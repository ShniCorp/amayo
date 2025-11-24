# Configuración de NGINX para Amayo

Esta guía te ayudará a configurar NGINX para servir tanto el frontend como el backend API con SSL.

## Dominios

- **Frontend (Vue):** `docs.amayo.dev` - Puerto 5173 (dev) / Archivos estáticos (prod)
- **Backend API:** `api.amayo.dev` - Puerto 3001

## Configuración de NGINX

### 1. Frontend - docs.amayo.dev

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name docs.amayo.dev;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.amayo.dev;

    # Certificados SSL (generados con certbot)
    ssl_certificate /etc/letsencrypt/live/docs.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.amayo.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Ruta de archivos estáticos del build de Vue
    root /var/www/docs.amayo.dev;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # SPA fallback - todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 2. Backend API - api.amayo.dev

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.amayo.dev;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.amayo.dev;

    # Certificados SSL (generados con certbot)
    ssl_certificate /etc/letsencrypt/live/api.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.amayo.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/api.amayo.dev.access.log;
    error_log /var/log/nginx/api.amayo.dev.error.log;

    # Proxy al servidor Node.js en puerto 3001
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # CORS headers (si es necesario)
    add_header Access-Control-Allow-Origin "https://docs.amayo.dev" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## Pasos de Instalación

### 1. Crear archivos de configuración

```bash
# Frontend
sudo nano /etc/nginx/sites-available/docs.amayo.dev

# Backend
sudo nano /etc/nginx/sites-available/api.amayo.dev
```

### 2. Habilitar los sitios

```bash
sudo ln -s /etc/nginx/sites-available/docs.amayo.dev /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.amayo.dev /etc/nginx/sites-enabled/
```

### 3. Generar certificados SSL con Certbot

```bash
# Instalar certbot si no lo tienes
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generar certificados
sudo certbot --nginx -d docs.amayo.dev
sudo certbot --nginx -d api.amayo.dev

# Verificar renovación automática
sudo certbot renew --dry-run
```

### 4. Verificar configuración y reiniciar NGINX

```bash
# Verificar sintaxis
sudo nginx -t

# Reiniciar NGINX
sudo systemctl restart nginx

# Ver estado
sudo systemctl status nginx
```

## Deploy del Frontend

```bash
cd AmayoWeb

# Build de producción
npm run build

# Copiar archivos al servidor
sudo rm -rf /var/www/docs.amayo.dev/*
sudo cp -r dist/* /var/www/docs.amayo.dev/

# Ajustar permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

## Iniciar el Backend API

```bash
# Opción 1: Con PM2 (recomendado)
pm2 start src/server/server.ts --name amayo-api --interpreter ts-node
pm2 save
pm2 startup

# Opción 2: Con node directamente
cd /ruta/a/amayo
node -r ts-node/register src/server/server.ts

# Opción 3: Con npm script (agrega a package.json)
npm run start:api
```

## Variables de Entorno

### Backend (.env en raíz del proyecto)

```env
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
```

### Frontend (.env.production en AmayoWeb)

```env
VITE_API_URL=https://api.amayo.dev
VITE_DISCORD_CLIENT_ID=tu_client_id
```

## Verificación

### Frontend
```bash
curl https://docs.amayo.dev
# Debe devolver el HTML de tu aplicación Vue
```

### Backend
```bash
curl https://api.amayo.dev/api/bot/stats
# Debe devolver JSON con estadísticas del bot
```

## Firewall

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# El puerto 3001 NO debe estar expuesto públicamente
# NGINX hace el proxy internamente
```

## Logs

```bash
# Ver logs de NGINX
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/api.amayo.dev.access.log

# Ver logs del backend con PM2
pm2 logs amayo-api
```

## Troubleshooting

### Error: 502 Bad Gateway
- Verifica que el servidor Node.js esté corriendo en el puerto 3001
- Verifica los logs: `pm2 logs amayo-api`

### Error: 404 Not Found en rutas de Vue
- Asegúrate de tener el `try_files` configurado correctamente
- Verifica que el archivo `index.html` esté en la raíz de `/var/www/docs.amayo.dev`

### Error: CORS
- Verifica los headers en la configuración de NGINX
- Asegúrate de que el backend también maneje CORS si es necesario

### Certificados SSL no se renuevan
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```
