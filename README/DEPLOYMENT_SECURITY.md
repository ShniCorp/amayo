# Guía de Deployment - Seguridad Backend Amayo

## ✅ Cambios Implementados

### 1. Nuevos Middlewares de Seguridad

Se han creado los siguientes módulos en `src/server/lib/`:

- **`cloudflare.ts`**: Validación de IPs de Cloudflare y obtención de IP real del cliente
- **`rateLimit.ts`**: Sistema de rate limiting por endpoint (API: 30/min, Auth: 3/min, Stats: 60/min)
- **`cors.ts`**: CORS estricto con whitelist de orígenes permitidos
- **`requestValidation.ts`**: Validación de headers de seguridad, timestamps anti-replay, bloqueo de user-agents sospechosos

### 2. Handler Actualizado

`src/server/handler.ts` ahora incluye:
- ✅ Validación de requests desde Cloudflare en producción
- ✅ Manejo de preflight OPTIONS para CORS
- ✅ Rate limiting en todos los endpoints de API
- ✅ CORS headers en respuestas de API
- ✅ Server tokens en respuestas de API
- ✅ Servicio de `/.well-known/api-config.json`

### 3. Archivos Creados

- `src/server/public/.well-known/api-config.json` - Configuración pública de API

## 🚀 Pasos para Deploy en Producción

### Paso 1: Configurar Variables de Entorno

Edita tu archivo `.env` en el servidor y asegura que tenga:

```bash
# Producción
NODE_ENV=production
API_PORT=3000
API_HOST=0.0.0.0

# Discord OAuth (ya existentes)
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
DISCORD_REDIRECT_URI=https://api.amayo.dev/auth/callback

# Database (ya existente)
DATABASE_URL=tu_database_url

# Opcional: Para logging avanzado
LOG_LEVEL=info
```

### Paso 2: Actualizar Nginx

Copia la configuración de seguridad a Nginx:

```bash
# En tu servidor
sudo cp /path/to/amayo/README/NGINX_SECURITY_CONFIG.md /tmp/nginx-config-reference.md

# Edita la configuración de Nginx
sudo nano /etc/nginx/sites-available/api.amayo.dev
```

**IMPORTANTE**: La configuración en `README/NGINX_SECURITY_CONFIG.md` requiere el módulo `headers-more`. Si aún no lo instalaste:

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install libnginx-mod-http-headers-more

# O comentar las líneas more_clear_headers en el config
```

Después de editar:

```bash
# Testear configuración
sudo nginx -t

# Si OK, reiniciar
sudo systemctl reload nginx
```

### Paso 3: Verificar Cloudflare

En el dashboard de Cloudflare para `api.amayo.dev`:

1. **SSL/TLS**: Modo "Full (strict)"
2. **Firewall Rules**: Crear regla para bloquear acceso directo
   ```
   (not cf.edge.server_port in {80 443}) → Block
   ```
3. **Bot Fight Mode**: Activar
4. **Rate Limiting**: Configurar reglas si quieres control adicional desde Cloudflare

### Paso 4: Actualizar Código en el Servidor

```bash
# En tu servidor
cd /path/to/amayo

# Pull los cambios
git pull origin master

# Instalar dependencias (si hay nuevas - en este caso no)
npm install

# Compilar TypeScript si usas build
npm run tsc  # O tu comando de build

# Reiniciar el servidor
pm2 restart amayo  # O tu gestor de procesos
# O si usas systemd:
sudo systemctl restart amayo
```

### Paso 5: Verificar que Funciona

#### A. Verificar endpoint de configuración

```bash
curl -I https://api.amayo.dev/.well-known/api-config.json
```

Deberías ver:
```
HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: public, max-age=3600
...
```

#### B. Verificar API con rate limiting

```bash
# Desde tu máquina local (no desde el servidor)
curl https://api.amayo.dev/api/bot/stats
```

Deberías ver headers de rate limit:
```json
{
  "servers": X,
  "users": Y,
  "commands": Z,
  "timestamp": "..."
}
```

Headers de respuesta deben incluir:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-Server-Token: <hex_token>
```

#### C. Verificar protección Cloudflare

Intenta acceder directamente a la IP del servidor (si la tienes):

```bash
curl -I http://TU_IP_SERVIDOR:3000/api/bot/stats
```

En producción (NODE_ENV=production), debería responder `403 Forbidden` porque no viene de Cloudflare.

#### D. Verificar CORS

Desde el frontend (AmayoWeb en desarrollo):

```bash
cd AmayoWeb
npm run dev
```

Abre DevTools → Console y ejecuta:

