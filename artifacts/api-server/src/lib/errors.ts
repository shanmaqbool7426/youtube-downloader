/**
 * One place that turns a yt-dlp failure into something a person can act on.
 *
 * Before this existed, every failure (bad link, deleted video, provider stall,
 * timeout, busy queue) returned the same 500 "Failed to fetch video info",
 * which tells the user nothing and hides the real provider state. Each case
 * below now carries its own status code, a stable `code` the UI switches on,
 * and whether retrying is worth offering.
 */
import { QueueTimeoutError } from "./concurrency";

export type ApiErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_URL"
  | "VIDEO_UNAVAILABLE"
  | "SIGN_IN_REQUIRED"
  | "PROVIDER_BLOCKED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "QUEUE_BUSY"
  | "NO_FORMATS"
  | "PROVIDER_ERROR";

export interface LookupFailure {
  code: ApiErrorCode;
  status: number;
  /** True when trying the same link again could plausibly work. */
  retryable: boolean;
  /** Shown to the user verbatim. Says what happened AND what to do next. */
  message: string;
}

const FAILURES: Record<ApiErrorCode, Omit<LookupFailure, "code">> = {
  INVALID_URL: {
    status: 400,
    retryable: false,
    message:
      "That doesn't look like a link. Paste the full YouTube address, for example https://www.youtube.com/watch?v=…",
  },
  UNSUPPORTED_URL: {
    status: 422,
    retryable: false,
    message:
      "This link doesn't point to a single video. Open the video on YouTube and copy the address bar link, or use the Share button.",
  },
  VIDEO_UNAVAILABLE: {
    status: 404,
    retryable: false,
    message:
      "YouTube says this video is unavailable — it may have been deleted, made private, or blocked where our server runs.",
  },
  SIGN_IN_REQUIRED: {
    status: 403,
    retryable: false,
    message:
      "This video needs a signed-in YouTube account (private, members-only, or age-restricted), so ClipZap can't read it.",
  },
  PROVIDER_BLOCKED: {
    status: 503,
    retryable: true,
    message:
      "YouTube is refusing requests from our server right now. That's on our side, not your link — please try again in a few minutes.",
  },
  TIMEOUT: {
    status: 504,
    retryable: true,
    message:
      "YouTube didn't respond in time. Try again, and if it keeps happening the video may be unusually long or heavily throttled.",
  },
  RATE_LIMITED: {
    status: 429,
    retryable: true,
    message: "Too many requests from your network. Wait about a minute, then try again.",
  },
  QUEUE_BUSY: {
    status: 503,
    retryable: true,
    message: "We're preparing a lot of videos right now. Please try again in a few seconds.",
  },
  NO_FORMATS: {
    status: 422,
    retryable: false,
    message:
      "We reached the video but found no downloadable formats. It may be a live stream, a premiere, or a format YouTube doesn't serve to servers.",
  },
  PROVIDER_ERROR: {
    status: 502,
    retryable: true,
    message: "Something went wrong while reading the video. Please try again in a moment.",
  },
};

export function failure(code: ApiErrorCode): LookupFailure {
  return { code, ...FAILURES[code] };
}

/** Ordered rules: the first match wins, so put specific messages before broad ones. */
const RULES: Array<{ code: ApiErrorCode; test: RegExp }> = [
  // yt-dlp's own validation of the string we handed it.
  { code: "INVALID_URL", test: /is not a valid URL|URL must be a|Invalid URL/i },
  // Single-video links that resolve to a channel/playlist/search page.
  { code: "UNSUPPORTED_URL", test: /is not a valid URL|Unsupported URL|no suitable extractor/i },
  // Account-gated content. yt-dlp words these several ways.
  {
    code: "SIGN_IN_REQUIRED",
    test: /Private video|This video is private|members-only|Join this channel|Sign in to confirm your age|age-restricted|Inappropriate for some users|requires payment|is only available to/i,
  },
  // A cookie jar yt-dlp cannot read: the operator needs to re-export it.
  { code: "PROVIDER_BLOCKED", test: /does not look like a Netscape format|skipping cookie file entry/i },
  // YouTube refusing our server's IP / TLS fingerprint.
  {
    code: "PROVIDER_BLOCKED",
    test: /confirm you'?re not a bot|Sign in to confirm|HTTP Error 403|Too Many Requests|HTTP Error 429|Your IP address is blocked|not available in your country/i,
  },
  // Deleted / removed / nonexistent.
  {
    code: "VIDEO_UNAVAILABLE",
    test: /This video is unavailable|Video unavailable|has been removed|does not exist|This video has been|content isn't available|is not available anymore|No video could be found|Incomplete YouTube ID/i,
  },
  // Generic host 404s (a URL that yt-dlp reached but could not parse as media).
  { code: "UNSUPPORTED_URL", test: /HTTP Error 404|Unable to download webpage/i },
  // Network stalls: what a throttled socket surfaces as.
  {
    code: "TIMEOUT",
    test: /timed out|timeout|Read timed out|Connection reset by peer|Temporary failure in name resolution|Network is unreachable/i,
  },
];

/**
 * Classify a thrown error from `fetchRawInfo`.
 *
 * yt-dlp-exec (execa) puts the tool's own message in `stderr` and leaves
 * `shortMessage` as the command line, so stderr is what actually says why.
 */
export function classifyLookupError(err: unknown): LookupFailure {
  if (err instanceof QueueTimeoutError) return failure("QUEUE_BUSY");

  const e = err as {
    stderr?: string;
    stdout?: string;
    message?: string;
    timedOut?: boolean;
    killed?: boolean;
    code?: string;
    exitCode?: number;
  } | null;

  if (e?.timedOut) return failure("TIMEOUT");

  // yt-dlp-exec (execa) puts the tool's own message in `stderr` and leaves
  // `message` as the command line. Only fall back to `message` when stderr is
  // empty: it embeds every flag, so `--socket-timeout 30` alone would classify
  // an unrelated failure as a timeout.
  const stderr = e?.stderr?.trim() ?? "";
  const text = stderr
    ? [stderr, e?.stdout].filter(Boolean).join("\n")
    : [e?.stdout, e?.message].filter(Boolean).join("\n");
  if (!text) return failure("PROVIDER_ERROR");

  for (const rule of RULES) {
    if (rule.test.test(text)) return failure(rule.code);
  }

  // A killed child with no usable stderr is most often our own socket timeout.
  if (e?.killed || e?.code === "ETIMEDOUT") return failure("TIMEOUT");

  return failure("PROVIDER_ERROR");
}
