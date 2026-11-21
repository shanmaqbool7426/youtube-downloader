import type { RequestHandler } from "express";
import { env } from "./env";

/**
 * Security headers without pulling in helmet (keeps the dependency surface
 * tiny; every header below is set explicitly for an API + static SPA origin).
 */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // HSTS only makes sense once we're actually behind TLS (Replit terminates it).
  if (env.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};
