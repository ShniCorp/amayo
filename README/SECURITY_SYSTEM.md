# 🔒 Sistema de Seguridad para Comandos Administrativos

## Descripción

Sistema de permisos para restringir comandos sensibles a:
- **Guild de Testing** (variable `guildTest` en `.env`)
- **Usuarios Autorizados** (whitelist por ID)
- **Administradores del Servidor**
- **Dueño del Bot**

---

## 📦 Instalación

El módulo está en: `src/core/lib/security.ts`

```typescript
import { 
  requireTestGuild,
  requireTestGuildAndAdmin,
  requireAuthorizedUser,
  withTestGuild,
  withTestGuildAndAdmin 
} from "@/core/lib/security";
```

---

## ⚙️ Configuración en `.env`

```env
# Guild de testing (requerido)
guildTest=123456789012345678

# Dueño del bot (opcional)
OWNER_ID=987654321098765432

# Whitelist de usuarios autorizados (opcional, separados por comas)
AUTHORIZED_USER_IDS=111111111111111111,222222222222222222
```

---

## 🛡️ Funciones Disponibles

### 1. `requireTestGuild(source)`
Verifica que el comando se ejecute solo en el guild de testing.

```typescript
import { requireTestGuild } from "@/core/lib/security";

export const command: CommandSlash = {
  name: "debug",
  description: "Comandos de debug",
  type: "slash",
  run: async (interaction, client) => {
    // Bloquea si no es guild de testing
    if (!await requireTestGuild(interaction)) {
      return; // Ya respondió al usuario automáticamente
    }

    // Tu código aquí (solo se ejecuta en guild de testing)
    await interaction.reply("🐛 Debug activado");
  }
};
```

**Respuesta automática si falla:**
```
🔒 Este comando solo está disponible en el servidor de testing.
```

---

### 2. `requireTestGuildAndAdmin(source)`
Requiere **guild de testing** Y **permisos de administrador**.

```typescript
import { requireTestGuildAndAdmin } from "@/core/lib/security";

export const command: CommandSlash = {
  name: "featureflags",
  description: "Gestión de feature flags",
  type: "slash",
  run: async (interaction, client) => {
    // Bloquea si no es guild de testing O no es admin
    if (!await requireTestGuildAndAdmin(interaction)) {
      return;
    }

    // Tu código aquí (solo admins en guild de testing)
    await interaction.reply("⚙️ Configuración de flags");
  }
};
```

**Respuestas automáticas:**
- Si no es guild de testing: `🔒 Este comando solo está disponible en el servidor de testing.`
- Si no es admin: `🔒 Este comando requiere permisos de administrador.`

---

### 3. `requireAuthorizedUser(source)`
Requiere que el usuario esté en la whitelist de `AUTHORIZED_USER_IDS`.

```typescript
import { requireAuthorizedUser } from "@/core/lib/security";

export const command: CommandSlash = {
  name: "shutdown",
  description: "Apagar el bot",
  type: "slash",
  run: async (interaction, client) => {
    // Solo usuarios autorizados
    if (!await requireAuthorizedUser(interaction)) {
      return;
    }

    await interaction.reply("🛑 Apagando bot...");
    process.exit(0);
  }
};
```

---

### 4. `withTestGuild(command)` - Wrapper
Envuelve todo el comando para restringirlo al guild de testing.

```typescript
import { withTestGuild } from "@/core/lib/security";
import { CommandSlash } from "@/core/types/commands";

const debugCommand: CommandSlash = {
  name: "debug",
  description: "Debug tools",
  type: "slash",
  run: async (interaction, client) => {
    await interaction.reply("🐛 Debug mode");
  }
};

// Exportar con wrapper de seguridad
export const command = withTestGuild(debugCommand);
```

---

### 5. `withTestGuildAndAdmin(command)` - Wrapper
Envuelve el comando para requerir guild de testing + admin.

```typescript
import { withTestGuildAndAdmin } from "@/core/lib/security";

const adminCommand: CommandSlash = {
  name: "config",
  description: "Configuración",
  type: "slash",
  run: async (interaction, client) => {
    await interaction.reply("⚙️ Configuración");
  }
};

export const command = withTestGuildAndAdmin(adminCommand);
```

---

## 🎯 Funciones Auxiliares

### `isTestGuild(source)`
Retorna `true` si es el guild de testing (no responde automáticamente).

