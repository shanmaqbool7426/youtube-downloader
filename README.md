# VidSnap

VidSnap previews public video links and prepares MP4 video or MP3 audio files. The app uses React, Express, yt-dlp, and FFmpeg. It serves the interface, API, and downloads from one origin and requires no database or account.

## Run with Docker

```sh
docker build -t vidsnap .
docker run --rm --init --name vidsnap --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=2g,mode=1777 \
  -p 127.0.0.1:8080:8080 vidsnap
```

Open [http://localhost:8080](http://localhost:8080). Paste a link, choose an available format, prepare it, and save the file through your browser.

## Develop locally

Install Node.js 24, pnpm 11.25.0, FFmpeg and ffprobe, and yt-dlp with the EJS package. The Dockerfile lists the tested extractor version. For example, install it in a Python virtual environment using `python -m pip install 'yt-dlp[default]==2026.10.26'`, then add its binary directory to your PATH or set `YTDLP_BIN` to the executable's absolute path.

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm start
```

Open [http://localhost:5000](http://localhost:5000). For frontend hot reload, keep the API running and run `pnpm --filter @workspace/vidsnap dev` in a second terminal to open [http://localhost:5173](http://localhost:5173). Local Windows development can use WSL or Docker.

## Deploy and operate

- Run one instance of the container behind HTTPS and use `GET /api/healthz` for health checks. Configure the upstream proxy to allow at least 220 seconds for a download preparation request.
- Keep the app port private when using a proxy. Set `TRUST_PROXY=1` only with exactly one trusted reverse proxy that overwrites incoming forwarded headers. Restrict outbound connections to public destinations at the deployment network layer. Block access to internal networks and cloud metadata services.
- Allocate at least 2 GB to temporary media storage. The container uses `/tmp` by default. For native deployments, use a dedicated, size-limited volume via `MEDIA_TEMP_DIR`. The service prepares two files at a time, one per IP. Prepared files stay on the instance for up to ten minutes and older unused files may be removed sooner under load. A restart invalidates save links. Use one replica unless storage and job coordination are moved to shared services.
- Public, recorded individual videos are limited to 30 minutes and 128 MB. Source sites can restrict links by IP, region, login, or availability. After deployment, test a public video you own or have permission to download from each platform you intend to support. Keep yt-dlp and its EJS package updated together and repeat those checks after every update.
- Configuration is optional. `PORT` sets the listener, `YTDLP_BIN` overrides the extractor executable, `MEDIA_TEMP_DIR` selects the scratch volume, and `LOG_LEVEL` controls logging. `WEB_PORT`, `WEB_HOST`, and `API_TARGET` configure the Vite development server.

## Earlier checkouts

The previous tree contained obfuscated startup scripts, an automatic editor task, and a database configuration that fetched and evaluated remote JavaScript. The old `AUTH_API_KEY` value decoded to the URL used by that loader. Treat machines and CI jobs that executed those paths as potentially exposed. Review their activity and rotate credentials that were available to them before deploying from a clean checkout.
