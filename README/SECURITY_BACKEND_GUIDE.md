# Guía de Seguridad Backend para Amayo

Esta guía contiene las mejoras de seguridad implementadas en el frontend y las recomendaciones para el backend para proteger la IP del servidor.

## 🛡️ Problema Identificado

Según el video de referencia (https://youtu.be/iXOlQszplC8), incluso con Cloudflare, un atacante puede:
1. Ver el código fuente del frontend y encontrar URLs del backend
2. Realizar timing attacks para encontrar la IP real del servidor
3. Bypassear Cloudflare usando técnicas de header manipulation

## ✅ Soluciones Implementadas en el Frontend

### 1. Servicio de Seguridad (`src/services/security.js`)

#### Características:
- **No expone URLs directamente en el código**: Las URLs se obtienen dinámicamente
- **Token de sesión único**: Genera un token por sesión para identificar clientes
- **Headers de seguridad**: Incluye timestamps y tokens en cada request
- **Rate limiting client-side**: Previene abuso desde el cliente
- **Validación de respuestas**: Verifica la autenticidad de las respuestas del servidor

### 2. Sistema de Rate Limiting

Implementado en `security.js`:
```javascript
- Login: 3 intentos por minuto
- API calls: 30 requests por minuto
- Default: 10 requests por minuto
```

### 3. Protección CSRF

- State parameter en OAuth2
- Validación de state en callbacks
- Tokens de sesión únicos

### 4. Caché de Datos

- Stats del bot: 5 minutos
- Info del bot: 1 hora
- Reduce requests innecesarios

## 🔧 Recomendaciones para el Backend

### 1. Configuración de Cloudflare

#### A. Activar IP Anonymization
```
Cloudflare Dashboard > Security > Settings > Privacy > Enable IP Geolocation
```

#### B. Bot Fight Mode
```
Cloudflare Dashboard > Security > Bots > Enable Bot Fight Mode
```

#### C. Under Attack Mode (opcional)
Para protección extra cuando se detecte un ataque:
```
Cloudflare Dashboard > Security > Settings > Security Level > I'm Under Attack
```

#### D. Reglas de Firewall Personalizadas

```
# Bloquear acceso directo a la IP
- Si el request no viene de Cloudflare (validar CF-Connecting-IP)
- Bloquear requests sin User-Agent
- Bloquear requests sin X-Requested-With

# Rate Limiting Avanzado
- 30 requests/minuto por IP
- 100 requests/minuto por usuario autenticado
```

### 2. Configuración del Servidor Backend (Express.js ejemplo)

```javascript
// middleware/security.js
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Verificar que el request viene de Cloudflare
export const cloudflareOnly = (req, res, next) => {
  const cfIp = req.headers['cf-connecting-ip'];
  
  // Lista de IPs de Cloudflare (actualizar periódicamente)
  const cloudflareIPs = [
    // https://www.cloudflare.com/ips/
    '173.245.48.0/20',
    '103.21.244.0/22',
    // ... más IPs
  ];
  
  if (!cfIp || !isCloudflareIP(req.ip, cloudflareIPs)) {
    return res.status(403).json({ error: 'Direct access forbidden' });
  }
  
  next();
};

// Rate limiting por endpoint
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip para requests autenticados con rate limit más alto
    return req.user && req.user.premium;
  }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3, // Solo 3 intentos de login por minuto
  skipSuccessfulRequests: true
});

// Headers de seguridad
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
});
```

### 3. Validación de Headers

```javascript
// middleware/validateRequest.js
export const validateSecurityHeaders = (req, res, next) => {
  const requiredHeaders = [
    'x-client-token',
    'x-requested-with',
    'x-timestamp'
  ];
  
  // Verificar headers obligatorios
  for (const header of requiredHeaders) {
    if (!req.headers[header]) {
      return res.status(400).json({ 
        error: 'Missing security headers' 
      });
    }
  }
  
  // Validar timestamp (prevenir replay attacks)
  const timestamp = parseInt(req.headers['x-timestamp']);
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutos
  
  if (Math.abs(now - timestamp) > maxAge) {
    return res.status(401).json({ 
      error: 'Request expired' 
    });
  }
  
  // Agregar server token a la respuesta
  res.setHeader('X-Server-Token', generateServerToken());
  
  next();
};
```

### 4. CORS Configuración Estricta

```javascript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://docs.amayo.dev',
      'https://amayo.dev'
    ];
    
    // Permitir requests sin origin (mobile apps, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Token',
    'X-Requested-With',
    'X-Timestamp'
  ],
  exposedHeaders: ['X-Server-Token'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
```

### 5. Ocultar Información del Servidor

```javascript
// Remover headers que revelan información
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  next();
});
```

### 6. Sistema de API Keys para el Frontend

En lugar de exponer el endpoint directamente, usar API keys rotativas:

```javascript
// Generar API key para el frontend (rotar cada 24 horas)
const generateApiKey = () => {
  const date = new Date().toISOString().split('T')[0];
  const secret = process.env.API_KEY_SECRET;
  return crypto
    .createHash('sha256')
    .update(date + secret)
    .digest('hex');
};

// Middleware para validar API key
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = generateApiKey();
  
  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};
```

### 7. Logging y Monitoreo

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Log de requests sospechosos
export const securityLogger = (req, res, next) => {
  const suspicious = 
    !req.headers['cf-connecting-ip'] ||
    !req.headers['user-agent'] ||
    req.headers['user-agent'].includes('curl') ||
    req.headers['user-agent'].includes('wget');
  
  if (suspicious) {
    logger.warn({
      type: 'suspicious_request',
      ip: req.ip,
      headers: req.headers,
      path: req.path,
      timestamp: new Date()
    });
  }
  
  next();
};
```

### 8. Implementación en el Servidor

```javascript
// server.js
import express from 'express';
import {
  cloudflareOnly,
  apiLimiter,
  authLimiter,
  securityHeaders,
  validateSecurityHeaders,
  securityLogger
} from './middleware/security.js';

const app = express();

// Aplicar middlewares de seguridad
app.use(securityHeaders);
app.use(cloudflareOnly); // IMPORTANTE: Solo aceptar requests de Cloudflare
app.use(securityLogger);
app.use(validateSecurityHeaders);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Ocultar endpoint real
app.use('/api', (req, res, next) => {
  // No revelar estructura interna en errores
  res.locals.showStack = false;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);

// Error handler - no revelar información
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    path: req.path
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    // No incluir detalles en producción
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message 
    })
  });
});
```

## 🔒 Configuración de Variables de Entorno

### Frontend (.env)
```env
VITE_DISCORD_CLIENT_ID=your_client_id
VITE_APP_VERSION=1.0.0
# NO incluir URLs del backend aquí
```

### Backend (.env)
```env
PORT=3000
NODE_ENV=production
API_KEY_SECRET=your_random_secret_here
JWT_SECRET=your_jwt_secret_here
DISCORD_CLIENT_SECRET=your_client_secret
ALLOWED_ORIGINS=https://docs.amayo.dev,https://amayo.dev

