# Start the HD Grab (youtube-downloader) API server in production mode.
# The server also serves the built SPA from artifacts/vidsnap/dist/public.
Set-Location C:\projects\youtube-downloader\artifacts\api-server
$env:PORT = '5050'
$env:NODE_ENV = 'production'
node ./dist/index.mjs
