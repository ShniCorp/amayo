# Configuración de Dominios - Amayo

## 📋 Resumen de Cambios

Se han configurado dos dominios separados para el frontend y backend:

### Dominios Configurados

| Servicio | Dominio | Puerto (Dev) | Puerto (Prod) |
|----------|---------|--------------|---------------|
| **Frontend (Vue)** | `docs.amayo.dev` | 5173 | 80/443 |
| **Backend API** | `api.amayo.dev` | 3001 | 80/443 |

## ✅ Archivos Modificados

### 1. Backend - `src/server/server.ts`

**Cambios:**
- Puerto cambiado a `3001` (antes `3000`)
- Agregado soporte para variables de entorno `API_PORT` y `API_HOST`
- Agregado mensaje de inicio con información de dominios

```typescript
const PORT = parseInt(process.env.API_PORT || '3001', 10);
const HOST = process.env.API_HOST || '0.0.0.0';
```

### 2. Frontend - Servicios API

#### `src/services/bot.js`
```javascript
// Antes
const API_URL = 'https://docs.amayo.dev'

// Ahora
const API_URL = 'https://api.amayo.dev'      // Producción
const API_URL = 'http://localhost:3001'       // Desarrollo
```

#### `src/services/auth.js`
```javascript
// Antes
const API_URL = 'https://docs.amayo.dev/api'

// Ahora
const API_URL = 'https://api.amayo.dev/api'  // Producción
const API_URL = 'http://localhost:3001/api'  // Desarrollo
```

### 3. Vite Config - `vite.config.js`

```javascript
// Proxy actualizado para desarrollo
proxy: {
  '/api': {
    target: 'http://localhost:3001',  // Antes: https://docs.amayo.dev
    changeOrigin: true,
  }
}
```

### 4. Floating Cards - `HeroSection.vue`

Reposicionados para evitar empalme con el hero principal:

```css
.card-1 { top: 60px; right: 20px; }     /* Más pegado a la derecha */
.card-2 { top: 200px; right: 160px; }   /* Centro-derecha */
.card-3 { bottom: 80px; right: 60px; }  /* Abajo-derecha */
```

## 🚀 Cómo Usar

### Desarrollo Local

1. **Iniciar el backend:**
   ```bash
   cd amayo
   npm run start:api
   # O con ts-node directamente:
   ts-node src/server/server.ts
   ```
   ✅ Backend corriendo en `http://localhost:3001`

2. **Iniciar el frontend:**
   ```bash
   cd AmayoWeb
   npm run dev
   ```
   ✅ Frontend corriendo en `http://localhost:5173`

3. **Verificar:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/bot/stats

### Producción

1. **Build del frontend:**
   ```bash
   cd AmayoWeb
   npm run build
   ```

2. **Configurar NGINX:**
   - Ver `NGINX_CONFIG.md` para configuración completa
   - Generar certificados SSL con certbot

3. **Iniciar backend con PM2:**
   ```bash
   pm2 start src/server/server.ts --name amayo-api --interpreter ts-node
   pm2 save
   pm2 startup
   ```

## 🔧 Variables de Entorno

### Backend (raíz del proyecto)

Crear `.env`:
```env
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
```

### Frontend (AmayoWeb/.env)

Crear `.env`:
```env
VITE_DISCORD_CLIENT_ID=tu_client_id
VITE_API_URL=http://localhost:3001
```

Para producción, el código detecta automáticamente el entorno y usa `https://api.amayo.dev`.

## 🔐 Certificados SSL

### Generar certificados con Certbot:

```bash
# Frontend
sudo certbot --nginx -d docs.amayo.dev

# Backend  
sudo certbot --nginx -d api.amayo.dev
```

### Renovación automática:

```bash
# Verificar
sudo certbot renew --dry-run

# Forzar renovación
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

## 🧪 Testing de Endpoints

### Verificar Backend API:

```bash
# Stats del bot
curl https://api.amayo.dev/api/bot/stats

# Info del bot
curl https://api.amayo.dev/api/bot/info

# Health check
curl https://api.amayo.dev/health
```

### Verificar Frontend:

```bash
# Homepage
curl https://docs.amayo.dev

# Debe devolver HTML de la aplicación Vue
```

## 📊 Flujo de Datos

```
Usuario
   ↓
docs.amayo.dev (Frontend Vue)
   ↓
   ↓ Hace peticiones a:
   ↓
api.amayo.dev (Backend Node.js)
   ↓
   ↓ Accede a:
   ↓
Bot de Discord (main.ts)
```

## 🔍 Troubleshooting

### Frontend no puede conectar con API

**Síntoma:** Error de CORS o 404 en requests

**Solución:**
1. Verifica que el backend esté corriendo: `curl http://localhost:3001/api/bot/stats`
2. Revisa logs del backend: `pm2 logs amayo-api`
3. Verifica configuración de CORS en NGINX

### Backend no responde

**Síntoma:** 502 Bad Gateway

**Solución:**
1. Verifica que el proceso esté corriendo: `pm2 status`
2. Reinicia el backend: `pm2 restart amayo-api`
3. Revisa logs: `pm2 logs amayo-api`

### SSL no funciona

**Síntoma:** Certificado inválido o conexión no segura

**Solución:**
1. Verifica certificados: `sudo certbot certificates`
2. Renueva certificados: `sudo certbot renew`
3. Reinicia NGINX: `sudo systemctl restart nginx`

### Floating cards se empalman

**Síntoma:** Las tarjetas se sobreponen al texto

**Solución:**
Ya están reposicionadas en este commit. Si persiste:
1. Ajusta valores en `HeroSection.vue`
2. Modifica los valores de `right`, `top`, `bottom`

## 📝 Checklist de Deploy

- [ ] Backend corriendo en puerto 3001
- [ ] Frontend compilado (`npm run build`)
- [ ] Archivos copiados a `/var/www/docs.amayo.dev`
- [ ] NGINX configurado para ambos dominios
- [ ] Certificados SSL generados con certbot
- [ ] PM2 configurado para auto-restart
- [ ] Firewall permite puertos 80/443
- [ ] DNS apunta a la IP del servidor
- [ ] Verificar endpoints con curl
- [ ] Probar login con Discord
- [ ] Verificar estadísticas en vivo

## 🎯 Próximos Pasos

1. ✅ Floating cards reposicionadas
2. ✅ Dominios configurados
3. ⏳ Generar certificados SSL
4. ⏳ Configurar NGINX en VPS
5. ⏳ Deploy de frontend y backend
6. ⏳ Pruebas en producción

---

**Última actualización:** Noviembre 2025
