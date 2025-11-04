# AmayoWeb - Nueva Landing Page

## 🎨 Características Implementadas

### ✅ Diseño Visual
- **Fondo Animado**: Gradientes rojos con efecto de deslizamiento suave
- **Grid Pattern**: Patrón de cuadrícula sutil sobre el fondo
- **Navbar Island Style**: Navegación flotante con bordes redondeados
- **Hero Section**: Con efecto typewriter animado

### 🌐 Internacionalización
- Soporte para Español e Inglés
- Selector de idioma en el navbar
- Traducciones configurables en `src/i18n/locales.js`

### 🎨 Sistema de Temas
- 5 temas predefinidos con degradados:
  - Rojo (por defecto)
  - Azul
  - Verde
  - Púrpura
  - Naranja
- Selector visual con círculos de colores
- Persistencia en localStorage

### 🔐 Autenticación Discord
- Login con Discord OAuth2
- Servicio de autenticación completo
- Manejo de callbacks y tokens
- Guard de navegación para rutas protegidas

## 📦 Instalación

```bash
cd AmayoWeb
npm install
```

## ⚙️ Configuración

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

2. Configura las variables en `.env`:
```env
VITE_DISCORD_CLIENT_ID=tu_client_id_aqui
VITE_API_URL=http://localhost:3000
```

3. En Discord Developer Portal (https://discord.com/developers/applications):
   - Crea una nueva aplicación
   - Ve a OAuth2 > General
   - Añade las siguientes redirect URIs:
     - Desarrollo: `http://localhost:5173/auth/callback`
     - Producción: `https://docs.amayo.dev/auth/callback`
   - Copia el Client ID y añádelo al archivo `.env`

## 🚀 Desarrollo

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

## 🌐 Configuración de Nginx

Para servir la aplicación en tu VPS con el dominio `docs.amayo.dev`, añade esta configuración a Nginx:

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

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/docs.amayo.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.amayo.dev/privkey.pem;

    root /var/www/docs.amayo.dev/dist;
    index index.html;

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API (si tienes backend)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🚀 Deploy en VPS

1. Construye el proyecto:
```bash
npm run build
```

2. Sube los archivos de `dist/` a tu VPS:
```bash
scp -r dist/* user@tu-vps:/var/www/docs.amayo.dev/dist/
```

3. Asegúrate de que Nginx tenga permisos:
```bash
sudo chown -R www-data:www-data /var/www/docs.amayo.dev
sudo chmod -R 755 /var/www/docs.amayo.dev
```

4. Recarga Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 📝 Personalización

### Cambiar el avatar del bot
Edita `src/components/IslandNavbar.vue` línea 36:
```javascript
const botLogo = ref('TU_URL_DE_AVATAR_AQUI')
```

### Añadir más temas
Edita `src/composables/useTheme.js` y añade nuevos temas al objeto `themes`.

### Modificar textos
Edita `src/i18n/locales.js` para cambiar los textos en español e inglés.
