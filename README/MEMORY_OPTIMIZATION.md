# 🚀 Gestión Optimizada de Memoria en Amayo

## ✅ Sistema de Memoria ya Implementado

Tu proyecto **ya cuenta con un sistema robusto de gestión de memoria**:

### 1. **Monitor de Memoria en Tiempo Real** (`memoryMonitor.ts`)
- Rastrea RSS, heap usage, memoria externa y latencia del event loop
- Alertas automáticas cuando el heap supera el 80% del límite
- Activación: `MEMORY_LOG_INTERVAL_SECONDS=120`

### 2. **Caché Limitado y Configurable**
```typescript
// En client.ts - Configuración actual
MessageManager: 50 (configurable con CACHE_MESSAGES_LIMIT)
GuildMemberManager: 100 (configurable con CACHE_MEMBERS_LIMIT)  
ThreadManager: 10
ReactionManager: 0 (desactivado)
GuildInviteManager: 0 (desactivado)
PresenceManager: 0 (desactivado)
```

### 3. **Sistema de Limpieza Automática (Sweepers)**
- **Mensajes**: cada 5 min borra los más antiguos de 15 min
- **Usuarios bot**: cada 30 minutos
- Configurable con `SWEEP_MESSAGES_INTERVAL_SECONDS` y `SWEEP_MESSAGES_LIFETIME_SECONDS`

### 4. **Conexiones Singleton**
- Una sola instancia de Prisma compartida
- Gestión adecuada de Redis con cierre limpio

## 🆕 Mejoras Añadidas

### 5. **Optimizador de Memoria Avanzado** (`memoryOptimizer.ts`)
- Garbage Collection forzado periódico (cada 15 min por defecto)
- GC automático cuando el heap supera un umbral (200MB por defecto)
- Estadísticas detalladas de liberación de memoria
- Activación: `ENABLE_MEMORY_OPTIMIZER=true`

## 📊 Scripts de Ejecución Optimizados

### Desarrollo
```bash
# Configuración estándar
npm run dev

# Ultra-ligero (para servidores limitados)
npm run dev:ultra
# Cache: 10 msgs, 25 miembros | Limpieza: cada 2min | Monitor: cada 1min

# Con monitoreo de memoria
npm run dev:mem

# Optimizado con GC manual
npm run dev:optimized
```

### Producción
```bash
# Estándar (384MB limit)
npm run start:prod

# Con optimizaciones avanzadas (512MB limit + GC)
npm run start:prod-optimized
```

## ⚙️ Variables de Entorno

### Monitoreo
```env
MEMORY_LOG_INTERVAL_SECONDS=120    # Monitor cada 2 minutos
ENABLE_MEMORY_OPTIMIZER=true       # Habilitar GC automático
```

### Cache Discord
```env
CACHE_MESSAGES_LIMIT=50           # Mensajes en memoria
CACHE_MEMBERS_LIMIT=100           # Miembros por servidor
```

### Limpieza
```env
SWEEP_MESSAGES_INTERVAL_SECONDS=300    # Cada 5 minutos
SWEEP_MESSAGES_LIFETIME_SECONDS=900    # Borrar > 15 minutos
```

## 🎯 Configuraciones Recomendadas

### Para VPS Limitado (< 512MB RAM)
```bash
npm run dev:ultra
```
- Uso de memoria: ~80-150MB
- Cache mínimo pero funcional

### Para Desarrollo Normal (1GB+ RAM)
```bash
npm run dev:optimized
```
- Uso de memoria: ~200-400MB
- Balance perfecto rendimiento/memoria

### Para Producción (2GB+ RAM)
```bash
npm run start:prod-optimized
```
- Uso de memoria: ~300-600MB
- Máximo rendimiento con seguridad

## 📈 Métricas que Obtienes

Con el monitor habilitado verás logs como:
```
[MEM] rss=156.2MB heapUsed=89.4MB heapTotal=112.1MB ext=8.3MB evLoopDelay=1.24ms
🗑️ GC threshold: liberó 23.1MB en 4ms
```

## 🔧 Personalización Avanzada

El sistema es completamente configurable. Puedes ajustar:
- Intervalos de limpieza
- Límites de cache por tipo
- Umbrales de GC automático
- Frecuencia de monitoreo

**¡Tu bot ya está optimizado para usar memoria de forma eficiente!** 🎉
