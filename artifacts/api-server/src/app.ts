import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import express, { type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app = express();
const production = process.env.NODE_ENV === "production";
const webRoot = process.env.WEB_ROOT || fileURLToPath(new URL("../../vidsnap/dist/public", import.meta.url));
const index = join(webRoot, "index.html");

app.disable("x-powered-by");
// Enable only when the app port is reachable exclusively through a trusted proxy.
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(pinoHttp({
  logger,
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
}));

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": req.path.startsWith("/api/") ? "noindex" : "all",
  });
  if (production) {
    res.set("Content-Security-Policy", "default-src 'self'; img-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});

app.use("/api", express.json({ limit: "8kb", inflate: false }), router);
app.use("/api", (_req, res) => res.status(404).json({ error: "Endpoint not found." }));

if (existsSync(index)) {
  app.use("/assets", express.static(join(webRoot, "assets"), { maxAge: "1y", immutable: true }));
  app.use(express.static(webRoot, { index: false }));
  app.get("/", (_req, res) => res.sendFile(index));
}

const handleError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = error.status === 400 || error.status === 413 || error.status === 415 ? error.status : 500;
  if (status === 500) req.log.error("Unhandled request failure");
  res.status(status).json({
    error: status === 400 ? "Invalid JSON request." : status === 413 ? "Request is too large." : status === 415 ? "Unsupported request encoding." : "Something went wrong.",
  });
};
app.use(handleError);

export default app;
