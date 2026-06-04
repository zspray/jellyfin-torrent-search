# =============================================
# Build do Plugin Jellyfin Torrent Search PT-BR
# =============================================
# Pré-requisito: .NET 8 SDK instalado
#   winget install Microsoft.DotNet.SDK.8
# =============================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Jellyfin Torrent Search PT-BR - Build  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se o .NET SDK está instalado
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
    Write-Host "[ERRO] .NET 8 SDK nao encontrado!" -ForegroundColor Red
    Write-Host "Instale com: winget install Microsoft.DotNet.SDK.8" -ForegroundColor Yellow
    exit 1
}

$sdkVersion = dotnet --version
Write-Host "[INFO] .NET SDK: $sdkVersion" -ForegroundColor Green

# Build
Write-Host "[BUILD] Compilando plugin..." -ForegroundColor Yellow

Push-Location "$PSScriptRoot\JellyfinTorrentSearch"

dotnet restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no restore!" -ForegroundColor Red
    Pop-Location
    exit 1
}

dotnet build -c Release --no-restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no build!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Copia a DLL para a pasta de saída
$outputDir = "$PSScriptRoot\dist"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$buildOutput = "$PSScriptRoot\JellyfinTorrentSearch\bin\Release\net8.0"
$dlls = @(
    "JellyfinTorrentSearch.dll",
    "HtmlAgilityPack.dll"
)

foreach ($dll in $dlls) {
    $source = Join-Path $buildOutput $dll
    if (Test-Path $source) {
        Copy-Item $source $outputDir -Force
        Write-Host "[OK] Copiado: $dll" -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Nao encontrado: $dll" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETO!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos em: $outputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para instalar no Jellyfin:" -ForegroundColor Yellow
Write-Host "  1. Copie TODOS os .dll da pasta 'dist' para:" -ForegroundColor White
Write-Host "     Windows: C:\ProgramData\Jellyfin\Server\plugins\TorrentSearch\" -ForegroundColor White
Write-Host "     Linux:   /var/lib/jellyfin/plugins/TorrentSearch/" -ForegroundColor White
Write-Host "     Docker:  /config/plugins/TorrentSearch/" -ForegroundColor White
Write-Host "  2. Reinicie o Jellyfin" -ForegroundColor White
Write-Host "  3. Va em Painel > Plugins > Torrent Search PT-BR" -ForegroundColor White
Write-Host ""
