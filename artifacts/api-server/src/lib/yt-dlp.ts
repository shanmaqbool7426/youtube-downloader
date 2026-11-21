import { spawn, type ChildProcess } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { create as createYtDlp } from "yt-dlp-exec";
import { env } from "./env";
import { acquireSlot } from "./concurrency";

/** Flags the bundled yt-dlp type declaration doesn't know about. */
type YtFlags = NonNullable<Parameters<ReturnType<typeof createYtDlp>>[1]>;

// Use a custom binary if provided (e.g. YTDLP_BIN), otherwise look for a local copy
// in <repo>/artifacts/api-server/bin. Bundles this module into dist/, so "../bin"
// always resolves to the api-server package directory.
function resolveBinaryPath(): string {
  if (process.env["YTDLP_BIN"]) return process.env["YTDLP_BIN"];
  const exe = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(import.meta.dirname, "..", "bin", exe);
}

/** Locate a bundled ffmpeg binary for muxing "Video + Audio" downloads. */
export function resolveFfmpegPath(): string {
  if (process.env["FFMPEG_BIN"]) return process.env["FFMPEG_BIN"];
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  return path.join(import.meta.dirname, "..", "bin", exe);
}

export const ytDlp = createYtDlp(resolveBinaryPath());

export interface RawFormat {
  format_id?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number;
  width?: number;
  fps?: number;
  tbr?: number;
  abr?: number;
  filesize?: number;
  filesize_approx?: number;
  protocol?: string;
}

export interface RawVideoInfo {
  title?: string;
  thumbnail?: string;
  duration?: number;
  formats?: RawFormat[];
}

/**
 * Speed / reliability flags shared by every yt-dlp invocation:
 * - concurrentFragments: downloads fragmented (HLS/DASH) streams 8 segments at a time
 * - retries + fragmentRetries: survive transient throttling / connection resets
 * - socketTimeout: bail on dead sockets instead of hanging forever
 * - httpChunkSize: 10M chunks keeps direct https streams flowing at full speed
 * - impersonate: browser TLS fingerprint (bundled curl_cffi). Without it YouTube
 *   throttles the default Python fingerprint to a byte-trickle on the watch-page
 *   request, which surfaces as an extraction "hang".
 * - jsRuntimes: lets yt-dlp solve YouTube's JS challenges (n-signature) with the
 *   Node runtime → unthrottled media URLs. Degrades gracefully if Node is absent.
 *
 * Note: we deliberately keep yt-dlp's default user agent — overriding it with a
 * bot UA (e.g. googlebot) makes some YouTube player endpoints hang forever.
 */
const SPEED_FLAGS = {
  noCheckCertificate: true,
  noWarnings: true,
  concurrentFragments: 8,
  fragmentRetries: 10,
  retries: 10,
  socketTimeout: 30,
  httpChunkSize: "10M",
  noPart: true,
  ...(env.ytdlpImpersonate ? { impersonate: env.ytdlpImpersonate } : {}),
  ...(env.ytdlpJsRuntime ? { jsRuntimes: env.ytdlpJsRuntime } : {}),
} as unknown as YtFlags;

/** Fetch the full metadata JSON for one video (bounded by a hard timeout). */
export async function fetchRawInfo(url: string): Promise<RawVideoInfo> {
  const release = await acquireSlot();
  try {
    return (await ytDlp(url, {
      ...SPEED_FLAGS,
      dumpSingleJson: true,
      // URLs pasted from watch pages often carry a &list= parameter; treat
      // them as the single video the user sees instead of dumping a playlist.
      noPlaylist: true,
    } as YtFlags, {
      timeout: env.infoTimeoutMs,
      maxBuffer: 64 * 1024 * 1024,
    })) as RawVideoInfo;
  } finally {
    release();
  }
}

type StreamProc = ChildProcess;

/**
 * Raw CLI flags mirroring SPEED_FLAGS, for processes spawned directly (the
 * yt-dlp-exec wrapper always appends a URL, which --load-info-json must not get).
 */
function speedArgs(): string[] {
  const args = [
    "--no-check-certificate",
    "--no-warnings",
    "--concurrent-fragments", "8",
    "--fragment-retries", "10",
    "--retries", "10",
    "--socket-timeout", "30",
    "--http-chunk-size", "10M",
    "--no-part",
    "--no-progress",
    "--quiet",
  ];
  if (env.ytdlpImpersonate) args.push("--impersonate", env.ytdlpImpersonate);
  return args;
}

