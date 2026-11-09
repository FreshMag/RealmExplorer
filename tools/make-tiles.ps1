# Cuts a large map image into the tile pyramid used by the site.
# Run it again whenever the map image changes:
#
#   powershell -ExecutionPolicy Bypass -File tools\make-tiles.ps1 -Source "Sword-Coast-Map_HighRes.jpg"
#
# Pins are stored as percentages, so they stay valid if the same map is
# re-exported at another resolution.

param(
    [Parameter(Mandatory = $true)][string]$Source,
    [string]$OutDir,
    [int]$TileSize = 512,
    [ValidateRange(1, 100)][int]$Quality = 80,
    # Fills the part of the edge tiles that lies outside the map.
    # Keep it equal to --bg in style.css so the padding is invisible.
    [string]$Background = '#1b1712'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not $OutDir) {
    $OutDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\tiles'
}

$sourcePath = (Resolve-Path $Source).Path
$null = New-Item -ItemType Directory -Force -Path $OutDir
$OutDir = (Resolve-Path $OutDir).Path

# Only numbered zoom folders are removed, never anything else in OutDir.
Get-ChildItem -Path $OutDir -Directory |
    Where-Object { $_.Name -match '^\d+$' } |
    Remove-Item -Recurse -Force

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$backgroundColor = [System.Drawing.ColorTranslator]::FromHtml($Background)
$rgb24 = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
$pixel = [System.Drawing.GraphicsUnit]::Pixel

$original = [System.Drawing.Image]::FromFile($sourcePath)
try {
    $width = $original.Width
    $height = $original.Height
    $maxZoom = [int][math]::Max(0, [math]::Ceiling([math]::Log([math]::Max($width, $height) / $TileSize, 2)))

    # Copies edge pixels outwards, otherwise bicubic scaling darkens the border.
    $wrap = New-Object System.Drawing.Imaging.ImageAttributes
    $wrap.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)

    $tile = New-Object System.Drawing.Bitmap($TileSize, $TileSize, $rgb24)
    $tileGraphics = [System.Drawing.Graphics]::FromImage($tile)
    $tileGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $tileGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $tileGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy

    $total = 0
    for ($zoom = $maxZoom; $zoom -ge 0; $zoom--) {
        $scale = [math]::Pow(2, $maxZoom - $zoom)
        $exactWidth = $width / $scale
        $exactHeight = $height / $scale
        $levelWidth = [int][math]::Ceiling($exactWidth)
        $levelHeight = [int][math]::Ceiling($exactHeight)

        $level = New-Object System.Drawing.Bitmap($levelWidth, $levelHeight, $rgb24)
        $levelGraphics = [System.Drawing.Graphics]::FromImage($level)
        $levelGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $levelGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $levelGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $levelGraphics.DrawImage(
            $original,
            (New-Object System.Drawing.Rectangle(0, 0, $levelWidth, $levelHeight)),
            [int]0, [int]0, [int]$width, [int]$height, $pixel, $wrap)
        $levelGraphics.Dispose()

        $zoomDir = Join-Path $OutDir $zoom
        $null = New-Item -ItemType Directory -Force -Path $zoomDir

        $columns = [int][math]::Ceiling($exactWidth / $TileSize)
        $rows = [int][math]::Ceiling($exactHeight / $TileSize)
        for ($x = 0; $x -lt $columns; $x++) {
            for ($y = 0; $y -lt $rows; $y++) {
                $left = $x * $TileSize
                $top = $y * $TileSize
                $w = [math]::Min($TileSize, $levelWidth - $left)
                $h = [math]::Min($TileSize, $levelHeight - $top)

                $tileGraphics.Clear($backgroundColor)
                $tileGraphics.DrawImage(
                    $level,
                    (New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
                    (New-Object System.Drawing.Rectangle($left, $top, $w, $h)),
                    $pixel)
                $tile.Save((Join-Path $zoomDir "${x}_${y}.jpg"), $jpegCodec, $encoderParams)
                $total++
            }
        }
        $level.Dispose()
        Write-Host ("zoom {0}: {1} x {2} tiles" -f $zoom, $columns, $rows)
    }

    $tileGraphics.Dispose()
    $tile.Dispose()

    $meta = '{{"width":{0},"height":{1},"tileSize":{2},"maxZoom":{3}}}' -f $width, $height, $TileSize, $maxZoom
    [System.IO.File]::WriteAllText((Join-Path $OutDir 'meta.json'), $meta, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "$total tiles written to $OutDir"
}
finally {
    $original.Dispose()
}
