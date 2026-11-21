import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rate-limit";
import { securityHeaders } from "./lib/security";

const app: Express = express();

// Replit (and most PaaS providers) terminate TLS in front of us; without this
// req.ip would be the proxy IP and per-client rate limiting would misfire.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
// Same-origin in production (SPA served below); open in dev for local tooling.
if (!env.isProduction) {
  app.use(cors());
}
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// General per-IP limit for the whole API surface...
app.use("/api", rateLimit({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax, name: "api" }));
// ...and a tighter one for the expensive yt-dlp endpoints.
app.use(
  ["/api/info", "/api/download"],
  rateLimit({
    windowMs: env.heavyRateLimitWindowMs,
    max: env.heavyRateLimitMax,
    name: "heavy",
  }),
);

app.use("/api", router);

// JSON 404 for unknown API routes (never the SPA fallback).
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built SPA (same origin → no CORS, no base-URL wiring needed).
// STATIC_ROOT overrides the default ../../vidsnap/dist/public location.
const staticRoot = env.staticRoot
  ? path.resolve(env.staticRoot)
  : path.resolve(import.meta.dirname, "..", "..", "vidsnap", "dist", "public");

if (existsSync(staticRoot)) {
  app.use(
    express.static(staticRoot, {
      index: "index.html",
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          // Hashed filenames → safe to cache "forever".
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }),
  );

  // SPA fallback for any other GET (deep links), but never for /api.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(staticRoot, "index.html"));
  });

  logger.info({ staticRoot }, "Serving built SPA");
} else {
  logger.warn(
    { expectedPath: staticRoot },
    "SPA build directory not found — serving API only. Build the vidsnap package to enable the web UI.",
  );
}

// Central error handler: log once, return JSON, never leak stack traces.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, "Unhandled request error");
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default app;
