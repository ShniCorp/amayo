# 🚀 Guía de Deploy - Amayo

## 📋 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         Usuario                              │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│ docs.amayo.dev│  │  api.amayo.dev   │
│  (Frontend)   │  │   (Backend API)  │
│               │  │                  │
│  Archivos     │  │  Proxy NGINX     │
│  estáticos    │  │       ↓          │
│  (Vue build)  │  │  localhost:3000  │
└───────────────┘  │  (Bot Node.js)   │
                   └──────────────────┘
```

## 🔧 Configuración Actual

| Componente | Dominio | Puerto | Servidor |
|------------|---------|--------|----------|
| Frontend Vue | `docs.amayo.dev` | 80/443 | Archivos estáticos |
| Backend API | `api.amayo.dev` | 80/443 → 3000 | Node.js (bot) |

**Importante:** El bot ejecuta el servidor desde `main.ts` en el puerto **3000**.

## 📝 Pasos de Deploy

### 1. Build del Frontend

```bash
cd AmayoWeb
npm run build
```

Esto genera la carpeta `dist/` con los archivos compilados.

### 2. Copiar Archivos al Servidor VPS

```bash
# Crear directorio si no existe
sudo mkdir -p /var/www/docs.amayo.dev

# Copiar archivos del build
sudo cp -r dist/* /var/www/docs.amayo.dev/

# Ajustar permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

### 3. Configurar NGINX

#### A. Frontend (docs.amayo.dev)

```bash
# Copiar configuración
sudo cp nginx-docs.amayo.dev.conf /etc/nginx/sites-available/docs.amayo.dev

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/docs.amayo.dev /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t
```

#### B. Backend API (api.amayo.dev)

```bash
# Copiar configuración
sudo cp nginx-api.amayo.dev.conf /etc/nginx/sites-available/api.amayo.dev

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/api.amayo.dev /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t
```

#### C. Reiniciar NGINX

```bash
sudo systemctl restart nginx
```

### 4. Configurar Variables de Entorno del Bot

En tu servidor VPS, asegúrate de tener estas variables:

```bash
# Editar archivo .env en la raíz del proyecto
nano .env
```

Agregar:

```env
# Puerto del servidor API (usado por el bot)
PORT=3000
API_PORT=3000
API_HOST=0.0.0.0

# Otras variables del bot
DISCORD_TOKEN=tu_token
DATABASE_URL=tu_database_url
# ... resto de variables
```

### 5. Iniciar/Reiniciar el Bot

El bot debe estar corriendo para que la API funcione:

```bash
# Opción 1: Con PM2 (recomendado)
pm2 restart amayo

# O si no está iniciado:
pm2 start npm --name amayo -- start

# Ver logs
pm2 logs amayo

# Opción 2: Directamente con npm
npm start
```

### 6. Verificar que Todo Funcione

#### A. Verificar Frontend

```bash
curl https://docs.amayo.dev
# Debe devolver HTML de tu app Vue
```

O abre en el navegador: https://docs.amayo.dev

#### B. Verificar Backend API

```bash
# Stats del bot
curl https://api.amayo.dev/api/bot/stats

# Debe devolver JSON con estadísticas
# {"servers":10,"users":1000,"commands":50}
```

#### C. Ver Logs de NGINX

```bash
# Frontend
sudo tail -f /var/log/nginx/docs.amayo.dev.access.log

# Backend
sudo tail -f /var/log/nginx/api.amayo.dev.access.log

# Errores
sudo tail -f /var/log/nginx/error.log
```

#### D. Ver Logs del Bot

```bash
pm2 logs amayo
```

## 🔄 Script de Deploy Automático

Puedes usar el script `deploy.sh` (necesitas crearlo):

```bash
#!/bin/bash

# Script de deploy para Amayo

echo "🚀 Iniciando deploy de Amayo..."

# 1. Build del frontend
echo "📦 Compilando frontend..."
cd AmayoWeb
npm run build

# 2. Copiar archivos
echo "📤 Copiando archivos al servidor..."
sudo rm -rf /var/www/docs.amayo.dev/*
sudo cp -r dist/* /var/www/docs.amayo.dev/
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev

# 3. Reiniciar NGINX
echo "🔄 Reiniciando NGINX..."
sudo nginx -t && sudo systemctl reload nginx

# 4. Reiniciar bot (para aplicar cambios del backend)
echo "🤖 Reiniciando bot..."
pm2 restart amayo

echo "✅ Deploy completado!"
echo "🌐 Frontend: https://docs.amayo.dev"
echo "🌐 Backend: https://api.amayo.dev"
```

Hacer ejecutable:

```bash
chmod +x deploy.sh
```

Ejecutar:

```bash
./deploy.sh
```

## 🧪 Testing Local (Desarrollo)

### Iniciar Backend (Bot)

```bash
# En la raíz del proyecto
npm start
# El bot iniciará el servidor en puerto 3000
```

### Iniciar Frontend

```bash
# En carpeta AmayoWeb
cd AmayoWeb
npm run dev
# Frontend en http://localhost:5173
```

El frontend se conectará automáticamente al backend en `localhost:3000` gracias al proxy de Vite.

## 🔍 Troubleshooting

### Error: "502 Bad Gateway" en api.amayo.dev

**Causa:** El bot no está corriendo o no está en el puerto 3000.

**Solución:**
```bash
# Verificar que el bot esté corriendo
pm2 status

# Verificar el puerto
netstat -tulpn | grep 3000

# Reiniciar el bot
pm2 restart amayo

# Ver logs
pm2 logs amayo
```

### Error: "404 Not Found" en rutas de Vue

**Causa:** Falta la configuración `try_files` en NGINX.

**Solución:** Asegúrate de que el archivo de configuración tenga:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Error: CORS al hacer requests desde el frontend

**Causa:** Headers CORS no configurados correctamente.

**Solución:** Verifica que el archivo `nginx-api.amayo.dev.conf` tenga los headers CORS configurados.

### Frontend muestra valores en 0

**Causa:** El bot no está devolviendo datos o no puede acceder a la instancia del bot.

**Solución:**
1. Verifica que el bot esté conectado a Discord
2. Revisa los endpoints en `src/server/handler.ts`
3. Verifica que `require("../main").bot` funcione correctamente

### Certificados SSL no válidos

**Causa:** Certificados no generados o expirados.

**Solución:**
```bash
# Verificar certificados
sudo certbot certificates

# Renovar
sudo certbot renew

# Reiniciar NGINX
sudo systemctl restart nginx
```

## 📊 Checklist de Deploy

- [ ] Build del frontend completado (`npm run build`)
- [ ] Archivos copiados a `/var/www/docs.amayo.dev`
- [ ] Configuración de NGINX para `docs.amayo.dev` creada y habilitada
- [ ] Configuración de NGINX para `api.amayo.dev` creada y habilitada
- [ ] Certificados SSL configurados para ambos dominios
- [ ] Variables de entorno configuradas en el servidor
- [ ] Bot corriendo en puerto 3000
- [ ] NGINX reiniciado
- [ ] Verificado frontend: `curl https://docs.amayo.dev`
- [ ] Verificado backend: `curl https://api.amayo.dev/api/bot/stats`
- [ ] Probado login con Discord
- [ ] Verificadas estadísticas en vivo

## 🎯 URLs Finales

- 🌐 **Frontend:** https://docs.amayo.dev
- 🔌 **Backend API:** https://api.amayo.dev
- 📊 **Stats:** https://api.amayo.dev/api/bot/stats
- ℹ️ **Info:** https://api.amayo.dev/api/bot/info

## 📝 Notas Importantes

1. **Puerto 3000:** El bot ejecuta el servidor en este puerto desde `main.ts`. No cambiar sin actualizar la configuración.

2. **Separación de Dominios:** 
   - `docs.amayo.dev` → Archivos estáticos (Vue)
   - `api.amayo.dev` → Proxy a Node.js (puerto 3000)

3. **CORS:** El backend acepta requests solo desde `docs.amayo.dev` en producción.

4. **PM2:** Asegúrate de que el bot esté configurado para reiniciarse automáticamente:
   ```bash
   pm2 save
   pm2 startup
   ```

5. **Logs:** Siempre revisa los logs si algo no funciona:
   ```bash
   # Logs del bot
   pm2 logs amayo
   
   # Logs de NGINX
   sudo tail -f /var/log/nginx/error.log
   ```

---

**Última actualización:** Noviembre 2025
