# Script de PowerShell para ejecutar el backend Go
# Uso: .\run.ps1

Write-Host "=== Zoho Bigin Backend - Go ===" -ForegroundColor Green
Write-Host ""

# Verificar si existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "📋 Copiando .env.example a .env..." -ForegroundColor Cyan
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Archivo .env creado desde .env.example" -ForegroundColor Green
        Write-Host "📝 Por favor, edita el archivo .env con tus credenciales de Zoho" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Presiona cualquier tecla para continuar (el servidor se iniciará pero necesitarás configurar las credenciales)..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "❌ No se encontró .env.example" -ForegroundColor Red
        exit 1
    }
}

# Verificar si Go está instalado
try {
    $goVersion = go version
    Write-Host "✅ Go detectado: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "📥 Descarga Go desde: https://golang.org/dl/" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "🔧 Instalando dependencias..." -ForegroundColor Cyan
go mod download

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
Write-Host "📡 El servidor estará disponible en: http://localhost:8000" -ForegroundColor Yellow
Write-Host "🛑 Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Ejecutar el servidor
go run .