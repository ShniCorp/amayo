# 🚀 Guía Rápida de Deployment - AmayoWeb

## Pre-requisitos

- [ ] Node.js 18+ instalado
- [ ] npm o pnpm
- [ ] Cuenta de Cloudflare configurada
- [ ] Dominio configurado (docs.amayo.dev, api.amayo.dev)
- [ ] Servidor VPS (opcional, si usas Nginx)

## 📦 1. Frontend (AmayoWeb)

### Instalación
```bash
cd AmayoWeb
npm install
```

### Variables de Entorno
Crear `.env` en `AmayoWeb/`:
```env
VITE_DISCORD_CLIENT_ID=991062751633883136
VITE_APP_VERSION=2.0.0
```

### Build de Producción
```bash
npm run build
```

Esto genera la carpeta `dist/` lista para deployment.

### Deployment en Vercel/Netlify

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deployment Manual (VPS con Nginx)
```bash
# Copiar archivos al servidor
scp -r dist/* user@server:/var/www/docs.amayo.dev/

# Configurar Nginx (ver NGINX_CONFIG.md en README/)
sudo nano /etc/nginx/sites-available/docs.amayo.dev
sudo ln -s /etc/nginx/sites-available/docs.amayo.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 2. Backend Security Setup

### A. Configurar Cloudflare

1. **Login a Cloudflare Dashboard**
   - Ir a tu dominio

2. **SSL/TLS**
   - Modo: `Full (strict)`
   - Always Use HTTPS: `On`
   - Minimum TLS Version: `1.2`

3. **Firewall Rules**
   
   **Regla 1: Bloquear bots maliciosos**
   ```
   Campo: User Agent
   Operador: contains
   Valor: curl|wget|python|scrapy
   Acción: Block
   ```

   **Regla 2: Rate limiting**
   ```
   Campo: Request Rate
   Operador: greater than
   Valor: 30 requests per minute
   Acción: Challenge
   ```

   **Regla 3: Validar headers**
   ```
   Campo: X-Requested-With
   Operador: does not equal
   Valor: XMLHttpRequest
   Acción: Block
   ```

4. **Security Settings**
   - Security Level: `High`
   - Bot Fight Mode: `On`
   - Challenge Passage: `30 minutes`

5. **Rate Limiting**
   ```
   /api/auth/* - 3 requests/minute per IP
   /api/* - 30 requests/minute per IP
   ```

6. **Page Rules**
   ```
   docs.amayo.dev/*
   - Cache Level: Standard
   - Browser Cache TTL: 4 hours
   - Always Online: On
   
   api.amayo.dev/*
   - Cache Level: Bypass
   - Security Level: High
   ```

### B. Actualizar archivo de configuración

Editar `AmayoWeb/public/.well-known/api-config.json`:
```json
{
  "endpoint": "https://api.amayo.dev/api",
  "version": "2.0.0",
  "features": {
    "rateLimit": true,
    "cors": true,
    "csrf": true
  },
  "security": {
    "requiresToken": true,
    "allowedOrigins": [
      "https://docs.amayo.dev",
      "https://amayo.dev"
    ]
  }
}
```

---

## 🖥️ 3. Backend (Node.js/Express)

### Instalar Dependencias
```bash
npm install helmet express-rate-limit cors winston
```

### Crear Middleware de Seguridad

**`middleware/security.js`:**
```javascript
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

// CORS Configuration
export const corsOptions = {
  origin: ['https://docs.amayo.dev', 'https://amayo.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Token',
    'X-Requested-With',
    'X-Timestamp'
  ]
};

// Rate Limiters
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests'
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true
});

// Cloudflare Validation
export const cloudflareOnly = (req, res, next) => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (!cfIp) {
    return res.status(403).json({ error: 'Direct access forbidden' });
  }
  next();
};

// Security Headers
export const securityHeaders = helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
});
```

**Aplicar en `server.js`:**
```javascript
import express from 'express';
import cors from 'cors';
import {
  corsOptions,
  apiLimiter,
  authLimiter,
  cloudflareOnly,
  securityHeaders
} from './middleware/security.js';

const app = express();

// Aplicar middlewares
app.use(securityHeaders);
app.use(cloudflareOnly);
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Ocultar información del servidor
app.disable('x-powered-by');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 🌐 4. Nginx Configuration (VPS)

Si usas VPS, configurar Nginx (ver `README/NGINX_SECURITY_CONFIG.md` para configuración completa):

```bash
# Descargar IPs de Cloudflare actualizadas
curl https://www.cloudflare.com/ips-v4 > /tmp/cloudflare-ips-v4.txt
curl https://www.cloudflare.com/ips-v6 > /tmp/cloudflare-ips-v6.txt

# Configurar Nginx
sudo nano /etc/nginx/sites-available/api.amayo.dev

# Testear configuración
sudo nginx -t

# Recargar
sudo systemctl reload nginx
```

---

## ✅ 5. Verificación Post-Deployment

### Tests de Seguridad

**1. Verificar que el backend solo acepta requests de Cloudflare:**
```bash
# Esto debe fallar (403 Forbidden)
curl https://api.amayo.dev/api/bot/stats

# Esto debe funcionar (desde el navegador con el sitio)
# Abrir: https://docs.amayo.dev/docs
```

**2. Verificar Rate Limiting:**
```bash
# Hacer múltiples requests rápidos
for i in {1..35}; do
  curl https://api.amayo.dev/api/bot/stats
done
# Debe dar error 429 después de 30 requests
```

**3. Verificar CORS:**
```bash
# Desde un dominio no permitido debe fallar
curl -H "Origin: https://evil.com" https://api.amayo.dev/api/bot/stats
```

**4. Verificar Headers de Seguridad:**
```bash
curl -I https://docs.amayo.dev/
# Debe incluir: X-Frame-Options, X-Content-Type-Options, etc.
```

### Tests Funcionales

**1. Navegación:**
- [ ] https://docs.amayo.dev/ carga correctamente
- [ ] https://docs.amayo.dev/docs muestra documentación
- [ ] https://docs.amayo.dev/terms muestra términos
- [ ] https://docs.amayo.dev/privacy muestra política de privacidad
- [ ] Sidebar de navegación funciona
- [ ] Scroll suave entre secciones

**2. Seguridad:**
- [ ] No se puede acceder directamente a la IP del backend
- [ ] Rate limiting funciona
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad presentes
- [ ] SSL/TLS funcionando (candado verde)

**3. Performance:**
- [ ] Caché funcionando (verificar Network tab)
- [ ] Tiempos de carga < 2 segundos
- [ ] No errores en console

---

## 📊 6. Monitoreo

### Configurar Alertas en Cloudflare

1. **Alertas de Seguridad:**
   - Rate limiting exceeded
   - Firewall events
   - DDoS attacks

2. **Alertas de Rendimiento:**
   - Origin response time
   - Error rate increase

### Logs

**Backend logs:**
```bash
# Verificar logs de errores
tail -f /var/log/your-app/error.log

# Verificar logs de seguridad
tail -f /var/log/your-app/security.log
```

**Nginx logs:**
```bash
tail -f /var/log/nginx/api.amayo.dev.error.log
tail -f /var/log/nginx/api.amayo.dev.access.log
```

---

## 🐛 Troubleshooting

### Frontend no carga
```bash
# Verificar que el build fue exitoso
cd AmayoWeb
npm run build
# Revisar carpeta dist/

# Verificar variables de entorno
cat .env
```

### API no responde
```bash
# Verificar que el servidor está corriendo
pm2 status
# o
systemctl status your-api-service

# Verificar logs
pm2 logs
```

### CORS errors
```bash
# Verificar configuración de CORS en backend
# Asegurarse que el dominio está en allowedOrigins
```

### Rate limiting muy restrictivo
```javascript
// Ajustar en backend/middleware/security.js
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // Aumentar de 30 a 60
});
```

---

## 📝 Checklist Final

- [ ] Frontend deployed y accesible
- [ ] Backend deployed y protegido
- [ ] Cloudflare configurado correctamente
- [ ] SSL/TLS funcionando
- [ ] Rate limiting activo
- [ ] CORS configurado
- [ ] Headers de seguridad presentes
- [ ] Páginas legales accesibles
- [ ] Sidebar de navegación funciona
- [ ] No errores en console
- [ ] Logs configurados
- [ ] Alertas configuradas
- [ ] Variables de entorno configuradas
- [ ] Backup configurado

---

## 🎉 ¡Listo!

Tu sitio ahora está:
- ✅ Desplegado y funcional
- ✅ Seguro contra ataques comunes
- ✅ Protegido por Cloudflare
- ✅ Con páginas legales (GDPR compliant)
- ✅ Con diseño profesional
- ✅ Optimizado para performance

---

## 📚 Documentación Adicional

- `README/SECURITY_BACKEND_GUIDE.md` - Guía completa de seguridad
- `README/NGINX_SECURITY_CONFIG.md` - Configuración de Nginx
- `README/CAMBIOS_NOVIEMBRE_2025.md` - Resumen de cambios

---

**Última actualización:** 6 de Noviembre, 2025
**Versión:** 2.0.0
