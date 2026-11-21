#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.includes("--version")) process.exit(0);

const source = new URL(args.at(-1));
if (source.searchParams.get("v") === "missing1234") process.exit(1);
if (args.includes("--dump-single-json")) {
  console.log(JSON.stringify({
    title: "VidSnap test clip",
    duration: 1,
    formats: source.searchParams.get("v") === "hls12345678" && args.includes("youtube:skip=hls") ? [] : [
      { format_id: "audio", vcodec: "none", acodec: "mp4a.40.2", ext: "m4a" },
      { format_id: "small", height: 360, width: 640, vcodec: "avc1", acodec: "mp4a.40.2", ext: "mp4" },
      { format_id: "medium", height: 720, width: 1280, vcodec: "avc1", acodec: "none", ext: "mp4" },
      { format_id: "large", height: 1080, width: 1920, vcodec: "avc1", acodec: "none", ext: "mp4", filesize: 500_000_000 },
      { format_id: "restricted", height: 480, width: 854, vcodec: "avc1", acodec: "mp4a.40.2", ext: "mp4", has_drm: true },
    ],
  }));
  process.exit(0);
}

if (source.searchParams.get("v") === "blocked1234") {
  console.error("ERROR: unable to download video data: HTTP Error 403: Forbidden");
  process.exit(1);
}
if (source.searchParams.get("v") === "slow1234567") {
  await new Promise((resolve) => setTimeout(resolve, 30_000));
}
if (source.searchParams.get("v") === "hls12345678" && args.includes("youtube:skip=hls")) process.exit(1);
const output = args[args.indexOf("--output") + 1];
const selector = args[args.indexOf("--format") + 1];
if (args.includes("--extract-audio") && args.includes("mp3") && selector === "audio") {
  execFileSync("ffmpeg", ["-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440",
    "-t", "1", "-c:a", "libmp3lame", output.replace("%(ext)s", "mp3")]);
} else if (args.includes("--merge-output-format") && args.includes("mp4") && selector === "medium+audio") {
  execFileSync("ffmpeg", ["-loglevel", "error", "-f", "lavfi", "-i", "color=size=1280x720",
    "-f", "lavfi", "-i", "sine=frequency=440", "-t", "1", "-c:v", "libx264",
    "-threads", "1", "-c:a", "aac", output.replace("%(ext)s", "mp4")]);
} else {
  process.exitCode = 1;
}
