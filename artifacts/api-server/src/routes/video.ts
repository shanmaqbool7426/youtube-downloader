import os from "node:os";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetVideoInfoBody,
  GetVideoInfoResponse,
  GetDownloadLinkBody,
  GetDownloadLinkResponse,
} from "@workspace/api-zod";
import { env } from "../lib/env";
import { QueueTimeoutError, acquireSlot } from "../lib/concurrency";
import {
  armStallWatchdog,
  fetchRawInfo,
  resolveDirectUrl,
  spawnFormatToStdout,
  spawnMp3ToStdout,
  spawnMuxToStdout,
  stderrTail,
  writeInfoFile,
  type RawFormat,
  type RawVideoInfo,
} from "../lib/yt-dlp";

const router: IRouter = Router();

interface DownloadFormat {
  formatId: string;
  type: "progressive" | "video" | "audio";
  quality: string;
  extension: string;
  filesize: number | null;
  filename: string;
}

interface VideoInfoPayload {
  title: string;
  thumbnail: string;
  duration: string;
  platform: string;
  formats: DownloadFormat[];
}

/** Cache entry: the API payload plus the raw data needed to plan downloads. */
interface CachedInfo {
  payload: VideoInfoPayload;
  rawDuration?: number;
  rawFormats: RawFormat[];
  /** Full yt-dlp JSON, replayed via --load-info-json to skip re-extraction. */
  infoJson: string;
  expiresAt: number;
}

/** Keys of the yt-dlp JSON that downloads never need but that bloat the cache. */
const HEAVY_INFO_KEYS = ["automatic_captions", "subtitles", "thumbnails", "heatmap"];

function compactInfoJson(info: RawVideoInfo): string {
  const copy: Record<string, unknown> = { ...(info as Record<string, unknown>) };
  for (const key of HEAVY_INFO_KEYS) delete copy[key];
  return JSON.stringify(copy);
}

// Per-URL cache with TTL + size cap so repeat requests (info + download) stay
// fast without leaking memory on a long-running instance.
const infoCache = new Map<string, CachedInfo>();
const fetchPromises = new Map<string, Promise<VideoInfoPayload>>();

function cacheGet(url: string): CachedInfo | null {
  const entry = infoCache.get(url);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    infoCache.delete(url);
    return null;
  }
  return entry;
}

function cacheSet(url: string, entry: CachedInfo): void {
  // Delete first so re-inserting refreshes the Map insertion order (poor man's LRU).
  infoCache.delete(url);
  infoCache.set(url, entry);
  while (infoCache.size > env.infoCacheMaxEntries) {
    const oldest = infoCache.keys().next().value;
    if (oldest === undefined) break;
    infoCache.delete(oldest);
  }
}

/** Detect platform name from URL */
function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/instagram\.com/.test(url)) return "Instagram";
  if (/facebook\.com|fb\.watch/.test(url)) return "Facebook";
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/twitter\.com|x\.com/.test(url)) return "Twitter";
  if (/dailymotion\.com/.test(url)) return "Dailymotion";
  return "Unknown";
}

/** Format seconds into MM:SS or HH:MM:SS */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Remove characters that are invalid in file names */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function heightLabel(height?: number): string {
  if (!height) return "SD";
  if (height >= 2160) return "2160p (4K)";
  return `${height}p`;
}

function fileSizeOf(f: RawFormat): number | null {
  return f.filesize ?? f.filesize_approx ?? null;
}

/** Mark the -drc (downmix) twin formats as low priority */
function isDrc(f: RawFormat): boolean {
  return String(f.format_id ?? "").includes("-drc");
}

/**
 * Prefer single-file direct streams (https) over HLS manifests (m3u8): piping a
 * direct stream to stdout yields a proper MP4, while an HLS manifest yields an
 * unmarked MPEG-TS stream that does not play in browsers.
 */
function isDirect(f: RawFormat): boolean {
  const protocol = String(f.protocol ?? "");
  return protocol !== "mhtml" && !protocol.includes("m3u8") && !protocol.includes("hls");
}

function hasVideoStream(f: RawFormat): boolean {
  return Boolean(f.vcodec && f.vcodec !== "none");
}

