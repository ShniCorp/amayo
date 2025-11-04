# 🎯 Comandos Exactos para el VPS

## ✅ Ya Tienes Configurado

```
✓ Certificado SSL para api.amayo.dev
✓ Certificado SSL para docs.amayo.dev (según tu configuración)
✓ NGINX instalado
```

## 📝 Pasos a Seguir

### 1. Configurar NGINX para docs.amayo.dev (Frontend Vue)

Editar el archivo de configuración existente:

```bash
sudo nano /etc/nginx/sites-available/default
```

**Reemplazar la configuración de `docs.amayo.dev` con esto:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name docs.amayo.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.amayo.dev;

    ssl_certificate /etc/letsencrypt/live/docs.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.amayo.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # IMPORTANTE: Cambiar a archivos estáticos
    root /var/www/docs.amayo.dev;
    index index.html;

    access_log /var/log/nginx/docs.amayo.dev.access.log;
    error_log /var/log/nginx/docs.amayo.dev.error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Configurar NGINX para api.amayo.dev (Backend)

En el mismo archivo o crear uno separado:

```bash
sudo nano /etc/nginx/sites-available/default
```

**Agregar o modificar la sección de `api.amayo.dev`:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.amayo.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.amayo.dev;

    ssl_certificate /etc/letsencrypt/live/api.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.amayo.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/api.amayo.dev.access.log;
    error_log /var/log/nginx/api.amayo.dev.error.log;

    # Proxy al bot en puerto 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # CORS para el frontend
    add_header Access-Control-Allow-Origin "https://docs.amayo.dev" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Manejar preflight
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://docs.amayo.dev" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type 'text/plain; charset=utf-8';
        add_header Content-Length 0;
        return 204;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3. Verificar y Reiniciar NGINX

```bash
# Verificar sintaxis
sudo nginx -t

# Si está OK, reiniciar
sudo systemctl restart nginx

# Ver estado
sudo systemctl status nginx
```

### 4. Crear Directorio para el Frontend

```bash
# Crear directorio
sudo mkdir -p /var/www/docs.amayo.dev

# Ajustar permisos
sudo chown -R $USER:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

### 5. Deploy del Frontend (Desde tu PC Local)

En tu PC con Windows, en la carpeta `AmayoWeb`:

```powershell
# Build
npm run build

# El contenido estará en la carpeta dist/
```

**Transferir archivos al VPS:**

Opción A - Con SCP desde PowerShell:
```powershell
scp -r dist/* shnimlz@tu_ip_servidor:/home/shnimlz/amayo-frontend/
```

Opción B - Con WinSCP o FileZilla (interfaz gráfica)

**En el VPS, mover los archivos:**

```bash
# Copiar archivos al directorio web
sudo cp -r /home/shnimlz/amayo-frontend/* /var/www/docs.amayo.dev/

# Ajustar permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

### 6. Verificar Variables de Entorno del Bot

En el servidor VPS:

```bash
cd /ruta/a/tu/proyecto/amayo

# Editar .env
nano .env
```

Asegúrate de tener:

```env
PORT=3000
DISCORD_TOKEN=tu_token
# ... resto de tus variables
```

### 7. Verificar que el Bot Esté Corriendo

```bash
# Si usas PM2
pm2 status

# Ver logs
pm2 logs amayo

# Reiniciar si es necesario
pm2 restart amayo

# Si no usas PM2, verificar el proceso
ps aux | grep node

# Verificar que esté en el puerto 3000
netstat -tulpn | grep 3000
```

### 8. Verificar que Todo Funcione

```bash
# Verificar frontend
curl https://docs.amayo.dev

# Verificar backend API
curl https://api.amayo.dev/api/bot/stats

# Ver logs de NGINX
sudo tail -f /var/log/nginx/docs.amayo.dev.access.log
sudo tail -f /var/log/nginx/api.amayo.dev.access.log
```

## 🔥 Comando Rápido de Deploy (Crear Script)

Crear archivo en el servidor:

```bash
nano ~/deploy-amayo-frontend.sh
```

Contenido:

```bash
#!/bin/bash

echo "🚀 Deploying Amayo Frontend..."

# Limpiar directorio
sudo rm -rf /var/www/docs.amayo.dev/*

# Copiar nuevos archivos (ajusta la ruta según donde subas los archivos)
sudo cp -r /home/shnimlz/amayo-frontend/* /var/www/docs.amayo.dev/

# Permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev

# Reiniciar NGINX
sudo systemctl reload nginx

echo "✅ Deploy completado!"
echo "🌐 https://docs.amayo.dev"
```

Hacer ejecutable:

```bash
chmod +x ~/deploy-amayo-frontend.sh
```

Usar:

```bash
./deploy-amayo-frontend.sh
```

## 🎯 Resumen de URLs

| Servicio | URL | Puerto Interno |
|----------|-----|----------------|
| Frontend | https://docs.amayo.dev | Archivos estáticos |
| Backend API | https://api.amayo.dev | → localhost:3000 |

## 🔍 Troubleshooting Rápido

### El frontend no carga

```bash
# Ver logs
sudo tail -f /var/log/nginx/error.log

# Verificar archivos
ls -la /var/www/docs.amayo.dev/

# Verificar NGINX
sudo nginx -t
```

### La API no responde (502)

```bash
# Verificar bot
pm2 status
pm2 logs amayo

# Verificar puerto
netstat -tulpn | grep 3000

# Reiniciar bot
pm2 restart amayo
```

### CORS errors

Verificar que la configuración de NGINX tenga los headers CORS correctos en la sección de `api.amayo.dev`.

---

**Notas:**
- El bot se ejecuta en el puerto **3000** (no 3001)
- El frontend son **archivos estáticos** de Vue
- NGINX hace **proxy** del API al bot en puerto 3000
