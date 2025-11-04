# 🔍 Diagnóstico: Frontend No Carga

## ✅ Build Exitoso

Tu build se completó correctamente:
```
✓ built in 3.20s
dist/index.html                   0.51 kB
dist/assets/index-Db_Iwe5l.css   12.44 kB
dist/assets/index-Cwegg0a4.js    48.55 kB
dist/assets/vendor-C0oSq11a.js  150.64 kB
```

## 🌐 Puertos Usados

### Frontend (docs.amayo.dev)

**Desarrollo:**
- Puerto: `5173` (Vite dev server)
- URL: `http://localhost:5173`

**Producción:**
- Puerto: `443` (HTTPS) / `80` (HTTP redirige a HTTPS)
- Son archivos estáticos servidos por NGINX
- No usa Node.js, solo NGINX sirve los archivos HTML/JS/CSS
- URL: `https://docs.amayo.dev`

### Backend API (api.amayo.dev)

**Producción:**
- Puerto externo: `443` (HTTPS)
- Puerto interno: `3000` (Node.js - Bot)
- NGINX hace proxy de `443` → `3000`
- URL: `https://api.amayo.dev`

## 🐛 Por Qué No Sale Nada

### Posibles Causas:

1. **Los archivos no están en el lugar correcto**
2. **NGINX no está configurado correctamente**
3. **Falta el archivo index.html en el directorio**
4. **Permisos incorrectos**
5. **Configuración de NGINX no tiene `try_files`**

## 🔧 Comandos de Diagnóstico en el VPS

### 1. Verificar que los archivos existen

```bash
# Ver archivos en el directorio web
ls -la /var/www/docs.amayo.dev/

# Debería mostrar:
# index.html
# assets/ (carpeta con JS y CSS)
```

**Esperado:**
```
total 16
drwxr-xr-x 3 www-data www-data 4096 Nov  4 12:00 .
drwxr-xr-x 3 root     root     4096 Nov  4 11:55 ..
drwxr-xr-x 2 www-data www-data 4096 Nov  4 12:00 assets
-rw-r--r-- 1 www-data www-data  510 Nov  4 12:00 index.html
```

### 2. Ver el contenido de index.html

```bash
cat /var/www/docs.amayo.dev/index.html
```

**Debería contener:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vite App</title>
    <script type="module" crossorigin src="/assets/index-Cwegg0a4.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Db_Iwe5l.css">
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### 3. Verificar configuración de NGINX

```bash
# Ver configuración actual
sudo cat /etc/nginx/sites-available/default | grep -A 30 "docs.amayo.dev"
```

**Debe tener:**
```nginx
server {
    listen 443 ssl http2;
    server_name docs.amayo.dev;
    
    # IMPORTANTE: root debe apuntar al directorio correcto
    root /var/www/docs.amayo.dev;
    index index.html;
    
    # IMPORTANTE: try_files para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Ver logs de NGINX

```bash
# Ver errores
sudo tail -f /var/log/nginx/error.log

# Ver accesos
sudo tail -f /var/log/nginx/docs.amayo.dev.access.log
```

### 5. Probar con curl

```bash
# Debe devolver HTML
curl -I https://docs.amayo.dev

# Ver contenido completo
curl https://docs.amayo.dev
```

## 🛠️ Soluciones

### Solución 1: Verificar que los archivos estén copiados

En tu VPS:

```bash
# Ver qué hay en el directorio
ls -la /var/www/docs.amayo.dev/

