/**
 * Normalising the links users paste.
 *
 * Two jobs:
 * 1. Reject malformed / non-video links BEFORE spending a 15-30 s yt-dlp call,
 *    so the UI can say "that isn't a link" instead of "failed to fetch info".
 * 2. Collapse every YouTube form (watch, youtu.be, Shorts, live, embed, m.) to
 *    one canonical `watch?v=<id>` URL. The info cache is keyed by URL, so
 *    without this, the same video pasted three ways costs three extractions.
 */

/** Matches any youtube.com subdomain (www, m, music, ...) and youtu.be. */
const YOUTUBE_HOST = /^(?:(?:www|m|music|gaming)\.)?youtube\.com$/i;
const YOUTU_BE_HOST = /^youtu\.be$/i;

/** A YouTube video id is always 11 characters of [A-Za-z0-9_-]. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Paths that carry the id as the first segment. */
const ID_PATH = /^\/(?:shorts|live|embed|v|e)\/([^/?#]+)/i;

export type NormalizedUrl =
  | { ok: true; url: string; videoId?: string }
  | { ok: false; reason: "malformed" | "not-a-video" };

/**
 * Canonicalise a pasted URL. Non-YouTube http(s) links pass through untouched
 * (the backend's extractor set is wider than YouTube), everything else must
 * resolve to a real 11-character video id.
 */
export function normalizeVideoUrl(input: string): NormalizedUrl {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "malformed" };

  // Accept a bare "youtube.com/watch?v=..." that lost its scheme in the paste.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "malformed" };
  }

  // A pasted search query without a scheme ("how to cook rice") becomes
  // https://how to cook rice — reject anything whose host has no dot.
  if (!parsed.hostname.includes(".")) return { ok: false, reason: "malformed" };

  const host = parsed.hostname;

  if (YOUTU_BE_HOST.test(host)) {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? watch(id) : { ok: false, reason: "not-a-video" };
  }

  if (YOUTUBE_HOST.test(host)) {
    // /shorts/<id>, /live/<id>, /embed/<id>, /v/<id>, /e/<id>
    const fromPath = ID_PATH.exec(parsed.pathname);
    if (fromPath) {
      return VIDEO_ID.test(fromPath[1] ?? "")
        ? watch(fromPath[1]!)
        : { ok: false, reason: "not-a-video" };
    }

    if (/^\/(?:watch|watch_popup)\/?$/i.test(parsed.pathname)) {
      const id = parsed.searchParams.get("v") ?? "";
      return VIDEO_ID.test(id) ? watch(id) : { ok: false, reason: "not-a-video" };
    }

    // /playlist, /@channel, /results, /feed/... — reachable, but not one video.
    return { ok: false, reason: "not-a-video" };
  }

  // Other hosts: let the extractors decide.
  return { ok: true, url: withScheme };
}

function watch(id: string): NormalizedUrl {
  return { ok: true, url: `https://www.youtube.com/watch?v=${id}`, videoId: id };
}

/** Human label for the source, used by the results panel. */
export function detectPlatformLabel(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  if (/twitter\.com|x\.com/i.test(url)) return "X";
  if (/dailymotion\.com/i.test(url)) return "Dailymotion";
  if (/vimeo\.com/i.test(url)) return "Vimeo";
  return "Unknown";
}
