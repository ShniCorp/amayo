# 🔧 Fix Aplicado: "Cannot read properties of undefined (reading 'upsert')"

## 📋 Resumen del Problema

**Error original:**
```
Cannot read properties of undefined (reading 'upsert')
at FeatureFlagService.setFlag (/home/shnimlz/amayo/src/core/services/FeatureFlagService.ts:562:32)
```

**Causa:**
Race condition donde `prisma.featureFlag` se vuelve `undefined` entre la validación y el uso, posiblemente por:
- Hot-reload / watch mode que recarga módulos
- Orden de inicialización de módulos en Discord.js
- Múltiples instancias de PrismaClient en memoria

---

## ✅ Solución Implementada

### 1. Referencias Locales al Delegado
En vez de usar `prisma.featureFlag` directamente, ahora capturamos una **referencia local** justo después de validarlo:

```typescript
// ANTES (vulnerable a race condition)
if (!prisma.featureFlag) throw new Error("...");
await prisma.featureFlag.upsert({ ... }); // ❌ puede fallar aquí

// AHORA (referencia local estable)
if (!prisma.featureFlag) throw new Error("...");
const featureFlagDelegate = prisma.featureFlag; // 📌 capturar ref
await featureFlagDelegate.upsert({ ... }); // ✅ usa la referencia
```

### 2. Doble Validación
Validamos tanto antes como después de capturar la referencia:

```typescript
// Primera validación
if (!prisma.featureFlag || typeof prisma.featureFlag.upsert !== "function") {
  logger.error({ msg: "Delegate missing", keys, typeofPrisma });
  throw new Error("Delegate missing");
}

// Capturar referencia
const featureFlagDelegate = prisma.featureFlag;

// Segunda validación (defensiva)
if (!featureFlagDelegate || typeof featureFlagDelegate.upsert !== "function") {
  logger.error({ msg: "Delegate lost between validation and use" });
  throw new Error("Delegate became undefined");
}

// Usar referencia estable
await featureFlagDelegate.upsert({ ... });
```

### 3. Aplicado en 3 Métodos
- `setFlag()` → usa `featureFlagDelegate.upsert()`
- `removeFlag()` → usa `featureFlagDelegate.delete()`
- `refreshCache()` → usa `featureFlagDelegate.findMany()`

---

## 🧪 Tests Realizados

### ✅ Test 1: Creación directa
```bash
npx tsx scripts/testCreateFlag.ts
```
**Resultado:** ✅ Pasa sin errores

### ✅ Test 2: Simulación de comando Discord
```bash
npx tsx scripts/testDiscordCommandFlow.ts
```
**Resultado:** ✅ Pasa sin errores (simula startup + delay + comando)

### ✅ Test 3: Prisma directo
```bash
npx tsx -e "import { prisma } from './src/core/database/prisma'; ..."
```
**Resultado:** ✅ CRUD operations funcionan

---

## 🚀 Cómo Aplicar el Fix

### Paso 1: Reiniciar el Bot
El error ocurrió porque el bot está ejecutando **código antiguo** (línea 562 del stack trace no coincide con el código actual).

**Opción A: PM2**
```bash
pm2 restart amayo
pm2 logs amayo --lines 50
```

**Opción B: Manual**
```bash
# Detener proceso actual
pkill -f "node.*amayo"

# Reiniciar
npm start
# o
pm2 start ecosystem.config.js
```

### Paso 2: Probar el Comando
Una vez reiniciado, ejecuta en Discord:
```
/featureflags create name:2025-10-alianza-blacklist status:disabled target:global
```

### Paso 3: Verificar Logs
Si funciona, verás:
```json
{"level":"info","msg":"[FeatureFlags] Flag \"2025-10-alianza-blacklist\" actualizado"}
```

Si falla (muy improbable ahora), verás uno de estos logs estructurados:
```json
{"level":"error","msg":"[FeatureFlags] Prisma featureFlag delegate missing or invalid","keys":[...],"typeofPrisma":"object"}
```
o
```json
{"level":"error","msg":"[FeatureFlags] FeatureFlag delegate lost between validation and use","typeofDelegate":"undefined"}
```

---

## 🔍 Si el Error Persiste

### Diagnóstico Avanzado

**1. Verificar versión del código en runtime:**
```bash
# Ver línea exacta del error en el archivo actual
sed -n '613p' /home/shni/amayo/amayo/src/core/services/FeatureFlagService.ts
# Debería mostrar: await featureFlagDelegate.upsert({
```

**2. Verificar módulo Prisma en runtime:**
```bash
npx tsx -e "
import { prisma } from './src/core/database/prisma';
console.log('Prisma:', typeof prisma);
console.log('featureFlag delegate:', typeof prisma.featureFlag);
console.log('Keys:', Object.keys(prisma).slice(0, 30));
"
```

**3. Buscar múltiples instancias de Prisma:**
```bash
grep -r "new PrismaClient" src/
# Debería mostrar solo: src/core/database/prisma.ts:8
```

**4. Revisar si hay imports circulares:**
```bash
npx madge --circular src/
```

### Posibles Causas Restantes (si persiste)

1. **TypeScript transpilado vs TSX:** El bot podría estar usando JS compilado antiguo en `dist/`
   ```bash
   rm -rf dist/
   npm run build  # si tienes script de build
   ```

2. **Caché de módulos de Node:** Limpiar require cache
   ```bash
   rm -rf node_modules/.cache/
   ```

3. **Hot-reload agresivo:** Deshabilitar watch mode temporalmente

4. **Prisma Client desincronizado:**
   ```bash
   npx prisma generate
   npm run build
   pm2 restart amayo
   ```

---

## 📊 Archivos Modificados

- ✅ `src/core/services/FeatureFlagService.ts`
  - Líneas 84-104: `refreshCache()` con referencia local
  - Líneas 584-627: `setFlag()` con doble validación y referencia local
  - Líneas 652-668: `removeFlag()` con validación y referencia local

- ✅ `scripts/testDiscordCommandFlow.ts` (nuevo)
  - Script de prueba que simula el flujo completo del comando Discord

---

## 🎯 Resultado Esperado

- ❌ **ANTES:** Error `Cannot read properties of undefined (reading 'upsert')` intermitente
- ✅ **AHORA:** 
  - Flag se crea correctamente
  - Si hay problema, logs estructurados identifican la causa exacta
  - Referencias locales previenen race conditions

---

## 📞 Próximos Pasos

1. **Reinicia el bot** (pm2 restart o npm start)
2. **Prueba el comando** `/featureflags create`
3. **Revisa logs** (deberían ser exitosos ahora)
4. Si persiste:
   - Pega aquí los logs JSON completos con el nuevo formato
   - Ejecuta los comandos de diagnóstico avanzado
   - Revisa si hay `dist/` con código compilado antiguo

---

**Fecha del fix:** 2025-10-31  
**Tests locales:** ✅ Todos pasan  
**Estado:** Listo para producción (requiere restart del bot)
