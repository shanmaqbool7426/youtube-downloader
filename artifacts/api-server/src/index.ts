import { execFileSync } from "node:child_process";
import app from "./app";
import { logger } from "./lib/logger";
import { ytDlpBin } from "./lib/media";
import { cleanupMediaStorage, initializeMediaStorage } from "./routes/video";

const port = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a port number between 1 and 65535.");
}

for (const [binary, flag] of [[ytDlpBin, "--version"], ["ffmpeg", "-version"], ["ffprobe", "-version"]]) {
  try {
    execFileSync(binary, [flag], { stdio: "ignore", timeout: 5000 });
  } catch {
    throw new Error("Cannot start VidSnap. Check that " + binary + " is installed and runs.");
  }
}

await initializeMediaStorage();
const server = app.listen(port, (error) => {
  if (error) {
    logger.error({ error }, "Could not start VidSnap");
    void cleanupMediaStorage().finally(() => process.exit(1));
  } else {
    logger.info({ port }, "VidSnap is listening");
  }
});

function shutdown() {
  const deadline = setTimeout(() => server.closeAllConnections(), 5000);
  deadline.unref();
  server.close(() => {
    clearTimeout(deadline);
    void cleanupMediaStorage().catch(() => {
      logger.error("Could not remove temporary media storage");
      process.exitCode = 1;
    });
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
