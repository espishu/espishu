# Genera les icones de l'app a icons/ a partir de icons/icon.svg i icons/favicon.svg.
# Obre eines/icona.html amb Edge sense interfície, desa els PNG i munta favicon.ico (16, 32 i 48 px).
# L'apple-touch-icon es desa sense canal alfa (l'iPhone no vol transparència).
# Ús (PowerShell, des de la carpeta del projecte):  powershell -ExecutionPolicy Bypass -File eines\icones.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$arrel = Split-Path -Parent $PSScriptRoot
$icons = Join-Path $arrel 'icons'
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$perfil = Join-Path $env:TEMP 'espishu-icones-edge'
$pagina = 'file:///' + ((Join-Path $arrel 'eines\icona.html') -replace '\\', '/')

$dom = & $edge --headless --disable-gpu --allow-file-access-from-files "--user-data-dir=$perfil" `
  --virtual-time-budget=10000 --dump-dom $pagina | Out-String
$trobats = [regex]::Matches($dom, '<pre data-nom="([^"]+)">data:image/png;base64,([^<]+)</pre>')
if ($trobats.Count -eq 0) { throw "Edge no ha generat cap icona." }

$favicons = @{}
foreach ($m in $trobats) {
  $nom = $m.Groups[1].Value
  $bytes = [Convert]::FromBase64String($m.Groups[2].Value)
  if ($nom -like 'favicon-*') {
    $favicons[[int]($nom -replace '\D', '')] = $bytes
  } elseif ($nom -eq 'apple-touch-icon.png') {
    # Sense canal alfa: es torna a dibuixar en un mapa de bits de 24 bits.
    $origen = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(, $bytes)))
    $opac = New-Object System.Drawing.Bitmap($origen.Width, $origen.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($opac)
    $g.DrawImage($origen, 0, 0, $origen.Width, $origen.Height)
    $g.Dispose()
    $opac.Save((Join-Path $icons $nom), [System.Drawing.Imaging.ImageFormat]::Png)
    $opac.Dispose(); $origen.Dispose()
  } else {
    [IO.File]::WriteAllBytes((Join-Path $icons $nom), $bytes)
  }
  Write-Host "  $nom"
}

# favicon.ico: capçalera, una entrada per mida i els PNG a continuació.
$mides = $favicons.Keys | Sort-Object
$ico = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter($ico)
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$mides.Count)
$posicio = 6 + 16 * $mides.Count
foreach ($mida in $mides) {
  $w.Write([byte]$mida); $w.Write([byte]$mida); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32)
  $w.Write([UInt32]$favicons[$mida].Length); $w.Write([UInt32]$posicio)
  $posicio += $favicons[$mida].Length
}
foreach ($mida in $mides) { $w.Write($favicons[$mida]) }
$w.Flush()
[IO.File]::WriteAllBytes((Join-Path $icons 'favicon.ico'), $ico.ToArray())
Write-Host "  favicon.ico ($($mides -join ', ') px)"
