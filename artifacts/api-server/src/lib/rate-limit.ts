import type { Request as ExpressRequest, RequestHandler } from "express";

/**
 * Minimal dependency-free fixed-window rate limiter (per IP).
 * Good enough for a single-instance deployment; swap for Redis if we scale out.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  /** Short id used in log lines / headers. */
  name: string;
}): RequestHandler {
  const { windowMs, max, name } = options;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodic sweep so idle IPs don't accumulate forever.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, Math.max(windowMs, 60_000));
  sweeper.unref?.();

  return (req, res, next) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      type LoggedRequest = ExpressRequest & {
        log?: { warn: (obj: object, msg: string) => void };
      };
      (req as unknown as LoggedRequest).log?.warn?.({ limiter: name, ip }, "Rate limit exceeded");
      res.status(429).json({
        error: `Too many requests. Please wait ${retryAfter}s and try again.`,
      });
      return;
    }

    next();
  };
}
