# 🎮 Feature Flags - Uso en Comandos Slash y Mensajes

## 🚀 Uso Universal

El sistema funciona **idénticamente** para comandos slash y comandos de mensaje.

---

## 📦 3 Formas de Usar

### 1️⃣ Wrapper (Recomendado - Más Limpio)

```typescript
import { withFeatureFlag } from "@/core/lib/featureFlagCommandWrapper";
import { CommandSlash } from "@/core/types/commands";

// COMANDO SLASH
export const command: CommandSlash = {
  name: 'shop',
  description: 'Abre la tienda',
  type: 'slash',
  cooldown: 10,
  run: withFeatureFlag('new_shop_system', async (interaction, client) => {
    // Tu código aquí - solo se ejecuta si el flag está enabled
    await interaction.reply('🛒 Tienda!');
  }, {
    fallbackMessage: '🔧 Tienda en mantenimiento'
  })
};

// COMANDO DE MENSAJE
export const command: CommandMessage = {
  name: 'shop',
  type: 'message',
  cooldown: 10,
  run: withFeatureFlag('new_shop_system', async (message, args, client) => {
    // Mismo código, funciona igual
    await message.reply('🛒 Tienda!');
  }, {
    fallbackMessage: '🔧 Tienda en mantenimiento'
  })
};
```

### 2️⃣ Guard (Respuesta Automática)

```typescript
import { guardFeatureFlag } from "@/core/lib/featureFlagCommandWrapper";

// COMANDO SLASH
export const command: CommandSlash = {
  name: 'mine',
  description: 'Minea recursos',
  type: 'slash',
  cooldown: 10,
  run: async (interaction, client) => {
    // Guard responde automáticamente si está disabled
    if (!await guardFeatureFlag('new_mining', interaction)) {
      return; // Ya respondió al usuario
    }

    // Tu código aquí
    await interaction.reply('⛏️ Minando...');
  }
};

// COMANDO DE MENSAJE - EXACTAMENTE IGUAL
export const command: CommandMessage = {
  name: 'mine',
  type: 'message',
  cooldown: 10,
  run: async (message, args, client) => {
    // Mismo guard funciona para mensajes
    if (!await guardFeatureFlag('new_mining', message)) {
      return;
    }

    await message.reply('⛏️ Minando...');
  }
};
```

### 3️⃣ Check Manual (Más Control)

```typescript
import { checkFeatureFlag } from "@/core/lib/featureFlagCommandWrapper";

// COMANDO SLASH
export const command: CommandSlash = {
  name: 'inventory',
  description: 'Tu inventario',
  type: 'slash',
  cooldown: 5,
  run: async (interaction, client) => {
    const useNewUI = await checkFeatureFlag('inventory_v2', interaction);

    if (useNewUI) {
      await interaction.reply('📦 Inventario v2');
    } else {
      await interaction.reply('📦 Inventario v1');
    }
  }
};

// COMANDO DE MENSAJE - IGUAL
export const command: CommandMessage = {
  name: 'inventory',
  type: 'message',
  cooldown: 5,
  run: async (message, args, client) => {
    const useNewUI = await checkFeatureFlag('inventory_v2', message);

    if (useNewUI) {
      await message.reply('📦 Inventario v2');
    } else {
      await message.reply('📦 Inventario v1');
    }
  }
};
```

---

## 🔥 A/B Testing

```typescript
import { abTestCommand } from "@/core/lib/featureFlagCommandWrapper";

// COMANDO SLASH
export const command: CommandSlash = {
  name: 'attack',
  description: 'Ataca',
  type: 'slash',
  cooldown: 10,
  run: async (interaction, client) => {
    await abTestCommand('new_combat', interaction, {
      variant: async () => {
        // Nueva versión (50% usuarios)
        await interaction.reply('⚔️ Daño nuevo: 100');
      },
      control: async () => {
        // Versión antigua (50% usuarios)
        await interaction.reply('⚔️ Daño viejo: 50');
      }
    });
  }
};

// COMANDO DE MENSAJE - IGUAL
export const command: CommandMessage = {
  name: 'attack',
  type: 'message',
  cooldown: 10,
  run: async (message, args, client) => {
    await abTestCommand('new_combat', message, {
      variant: async () => {
        await message.reply('⚔️ Daño nuevo: 100');
      },
      control: async () => {
        await message.reply('⚔️ Daño viejo: 50');
      }
    });
  }
};
```