# Si está vacío, copiar archivos del build
# (Asumiendo que subiste los archivos a /home/shnimlz/amayo-frontend/)
sudo cp -r /home/shnimlz/amayo/AmayoWeb/dist/* /var/www/docs.amayo.dev/

# Ajustar permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

### Solución 2: Corregir configuración de NGINX

Editar configuración:

```bash
sudo nano /etc/nginx/sites-available/default
```

Buscar la sección de `docs.amayo.dev` y asegurarte que tenga:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.amayo.dev;

    ssl_certificate /etc/letsencrypt/live/docs.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.amayo.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # CAMBIAR ESTO: NO debe haber proxy_pass
    root /var/www/docs.amayo.dev;
    index index.html;

    # Logs
    access_log /var/log/nginx/docs.amayo.dev.access.log;
    error_log /var/log/nginx/docs.amayo.dev.error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # SPA fallback - IMPORTANTE
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Guardar (Ctrl+O, Enter, Ctrl+X) y reiniciar:

```bash
# Verificar sintaxis
sudo nginx -t

# Si OK, reiniciar
sudo systemctl restart nginx
```

### Solución 3: Verificar permisos

```bash
# Archivos deben ser legibles por www-data
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev

# Verificar
ls -la /var/www/docs.amayo.dev/
```

## 📝 Procedimiento Completo de Deploy

### En tu PC (Windows):

```powershell
# 1. Build
cd C:\Users\Shnimlz\Documents\GitHub\amayo\AmayoWeb
npm run build

# 2. Los archivos están en dist/
# Subir al servidor con SCP o WinSCP
```

### Con SCP (desde PowerShell):

```powershell
# Copiar archivos al servidor
scp -r dist/* shnimlz@tu_ip:/home/shnimlz/amayo-frontend/
```

### En el VPS (Linux):

```bash
# 1. Ir al proyecto
cd ~/amayo/AmayoWeb

# 2. Si subiste con SCP a /home/shnimlz/amayo-frontend/
# O si ya tienes el build en el repo, usar:
sudo cp -r dist/* /var/www/docs.amayo.dev/

# 3. Permisos
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev

# 4. Verificar
ls -la /var/www/docs.amayo.dev/

# 5. Reiniciar NGINX
sudo systemctl restart nginx

# 6. Probar
curl https://docs.amayo.dev
```

## 🎯 Checklist Rápido

- [ ] Archivos del build copiados a `/var/www/docs.amayo.dev/`
- [ ] Existe `/var/www/docs.amayo.dev/index.html`
- [ ] Existe `/var/www/docs.amayo.dev/assets/` con archivos JS y CSS
- [ ] Permisos correctos (`www-data:www-data`, `755`)
- [ ] NGINX tiene `root /var/www/docs.amayo.dev;`
- [ ] NGINX tiene `try_files $uri $uri/ /index.html;`
- [ ] NO hay `proxy_pass` en la config de docs.amayo.dev
- [ ] `sudo nginx -t` pasa sin errores
- [ ] NGINX reiniciado: `sudo systemctl restart nginx`
- [ ] `curl https://docs.amayo.dev` devuelve HTML

## 🔴 ERROR COMÚN

**Si ves "502 Bad Gateway":** Significa que NGINX está intentando hacer proxy a un servidor que no existe. Esto pasa si la configuración tiene `proxy_pass` en lugar de `root`.

**Solución:** Cambiar `proxy_pass` por `root /var/www/docs.amayo.dev;`

## 📞 Si Nada Funciona

Muéstrame la salida de estos comandos:

```bash
# 1. Ver archivos
ls -la /var/www/docs.amayo.dev/

# 2. Ver configuración
sudo cat /etc/nginx/sites-available/default | grep -A 40 "docs.amayo.dev"

# 3. Ver logs
sudo tail -20 /var/log/nginx/error.log

# 4. Probar curl
curl -I https://docs.amayo.dev
```

Con esa información podré ayudarte mejor.

---

## 📊 Resumen de Puertos

| Servicio | Entorno | Puerto | Descripción |
|----------|---------|--------|-------------|
| Frontend Dev | Desarrollo | 5173 | Vite dev server (local) |
| Frontend Prod | Producción | 443 (HTTPS) | NGINX sirve archivos estáticos |
| Backend API | Producción | 443 → 3000 | NGINX proxy a Node.js |
| Bot/API Interno | Producción | 3000 | Node.js server (interno) |

**El frontend NO usa ningún puerto Node.js en producción**, solo archivos estáticos servidos por NGINX en el puerto 443 (HTTPS).
