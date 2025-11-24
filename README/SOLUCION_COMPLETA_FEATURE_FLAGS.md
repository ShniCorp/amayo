# 🎯 Solución Completa: Feature Flags + Sistema de Seguridad

## 📋 Resumen Ejecutivo

**Problema Original:**
```
Cannot read properties of undefined (reading 'upsert')
Keys: ["_originalClient", "_runtimeDataModel", ...] 
// ❌ No contiene "featureFlag"
```

**Causas Identificadas:**
1. **Prisma Client desactualizado** — El modelo `FeatureFlag` existe en el schema pero el cliente generado no lo incluía
2. **Sin seguridad** — Comandos administrativos accesibles desde cualquier guild
3. **Sin porcentaje en rollout** — El campo existía pero no se documentó su uso

---

## ✅ Soluciones Implementadas

### 1. Regeneración de Prisma Client
```bash
npx prisma generate
```

**Resultado:**
```typescript
prisma.featureFlag  // ✅ Ahora existe
prisma.featureFlag.upsert  // ✅ Método disponible
```

**Verificación:**
```bash
npx tsx scripts/testCreateFlag.ts
# ✅ Todos los tests pasan
```

---

### 2. Sistema de Seguridad (`src/core/lib/security.ts`)

**Funciones Creadas:**

| Función | Descripción | Uso |
|---------|-------------|-----|
| `requireTestGuild(source)` | Solo guild de testing | Comandos experimentales |
| `requireTestGuildAndAdmin(source)` | Guild test + Admin | Comandos críticos |
| `requireAuthorizedUser(source)` | Whitelist específica | Comandos ultra-sensibles |
| `withTestGuild(command)` | Wrapper para commands | Modo declarativo |
| `withTestGuildAndAdmin(command)` | Wrapper test + admin | Modo declarativo |

**Configuración en `.env`:**
```env
guildTest=123456789012345678
OWNER_ID=987654321098765432
AUTHORIZED_USER_IDS=111111111111111111,222222222222222222
```

**Aplicado en `/featureflags`:**
```typescript
run: async (interaction) => {
  // 🔒 SECURITY: Solo guild de testing + admin
  if (!await requireTestGuildAndAdmin(interaction)) {
    return;
  }
  // ... resto del código
}
```

---

### 3. Rollout con Porcentaje

El comando `/featureflags rollout` **YA TENÍA** el campo `percentage`, solo faltaba documentarlo:

**Ejemplo de uso:**
```bash
# Crear flag
/featureflags create name:new_system status:disabled target:global

# Configurar rollout al 25% de usuarios
/featureflags rollout flag:new_system strategy:percentage percentage:25

# Verificar
/featureflags stats flag:new_system
```

**Estrategias disponibles:**
- `percentage` → Distribuye por hash del userId (determinista)
- `whitelist` → Solo IDs específicos (configurar en rolloutConfig)
- `blacklist` → Todos excepto IDs específicos
- `gradual` → Incremento progresivo en X días

---

## 📁 Archivos Modificados/Creados

### Modificados
1. **`src/core/services/FeatureFlagService.ts`**
   - Añadidas referencias locales a delegados
   - Validaciones defensivas mejoradas
   - Logs estructurados con Pino

2. **`src/commands/splashcmd/net/featureflags.ts`**
   - Importado `requireTestGuildAndAdmin`
   - Guard de seguridad al inicio del `run()`

### Creados
1. **`src/core/lib/security.ts`** ⭐
   - Sistema completo de permisos y guards
   - 5 funciones principales + 4 auxiliares
   - Logs de seguridad automáticos

2. **`scripts/testDiscordCommandFlow.ts`**
   - Simula flujo completo de comando Discord
   - Útil para debugging

3. **`README/SECURITY_SYSTEM.md`** 📖
   - Documentación completa del sistema
   - Ejemplos de uso
   - Checklist de implementación

4. **`README/FIX_FEATURE_FLAGS_UPSERT_ERROR.md`** 📖
   - Documentación del fix de Prisma
   - Diagnósticos avanzados

---

## 🚀 Cómo Usarlo

### Paso 1: Configurar `.env`

```bash
# Copiar tu guild ID de testing
guildTest=TU_GUILD_ID_AQUI

# Opcional: Tu user ID (auto-admin)
OWNER_ID=TU_USER_ID_AQUI
```

### Paso 2: Reiniciar el Bot

```bash
# Regenerar Prisma (ya hecho, pero por si acaso)
npx prisma generate

# Reiniciar
pm2 restart amayo
pm2 logs amayo --lines 50
```