function hasAudioStream(f: RawFormat): boolean {
  return Boolean(f.acodec && f.acodec !== "none");
}

/** Map a raw yt-dlp format to the API contract, or null for non-media entries */
function classifyFormat(f: RawFormat): Omit<DownloadFormat, "filename"> | null {
  const formatId = f.format_id;
  if (!formatId) return null;

  const hasVideo = hasVideoStream(f);
  const hasAudio = hasAudioStream(f);
  if (!hasVideo && !hasAudio) return null; // storyboards / placeholder entries

  const extension = f.ext ?? "mp4";
  const filesize = fileSizeOf(f);

  let type: DownloadFormat["type"];
  let quality: string;

  if (hasVideo && hasAudio) {
    type = "progressive";
    quality = heightLabel(f.height);
  } else if (hasVideo) {
    type = "video";
    quality =
      heightLabel(f.height) + (f.fps && f.fps > 30 ? " 60fps" : "");
  } else {
    type = "audio";
    quality = `Best audio (${extension})`;
  }

  return { formatId, type, quality, extension, filesize };
}

interface MergedSelection {
  video: RawFormat;
  audio: RawFormat;
  container: "mp4" | "webm" | "mkv";
  quality: string;
  filesize: number | null;
}

/**
 * Pick the exact video + audio streams a "Video + Audio" row will download.
 * Deterministic: used both when building the format list (for size/container
 * labels) and at download time, so what the user sees is what they get.
 */
function selectMergedStreams(raw: RawFormat[], height: number): MergedSelection | null {
  const videos = raw.filter(
    (f) =>
      f.format_id &&
      hasVideoStream(f) &&
      !hasAudioStream(f) &&
      (f.height ?? 0) <= height &&
      (f.height ?? 0) > 0 &&
      isDirect(f) &&
      !isDrc(f),
  );
  if (videos.length === 0) return null;

  // Highest resolution first, prefer mp4 (broad player support), then bitrate.
  const bestVideo = [...videos].sort((a, b) => {
    const heightDiff = (b.height ?? 0) - (a.height ?? 0);
    if (heightDiff !== 0) return heightDiff;
    const aMp4 = a.ext === "mp4";
    const bMp4 = b.ext === "mp4";
    if (aMp4 !== bMp4) return aMp4 ? -1 : 1;
    return (b.tbr ?? 0) - (a.tbr ?? 0);
  })[0]!;

  const audios = raw.filter(
    (f) => f.format_id && hasAudioStream(f) && !hasVideoStream(f) && isDirect(f) && !isDrc(f),
  );
  if (audios.length === 0) return null;

  // Prefer AAC in m4a next to mp4 video (clean mp4 muxing); otherwise prefer
  // opus/webm next to webm video, falling back to whatever exists.
  const videoExt = bestVideo.ext ?? "mp4";
  const preferredAudioExt = videoExt === "mp4" ? "m4a" : "webm";
  const bestAudio = [...audios].sort((a, b) => {
    const aPreferred = a.ext === preferredAudioExt;
    const bPreferred = b.ext === preferredAudioExt;
    if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
    return (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0);
  })[0]!;

  const audioExt = bestAudio.ext ?? "m4a";
  let container: MergedSelection["container"];
  if (videoExt === "mp4" && audioExt === "m4a") container = "mp4";
  else if (videoExt === "webm" && (audioExt === "webm" || audioExt === "opus")) container = "webm";
  else container = "mkv";

  const videoSize = fileSizeOf(bestVideo);
  const audioSize = fileSizeOf(bestAudio);
  const filesize = videoSize != null && audioSize != null ? videoSize + audioSize : null;

  const quality =
    heightLabel(bestVideo.height) + (bestVideo.fps && bestVideo.fps > 30 ? " 60fps" : "");

  return { video: bestVideo, audio: bestAudio, container, quality, filesize };
}

/** MP3 rows the server prepares via ffmpeg; sizes estimated from duration. */
const MP3_OPTIONS = [
  { bitrate: 320, bytesPerSecond: 40_000 },
  { bitrate: 128, bytesPerSecond: 16_000 },
] as const;

