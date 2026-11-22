# ClipZap — YouTube Video Downloader

Browser-based YouTube downloader: paste a video URL, preview every available
format with real file sizes, and download 1080p Full HD (video+audio merged),
720p, 4K, video-only streams, best audio, or MP3 at 320/128 kbps.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build + start the API server (needs `PORT`)
- `pnpm --filter @workspace/vidsnap run dev` — Vite dev server for the SPA (needs `PORT`, `BASE_PATH`; proxies `/api` to `API_PROXY_TARGET`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

### Production (single process serves API + SPA)

```
pnpm run build
PORT=5000 NODE_ENV=production node artifacts/api-server/dist/index.mjs
```

The API server statically serves `artifacts/vidsnap/dist/public` on the same
origin (no CORS needed); `STATIC_ROOT` can point elsewhere if the SPA is
deployed separately.

### Environment variables (api-server)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | — (required) | Listen port |
| `NODE_ENV` | `development` | `production` tightens CORS to same-origin and enables HSTS |
| `YTDLP_BIN` / `FFMPEG_BIN` | bundled `bin/` | Override binary locations |
| `YTDLP_IMPERSONATE` | `chrome` | TLS fingerprint for yt-dlp metadata/API requests (bundled curl_cffi). YouTube throttles the default Python TLS fingerprint to a byte-trickle that looks like a hang — keep this enabled. Set to empty to disable. |
| `YTDLP_JS_RUNTIME` | `node` | JS runtime yt-dlp uses to solve YouTube challenges (n-signature → unthrottled media URLs). Falls back gracefully if Node is not on PATH. Set to empty to disable. |
| `YTDLP_MAX_CONCURRENT` | `4` | Max simultaneous yt-dlp processes |
| `YTDLP_QUEUE_TIMEOUT_MS` | `30000` | Queue wait before 503 |
| `INFO_TIMEOUT_MS` | `45000` | Metadata fetch timeout |
| `DOWNLOAD_STALL_TIMEOUT_MS` | `60000` | Kill downloads with no data |
| `DOWNLOAD_MAX_DURATION_MS` | `900000` | Hard cap for merged/MP3 pipelines |
| `INFO_CACHE_TTL_MS` | `1800000` | Video-info cache lifetime |
| `INFO_CACHE_MAX_ENTRIES` | `500` | Cache size cap (LRU-ish) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `120` / `60000` | General per-IP API limit |
| `HEAVY_RATE_LIMIT_MAX` / `HEAVY_RATE_LIMIT_WINDOW_MS` | `30` / `60000` | `/api/info` + `/api/download` per-IP limit |
| `STATIC_ROOT` | bundled SPA path | Directory of the built SPA |
| `LOG_LEVEL` | `info` | Pino log level |
| `DATABASE_URL` | — (unused by server) | Kept for future persistence; not required at boot |
| `CANONICAL_HOST` | — (off) | e.g. `www.clipzap.net`: 301 page requests on other hosts (apex, onrender.com) to it |

### SEO / domain

The production domain is **https://www.clipzap.net** (`DEFAULT_SITE_URL` in
`artifacts/vidsnap/scripts/seo-head.mjs`; override with `SITE_URL` at build
time). www is canonical because the edge 301s the apex to it — pointing
`DEFAULT_SITE_URL` at the apex would make every canonical/OG/sitemap URL point
at a redirect. The build prerenders every page in `src/site.ts` and generates
canonical/OG tags, JSON-LD, `robots.txt` and `sitemap.xml` from that URL; there
are no hand-maintained copies to keep in sync. Sitemap `<lastmod>` comes from
the per-page `lastmod` field in `src/site.ts` — bump it when you edit a page,
never derive it from the build time.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + yt-dlp (bundled binaries in `artifacts/api-server/bin`) + ffmpeg muxing
- SPA: React 19 + Vite 7, hand-rolled CSS design system (`src/index.css`)
- Validation: Zod (`zod/v4`), API codegen: Orval (from OpenAPI spec)
- Build: esbuild (server), Vite (SPA)

## Architecture decisions

- **Downloads stream through the server.** Plain formats pipe yt-dlp stdout
  straight into the HTTP response; "Video + Audio" rows download the two streams
  **in parallel** and copy-mux them with ffmpeg (`-c copy`, no re-encode), which
  is roughly 2× faster than yt-dlp's sequential merge.
- **A FIFO semaphore bounds yt-dlp processes** (`YTDLP_MAX_CONCURRENT`) with a
  queue timeout → 503, so download bursts cannot exhaust CPU/RAM.
- **The info cache stores raw formats too**, so merged-row download planning
  never re-runs yt-dlp for metadata.
- **Speed flags are centralized** (`concurrentFragments: 8`, retries, socket
  timeout, 10M http chunks) in `src/lib/yt-dlp.ts` for every invocation.
- **Rate limiting is dependency-free** (fixed-window per IP) and applied in two
  tiers: general API and heavy endpoints.

## Gotchas

- Windows PowerShell: `pnpm --filter @workspace/api-server run dev` uses `export`,
  which fails — set `$env:PORT=5000` and run `node dist/index.mjs` directly.
- `yt-dlp-exec` types are incomplete; extra flags are cast at call sites (they
  pass through `dargs` correctly at runtime).
- yt-dlp format ids like `video+audio:1080` and `mp3:320` are synthetic ids
  handled only by `GET /api/download`.
- If extractions start hanging at "Downloading webpage" (or `/api/info` times out
  while nothing changed in the code), it is almost always YouTube throttling the
  default Python TLS fingerprint — verify `YTDLP_IMPERSONATE=chrome` is active
  (bundled yt-dlp has curl_cffi) and consider refreshing the bundled yt-dlp
  binary (`bin\yt-dlp.exe -U`), since YouTube extraction breaks every few weeks.
  Do NOT "fix" it with a custom user agent like googlebot — that makes some
  player endpoints hang forever (verified by CLI A/B tests).

## Pointers

- API contract: `lib/api-spec/openapi.yaml`
- Server entry: `artifacts/api-server/src/index.ts`, routes in `src/routes/video.ts`
- yt-dlp invocation + flags: `artifacts/api-server/src/lib/yt-dlp.ts`
- Tunables: `artifacts/api-server/src/lib/env.ts`
