# Regenerates public/favicon.ico from public/favicon-48.png.
# Browsers and crawlers still probe /favicon.ico directly, so the file has to
# exist even though the page declares SVG/PNG icons. The ICO wraps the existing
# PNG verbatim (no re-encoding), which keeps the alpha channel identical.
#   pwsh -File scripts/make-favicon.ps1
$ErrorActionPreference = 'Stop'
$public = Join-Path (Split-Path $PSScriptRoot -Parent) 'public'
$png = [System.IO.File]::ReadAllBytes((Join-Path $public 'favicon-48.png'))

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([uint16]0)              # reserved
$writer.Write([uint16]1)              # type: icon
$writer.Write([uint16]1)              # image count
$writer.Write([byte]48)               # width
$writer.Write([byte]48)               # height
$writer.Write([byte]0)                # palette size (0 = truecolour)
$writer.Write([byte]0)                # reserved
$writer.Write([uint16]1)              # colour planes
$writer.Write([uint16]32)             # bits per pixel
$writer.Write([uint32]$png.Length)    # payload size
$writer.Write([uint32]22)             # payload offset = 6 + 16
$writer.Write($png)
$writer.Flush()

$target = Join-Path $public 'favicon.ico'
[System.IO.File]::WriteAllBytes($target, $stream.ToArray())
$writer.Dispose()
"wrote $target ($((Get-Item $target).Length) bytes)"
