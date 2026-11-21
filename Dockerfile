# HD Grab — single container serving the API and the built SPA.
# yt-dlp and ffmpeg come from Linux packages here; the Windows binaries in
# artifacts/api-server/bin are local-only (gitignored).

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.22.0
COPY . .
# yt-dlp-exec's postinstall would download its own yt-dlp; the runtime image
# installs yt-dlp itself, so skip that download.
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
RUN pnpm install --frozen-lockfile
# vidsnap's vite config requires PORT and BASE_PATH even for builds.
RUN PORT=8080 BASE_PATH=/ pnpm --filter @workspace/vidsnap run build \
 && pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    YTDLP_BIN=/opt/media/bin/yt-dlp \
    FFMPEG_BIN=/usr/bin/ffmpeg
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*
# curl_cffi backs YTDLP_IMPERSONATE=chrome; yt-dlp-ejs lets yt-dlp solve
# YouTube's JS challenges with the Node runtime already in this image.
RUN python3 -m venv /opt/media \
 && /opt/media/bin/pip install --no-cache-dir yt-dlp==2026.10.26 yt-dlp-ejs curl_cffi
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/vidsnap/dist/public ./artifacts/vidsnap/dist/public
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