/** Build the deduplicated, best-per-height format list presented to users */
function buildFormatList(
  title: string,
  raw: RawFormat[],
  rawDuration?: number,
): DownloadFormat[] {
  const byHeight = new Map<
    number,
    { progressive: RawFormat | null; video: RawFormat | null }
  >();
  let bestAudio: RawFormat | null = null;

  for (const f of raw) {
    if (isDrc(f)) continue;

    const classified = classifyFormat(f);
    if (!classified) continue;

    if (classified.type === "audio") {
      const audioBitrate = (candidate: RawFormat) => candidate.abr ?? candidate.tbr ?? 0;
      if (!bestAudio || audioBitrate(f) > audioBitrate(bestAudio)) bestAudio = f;
      continue;
    }

    const height = f.height ?? 0;
    let bucket = byHeight.get(height);
    if (!bucket) {
      bucket = { progressive: null, video: null };
      byHeight.set(height, bucket);
    }

    const isBetterCandidate = (a: RawFormat, b: RawFormat | null): boolean => {
      if (!b) return true;
      const aMp4 = a.ext === "mp4";
      const bMp4 = b.ext === "mp4";
      if (aMp4 !== bMp4) return aMp4;
      const aDirect = isDirect(a);
      const bDirect = isDirect(b);
      if (aDirect !== bDirect) return aDirect;
      return (a.tbr ?? 0) > (b.tbr ?? 0);
    };

    if (classified.type === "progressive") {
      if (isBetterCandidate(f, bucket.progressive)) bucket.progressive = f;
    } else if (isBetterCandidate(f, bucket.video)) {
      bucket.video = f;
    }
  }

  const heights = [...byHeight.keys()].sort((a, b) => b - a);
  const titlePart = sanitizeFilename(title) || "video";

  // "Video + Audio" merged rows: one per available height (not just 1080/720),
  // downloaded as two parallel streams and muxed server-side into one file.
  const merged: Omit<DownloadFormat, "filename">[] = [];
  for (const height of heights) {
    const bucket = byHeight.get(height)!;
    if (!bucket.video) continue; // heights without a video-only stream already have a progressive row
    const selection = selectMergedStreams(raw, height);
    if (!selection) continue;
    merged.push({
      formatId: `video+audio:${height}`,
      type: "progressive",
      quality: selection.quality,
      extension: selection.container,
      filesize: selection.filesize,
    });
  }

  const base: Omit<DownloadFormat, "filename">[] = [];
  for (const height of heights) {
    const bucket = byHeight.get(height)!;
    const progressive = bucket.progressive
      ? classifyFormat(bucket.progressive)
      : null;
    const videoOnly = bucket.video ? classifyFormat(bucket.video) : null;
    if (progressive) base.push(progressive);
    if (videoOnly) base.push(videoOnly);
  }

  const audioRows: Omit<DownloadFormat, "filename">[] = MP3_OPTIONS.map((option) => ({
    formatId: `mp3:${option.bitrate}`,
    type: "audio",
    quality: `MP3 · ${option.bitrate} kbps`,
    extension: "mp3",
    filesize: rawDuration ? Math.round(rawDuration * option.bytesPerSecond) : null,
  }));
  if (bestAudio) {
    const audio = classifyFormat(bestAudio);
    if (audio) audioRows.push(audio);
  }

  const all = [...merged, ...base, ...audioRows];

  return all.map((fmt) => ({
    ...fmt,
    filename:
      fmt.formatId.startsWith("mp3:")
        ? `${titlePart}-${fmt.formatId.slice(4)}kbps.mp3`
        : fmt.type === "audio"
          ? `${titlePart}.${fmt.extension}`
          : fmt.formatId.startsWith("video+audio:")
              ? `${titlePart}-${fmt.quality.replace(/\s/g, "")}-VideoAndAudio.${fmt.extension}`
              : `${titlePart}-${fmt.quality.replace(/\s/g, "")}.${fmt.extension}`,
  }));
}

