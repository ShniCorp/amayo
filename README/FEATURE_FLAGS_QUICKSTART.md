# 🎮 Feature Flags - Guía Rápida de Instalación

## 📦 Lo que se creó

1. **Schema de Prisma** (`prisma/schema.prisma`)
   - Modelo `FeatureFlag` con todos los campos necesarios

2. **Servicio Principal** (`src/core/services/FeatureFlagService.ts`)
   - Singleton con caché en memoria
   - Evaluación de flags con contexto
   - Estrategias de rollout (percentage, whitelist, blacklist, gradual, random)
   - Sistema de estadísticas

3. **Tipos TypeScript** (`src/core/types/featureFlags.ts`)
   - Tipos completos para el sistema
   - Interfaces para configuración y evaluación

4. **Helpers y Decoradores** (`src/core/lib/featureFlagHelpers.ts`)
   - `@RequireFeature` - Decorador para proteger métodos
   - `featureGuard` - Guard con respuesta automática
   - `isFeatureEnabled` - Check básico
   - `abTest` - A/B testing
   - Y más...

5. **Comando de Administración** (`src/commands/admin/featureflags.ts`)
   - Crear, listar, actualizar, eliminar flags
   - Configurar rollouts
   - Ver estadísticas

6. **Loader** (`src/core/loaders/featureFlagsLoader.ts`)
   - Inicialización automática del servicio

7. **Documentación** (`README/FEATURE_FLAGS_SYSTEM.md`)
   - Guía completa con ejemplos

8. **Scripts** (`scripts/setupFeatureFlags.ts`)
   - Setup inicial con flags de ejemplo

9. **Ejemplos** (`src/examples/featureFlagsUsage.ts`)
   - 11 patrones de uso diferentes

---

## 🚀 Instalación (Paso a Paso)

### 1. Genera el cliente de Prisma

```bash
npx prisma generate
```

Esto creará los tipos TypeScript para el nuevo modelo `FeatureFlag`.

### 2. Ejecuta la migración

```bash
npx prisma migrate dev --name add_feature_flags
```

Esto creará la tabla en tu base de datos.

### 3. (Opcional) Crea flags de ejemplo

```bash
npx tsx scripts/setupFeatureFlags.ts
```

Esto creará 8 feature flags de ejemplo para que puedas probar el sistema.

### 4. Integra el loader en tu bot

Abre tu archivo principal donde cargas los servicios (probablemente `src/main.ts` o similar) y añade:

```typescript
import { loadFeatureFlags } from './core/loaders/featureFlagsLoader';

// Antes de iniciar el bot
await loadFeatureFlags();
```

O si tienes un sistema de loaders centralizado, simplemente impórtalo ahí.

### 5. ¡Listo! Empieza a usar feature flags

---

## 💡 Uso Rápido

### En un comando nuevo o existente:

```typescript
import { featureGuard } from '@/core/lib/featureFlagHelpers';

export async function execute(interaction: CommandInteraction) {
  // Check si el flag está habilitado
  if (!await featureGuard('new_feature', interaction)) {
    return; // Automáticamente responde al usuario si está disabled
  }

  // Tu código aquí (solo se ejecuta si el flag está habilitado)
  await interaction.reply('✨ Feature habilitada!');
}
```

### Crear un flag desde Discord:

```
/featureflags create name:new_feature status:disabled target:global description:"Mi nueva feature"
```

### Habilitarlo:

```
/featureflags update flag:new_feature status:enabled
```

### Rollout progresivo (25% de usuarios):

```
/featureflags rollout flag:new_feature strategy:percentage percentage:25
```

---

## 🎯 Casos de Uso Comunes

### 1. Desplegar una feature nueva gradualmente

```bash
# Día 1: Deshabilitada, en desarrollo
/featureflags create name:pvp_system status:disabled target:global

# Día 5: Beta testing con usuarios específicos
/featureflags rollout flag:pvp_system strategy:whitelist
# (añade IDs mediante código o actualiza la config)

# Día 10: 10% de usuarios
/featureflags rollout flag:pvp_system strategy:percentage percentage:10

# Día 15: 50% de usuarios
/featureflags update flag:pvp_system
/featureflags rollout flag:pvp_system strategy:percentage percentage:50

# Día 20: 100% de usuarios
/featureflags update flag:pvp_system status:enabled

# Día 30: Eliminar el flag y el código del check
/featureflags delete flag:pvp_system
```

### 2. A/B Testing

```typescript
import { abTest, extractContext } from '@/core/lib/featureFlagHelpers';

const context = extractContext(interaction);

await abTest('new_algorithm', context, {
  variant: async () => {
    // 50% de usuarios ven esto
    return newAlgorithm();
  },
  control: async () => {
    // 50% ven esto
    return oldAlgorithm();
  }
});
```

### 3. Kill Switch (emergencias)

Si hay un bug crítico en una feature:

```bash
/featureflags update flag:problematic_feature status:maintenance
```

Esto la deshabilitará inmediatamente sin necesidad de redeploy.

### 4. Eventos temporales

```typescript
// Configurar con fechas
await featureFlagService.setFlag({
  name: 'christmas_event',
  status: 'enabled',
  target: 'global',
  startDate: new Date('2025-12-15'),
  endDate: new Date('2025-12-31')
});

// El flag se auto-deshabilitará el 1 de enero
```

---

## 📊 Monitoreo

### Ver estadísticas de uso:

```
/featureflags stats flag:nombre_flag
```

Te mostrará:
- Total de evaluaciones
- Cuántas veces se habilitó
- Cuántas veces se deshabilitó
- Tasa de habilitación (%)

### Ver todos los flags:

```
/featureflags list
```

### Refrescar caché:

```
/featureflags refresh
```

---

## 🔧 Troubleshooting

### Los flags no se aplican

1. Verifica que el servicio está inicializado:
   ```typescript
   await loadFeatureFlags();
   ```

2. Refresca el caché:
   ```
   /featureflags refresh
   ```

3. Verifica que el flag existe:
   ```
   /featureflags info flag:nombre_flag
   ```

### Errores de TypeScript

Si ves errores tipo "Property 'featureFlag' does not exist":

```bash
npx prisma generate
```

Esto regenerará los tipos de Prisma.

### La migración falla

Si la migración falla, verifica tu conexión a la base de datos en `.env`:

```env
XATA_DB="postgresql://..."
XATA_SHADOW_DB="postgresql://..."
```

---

## 📚 Recursos

- **Documentación completa**: `README/FEATURE_FLAGS_SYSTEM.md`
- **Ejemplos de uso**: `src/examples/featureFlagsUsage.ts`
- **Tipos**: `src/core/types/featureFlags.ts`
- **Servicio**: `src/core/services/FeatureFlagService.ts`
- **Helpers**: `src/core/lib/featureFlagHelpers.ts`

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo de Feature Flags. Puedes:

✅ Desplegar features sin miedo a romper producción
✅ Hacer rollouts progresivos
✅ A/B testing
✅ Kill switches para emergencias
✅ Eventos temporales
✅ Beta testing con usuarios específicos
✅ Monitorear el uso de cada feature

---

**Tip Pro**: Combina feature flags con tus deployments. Por ejemplo:

1. Despliega código nuevo con flag disabled
2. Verifica que el deploy fue exitoso
3. Habilita el flag progresivamente (10% → 50% → 100%)
4. Monitorea métricas/errores
5. Si hay problemas, desactiva el flag instantáneamente
6. Una vez estable, elimina el flag y el código antiguo

---

Creado con 🎮 para Amayo Bot