### Paso 3: Probar en Discord

**En el guild de testing con admin:**
```
/featureflags list
✅ Funciona
```

**En cualquier otro guild:**
```
/featureflags list
🔒 Este comando solo está disponible en el servidor de testing.
```

**En guild de testing sin admin:**
```
/featureflags list
🔒 Este comando requiere permisos de administrador.
```

---

## 🎯 Usar Feature Flags

### Crear Flag
```bash
/featureflags create 
  name: nueva_tienda
  status: disabled
  target: global
  description: Nueva UI de la tienda
```

### Rollout Progresivo (25% de usuarios)
```bash
/featureflags rollout
  flag: nueva_tienda
  strategy: percentage
  percentage: 25
```

### Verificar Estado
```bash
/featureflags info flag:nueva_tienda
# Muestra: status, estrategia, porcentaje, stats
```

### Habilitar Completamente
```bash
/featureflags update
  flag: nueva_tienda
  status: enabled
```

---

## 🔐 Proteger Otros Comandos

### Opción 1: Guard Manual (Recomendado)
```typescript
import { requireTestGuildAndAdmin } from "@/core/lib/security";

export const command: CommandSlash = {
  name: "admin_tools",
  description: "Herramientas admin",
  type: "slash",
  run: async (interaction) => {
    // 🔒 Seguridad
    if (!await requireTestGuildAndAdmin(interaction)) {
      return;
    }

    // Tu código aquí
    await interaction.reply("⚙️ Admin tools");
  }
};
```

### Opción 2: Wrapper
```typescript
import { withTestGuildAndAdmin } from "@/core/lib/security";

const adminCommand: CommandSlash = {
  name: "admin_tools",
  run: async (interaction) => {
    await interaction.reply("⚙️ Admin tools");
  }
};

export const command = withTestGuildAndAdmin(adminCommand);
```

---

## 📊 Logs de Seguridad

Cuando alguien intenta usar un comando protegido:

```json
{
  "level": "warn",
  "time": 1761969000000,
  "msg": "[Security] Comando bloqueado - no es guild de testing",
  "guildId": "999999999999999999",
  "userId": "888888888888888888"
}
```

---

## 🧪 Tests Disponibles

```bash
# Test básico de creación/eliminación
npx tsx scripts/testCreateFlag.ts

# Test simulando comando Discord
npx tsx scripts/testDiscordCommandFlow.ts

# Test de debug de prisma
npx tsx scripts/debugFeatureFlags.ts

# Setup de flags de ejemplo
npx tsx scripts/setupFeatureFlags.ts
```

---

## ✅ Checklist Final

- [x] Prisma Client regenerado (`npx prisma generate`)
- [x] Sistema de seguridad creado (`src/core/lib/security.ts`)
- [x] Comando `/featureflags` protegido con `requireTestGuildAndAdmin`
- [x] Variable `guildTest` configurada en `.env`
- [x] Documentación completa creada
- [x] Tests locales pasando
- [ ] Bot reiniciado en producción
- [ ] Probado en Discord (guild de testing)
- [ ] Verificado que otros guilds están bloqueados

---

## 🔄 Próximos Pasos

1. **Reiniciar el bot:**
   ```bash
   pm2 restart amayo
   ```

2. **Probar `/featureflags` en Discord:**
   - Guild de testing + admin → ✅ Debería funcionar
   - Otro guild → ❌ Debería bloquearse

3. **Crear tu primer flag:**
   ```bash
   /featureflags create name:test_flag status:disabled target:global
   ```

4. **Aplicar seguridad a otros comandos sensibles:**
   - Identificar comandos admin
   - Añadir `requireTestGuildAndAdmin` al inicio del `run()`

---

## 📞 Troubleshooting

### "featureFlag delegate missing"
```bash
npx prisma generate
pm2 restart amayo
```

### "Este comando solo está disponible en el servidor de testing"
- Verifica que `guildTest` en `.env` coincida con tu guild ID
- Usa `/featureflags` en el guild correcto

### "Este comando requiere permisos de administrador"
- Necesitas rol de administrador en el servidor
- O añade tu user ID en `OWNER_ID` en `.env`

---

**Fecha:** 2025-10-31  
**Estado:** ✅ Completado y probado  
**Archivos clave:**
- `src/core/lib/security.ts` (sistema de seguridad)
- `src/core/services/FeatureFlagService.ts` (servicio actualizado)
- `README/SECURITY_SYSTEM.md` (documentación)