```javascript
fetch('https://api.amayo.dev/api/bot/stats', {
  headers: {
    'X-Client-Token': 'test123',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Timestamp': Date.now().toString()
  }
})
.then(r => r.json())
.then(console.log)
```

Debería funcionar si el origen está en la whitelist de CORS.

### Paso 6: Monitorear Logs

```bash
# Logs del servidor Node.js
pm2 logs amayo  # O tu gestor de procesos

# Logs de Nginx
sudo tail -f /var/log/nginx/api.amayo.dev.access.log
sudo tail -f /var/log/nginx/api.amayo.dev.error.log
```

Busca mensajes como:
- `[Security] Blocked non-Cloudflare request` - Acceso directo bloqueado ✅
- `Too many requests` - Rate limiting funcionando ✅
- Errores 403/429 - Protecciones activas ✅

## 🔧 Troubleshooting

### Problema 1: "Direct access forbidden" en requests legítimos

**Causa**: El servidor no detecta que el request viene de Cloudflare.

**Solución**:
1. Verifica que Cloudflare esté en modo proxy (nube naranja) para `api.amayo.dev`
2. Asegura que `NODE_ENV=production` esté configurado
3. Verifica los logs: `console.log` en `cloudflare.ts` te dirá qué IP detectó

### Problema 2: Rate limiting demasiado agresivo

**Solución**: Ajusta los límites en `src/server/lib/rateLimit.ts`:

```typescript
export const rateLimiters = {
  api: new RateLimiter(60, 60_000),    // Aumentar de 30 a 60
  auth: new RateLimiter(5, 60_000),     // Aumentar de 3 a 5
  stats: new RateLimiter(120, 60_000),  // Aumentar de 60 a 120
};
```

### Problema 3: CORS bloqueando requests del frontend

**Solución**: Agrega el origen en `src/server/lib/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  "https://docs.amayo.dev",
  "https://amayo.dev",
  "https://www.amayo.dev",
  "https://tu-nuevo-dominio.com",  // <-- Agregar aquí
];
```

### Problema 4: Nginx no inicia por `more_clear_headers`

**Solución**: Instala el módulo o comenta las líneas:

```bash
# Opción 1: Instalar módulo
sudo apt install libnginx-mod-http-headers-more
sudo systemctl restart nginx

# Opción 2: Comentar en /etc/nginx/sites-available/api.amayo.dev
# more_clear_headers Server;
# more_clear_headers X-Powered-By;
```

## 📊 Métricas a Monitorear

Después del deploy, monitorea:

1. **Tasa de 403 Forbidden**: Debería ser > 0 si hay intentos de acceso directo
2. **Tasa de 429 Too Many Requests**: Indica rate limiting funcionando
3. **Headers X-RateLimit-*** en responses**: Confirma que el sistema está activo
4. **Logs de Cloudflare**: Revisa el Analytics > Security para ver bloqueos
5. **Performance**: Asegura que los middlewares no impacten latencia significativamente

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en producción
- [ ] Nginx actualizado con configuración de seguridad
- [ ] Módulo `libnginx-mod-http-headers-more` instalado (o líneas comentadas)
- [ ] Código actualizado en el servidor (git pull)
- [ ] Servidor reiniciado
- [ ] `/.well-known/api-config.json` accesible
- [ ] API endpoints respondiendo con headers de rate limit
- [ ] CORS funcionando desde frontend permitido
- [ ] Acceso directo a IP bloqueado (403)
- [ ] Cloudflare en modo proxy (nube naranja)
- [ ] SSL/TLS en modo Full (strict)
- [ ] Logs monitoreados sin errores críticos

## 🔄 Mantenimiento Continuo

### Actualizar IPs de Cloudflare (Mensual)

Cloudflare actualiza sus rangos de IP ocasionalmente. Actualiza `src/server/lib/cloudflare.ts`:

```bash
# Obtener IPs actuales
curl https://www.cloudflare.com/ips-v4
curl https://www.cloudflare.com/ips-v6

# Actualizar en cloudflare.ts
# Reiniciar servidor
```

### Rotar Secrets (Trimestral)

- Rotar `DISCORD_CLIENT_SECRET`
- Cambiar `JWT_SECRET` si usas JWTs
- Revisar y actualizar configuración de Cloudflare

### Auditoría de Seguridad (Trimestral)

- Revisar logs de accesos bloqueados
- Verificar que rate limits son apropiados
- Actualizar dependencias de npm
- Revisar y actualizar configuración de Nginx

## 📚 Recursos Adicionales

- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [NGINX Security Best Practices](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [README/SECURITY_BACKEND_GUIDE.md](./SECURITY_BACKEND_GUIDE.md) - Guía completa de seguridad

---

**Fecha de última actualización**: 2025-11-07
**Versión**: 1.0.0
