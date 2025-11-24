#!/bin/bash

# Script de deploy para AmayoWeb
# Uso: ./deploy.sh [servidor]
# Ejemplo: ./deploy.sh user@tu-vps.com

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando deploy de AmayoWeb...${NC}"

# Variables
SERVER=$1
REMOTE_PATH="/var/www/docs.amayo.dev"
BUILD_DIR="dist"

if [ -z "$SERVER" ]; then
    echo -e "${RED}❌ Error: Debes especificar el servidor${NC}"
    echo "Uso: ./deploy.sh user@tu-vps.com"
    exit 1
fi

# 1. Build del proyecto
echo -e "${BLUE}📦 Construyendo el proyecto...${NC}"
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Error: No se encontró la carpeta dist${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completado${NC}"

# 2. Crear backup del directorio actual en el servidor
echo -e "${BLUE}💾 Creando backup en el servidor...${NC}"
ssh $SERVER "cd $REMOTE_PATH && [ -d dist ] && cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S) || echo 'No hay dist anterior para backup'"

# 3. Subir archivos
echo -e "${BLUE}📤 Subiendo archivos al servidor...${NC}"
rsync -avz --delete $BUILD_DIR/ $SERVER:$REMOTE_PATH/dist/

echo -e "${GREEN}✅ Archivos subidos${NC}"

# 4. Configurar permisos
echo -e "${BLUE}🔒 Configurando permisos...${NC}"
ssh $SERVER "sudo chown -R www-data:www-data $REMOTE_PATH/dist && sudo chmod -R 755 $REMOTE_PATH/dist"

echo -e "${GREEN}✅ Permisos configurados${NC}"

# 5. Recargar Nginx
echo -e "${BLUE}🔄 Recargando Nginx...${NC}"
ssh $SERVER "sudo nginx -t && sudo systemctl reload nginx"

echo -e "${GREEN}✅ Nginx recargado${NC}"

# 6. Limpiar builds locales antiguos (opcional)
echo -e "${BLUE}🧹 Limpiando archivos locales...${NC}"
# Descomentar si quieres limpiar el build local después del deploy
# rm -rf $BUILD_DIR

echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
echo -e "${BLUE}🌐 Tu sitio está disponible en: https://docs.amayo.dev${NC}"
