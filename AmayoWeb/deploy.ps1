# Script de deploy para AmayoWeb (Windows PowerShell)
# Uso: .\deploy.ps1 -Server "user@tu-vps.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Server,
    
    [string]$RemotePath = "/var/www/docs.amayo.dev",
    [string]$BuildDir = "dist"
)

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Blue "🚀 Iniciando deploy de AmayoWeb..."

# 1. Build del proyecto
Write-ColorOutput Blue "📦 Construyendo el proyecto..."
npm run build

if (-not (Test-Path $BuildDir)) {
    Write-ColorOutput Red "❌ Error: No se encontró la carpeta dist"
    exit 1
}

Write-ColorOutput Green "✅ Build completado"

# 2. Crear backup en el servidor
Write-ColorOutput Blue "💾 Creando backup en el servidor..."
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
ssh $Server "cd $RemotePath && [ -d dist ] && cp -r dist dist.backup.$timestamp || echo 'No hay dist anterior para backup'"

# 3. Subir archivos usando SCP
Write-ColorOutput Blue "📤 Subiendo archivos al servidor..."

# Crear archivo temporal con lista de archivos
Get-ChildItem -Path $BuildDir -Recurse | ForEach-Object {
    scp -r "$($_.FullName)" "${Server}:${RemotePath}/dist/"
}

# Alternativa: usar WinSCP o rsync de WSL si está disponible
# rsync -avz --delete $BuildDir/ ${Server}:${RemotePath}/dist/

Write-ColorOutput Green "✅ Archivos subidos"

# 4. Configurar permisos
Write-ColorOutput Blue "🔒 Configurando permisos..."
ssh $Server "sudo chown -R www-data:www-data $RemotePath/dist && sudo chmod -R 755 $RemotePath/dist"

Write-ColorOutput Green "✅ Permisos configurados"

# 5. Recargar Nginx
Write-ColorOutput Blue "🔄 Recargando Nginx..."
ssh $Server "sudo nginx -t && sudo systemctl reload nginx"

Write-ColorOutput Green "✅ Nginx recargado"

Write-ColorOutput Green "✅ Deploy completado exitosamente!"
Write-ColorOutput Blue "🌐 Tu sitio está disponible en: https://docs.amayo.dev"
