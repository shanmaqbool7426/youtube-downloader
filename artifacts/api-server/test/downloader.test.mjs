import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("VidSnap serves compatible media attachments with bounded preparation", { timeout: 25_000 }, async (context) => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const origin = "http://127.0.0.1:" + port;
  const temp = await mkdtemp(join(tmpdir(), "vidsnap-tests-"));
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/index.mjs", import.meta.url))], {
    env: {
      ...process.env, PORT: String(port), NODE_ENV: "production", MEDIA_TEMP_DIR: temp, TRUST_PROXY: "",
      YTDLP_BIN: fileURLToPath(new URL("./media-fixture.mjs", import.meta.url)),
    },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const stopped = once(child, "exit");
  context.after(async () => {
    child.kill("SIGTERM");
    await stopped;
    assert.deepEqual(await readdir(temp), []);
    await rm(temp, { recursive: true, force: true });
  });
  const hasStarted = Promise.race([
    once(child.stdout, "data"),
    stopped.then(([code]) => { throw new Error("The API exited early: " + code); }),
  ]);
  await hasStarted;
  child.stdout.resume();

  const url = "https://youtu.be/test1234567?list=ignored";
  const post = (path, data, options = {}) => fetch(origin + path, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  assert.equal((await fetch(origin + "/")).status, 200);
  assert.deepEqual(await (await fetch(origin + "/api/healthz")).json(), { status: "ok" });
  const invalid = await post("/api/info", { url: "https://not-a-video.example/" });
  assert.equal(invalid.status, 400);
  const fromAnotherSite = await post("/api/info", { url }, { headers: { "Sec-Fetch-Site": "cross-site" } });
  assert.equal(fromAnotherSite.status, 403);
  assert.equal((await post("/api/info", { url: "https://youtu.be/missing1234" })).status, 502);
  const info = await post("/api/info", { url });
  assert.equal(info.status, 200);
  assert.deepEqual((await info.json()).formats.map(({ quality }) => quality), ["720p", "360p", "mp3"]);
  assert.equal((await post("/api/download", { url, format: "1080p" })).status, 422);
  assert.equal((await post("/api/download", { url, format: "arbitrary" })).status, 400);

  for (const [format, extension, codecs] of [
    ["720p", "mp4", ["h264", "aac"]],
    ["mp3", "mp3", ["mp3"]],
  ]) {
    const response = await post("/api/download", { url, format });
    assert.equal(response.status, 200);
    const { downloadUrl, filename } = await response.json();
    assert.equal(filename, "VidSnap test clip." + extension);
    assert.match(downloadUrl, /^\/api\/file\?token=[\w-]+$/);
    const media = await fetch(origin + downloadUrl);
    assert.equal(media.status, 200);
    assert.match(media.headers.get("content-disposition"), /^attachment/);
    assert.equal(media.headers.get("cache-control"), "no-store");
    const path = join(tmpdir(), "vidsnap-ffprobe-" + child.pid + "." + extension);
    try {
      await writeFile(path, Buffer.from(await media.arrayBuffer()));
      const result = execFileSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json", path]);
      assert.deepEqual(JSON.parse(result).streams.map((stream) => stream.codec_name), codecs);
    } finally {
      await rm(path, { force: true });
    }
    const range = await fetch(origin + downloadUrl, { headers: { Range: "bytes=0-15" } });
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 16);
  }
  assert.equal((await fetch(origin + "/api/file?token=unknown")).status, 404);

  const controller = new AbortController();
  const stalled = post("/api/download", { url: "https://youtu.be/slow1234567", format: "720p" }, { signal: controller.signal });
  const abortion = assert.rejects(stalled, { name: "AbortError" });
  const [root] = await readdir(temp);
  for (let attempt = 0; attempt < 100 && (await readdir(join(temp, root))).length < 3; attempt++) await delay(20);
  assert.equal((await readdir(join(temp, root))).length, 3);
  assert.equal((await post("/api/download", { url, format: "720p" })).status, 429);
  controller.abort();
  await abortion;
  for (let attempt = 0; attempt < 100 && (await readdir(join(temp, root))).length > 2; attempt++) await delay(20);
  assert.equal((await readdir(join(temp, root))).length, 2);
});