/** Fetch + cache video metadata (title, thumbnail, duration, platform, formats) */
async function fetchVideoInfo(url: string): Promise<VideoInfoPayload> {
  const cached = cacheGet(url);
  if (cached) return cached.payload;

  let pending = fetchPromises.get(url);
  if (!pending) {
    pending = (async () => {
      const info: RawVideoInfo = await fetchRawInfo(url);

      const payload: VideoInfoPayload = {
        title: info.title ?? "Unknown title",
        thumbnail: info.thumbnail ?? "",
        duration: info.duration ? formatDuration(info.duration) : "Unknown",
        platform: detectPlatform(url),
        formats: buildFormatList(info.title ?? "Unknown title", info.formats ?? [], info.duration),
      };

      cacheSet(url, {
        payload,
        rawDuration: info.duration,
        rawFormats: info.formats ?? [],
        infoJson: compactInfoJson(info),
        expiresAt: Date.now() + env.infoCacheTtlMs,
      });
      fetchPromises.delete(url);
      return payload;
    })().catch((err: unknown) => {
      fetchPromises.delete(url);
      throw err;
    });
    fetchPromises.set(url, pending);
  }

  return pending;
}

/** Info for a download request; re-fetches (bounded) if the cache expired. */
async function ensureInfo(url: string): Promise<CachedInfo> {
  const cached = cacheGet(url);
  if (cached) return cached;
  await fetchVideoInfo(url);
  const refreshed = cacheGet(url);
  if (!refreshed) throw new Error("Failed to load video info");
  return refreshed;
}

const STREAM_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  opus: "audio/ogg",
  ogg: "audio/ogg",
};

