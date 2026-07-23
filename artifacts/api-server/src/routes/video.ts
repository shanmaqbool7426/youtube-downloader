import { Router, type IRouter } from "express";
import { create as createYtDlp } from "yt-dlp-exec";

// Use the locally downloaded binary; fall back to PATH
const ytDlp = createYtDlp(process.env["YTDLP_BIN"] ?? "/home/runner/yt-dlp");
import {
  GetVideoInfoBody,
  GetVideoInfoResponse,
  GetDownloadLinkBody,
  GetDownloadLinkResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

/** POST /api/info — get video metadata */
router.post("/info", async (req, res): Promise<void> => {
  const parsed = GetVideoInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { url } = parsed.data;

  try {
    const info = await ytDlp(url, {
      dumpSingleJson: true,
      noCheckCertificate: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: "user-agent:googlebot",
    }) as unknown as Record<string, unknown>;

    const title = (info.title as string) ?? "Unknown title";
    const thumbnail = (info.thumbnail as string) ?? "";
    const durationRaw = info.duration as number | undefined;
    const duration = durationRaw ? formatDuration(durationRaw) : "Unknown";
    const platform = detectPlatform(url);

    // Build format list: 360p, 720p, 1080p, mp3
    const formats = [
      { quality: "360p", format: "mp4", label: "360p MP4" },
      { quality: "720p", format: "mp4", label: "720p MP4" },
      { quality: "1080p", format: "mp4", label: "1080p MP4" },
      { quality: "mp3", format: "mp3", label: "MP3 Audio" },
    ];

    const response = GetVideoInfoResponse.parse({
      title,
      thumbnail,
      duration,
      platform,
      formats,
    });

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch video info");
    res.status(500).json({ error: "Failed to fetch video info. Make sure the URL is valid and the platform is supported." });
  }
});

/** POST /api/download — get direct download URL */
router.post("/download", async (req, res): Promise<void> => {
  const parsed = GetDownloadLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { url, format } = parsed.data;

  // Map quality key to yt-dlp format selector
  const formatMap: Record<string, string> = {
    "360p": "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]",
    "720p": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]",
    "1080p": "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]",
    "mp3": "bestaudio[ext=m4a]/bestaudio",
  };

  const ytdlpFormat = formatMap[format] ?? "best";

  try {
    // Get the direct URL without downloading
    const result = await ytDlp(url, {
      getUrl: true,
      format: ytdlpFormat,
      noCheckCertificate: true,
      noWarnings: true,
    }) as unknown as string;

    // yt-dlp-exec with getUrl returns the URL as a string (possibly multiline for merged streams)
    const downloadUrl = result.trim().split("\n")[0];

    if (!downloadUrl) {
      res.status(500).json({ error: "Could not extract download URL" });
      return;
    }

    // Build a filename
    const ext = format === "mp3" ? "mp3" : "mp4";
    const filename = `vidsnap-${Date.now()}.${ext}`;

    const response = GetDownloadLinkResponse.parse({ downloadUrl, filename });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to get download link");
    res.status(500).json({ error: "Failed to get download link. The format may not be available for this video." });
  }
});

export default router;