/**
 * Write the cached metadata JSON to a file so yt-dlp can skip extraction
 * (`--load-info-json`). Re-extracting costs ~10-15 s per process on YouTube;
 * loading the cached JSON starts the media download almost immediately.
 */
export async function writeInfoFile(dir: string, infoJson: string): Promise<string> {
  const infoPath = path.join(dir, "info.json");
  await writeFile(infoPath, infoJson, "utf8");
  return infoPath;
}

/** Spawn yt-dlp streaming one format (from a cached info file) to stdout. */
export function spawnFormatToStdout(infoPath: string, format: string): StreamProc {
  return spawn(
    resolveBinaryPath(),
    [...speedArgs(), "--load-info-json", infoPath, "--format", format, "--output", "-"],
    { stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
  );
}

/**
 * Copy-mux a video stream and an audio stream, both arriving on pipes, into one
 * container written to stdout. Nothing touches the disk and the client gets
 * bytes as soon as the first fragments are muxed. MP4 output is fragmented
 * (moov up front, moof per keyframe) because stdout is not seekable.
 */
export function spawnMuxToStdout(
  video: StreamProc,
  audio: StreamProc,
  container: "mp4" | "webm" | "mkv",
): StreamProc {
  const args = [
    "-hide_banner", "-loglevel", "error",
    "-i", "pipe:3",
    "-i", "pipe:4",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c", "copy",
  ];
  if (container === "mp4") {
    args.push("-movflags", "frag_keyframe+empty_moov+default_base_moof", "-f", "mp4");
  } else if (container === "webm") {
    args.push("-f", "webm");
  } else {
    args.push("-f", "matroska");
  }
  args.push("pipe:1");

  const ffmpeg = spawn(resolveFfmpegPath(), args, {
    stdio: ["ignore", "pipe", "ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  pipeInto(video, ffmpeg.stdio[3] as Writable);
  pipeInto(audio, ffmpeg.stdio[4] as Writable);
  return ffmpeg;
}

/** Transcode an audio stream arriving on stdin into MP3 on stdout. */
export function spawnMp3ToStdout(
  audio: StreamProc,
  bitrateKbps: number,
  title: string,
): StreamProc {
  const ffmpeg = spawn(
    resolveFfmpegPath(),
    [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-vn",
      "-c:a", "libmp3lame",
      "-b:a", `${bitrateKbps}k`,
      "-metadata", `title=${title}`,
      "-f", "mp3",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "ignore"], windowsHide: true },
  );
  pipeInto(audio, ffmpeg.stdin as Writable);
  return ffmpeg;
}

/** Pipe a producer's stdout into a consumer pipe, ignoring EPIPE on teardown. */
function pipeInto(producer: StreamProc, target: Writable): void {
  target.on("error", () => producer.kill());
  producer.stdout?.on("error", () => {});
  producer.stdout?.pipe(target);
}

/** Resolve the direct media URL for one format id (short-lived run). */
export async function resolveDirectUrl(url: string, formatId: string): Promise<string> {
  const release = await acquireSlot();
  try {
    const result = (await ytDlp(url, {
      ...SPEED_FLAGS,
      getUrl: true,
      format: formatId,
    } as YtFlags, {
      timeout: env.infoTimeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    })) as unknown as string;
    return String(result).trim().split("\n")[0] ?? "";
  } finally {
    release();
  }
}

/**
 * Kill a stdout-streaming download when no bytes have arrived for a while —
 * keeps hung yt-dlp processes from holding a connection (and a slot) forever.
 */
export function armStallWatchdog(
  proc: { stdout: Readable | null; kill: (signal?: NodeJS.Signals) => boolean },
  onStall: () => void,
): () => void {
  let lastData = Date.now();
  let stalled = false;

  const onData = () => {
    lastData = Date.now();
  };
  proc.stdout?.on("data", onData);

  const timer = setInterval(() => {
    if (stalled) return;
    if (Date.now() - lastData > env.downloadStallTimeoutMs) {
      stalled = true;
      proc.kill("SIGKILL");
      onStall();
    }
  }, 5_000);
  timer.unref?.();

  return () => {
    clearInterval(timer);
    proc.stdout?.off("data", onData);
  };
}