---

## 💡 Ejemplo Real: Comando Universal

```typescript
import { checkFeatureFlag } from "@/core/lib/featureFlagCommandWrapper";
import { CommandSlash, CommandMessage } from "@/core/types/commands";

// Función de negocio (reutilizable)
async function executeShop(source: any) {
  const useNewShop = await checkFeatureFlag('new_shop_system', source);

  const items = useNewShop 
    ? ['⚔️ Espada Legendaria', '🛡️ Escudo Épico']
    : ['Espada', 'Escudo'];

  const response = `🛒 **Tienda**\n${items.join('\n')}`;

  // Detectar tipo y responder
  if ('options' in source) {
    await source.reply(response);
  } else {
    await source.reply(response);
  }
}

// COMANDO SLASH
export const shopSlash: CommandSlash = {
  name: 'shop',
  description: 'Tienda',
  type: 'slash',
  cooldown: 10,
  run: async (interaction, client) => {
    await executeShop(interaction);
  }
};

// COMANDO DE MENSAJE
export const shopMessage: CommandMessage = {
  name: 'shop',
  type: 'message',
  cooldown: 10,
  run: async (message, args, client) => {
    await executeShop(message);
  }
};
```

---

## 📊 Configurar Flags

```bash
# Crear flag
/featureflags create name:new_shop_system status:disabled target:global

# Habilitar
/featureflags update flag:new_shop_system status:enabled

# Rollout 25% de usuarios
/featureflags rollout flag:new_shop_system strategy:percentage percentage:25

# A/B testing (50/50)
/featureflags rollout flag:new_combat strategy:percentage percentage:50

# Ver estadísticas
/featureflags stats flag:new_shop_system
```

---

## ✨ Ventajas del Sistema

✅ **Un solo código** para ambos tipos de comandos
✅ **No rompe** comandos existentes
✅ **Rollouts progresivos** sin redeploys
✅ **Kill switches** instantáneos
✅ **A/B testing** automático
✅ **Estadísticas** de uso en tiempo real

---

## 🎯 Casos de Uso

### Migración Gradual
```typescript
run: async (interaction, client) => {
  const useNew = await checkFeatureFlag('new_system', interaction);
  
  if (useNew) {
    await newSystem(interaction);
  } else {
    await oldSystem(interaction);
  }
}
```

### Kill Switch
```bash
# Si hay un bug crítico
/featureflags update flag:problematic_feature status:maintenance
# Inmediatamente deshabilitado sin redeploy
```

### Beta Testing
```bash
# Solo para guilds específicos
/featureflags create name:beta_features status:rollout target:guild
/featureflags rollout flag:beta_features strategy:whitelist
# Luego añadir IDs de guilds en el config
```

### Eventos Temporales
```typescript
// Crear con fechas
await featureFlagService.setFlag({
  name: 'halloween_event',
  status: 'enabled',
  startDate: new Date('2025-10-25'),
  endDate: new Date('2025-11-01')
});
// Se auto-desactiva el 1 de noviembre
```

---

## 🔧 Integración en tu Bot

Simplemente usa los helpers en cualquier comando:

```typescript
import { withFeatureFlag } from '@/core/lib/featureFlagCommandWrapper';

export const command: CommandSlash = {
  name: 'tu_comando',
  description: 'Descripción',
  type: 'slash',
  cooldown: 10,
  run: withFeatureFlag('tu_flag', async (interaction, client) => {
    // Tu código existente aquí
  })
};
```

**Eso es todo.** El sistema funciona transparentemente para ambos tipos de comandos. 🎮
