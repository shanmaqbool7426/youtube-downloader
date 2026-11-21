FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=8080 MEDIA_TEMP_DIR=/tmp
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/media \
    && /opt/media/bin/pip install --no-cache-dir --no-deps yt-dlp==2026.10.26 yt-dlp-ejs==0.8.0
ENV PATH="/opt/media/bin:${PATH}"
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/vidsnap/dist/public ./artifacts/vidsnap/dist/public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/api/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
