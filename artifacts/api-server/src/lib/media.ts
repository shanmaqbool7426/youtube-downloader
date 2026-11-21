import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const youtube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
const platforms = [
  { name: "YouTube", hosts: youtube, extractor: "youtube" },
  { name: "Instagram", hosts: ["instagram.com", "www.instagram.com"], extractor: "Instagram" },
  { name: "Facebook", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"], extractor: "Facebook,facebook:reel,FacebookRedirectURL" },
  { name: "TikTok", hosts: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"], extractor: "TikTok,vm\\.tiktok" },
  { name: "X", hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"], extractor: "Twitter" },
  { name: "Dailymotion", hosts: ["dailymotion.com", "www.dailymotion.com", "dai.ly"], extractor: "Dailymotion" },
];

export const maxBytes = 128 * 1024 * 1024;
export const maxDuration = 30 * 60;
export const ytDlpBin = process.env.YTDLP_BIN || "yt-dlp";

export class MediaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function parseSource(input: string) {
  const message = "Paste a public video link from one of the supported platforms.";
  if (input.length > 2048) throw new MediaError(400, message);
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new MediaError(400, message);
  }
  const platform = platforms.find(({ hosts }) => hosts.includes(url.hostname));
  if (!platform || url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new MediaError(400, message);
  }

  // Canonicalize individual YouTube videos so share and playlist variants reuse metadata.
  if (platform.name === "YouTube") {
    const [, route, id] = url.pathname.split("/");
    const videoId = url.hostname === "youtu.be"
      ? route : route === "watch" ? url.searchParams.get("v")
      : ["shorts", "live", "embed"].includes(route) ? id : null;
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) throw new MediaError(400, message);
    url = new URL("https://www.youtube.com/watch?v=" + videoId);
  }
  url.hash = "";
  return { url: url.href, platform };
}

type MediaFormat = {
  format_id?: string;
  height?: number;
  width?: number;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  has_drm?: boolean;
  filesize?: number;
  filesize_approx?: number;
};

type Metadata = {
  title?: string;
  thumbnail?: string;
  duration?: number;
  is_live?: boolean;
  live_status?: string;
  _type?: string;
  formats?: MediaFormat[];
};

function selectable(format: MediaFormat) {
  return !!format.format_id && /^[\w.-]+$/.test(format.format_id) && !format.has_drm
    && (format.filesize ?? format.filesize_approx ?? 0) <= maxBytes;
}

export function availableFormats(formats: MediaFormat[]) {
  const usable = formats.filter(selectable);
  // yt-dlp returns formats in ascending preference order.
  const preferred = [...usable].reverse();
  const audio = preferred.find((format) =>
    format.ext === "m4a" && format.vcodec === "none" && format.acodec?.startsWith("mp4a"));
  const video = new Map<string, { quality: string; format: "mp4"; label: string; selector: string }>();

  for (const format of preferred) {
    if (format.ext !== "mp4" || !format.vcodec?.startsWith("avc") || !format.height) continue;
    const resolution = Math.min(format.height, format.width || format.height);
    if (resolution > 1080) continue;
    const quality = resolution + "p";
    const combined = format.acodec?.startsWith("mp4a");
    if (!combined && (format.acodec !== "none" || !audio)) continue;
    if (video.has(quality) && (!combined || !video.get(quality)?.selector.includes("+"))) continue;
    const selector = combined
      ? format.format_id!
      : format.format_id + "+" + audio!.format_id;
    video.set(quality, { quality, format: "mp4", label: quality + " MP4", selector });
  }

  const options: { quality: string; format: "mp4" | "mp3"; label: string; selector: string }[] =
    [...video.values()].sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
  const audioDownload = preferred.find((format) => format.vcodec === "none" && format.acodec && format.acodec !== "none")
    ?? preferred.find((format) => format.acodec && format.acodec !== "none");
  if (audioDownload) {
    options.push({ quality: "mp3", format: "mp3", label: "MP3 audio", selector: audioDownload.format_id! });
  }
  return options;
}

function manifestArguments(skipHls: boolean) {
  return skipHls ? ["--extractor-args", "youtube:skip=hls"] : [];
}

async function readMetadata(source: ReturnType<typeof parseSource>, signal: AbortSignal, skipHls: boolean) {
  const output = await runYtDlp(source, [
    "--dump-single-json", "--skip-download", "--playlist-items", "1",
    "--ignore-no-formats-error", ...manifestArguments(skipHls),
  ], signal, 25_000);
  const metadata = JSON.parse(output) as Metadata;

  if (metadata._type === "playlist" || metadata._type === "multi_video") {
    throw new MediaError(422, "Open an individual video and paste its link.");
  }
  if (metadata.is_live || ["is_live", "is_upcoming", "post_live"].includes(metadata.live_status ?? "")
      || !metadata.duration || metadata.duration > maxDuration) {
    throw new MediaError(422, "Choose a recorded video that is 30 minutes or shorter.");
  }
  const options = availableFormats(metadata.formats ?? []);
  return {
    title: metadata.title || "Untitled video",
    thumbnail: metadata.thumbnail?.startsWith("https://") ? metadata.thumbnail : "",
    duration: new Date(Math.floor(metadata.duration) * 1000).toISOString().slice(11, 19).replace(/^00:/, ""),
    platform: source.platform.name,
    options,
    skipHls,
  };
}

export async function getMetadata(source: ReturnType<typeof parseSource>, signal: AbortSignal) {
  const fast = await readMetadata(source, signal, source.platform.name === "YouTube");
  // Most recorded YouTube videos expose direct formats without an HLS manifest request.
  const metadata = fast.skipHls && !fast.options.length
    ? await readMetadata(source, signal, false)
    : fast;
  if (!metadata.options.length) throw new MediaError(422, "This video has no supported download formats.");
  return metadata;
}

export async function prepareMedia(
  source: ReturnType<typeof parseSource>,
  option: ReturnType<typeof availableFormats>[number],
  directory: string,
  signal: AbortSignal,
  skipHls: boolean,
) {
  const params = option.format === "mp3"
    ? ["--extract-audio", "--audio-format", "mp3", "--audio-quality", "192K"]
    : ["--merge-output-format", "mp4"];
  const outputPath = join(directory, "media." + option.format);
  await runYtDlp(source, [
    "--format", option.selector, "--output", join(directory, "media.%(ext)s"),
    "--max-filesize", String(maxBytes), "--match-filters", `duration <= ${maxDuration} & !is_live`,
    "--concurrent-fragments", "4", "--abort-on-unavailable-fragments",
    ...manifestArguments(skipHls), ...params,
  ], signal, 180_000, directory);
  const file = await stat(outputPath).catch(() => undefined);
  if (!file?.isFile() || file.size === 0 || file.size > maxBytes) {
    throw new MediaError(422, "This file could not be prepared within the 128 MB limit.");
  }
  return outputPath;
}

function runYtDlp(
  source: ReturnType<typeof parseSource>,
  args: string[],
  signal: AbortSignal,
  timeoutMs: number,
  directory?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const child = spawn(ytDlpBin, [
      "--ignore-config", "--no-plugin-dirs", "--no-cache-dir", "--no-playlist",
      "--no-remote-components", "--compat-options", "no-certifi",
      "--use-extractors", source.platform.extractor,
      "--no-js-runtimes", "--js-runtimes", `node:${process.execPath}`,
      "--socket-timeout", "10", "--retries", "2", "--fragment-retries", "2",
      "--extractor-retries", "1", "--no-progress", ...args, "--", source.url,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      // A process group lets cancellation stop both yt-dlp and its FFmpeg subprocess.
      detached: process.platform !== "win32",
      env: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        PYTHONUTF8: "1",
        SYSTEMROOT: process.env.SYSTEMROOT,
        https_proxy: process.env.https_proxy ?? process.env.HTTPS_PROXY,
        http_proxy: process.env.http_proxy ?? process.env.HTTP_PROXY,
        no_proxy: process.env.no_proxy ?? process.env.NO_PROXY,
        SSL_CERT_FILE: process.env.SSL_CERT_FILE,
        SSL_CERT_DIR: process.env.SSL_CERT_DIR,
        REQUESTS_CA_BUNDLE: process.env.REQUESTS_CA_BUNDLE,
      },
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let stderr = "";
    let failure: Error | undefined;
    let checking = false;
    function stop(error: Error) {
      if (failure) return;
      failure = error;
      if (!child.pid) return;
      try {
        if (process.platform === "win32") child.kill("SIGKILL");
        else process.kill(-child.pid, "SIGKILL");
      } catch {
        // The process group may already have exited naturally.
      }
    }
    const abort = () => stop(new MediaError(499, "Request cancelled."));
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => stop(new MediaError(504, "This took too long. Try again or choose a smaller file.")), timeoutMs);
    const sizeCheck = directory && setInterval(async () => {
      if (checking || failure) return;
      checking = true;
      try {
        const sizes = await Promise.all((await readdir(directory)).map(async (name) =>
          (await stat(join(directory, name)).catch(() => undefined))?.size ?? 0));
        if (sizes.reduce((total, size) => total + size, 0) > maxBytes * 2) {
          stop(new MediaError(422, "This file is too large to prepare."));
        }
      } catch {
        stop(new MediaError(503, "Temporary storage is unavailable."));
      } finally {
        checking = false;
      }
    }, 500);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 8 * 1024 * 1024) stop(new MediaError(422, "This video returned too much metadata."));
      else chunks.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr = (stderr + chunk).slice(-8192); });
    child.on("error", () => {
      failure ??= new MediaError(503, "The media service is unavailable. Try again later.");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (sizeCheck) clearInterval(sizeCheck);
      signal.removeEventListener("abort", abort);
      if (failure) reject(failure);
      else if (code !== 0) {
        const message = /HTTP Error (403|429)|sign in to confirm/i.test(stderr)
          ? "The source site blocked this request. Try another public video."
          : "The source couldn’t provide this video. Check that it’s public and try again.";
        reject(new MediaError(502, message));
      } else resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}
