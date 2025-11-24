# 🎮 Feature Flags System

Sistema completo de Feature Flags para control de funcionalidades, rollouts progresivos, A/B testing y toggles dinámicos.

## 📋 Índice

- [Instalación](#instalación)
- [Conceptos](#conceptos)
- [Uso Básico](#uso-básico)
- [Ejemplos Avanzados](#ejemplos-avanzados)
- [Comando de Administración](#comando-de-administración)
- [Estrategias de Rollout](#estrategias-de-rollout)
- [Best Practices](#best-practices)

---

## 🚀 Instalación

### 1. Migración de Base de Datos

```bash
npx prisma migrate dev --name add_feature_flags
```

### 2. Inicialización del Servicio

En tu `src/loaders/` o punto de entrada principal:

```typescript
import { featureFlagService } from '@/core/services/FeatureFlagService';

// Inicializar el servicio
await featureFlagService.initialize();
```

---

## 🧠 Conceptos

### Estados de Flags

- **`enabled`**: Habilitado para todos
- **`disabled`**: Deshabilitado para todos
- **`rollout`**: Rollout progresivo según estrategia
- **`maintenance`**: Deshabilitado por mantenimiento

### Targets

- **`global`**: Aplica a todo el bot
- **`guild`**: Aplica por servidor
- **`user`**: Aplica por usuario
- **`channel`**: Aplica por canal

### Estrategias de Rollout

- **`percentage`**: Basado en % de usuarios
- **`whitelist`**: Solo IDs específicos
- **`blacklist`**: Todos excepto IDs específicos
- **`gradual`**: Rollout gradual en el tiempo
- **`random`**: Aleatorio por sesión

---

## 💡 Uso Básico

### 1. En Comandos con Decorador

```typescript
import { RequireFeature } from '@/core/lib/featureFlagHelpers';

class ShopCommand {
  @RequireFeature('new_shop_system', {
    fallbackMessage: '🔧 El nuevo sistema de tienda estará disponible pronto'
  })
  async execute(interaction: CommandInteraction) {
    // Este código solo se ejecuta si el flag está habilitado
    await interaction.reply('Bienvenido a la nueva tienda!');
  }
}
```

### 2. Con Guard en el Handler

```typescript
import { featureGuard } from '@/core/lib/featureFlagHelpers';

async function handleMineCommand(interaction: CommandInteraction) {
  // Check del flag
  if (!await featureGuard('new_mining_system', interaction)) {
    return; // Automáticamente responde al usuario
  }

  // Código del comando nuevo
  await doNewMining(interaction);
}
```

### 3. Check Manual

```typescript
import { isFeatureEnabledForInteraction } from '@/core/lib/featureFlagHelpers';

async function execute(interaction: CommandInteraction) {
  const useNewAlgorithm = await isFeatureEnabledForInteraction(
    'improved_algorithm',
    interaction
  );

  if (useNewAlgorithm) {
    await newAlgorithm();
  } else {
    await oldAlgorithm();
  }
}
```

---

## 🎯 Ejemplos Avanzados

### A/B Testing

```typescript
import { abTest, extractContext } from '@/core/lib/featureFlagHelpers';

async function handleShop(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  const result = await abTest('new_shop_ui', context, {
    variant: async () => {
      // Nueva UI
      return buildNewShopUI();
    },
    control: async () => {
      // UI antigua
      return buildOldShopUI();
    }
  });

  await interaction.reply(result);
}
```

### Múltiples Flags (AND)

```typescript
import { requireAllFeatures, extractContext } from '@/core/lib/featureFlagHelpers';

async function handlePremiumFeature(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  const hasAccess = await requireAllFeatures(
    ['premium_features', 'beta_access', 'new_ui'],
    context
  );

  if (!hasAccess) {
    await interaction.reply('No tienes acceso a esta funcionalidad');
    return;
  }

  // Código de la feature premium
}
```

### Múltiples Flags (OR)

```typescript
import { requireAnyFeature, extractContext } from '@/core/lib/featureFlagHelpers';

async function handleSpecialEvent(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  const hasEventAccess = await requireAnyFeature(
    ['halloween_event', 'christmas_event', 'beta_events'],
    context
  );

  if (!hasEventAccess) {
    await interaction.reply('No hay eventos activos para ti');
    return;
  }

  // Código del evento
}
```

### Con Fallback

```typescript
import { withFeature, extractContext } from '@/core/lib/featureFlagHelpers';

async function getData(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  const data = await withFeature(
    'new_data_source',
    context,
    async () => {
      // Fuente nueva
      return fetchFromNewAPI();
    },
    async () => {
      // Fuente antigua (fallback)
      return fetchFromOldAPI();
    }
  );

  return data;
}
```

---

## 🛠️ Comando de Administración

### Crear un Flag

```
/featureflags create name:new_shop_system status:disabled target:global description:"Nuevo sistema de tienda"
```

### Listar Flags

```
/featureflags list
```

### Ver Info de un Flag

```
/featureflags info flag:new_shop_system
```

### Actualizar Estado

```
/featureflags update flag:new_shop_system status:enabled
```

### Configurar Rollout Progresivo

```
/featureflags rollout flag:new_shop_system strategy:percentage percentage:25
```

Esto habilitará la feature para el 25% de los usuarios.

### Configurar Rollout Gradual

```typescript
// Programáticamente
await featureFlagService.setFlag({
  name: 'new_combat_system',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'gradual',
  rolloutConfig: {
    gradual: {
      startPercentage: 10,    // Empieza con 10%
      targetPercentage: 100,  // Llega al 100%
      durationDays: 7         // En 7 días
    }
  },
  startDate: new Date()
});
```

### Ver Estadísticas

```
/featureflags stats flag:new_shop_system
```

### Refrescar Caché

```
/featureflags refresh
```

### Eliminar Flag

```
/featureflags delete flag:old_feature
```

---

## 📊 Estrategias de Rollout

### 1. Percentage (Porcentaje)

Distribuye la feature a un % de usuarios de forma determinista.

```typescript
await featureFlagService.setFlag({
  name: 'feature_x',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'percentage',
  rolloutConfig: {
    percentage: 50  // 50% de usuarios
  }
});
```

### 2. Whitelist (Lista Blanca)

Solo para IDs específicos.

```typescript
await featureFlagService.setFlag({
  name: 'beta_features',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'whitelist',
  rolloutConfig: {
    targetIds: [
      '123456789', // User ID 1
      '987654321'  // User ID 2
    ]
  }
});
```

### 3. Blacklist (Lista Negra)

Para todos excepto IDs específicos.

```typescript
await featureFlagService.setFlag({
  name: 'stable_feature',
  status: 'rollout',
  target: 'guild',
  rolloutStrategy: 'blacklist',
  rolloutConfig: {
    targetIds: [
      'guild_id_problematico'
    ]
  }
});
```

### 4. Gradual (Progresivo en el Tiempo)

Rollout gradual durante X días.

```typescript
await featureFlagService.setFlag({
  name: 'major_update',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'gradual',
  rolloutConfig: {
    gradual: {
      startPercentage: 5,     // Empieza con 5%
      targetPercentage: 100,  // Termina en 100%
      durationDays: 14        // Durante 14 días
    }
  },
  startDate: new Date()  // Importante: define cuándo empieza
});
```

---

## ✨ Best Practices

### 1. Nombres Claros y Descriptivos

```typescript
// ❌ Mal
'flag_1'
'test'
'new'

// ✅ Bien
'new_shop_ui_v2'
'improved_combat_algorithm'
'halloween_2025_event'
```

### 2. Siempre con Descripción

```typescript
await featureFlagService.setFlag({
  name: 'new_mining_system',
  description: 'Sistema de minería rediseñado con durabilidad de herramientas',
  status: 'disabled',
  target: 'global'
});
```

### 3. Rollouts Graduales para Cambios Grandes

Para cambios importantes, usa rollout gradual:

1. Día 1-3: 10% de usuarios
2. Día 4-7: 50% de usuarios
3. Día 8-14: 100% de usuarios

### 4. Limpiar Flags Obsoletos

Una vez que una feature está 100% desplegada y estable:

1. Elimina el flag
2. Elimina el código del check
3. Mantén solo la nueva implementación

### 5. Usar Whitelists para Beta Testers

```typescript
await featureFlagService.setFlag({
  name: 'experimental_features',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'whitelist',
  rolloutConfig: {
    targetIds: BETA_TESTER_IDS  // Array de tus beta testers
  }
});
```

### 6. Fechas de Expiración para Eventos

```typescript
await featureFlagService.setFlag({
  name: 'christmas_2025_event',
  status: 'enabled',
  target: 'global',
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-31')
});
```

El flag se auto-deshabilitará después del 31 de diciembre.

### 7. Caché y Performance

El servicio cachea flags en memoria por 5 minutos. Si necesitas actualizaciones inmediatas:

```
/featureflags refresh
```

O programáticamente:

```typescript
await featureFlagService.refreshCache();
```

---

## 🔥 Casos de Uso Reales

### Lanzamiento de Comando Nuevo

```typescript
// Fase 1: Desarrollo - Deshabilitado
await featureFlagService.setFlag({
  name: 'pvp_arena_command',
  status: 'disabled',
  target: 'global'
});

// Fase 2: Beta Testing - Solo whitelisted
await featureFlagService.setFlag({
  name: 'pvp_arena_command',
  status: 'rollout',
  target: 'guild',
  rolloutStrategy: 'whitelist',
  rolloutConfig: {
    targetIds: ['guild_beta_1', 'guild_beta_2']
  }
});

// Fase 3: Rollout Progresivo - 25%
await featureFlagService.setFlag({
  name: 'pvp_arena_command',
  status: 'rollout',
  target: 'user',
  rolloutStrategy: 'percentage',
  rolloutConfig: { percentage: 25 }
});

// Fase 4: Habilitado para Todos
await featureFlagService.setFlag({
  name: 'pvp_arena_command',
  status: 'enabled',
  target: 'global'
});

// Fase 5: Cleanup - Eliminar flag y código del check
await featureFlagService.removeFlag('pvp_arena_command');
```

### Migración de Sistema Antiguo a Nuevo

```typescript
// En el comando
async function handleInventory(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  await abTest('inventory_system_v2', context, {
    variant: async () => {
      // Sistema nuevo
      return await newInventorySystem.show(interaction);
    },
    control: async () => {
      // Sistema antiguo
      return await oldInventorySystem.show(interaction);
    }
  });
}
```

Luego gradualmente aumentas el % hasta 100% y eliminas el código antiguo.

### Kill Switch para Emergencias

```typescript
// Si hay un bug crítico en una feature:
await featureFlagService.setFlag({
  name: 'problematic_feature',
  status: 'maintenance',  // Deshabilitado inmediatamente
  target: 'global'
});

// O via comando Discord:
// /featureflags update flag:problematic_feature status:maintenance
```

---

## 📚 API Reference

Ver `src/core/types/featureFlags.ts` para tipos completos.

### FeatureFlagService

```typescript
// Inicializar
await featureFlagService.initialize();

// Check si está habilitado
const enabled = await featureFlagService.isEnabled('flag_name', context);

// Crear/actualizar flag
await featureFlagService.setFlag(config);

// Eliminar flag
await featureFlagService.removeFlag('flag_name');

// Obtener flag
const flag = featureFlagService.getFlag('flag_name');

// Obtener todos los flags
const flags = featureFlagService.getFlags();

// Estadísticas
const stats = featureFlagService.getStats('flag_name');
const allStats = featureFlagService.getAllStats();

// Refrescar caché
await featureFlagService.refreshCache();
featureFlagService.clearEvaluationCache();
```

### Helpers

```typescript
// Check básico
await isFeatureEnabled(flagName, context);
await isFeatureEnabledForInteraction(flagName, interaction);

// Guards
await featureGuard(flagName, interaction, options);

// Decorador
@RequireFeature('flag_name', options)

// A/B Testing
await abTest(flagName, context, { variant, control });

// Wrapper
await withFeature(flagName, context, fn, fallback);

// Múltiples flags
await requireAllFeatures(flags, context);  // AND
await requireAnyFeature(flags, context);   // OR
```

---

## 🎮 Integración con tu Bot

El sistema se integra automáticamente si añades la inicialización en tu loader:

```typescript
// src/loaders/featureFlagsLoader.ts
import { featureFlagService } from '../services/FeatureFlagService';
import logger from '../lib/logger';

export async function loadFeatureFlags() {
  try {
    await featureFlagService.initialize();
    logger.info('[FeatureFlags] Sistema inicializado');
  } catch (error) {
    logger.error('[FeatureFlags] Error al inicializar:', error);
  }
}
```

Luego en tu `main.ts` o donde cargues servicios:

```typescript
import { loadFeatureFlags } from './loaders/featureFlagsLoader';

// ...
await loadFeatureFlags();
// ...
```

---

Creado con 🎮 para el bot Amayo
