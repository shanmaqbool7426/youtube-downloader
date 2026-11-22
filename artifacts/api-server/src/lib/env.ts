/** Central env parsing so behaviour is tunable per deployment without code changes. */

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** String env var; unset → fallback, set → trimmed value (empty string allowed to disable). */
function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw.trim();
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",

  /** Max simultaneous yt-dlp processes (info + downloads combined). */
  ytdlpMaxConcurrent: num("YTDLP_MAX_CONCURRENT", 4),
  /** How long a queued request may wait for a slot before we return 503. */
  ytdlpQueueTimeoutMs: num("YTDLP_QUEUE_TIMEOUT_MS", 30_000),
  /** Metadata (yt-dlp --dump-single-json) hard timeout. */
  infoTimeoutMs: num("INFO_TIMEOUT_MS", 45_000),
  /** Kill a download when no bytes arrive for this long. */
  downloadStallTimeoutMs: num("DOWNLOAD_STALL_TIMEOUT_MS", 60_000),
  /** Hard cap for the whole merged/mp3 pipeline (two downloads + ffmpeg). */
  downloadMaxDurationMs: num("DOWNLOAD_MAX_DURATION_MS", 15 * 60_000),
  /** Video info cache lifetime. */
  infoCacheTtlMs: num("INFO_CACHE_TTL_MS", 30 * 60_000),
  /** Max entries kept in the info cache. */
  infoCacheMaxEntries: num("INFO_CACHE_MAX_ENTRIES", 500),

  /**
   * TLS fingerprint yt-dlp impersonates for metadata/API requests (bundled
   * curl_cffi). YouTube throttles the default Python TLS fingerprint to a
   * byte-trickle that looks like a hang. Set YTDLP_IMPERSONATE= to disable.
   */
  ytdlpImpersonate: str("YTDLP_IMPERSONATE", "chrome"),
  /**
   * JS runtime yt-dlp may use to solve YouTube challenges (n-signature →
   * unthrottled media URLs). Node always exists wherever this server runs.
   * Set YTDLP_JS_RUNTIME= to disable.
   */
  ytdlpJsRuntime: str("YTDLP_JS_RUNTIME", "node"),
  /**
   * Netscape-format cookies.txt from a signed-in YouTube session. Datacenter
   * IPs (Render, Railway, …) get "Failed to extract any player response" /
   * "confirm you're not a bot" without them. On Render, add a Secret File
   * named cookies.txt and set this to /etc/secrets/cookies.txt.
   */
  ytdlpCookiesFile: str("YTDLP_COOKIES_FILE", ""),
  /** Raw --extractor-args value, e.g. "youtube:player_client=tv,web_safari". */
  ytdlpExtractorArgs: str("YTDLP_EXTRACTOR_ARGS", ""),

  /** General API rate limit (per IP). */
  rateLimitMax: num("RATE_LIMIT_MAX", 120),
  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  /** Heavy endpoints (/info, /download) limit (per IP). */
  heavyRateLimitMax: num("HEAVY_RATE_LIMIT_MAX", 30),
  heavyRateLimitWindowMs: num("HEAVY_RATE_LIMIT_WINDOW_MS", 60_000),

  /**
   * Public hostname (e.g. "www.clipzap.net"). When set, page requests arriving
   * on any other host (the apex, the *.onrender.com URL) get a 301 to it, so
   * search engines only index one domain. Must match DEFAULT_SITE_URL in
   * artifacts/vidsnap/scripts/seo-head.mjs, or canonical tags point elsewhere.
   * Leave unset until DNS points at this server.
   */
  canonicalHost: str("CANONICAL_HOST", "").toLowerCase(),

  /** Optional override for the built SPA directory served by this server. */
  staticRoot: process.env.STATIC_ROOT,
} as const;
