# ============================================================================
#  Instala las dos fuentes de marca de MAG Industries en este ordenador.
#
#  PARA QUE SIRVE
#  Los documentos que genera la app estan escritos en dos tipografias:
#  "Saira Stencil One" (los titulares) y "Barlow" (el resto). Si el ordenador
#  que ABRE el .docx no las tiene instaladas, Word las sustituye por su cuenta
#  y el documento se ve con letras mezcladas y descuadrado.
#
#  CUANDO HAY QUE EJECUTARLO
#  Una sola vez por ordenador. Si cambias de equipo, o reinstalas Windows,
#  vuelve a ejecutarlo.
#
#  COMO SE EJECUTA
#  Abre PowerShell en la carpeta del proyecto y pega esta linea:
#
#      powershell -ExecutionPolicy Bypass -File scripts/instalar_fuentes.ps1
#
#  NO hace falta ser administrador: las fuentes se instalan solo para tu
#  usuario, no para todo el sistema.
#
#  IMPORTANTE PARA MANDAR DOCUMENTOS AL CLIENTE
#  Tu cliente no va a tener estas fuentes. Mandale siempre el PDF, no el
#  .docx: al exportar a PDF desde tu Word, las fuentes quedan incrustadas
#  dentro del archivo y el documento se ve igual en cualquier ordenador.
#  En Word: Archivo > Guardar como > y elige "PDF" en el desplegable.
#
#  Las fuentes son gratuitas y de codigo abierto (licencia OFL). Los archivos
#  estan en assets/fonts/ junto con su licencia.
# ============================================================================

$ErrorActionPreference = "Stop"

# La carpeta del proyecto es la de arriba de scripts/
$root  = Split-Path -Parent $PSScriptRoot
$src   = Join-Path $root "assets\fonts"
$dest  = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\Fonts"
$reg   = "HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"

if (-not (Test-Path $src)) {
  Write-Host "ERROR: no encuentro la carpeta assets\fonts del proyecto." -ForegroundColor Red
  Write-Host "Comprueba que estas ejecutando el script desde la carpeta del proyecto."
  exit 1
}
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
if (-not (Test-Path $reg))  { New-Item -Path $reg -Force | Out-Null }

# AddFontResourceW hace que la fuente este disponible ya, sin reiniciar.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class MagFont {
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)]
  public static extern int AddFontResourceW(string f);
}
'@ -ErrorAction SilentlyContinue

# Nombre de archivo -> nombre con el que Word vera la fuente.
$map = [ordered]@{
  "Barlow-Regular.ttf"          = "Barlow Regular"
  "Barlow-Italic.ttf"           = "Barlow Italic"
  "Barlow-Medium.ttf"           = "Barlow Medium"
  "Barlow-MediumItalic.ttf"     = "Barlow Medium Italic"
  "Barlow-SemiBold.ttf"         = "Barlow SemiBold"
  "Barlow-SemiBoldItalic.ttf"   = "Barlow SemiBold Italic"
  "Barlow-Bold.ttf"             = "Barlow Bold"
  "Barlow-BoldItalic.ttf"       = "Barlow Bold Italic"
  "SairaStencilOne-Regular.ttf" = "Saira Stencil One Regular"
}

Write-Host ""
Write-Host "Instalando las fuentes de marca de MAG Industries..." -ForegroundColor Cyan
Write-Host ""

$ok = 0
foreach ($file in $map.Keys) {
  $from = Join-Path $src $file
  if (-not (Test-Path $from)) { Write-Host ("  falta el archivo " + $file) -ForegroundColor Yellow; continue }
  $to = Join-Path $dest $file
  $nota = "instalada"
  # Si la fuente ya estaba instalada, Windows tiene el .ttf abierto y no deja
  # sobrescribirlo. No es un error: solo significa que ya estaba puesta. Se
  # copia unicamente si falta o si el archivo ha cambiado de tamano.
  $hayQueCopiar = $true
  if (Test-Path $to) {
    if ((Get-Item $to).Length -eq (Get-Item $from).Length) { $hayQueCopiar = $false; $nota = "ya estaba" }
  }
  if ($hayQueCopiar) {
    try { Copy-Item -Path $from -Destination $to -Force }
    catch { $nota = "ya estaba (en uso)" }
  }
  $null = [MagFont]::AddFontResourceW($to)
  New-ItemProperty -Path $reg -Name ($map[$file] + " (TrueType)") -Value $to -PropertyType String -Force | Out-Null
  Write-Host ("  " + $nota + ": " + $map[$file]) -ForegroundColor Green
  $ok++
}

# Comprobacion final: preguntamos a Windows que familias ve de verdad.
Add-Type -AssemblyName System.Drawing
$fams = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }
Write-Host ""
$todoBien = $true
foreach ($n in @("Barlow", "Saira Stencil One")) {
  if ($fams -contains $n) {
    Write-Host ("  OK  -> " + $n + " disponible en Word") -ForegroundColor Green
  } else {
    Write-Host ("  NO  -> " + $n + " NO aparece. Cierra Word del todo y vuelve a ejecutar esto.") -ForegroundColor Red
    $todoBien = $false
  }
}

Write-Host ""
if ($todoBien) {
  Write-Host "Listo: $ok archivos instalados. Si tenias Word abierto, cierralo y vuelvelo a abrir." -ForegroundColor Cyan
} else {
  Write-Host "Algo no ha quedado bien. Cierra Word y vuelve a ejecutar el script." -ForegroundColor Yellow
}
Write-Host ""