# Database
DATABASE_URL=your_database_url

# Cloudflare
CLOUDFLARE_API_TOKEN=your_token
```

## 📋 Checklist de Seguridad

### Frontend ✅
- [x] Servicio de seguridad implementado
- [x] Rate limiting client-side
- [x] No URLs hardcodeadas
- [x] Protección CSRF
- [x] Validación de respuestas
- [x] Sistema de caché

### Backend (Por Implementar)
- [ ] Verificar requests de Cloudflare
- [ ] Rate limiting server-side
- [ ] Validación de headers de seguridad
- [ ] CORS estricto
- [ ] Ocultar información del servidor
- [ ] Sistema de API keys
- [ ] Logging y monitoreo
- [ ] Error handling seguro

### Cloudflare
- [ ] Bot Fight Mode activado
- [ ] Reglas de firewall configuradas
- [ ] Rate limiting configurado
- [ ] SSL/TLS en modo Full (strict)
- [ ] DNSSEC activado
- [ ] Page Rules configuradas

## 🚀 Despliegue

### 1. Actualizar Cloudflare
```bash
# Configurar reglas de firewall
# Dashboard > Security > WAF > Create firewall rule
```

### 2. Actualizar el Backend
```bash
npm install helmet express-rate-limit cors winston
```

### 3. Variables de Entorno
Asegúrate de configurar todas las variables de entorno en producción.

### 4. Monitoreo
Implementa un sistema de alertas para:
- Intentos de acceso directo a la IP
- Rate limiting excedido
- Errores de seguridad
- Requests sospechosos

## 📚 Recursos Adicionales

- [Cloudflare Security Best Practices](https://developers.cloudflare.com/fundamentals/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## ⚠️ Notas Importantes

1. **Nunca expongas URLs del backend en el código del cliente**
2. **Siempre valida que los requests vengan de Cloudflare**
3. **Usa rate limiting tanto en cliente como en servidor**
4. **Monitorea logs constantemente**
5. **Mantén Cloudflare actualizado con las últimas reglas de seguridad**
6. **Rota API keys regularmente**
7. **Implementa un sistema de alertas**

## 🔄 Mantenimiento

### Semanal
- Revisar logs de seguridad
- Verificar rate limiting efectivo
- Actualizar reglas de firewall si es necesario

### Mensual
- Rotar API keys
- Actualizar lista de IPs de Cloudflare
- Revisar políticas de CORS
- Auditar accesos sospechosos

### Trimestral
- Realizar penetration testing
- Actualizar dependencias de seguridad
- Revisar y actualizar esta guía