function setDownloadHeaders(res: Response, filename: string, ext: string, length?: number): void {
  const safeName = sanitizeFilename(filename).replace(/["\\]/g, "");
  // Header values must be Latin-1: Node throws on titles in Hindi/Urdu/emoji.
  // The quoted filename gets an ASCII fallback; browsers use the RFC 5987
  // filename* form, which carries the real (percent-encoded UTF-8) name.
  const asciiName =
    safeName.replace(/[^\x20-\x7e]+/g, "_").replace(/_+/g, "_").replace(/^[_ ]+/, "") ||
    `download.${ext}`;
  res.status(200);
  res.setHeader("Content-Type", STREAM_MIME[ext] ?? "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  );
  if (length != null && Number.isFinite(length) && length > 0) {
    res.setHeader("Content-Length", String(length));
  }
}

/** POST /api/info — get video metadata + real available formats */
router.post("/info", async (req, res): Promise<void> => {
  const parsed = GetVideoInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { url } = parsed.data;

  try {
    const data = await fetchVideoInfo(url);
    const response = GetVideoInfoResponse.parse(data);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch video info");
    res.status(500).json({
      error: "Failed to fetch video info. Make sure the URL is valid and the platform is supported.",
    });
  }
});

/** POST /api/download — get a direct download URL for a specific format id */
router.post("/download", async (req, res): Promise<void> => {
  const parsed = GetDownloadLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { url, formatId } = parsed.data;

  if (formatId.startsWith("video+audio:") || formatId.startsWith("mp3:")) {
    res.status(400).json({
      error: "Merged and MP3 formats are prepared server-side; use GET /api/download.",
    });
    return;
  }

  try {
    const downloadUrl = await resolveDirectUrl(url, formatId);
    if (!downloadUrl) {
      res.status(500).json({ error: "Could not extract download URL" });
      return;
    }

    // Reuse the cached info to build a nice filename without a second yt-dlp call.
    const cachedFormat = cacheGet(url)?.payload.formats.find((fmt) => fmt.formatId === formatId);
    const response = GetDownloadLinkResponse.parse({
      downloadUrl,
      filename: cachedFormat?.filename ?? `video-${formatId}`,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to get download link");
    res.status(500).json({
      error: "Failed to get download link. The format may not be available for this video.",
    });
  }
});

class DownloadUnavailableError extends Error {}

/**
 * Run a download pipeline and stream its output to the client.
 *
 * Every yt-dlp process replays the cached metadata (`--load-info-json`), so no
 * second extraction happens, and output is piped straight through: the browser
 * starts receiving the file within a few seconds instead of waiting for the
 * whole video to be downloaded + muxed on the server first.
 *
 * Headers are sent only once the first byte exists, so a pipeline that fails
 * immediately (e.g. an expired format URL) still returns a clean JSON error
 * instead of an empty "successful" file.
 */
async function runStreamingDownload(
  req: Request,
  res: Response,
  opts: {
    url: string;
    info: CachedInfo;
    slots: number;
    filename: string;
    ext: string;
    length?: number | null;
    build: (infoPath: string) => { output: ChildProcess; all: ChildProcess[] };
  },
): Promise<void> {
  const releases: (() => void)[] = [];
  const dir = await mkdtemp(path.join(os.tmpdir(), "hdgrab-"));
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    for (const release of releases) release();
    rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  let all: ChildProcess[] = [];
  let output: ChildProcess;
  try {
    for (let i = 0; i < opts.slots; i++) releases.push(await acquireSlot());
    const infoPath = await writeInfoFile(dir, opts.info.infoJson);
    ({ output, all } = opts.build(infoPath));
  } catch (err) {
    finish();
    throw err;
  }

  const killAll = () => {
    for (const proc of all) if (proc.exitCode === null) proc.kill();
  };

  const stdout = output.stdout;
  if (!stdout) {
    killAll();
    finish();
    throw new Error("Download process has no stdout");
  }

  await new Promise<void>((resolve) => {
    let started = false;

    const disarmWatchdog = armStallWatchdog(output, () => {
      req.log.warn({ url: opts.url }, "Download stalled (no data), killing pipeline");
      killAll();
      res.destroy();
    });

    stdout.once("data", (chunk: Buffer) => {
      stdout.pause();
      try {
        setDownloadHeaders(res, opts.filename, opts.ext, opts.length ?? undefined);
      } catch (err) {
        // This runs in a stream event handler: an exception here would take
        // the whole server down, so fail just this request instead.
        req.log.error({ err }, "Could not set download headers");
        killAll();
        return;
      }
      started = true;
      res.write(chunk);
      stdout.pipe(res);
    });

    for (const proc of all) {
      proc.on("error", (err) => req.log.error({ err }, "Download process failed to start"));
    }

    output.on("close", (code) => {
      const stderr = all.map(stderrTail).filter(Boolean);
      if (!started) {
        req.log.error({ code, url: opts.url, stderr }, "Download pipeline produced no data");
        sendDownloadError(req, res, 500, "Failed to download this format. Please process the video again.");
      } else if (code && code !== 0 && !res.writableEnded) {
        req.log.error({ code, url: opts.url, stderr }, "Download pipeline exited with an error");
        res.destroy();
      }
      disarmWatchdog();
      killAll();
      finish();
      resolve();
    });

    // Client cancelled / closed the tab: stop every process immediately.
    res.on("close", () => {
      if (!res.writableEnded) killAll();
    });
  });
}

/**
 * "Video + Audio": the video and audio streams download in PARALLEL (two
 * yt-dlp processes, two concurrency slots) and are copy-muxed by ffmpeg on the
 * fly, so the merged file streams to the client while it is being downloaded.
 */
async function streamMergedDownload(
  req: Request,
  res: Response,
  url: string,
  height: number,
  info: CachedInfo,
): Promise<void> {
  const selection = selectMergedStreams(info.rawFormats, height);
  const videoId = selection?.video.format_id;
  const audioId = selection?.audio.format_id;
  if (!selection || !videoId || !audioId) {
    throw new DownloadUnavailableError();
  }

  const format = info.payload.formats.find((fmt) => fmt.formatId === `video+audio:${height}`);
  await runStreamingDownload(req, res, {
    url,
    info,
    slots: 2,
    filename: format?.filename ?? `video-${selection.quality}-VideoAndAudio.${selection.container}`,
    ext: selection.container,
    build: (infoPath) => {
      const video = spawnFormatToStdout(infoPath, videoId);
      const audio = spawnFormatToStdout(infoPath, audioId);
      const output = spawnMuxToStdout(video, audio, selection.container);
      return { output, all: [video, audio, output] };
    },
  });
}

/** Best audio piped through ffmpeg into an MP3 at the requested bitrate. */
async function streamMp3Download(
  req: Request,
  res: Response,
  url: string,
  bitrateKbps: number,
  info: CachedInfo,
): Promise<void> {
  const format = info.payload.formats.find((fmt) => fmt.formatId === `mp3:${bitrateKbps}`);
  await runStreamingDownload(req, res, {
    url,
    info,
    slots: 1,
    filename: format?.filename ?? `audio-${bitrateKbps}kbps.mp3`,
    ext: "mp3",
    build: (infoPath) => {
      const audio = spawnFormatToStdout(infoPath, "bestaudio/best");
      const output = spawnMp3ToStdout(audio, bitrateKbps, info.payload.title);
      return { output, all: [audio, output] };
    },
  });
}

/** A single native format, piped straight from yt-dlp. */
async function streamPlainDownload(
  req: Request,
  res: Response,
  url: string,
  formatId: string,
  info: CachedInfo,
): Promise<void> {
  const format = info.payload.formats.find((fmt) => fmt.formatId === formatId);
  const ext = format?.extension ?? "mp4";
  // Only advertise a length when metadata reports an EXACT size, so the
  // browser can show a real progress bar without risking a corrupt file.
  const rawFormat = info.rawFormats.find((f) => f.format_id === formatId);
  await runStreamingDownload(req, res, {
    url,
    info,
    slots: 1,
    filename: format?.filename ?? `video-${formatId}.${ext}`,
    ext,
    length: rawFormat?.filesize,
    build: (infoPath) => {
      const output = spawnFormatToStdout(infoPath, formatId);
      return { output, all: [output] };
    },
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Error reply for GET /api/download. The SPA reaches this route by plain
 * navigation, so a JSON body would be saved by the browser as a stray
 * "download.txt"; browsers get a small HTML page instead, API clients JSON.
 */
function sendDownloadError(req: Request, res: Response, status: number, message: string): void {
  if (res.headersSent) return;
  res.status(status);
  if (req.accepts(["json", "html"]) === "html") {
    res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Download failed · HD Grab</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#f7f7f5;color:#18181b;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{background:#fff;border:1px solid #e5e5e8;border-radius:16px;padding:28px;max-width:440px;text-align:center}
h1{font-size:1.25rem;margin:0 0 8px}p{color:#63636b;margin:0 0 20px}
a{display:inline-block;background:#e85d27;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px}</style>
</head><body><main><h1>Download failed</h1><p>${escapeHtml(message)}</p>
<a href="/">Go back</a></main></body></html>`);
    return;
  }
  res.json({ error: message });
}

/**
 * GET /api/download?url=...&formatId=... — stream the actual media file to the
 * client. Every row type streams: plain formats straight from yt-dlp, merged
 * rows through an on-the-fly ffmpeg copy-mux, MP3 rows through ffmpeg encode.
 */
router.get("/download", async (req, res): Promise<void> => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const formatId =
    typeof req.query.formatId === "string" ? req.query.formatId.trim() : "";

  if (!url || !formatId || !/^https?:\/\//i.test(url)) {
    sendDownloadError(req, res, 400, "Missing required query params: url, formatId");
    return;
  }

  try {
    const info = await ensureInfo(url);

    if (formatId.startsWith("video+audio:")) {
      const height = Number(formatId.split(":")[1]);
      if (!Number.isFinite(height) || height <= 0) {
        sendDownloadError(req, res, 400, "Invalid format id");
        return;
      }
      await streamMergedDownload(req, res, url, height, info);
      return;
    }

    if (formatId.startsWith("mp3:")) {
      const bitrate = Number(formatId.slice("mp3:".length));
      if (!Number.isFinite(bitrate) || bitrate <= 0) {
        sendDownloadError(req, res, 400, "Invalid format id");
        return;
      }
      await streamMp3Download(req, res, url, bitrate, info);
      return;
    }

    await streamPlainDownload(req, res, url, formatId, info);
  } catch (err) {
    if (err instanceof DownloadUnavailableError) {
      sendDownloadError(req, res, 400, "This quality is no longer available. Please reprocess the video.");
      return;
    }
    if (err instanceof QueueTimeoutError) {
      res.setHeader("Retry-After", "5");
      sendDownloadError(req, res, 503, "The download queue is busy. Please try again in a few seconds.");
      return;
    }
    req.log.error({ err }, "Download failed");
    if (!res.headersSent) {
      sendDownloadError(req, res, 500, "Failed to download this format. It may not be available anymore.");
    } else if (!res.writableEnded) {
      res.destroy();
    }
  }
});

export default router;