```typescript
if (isTestGuild(interaction)) {
  console.log("Estamos en guild de testing");
}
```

### `isGuildAdmin(member)`
Retorna `true` si el miembro tiene permisos de administrador.

```typescript
const member = interaction.member as GuildMember;
if (isGuildAdmin(member)) {
  console.log("Usuario es admin");
}
```

### `isBotOwner(userId)`
Retorna `true` si el userId coincide con `OWNER_ID` en `.env`.

```typescript
if (isBotOwner(interaction.user.id)) {
  console.log("Es el dueño del bot");
}
```

### `isAuthorizedUser(userId)`
Retorna `true` si está en la whitelist o es el dueño.

```typescript
if (isAuthorizedUser(interaction.user.id)) {
  console.log("Usuario autorizado");
}
```

---

## 📊 Ejemplo Real: Comando Feature Flags

```typescript
import { requireTestGuildAndAdmin } from "@/core/lib/security";
import { CommandSlash } from "@/core/types/commands";

export const command: CommandSlash = {
  name: "featureflags",
  description: "Administra feature flags del bot",
  type: "slash",
  cooldown: 5,
  options: [
    {
      name: "list",
      description: "Lista todos los flags",
      type: 1,
    },
    {
      name: "create",
      description: "Crea un nuevo flag",
      type: 1,
      options: [
        { name: "name", description: "Nombre del flag", type: 3, required: true },
        { name: "status", description: "Estado", type: 3, required: true },
      ],
    },
  ],
  run: async (interaction) => {
    // 🔒 SECURITY: Solo guild de testing + admin
    if (!await requireTestGuildAndAdmin(interaction)) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "list":
        await interaction.reply("📋 Listando flags...");
        break;
      case "create":
        const name = interaction.options.getString("name", true);
        await interaction.reply(`✅ Flag "${name}" creado`);
        break;
    }
  },
};
```

---

## 🔐 Niveles de Seguridad

| Función | Guild Test | Admin | Whitelist | Owner |
|---------|------------|-------|-----------|-------|
| `requireTestGuild` | ✅ | ❌ | ❌ | ❌ |
| `requireTestGuildAndAdmin` | ✅ | ✅ | ❌ | Auto-admin |
| `requireAuthorizedUser` | ❌ | ❌ | ✅ | ✅ |

---

## 🚨 Logs de Seguridad

Cuando un comando es bloqueado, se registra en los logs:

```json
{
  "level": "warn",
  "msg": "[Security] Comando bloqueado - no es guild de testing",
  "guildId": "123456789",
  "userId": "987654321"
}
```

```json
{
  "level": "warn",
  "msg": "[Security] Comando bloqueado - sin permisos de admin",
  "guildId": "123456789",
  "userId": "987654321"
}
```

---

## ✅ Checklist de Implementación

1. **Configurar `.env`:**
   ```env
   guildTest=TU_GUILD_ID_AQUI
   OWNER_ID=TU_USER_ID_AQUI
   ```

2. **Importar el guard:**
   ```typescript
   import { requireTestGuildAndAdmin } from "@/core/lib/security";
   ```

3. **Aplicar al comando:**
   ```typescript
   run: async (interaction) => {
     if (!await requireTestGuildAndAdmin(interaction)) {
       return;
     }
     // Tu código...
   }
   ```

4. **Reiniciar el bot:**
   ```bash
   pm2 restart amayo
   ```

5. **Probar en Discord:**
   - En guild de testing con admin → ✅ Funciona
   - En otro guild → ❌ Bloqueado
   - En guild de testing sin admin → ❌ Bloqueado

---

## 🎮 Casos de Uso

### Comando de Testing
```typescript
export const command = withTestGuild({
  name: "test",
  run: async (interaction) => {
    await interaction.reply("🧪 Test mode");
  }
});
```

### Comando Admin
```typescript
export const command = withTestGuildAndAdmin({
  name: "config",
  run: async (interaction) => {
    await interaction.reply("⚙️ Configuración");
  }
});
```

### Comando Ultra-Sensible
```typescript
run: async (interaction) => {
  if (!await requireAuthorizedUser(interaction)) {
    return;
  }
  // Solo usuarios whitelisteados
}
```

---

**Fecha:** 2025-10-31  
**Archivo:** `src/core/lib/security.ts`  
**Estado:** ✅ Implementado y probado
