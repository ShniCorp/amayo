# Guía de Configuración de Nginx para docs.amayo.dev

## 📋 Requisitos Previos

- Ubuntu/Debian VPS con acceso root o sudo
- Nginx instalado
- Dominio `docs.amayo.dev` apuntando a tu VPS
- Certificado SSL (Let's Encrypt recomendado)

## 1. Instalar Nginx (si no está instalado)

```bash
sudo apt update
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 2. Crear directorio para la aplicación

```bash
sudo mkdir -p /var/www/docs.amayo.dev/dist
sudo chown -R $USER:$USER /var/www/docs.amayo.dev
```

## 3. Crear configuración de Nginx

Crea el archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/docs.amayo.dev
```

Pega la siguiente configuración:

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name docs.amayo.dev;
    
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.amayo.dev;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/docs.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.amayo.dev/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/docs.amayo.dev/chain.pem;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root y index
    root /var/www/docs.amayo.dev/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/docs.amayo.dev.access.log;
    error_log /var/log/nginx/docs.amayo.dev.error.log;

    # Configuración para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API backend (ajusta el puerto según tu configuración)
    location /api {
        proxy_pass http://localhost:3000;
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

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Desactivar logs para favicon y robots.txt
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # Compresión Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Brotli compression (si está disponible)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

## 4. Habilitar el sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/docs.amayo.dev /etc/nginx/sites-enabled/

# Eliminar configuración por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default
```

## 5. Instalar Certbot para SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d docs.amayo.dev

# El certificado se renovará automáticamente
```

## 6. Verificar configuración de Nginx

```bash
sudo nginx -t
```

Si todo está bien, deberías ver:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## 7. Reiniciar Nginx

```bash
sudo systemctl restart nginx
```

## 8. Configurar Firewall (si está activo)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

## 9. Verificar que funciona

```bash
curl -I https://docs.amayo.dev
```

Deberías ver un código 200 o 301.

## 📝 Comandos Útiles

### Verificar estado de Nginx
```bash
sudo systemctl status nginx
```

### Ver logs en tiempo real
```bash
sudo tail -f /var/log/nginx/docs.amayo.dev.access.log
sudo tail -f /var/log/nginx/docs.amayo.dev.error.log
```

### Recargar configuración sin downtime
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Renovar certificado SSL manualmente
```bash
sudo certbot renew
```

## 🔒 Configuración PM2 para Backend (Opcional)

Si tienes un backend Node.js para la autenticación:

```bash
# Instalar PM2
npm install -g pm2

# Iniciar el servidor
pm2 start server-example.js --name "amayo-auth"

# Configurar para iniciar al arranque
pm2 startup
pm2 save

# Ver logs
pm2 logs amayo-auth

# Reiniciar
pm2 restart amayo-auth
```

## 🐛 Troubleshooting

### Error 502 Bad Gateway
- Verifica que el backend esté corriendo: `pm2 status`
- Revisa los logs: `sudo tail -f /var/log/nginx/error.log`

### Error 403 Forbidden
- Verifica permisos: `sudo chown -R www-data:www-data /var/www/docs.amayo.dev`
- Verifica que index.html existe en `/var/www/docs.amayo.dev/dist/`

### Error SSL
- Renueva el certificado: `sudo certbot renew --force-renewal`
- Verifica rutas de certificados en la configuración de Nginx

## 📊 Monitoreo (Opcional)

### Instalar herramientas de monitoreo
```bash
# GoAccess para análisis de logs
sudo apt install goaccess
goaccess /var/log/nginx/docs.amayo.dev.access.log --log-format=COMBINED

# Netdata para monitoreo en tiempo real
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

---

¡Tu sitio debería estar funcionando en https://docs.amayo.dev! 🎉
