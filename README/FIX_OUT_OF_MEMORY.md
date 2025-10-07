# Fix: Out of Memory en PostgreSQL

## Problema Identificado

El bot estaba experimentando errores `out of memory` (código 53200) en PostgreSQL debido a que **en cada mensaje recibido** se estaba ejecutando un `prisma.guild.upsert()` para obtener la configuración del servidor (principalmente el prefix).

### Síntomas
```
ConnectorError(ConnectorError { 
  kind: QueryError(PostgresError { 
    code: "53200", 
    message: "out of memory", 
    severity: "ERROR", 
    detail: Some("Failed on request of size 8192.") 
  })
})
```

Esto ocurría en:
- `messageCreate.ts` línea 199: `await bot.prisma.guild.upsert(...)` en cada mensaje
- `handleAIReply()`: `await bot.prisma.guild.findUnique(...)` en cada respuesta a la IA

## Solución Implementada

### 1. Sistema de Caché con Redis
Se creó un nuevo módulo `guildCache.ts` que:

- **Almacena en caché** la configuración de cada guild por 5 minutos (TTL: 300s)
- **Reduce consultas a PostgreSQL** en ~99% (solo 1 consulta cada 5 minutos por guild)
- **Maneja errores gracefully** retornando valores por defecto si Redis o PostgreSQL fallan

#### Funciones principales:
```typescript
// Obtiene config desde caché o DB (con upsert automático)
getGuildConfig(guildId, guildName, prisma): Promise<GuildConfig>

// Invalida el caché cuando se actualiza la config
invalidateGuildCache(guildId): Promise<void>

// Actualiza directamente el caché
updateGuildCache(config): Promise<void>
```

### 2. Actualización de `messageCreate.ts`
- Reemplazó `prisma.guild.upsert()` por `getGuildConfig()`
- Ahora usa caché en Redis antes de consultar PostgreSQL
- Aplica en:
  - Handler principal de mensajes
  - `handleAIReply()` para respuestas a la IA

### 3. Invalidación de Caché en `settings.ts`
Se agregó invalidación automática del caché cuando se actualiza:
- **Prefix del servidor**
- **Roles de staff**
- **AI Role Prompt**

Esto asegura que los cambios se reflejen inmediatamente en el próximo mensaje.

## Impacto en el Rendimiento

### Antes:
- **Por cada mensaje**: 1 consulta a PostgreSQL (upsert)
- En un servidor activo con 100 mensajes/minuto: **100 consultas/minuto**
- En 10 servidores: **1,000 consultas/minuto**

### Después:
- **Primera consulta**: va a PostgreSQL + guarda en Redis (TTL 5 min)
- **Siguientes consultas**: se obtienen de Redis (0 consultas a PostgreSQL)
- En un servidor activo: **~1 consulta cada 5 minutos**
- En 10 servidores: **~10 consultas cada 5 minutos** (reducción del 99.8%)

## Archivos Modificados

1. **`src/core/database/guildCache.ts`** (NUEVO)
   - Sistema completo de caché con Redis
   - Manejo de errores robusto
   - Logging detallado

2. **`src/events/messageCreate.ts`**
   - Reemplazó `prisma.guild.upsert()` con `getGuildConfig()`
   - Reemplazó `prisma.guild.findUnique()` en `handleAIReply()`

3. **`src/commands/messages/settings-server/settings.ts`**
   - Agregó `invalidateGuildCache()` después de:
     - Actualizar prefix
     - Actualizar staff roles
     - Actualizar AI role prompt

## Verificación

Para verificar que funciona:

1. **Logs de Redis**: Buscar mensajes como:
   ```
   ✅ Guild config obtenida desde caché
   ✅ Guild config guardada en caché
   🗑️  Caché de guild invalidada
   ```

2. **Logs de Prisma**: Deberías ver **mucho menos** `prisma.guild.upsert()` en los logs

3. **Memoria de PostgreSQL**: Debería estabilizarse y no crecer descontroladamente

## Recomendaciones Adicionales

Si el problema persiste:

1. **Revisar otras consultas frecuentes** que puedan estar saturando PostgreSQL
2. **Aumentar memoria de PostgreSQL** si es posible en el plan de Heroku/hosting
3. **Implementar connection pooling** para Prisma si no está configurado
4. **Considerar agregar índices** en tablas con consultas pesadas

## Deployment

Asegúrate de que:
- ✅ Redis está configurado y accesible (`REDIS_URL` y `REDIS_PASS` en `.env`)
- ✅ El bot tiene conexión a Redis antes de procesar mensajes
- ✅ Se ejecuta `npm run build` o el equivalente para compilar TypeScript

---

**Fecha**: 2025-10-07  
**Severidad**: CRÍTICA  
**Estado**: RESUELTO ✅
