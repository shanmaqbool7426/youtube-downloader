import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Router, type Request, type Response } from "express";
import { GetDownloadLinkBody, GetVideoInfoBody } from "@workspace/api-zod";
import { getMetadata, MediaError, parseSource, prepareMedia } from "../lib/media";

const router = Router();
const metadataCache = new Map<string, { expires: number; data: Awaited<ReturnType<typeof getMetadata>> }>();
const downloads = new Map<string, { path: string; filename: string; expires: number; connections: number }>();
const requests = new Map<string, { count: number; expires: number }>();
const activeDownloads = new Set<string>();
const lifetime = 10 * 60_000;
let lookupCount = 0;
let storage: Promise<string> | undefined;

function removeDownload(token: string, file: { path: string }) {
  downloads.delete(token);
  return rm(dirname(file.path), { recursive: true, force: true });
}

async function clearExpired() {
  const now = Date.now();
  for (const [key, record] of metadataCache) {
    if (record.expires <= now) metadataCache.delete(key);
  }
  for (const [key, record] of requests) {
    if (record.expires <= now) requests.delete(key);
  }
  await Promise.all([...downloads].map(([token, file]) =>
    !file.connections && file.expires <= now ? removeDownload(token, file) : undefined));
}

const cleanup = setInterval(() => {
  void clearExpired().catch(() => console.error("Failed to clear expired media files"));
}, 30_000);
cleanup.unref();

export async function initializeMediaStorage() {
  if (!storage) {
    storage = (async () => {
      const parent = process.env.MEDIA_TEMP_DIR || tmpdir();
      await mkdir(parent, { recursive: true });
      return mkdtemp(join(parent, "vidsnap-"));
    })();
  }
  return storage;
}

export async function cleanupMediaStorage() {
  clearInterval(cleanup);
  if (storage) await rm(await storage, { recursive: true, force: true });
}

function sendError(req: Request, res: Response, error: unknown) {
  if (res.destroyed || res.headersSent) return;
  if (error instanceof MediaError) {
    if (error.status === 429 || error.status === 503) res.set("Retry-After", "10");
    res.status(error.status).json({ error: error.message });
    return;
  }
  req.log.error({ errorType: error instanceof Error ? error.name : typeof error }, "Media request failed");
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

router.use(["/info", "/download", "/file"], (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    res.status(403).json({ error: "Open VidSnap directly to download a file." });
    return;
  }
  if (req.method === "POST" && !req.is("application/json")) {
    res.status(415).json({ error: "Send a JSON request." });
    return;
  }
  if (req.method !== "POST") {
    next();
    return;
  }

  const key = req.ip ?? "unknown";
  const now = Date.now();
  let record = requests.get(key);
  if (!record || record.expires <= now) {
    if (requests.size >= 4096) {
      res.set("Retry-After", "30").status(503).json({ error: "VidSnap is busy. Try again shortly." });
      return;
    }
    record = { count: 0, expires: now + 60_000 };
    requests.set(key, record);
  }
  if (++record.count > 20) {
    res.set("Retry-After", String(Math.ceil((record.expires - now) / 1000)))
      .status(429).json({ error: "Too many requests. Wait a moment and try again." });
    return;
  }
  next();
});

function requestSignal(res: Response) {
  const controller = new AbortController();
  res.once("close", () => controller.abort());
  return controller.signal;
}

async function lookup(source: ReturnType<typeof parseSource>, signal: AbortSignal) {
  const hit = metadataCache.get(source.url);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (lookupCount >= 6) throw new MediaError(503, "VidSnap is busy. Try again shortly.");
  lookupCount++;
  try {
    const data = await getMetadata(source, signal);
    metadataCache.delete(source.url);
    if (metadataCache.size >= 128) metadataCache.delete(metadataCache.keys().next().value!);
    metadataCache.set(source.url, { data, expires: Date.now() + 5 * 60_000 });
    return data;
  } finally {
    lookupCount--;
  }
}

router.post("/info", async (req, res) => {
  try {
    const input = GetVideoInfoBody.safeParse(req.body);
    if (!input.success) throw new MediaError(400, "Paste a public video link to continue.");
    const { options, ...video } = await lookup(parseSource(input.data.url), requestSignal(res));
    res.json({ ...video, formats: options.map(({ quality, format, label }) => ({ quality, format, label })) });
  } catch (error) {
    sendError(req, res, error);
  }
});

router.post("/download", async (req, res) => {
  const key = req.ip ?? "unknown";
  let directory: string | undefined;
  let reserved = false;
  try {
    const input = GetDownloadLinkBody.safeParse(req.body);
    if (!input.success || !/^(?:\d{2,4}p|mp3)$/.test(input.data.format)) {
      throw new MediaError(400, "Select an available format.");
    }
    const source = parseSource(input.data.url);
    if (activeDownloads.has(key)) throw new MediaError(429, "You already have a file being prepared.");
    if (activeDownloads.size >= 2) throw new MediaError(503, "VidSnap is busy. Try again shortly.");
    activeDownloads.add(key);
    reserved = true;
    const signal = requestSignal(res);
    const video = await lookup(source, signal);
    const option = video.options.find(({ quality }) => quality === input.data.format);
    if (!option) throw new MediaError(422, "That format is unavailable. Choose another format.");

    if (downloads.size + activeDownloads.size > 8) {
      const oldest = [...downloads].find(([, record]) => !record.connections);
      if (!oldest) throw new MediaError(503, "Download storage is busy. Try again shortly.");
      await removeDownload(...oldest);
    }

    directory = await mkdtemp(join(await initializeMediaStorage(), "file-"));
    const path = await prepareMedia(source, option, directory, signal);
    signal.throwIfAborted();
    const title = Array.from(video.title.replace(/[^\p{L}\p{N} _-]/gu, " ").trim()).slice(0, 70).join("");
    const filename = (title || "VidSnap") + "." + option.format;
    const token = randomUUID();
    downloads.set(token, { path, filename, expires: Date.now() + lifetime, connections: 0 });
    directory = undefined;
    res.json({ downloadUrl: "/api/file?token=" + token, filename });
  } catch (error) {
    sendError(req, res, error);
  } finally {
    if (reserved) activeDownloads.delete(key);
    if (directory) {
      await rm(directory, { recursive: true, force: true }).catch(() =>
        req.log.error("Failed to remove an incomplete download"));
    }
  }
});

router.get("/file", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const file = downloads.get(token);
  if (!file || file.expires <= Date.now()) {
    res.status(404).json({ error: "This download has expired. Prepare the file again." });
    return;
  }
  if (file.connections >= 2) {
    res.set("Retry-After", "10").status(429).json({ error: "This file is already downloading." });
    return;
  }
  file.connections++;
  res.once("close", () => file.connections--);
  res.download(file.path, file.filename, { cacheControl: false }, (error) => {
    if (error && !res.destroyed) {
      if (res.headersSent) res.destroy();
      else sendError(req, res, error);
    }
  });
});

export default router;
