# 🔧 Guía de Corrección de Bugs de Durabilidad y Combate

**Fecha:** 2025-10-09  
**Problemas Resueltos:**
1. Items degradándose por cantidad (x16→x15) en lugar de durabilidad
2. Combate ganado sin arma equipada

---

## ✅ Cambios Implementados

### 1. **Migración de Base de Datos**
- ✅ **10 items actualizados** a `stackable: false` (herramientas/armas/armaduras/capas)
- ✅ Script de migración ejecutado: `scripts/migrateStackableToInstanced.ts`
- ✅ Schema sincronizado con `prisma db push`

### 2. **Corrección de Lógica de Combate**
**Archivo:** `src/game/minigames/service.ts` (línea 470)

**Cambio:**
```typescript
// ANTES (ambiguo):
if (!eff.damage || eff.damage <= 0) {

// DESPUÉS (explícito):
const hasWeapon = eff.damage > 0;
if (!hasWeapon) {
```

Ahora el jugador **pierde automáticamente** si no tiene arma equipada al enfrentar mobs.

### 3. **Nuevos Comandos de Admin**

#### `!debug-inv [@user]`
Muestra información detallada del inventario para diagnóstico:
- Stackable status de cada item
- Quantity vs Instances
- Durabilidad de cada instancia
- Equipo actual

#### `!reset-inventory [@user]`
Migra inventarios corruptos de stackable a non-stackable con durabilidad correcta.

---

## 🚀 Pasos Para Probar

### 1. **Reiniciar el Bot**
```bash
# Detener bot actual (Ctrl+C o kill process)
npm run dev
```

### 2. **Verificar Inventario Actual**
En Discord, ejecuta:
```
a!debug-inv
```

**Salida esperada (items correctos):**
```
**Pico Básico** (`tool.pickaxe.basic`)
• Stackable: false
• Quantity: 16
• Instances: 16
  └ [0] dur: 100
  └ [1] dur: 95
  └ [2] dur: 100
  ...
```

**Salida problemática (items corruptos):**
```
**Pico Básico** (`tool.pickaxe.basic`)
• Stackable: false
• Quantity: 16
• Instances: 0
⚠️ CORRUPTO: Non-stackable con qty>1 sin instances
```

### 3. **Si Aparece Inventario Corrupto**
Ejecuta el comando de migración manual:
```
a!reset-inventory @TuUsuario
```

Este comando:
- Convierte `quantity` a `state.instances[]`
- Inicializa durabilidad máxima en cada instancia
- Actualiza items en DB a `stackable: false`

### 4. **Probar Combate Sin Arma (Debe Perder)**
```
a!desequipar weapon
a!minar
```

**Resultado esperado:**
```
❌ Combate (🪦 Derrota)
• Mobs: 1 | Derrotados: 0/1
• Daño hecho: 0 | Daño recibido: 0
• HP: 50 → 25 (regenerado al 50%)
• Penalización: -X monedas, FATIGUE aplicada
```

### 5. **Probar Combate Con Arma (Debe Ganar)**
```
a!equipar weapon weapon.sword.iron
a!minar
```

**Resultado esperado:**
```
✅ Combate (🏆 Victoria)
• Mobs: 1 | Derrotados: 1/1
• Daño hecho: 15-20 | Daño recibido: 5-10
• HP: 50 → 40
```

### 6. **Probar Degradación de Durabilidad**
Ejecuta `a!minar` varias veces y verifica con `a!inventario` o `a!debug-inv`:

**Progresión esperada:**
```
Ejecución 1: Pico (95/100) - Espada (149/150)
Ejecución 2: Pico (90/100) - Espada (148/150)
Ejecución 3: Pico (85/100) - Espada (148/150)  [espada no usada si no hay mobs]
```

---

## 🐛 Diagnóstico de Problemas

### Problema: "Sigue mostrando (x16) en lugar de durabilidad"

**Causa Posible:** El comando `a!minar` muestra cantidad de instancias, no durabilidad individual.

**Verificación:**
```typescript
// En src/commands/messages/game/mina.ts
// Buscar la línea que formatea el tool display
formatToolLabel(tool, { /* ... */ })
```

**Solución:** Modificar formato para mostrar durabilidad de la instancia usada:
```typescript
// ANTES:
`${toolName} (x${instances.length})`

// DESPUÉS:
`${toolName} (${usedInstance.durability}/${maxDurability}) [x${instances.length}]`
```

### Problema: "Item se rompe al primer uso"

**Causa:** `durabilityPerUse > maxDurability` o durabilidad no inicializada.

**Verificación:**
```
a!debug-inv
```

Busca:
```
• Breakable: enabled=true, max=100
  └ [0] dur: N/A    <-- ❌ PROBLEMA
```

**Solución:**
```
a!reset-inventory @Usuario
```

---

## 📝 Archivos Modificados

```
src/game/minigames/service.ts          # Línea 470: Fix combate sin arma
src/commands/messages/admin/
  ├── resetInventory.ts                # Comando migración manual
  └── debugInv.ts                      # Comando debug inventario
scripts/
  ├── migrateStackableToInstanced.ts   # Script migración automática
  └── debugInventory.ts                # Script CLI debug
prisma/migrations/
  └── fix_stackable_items.sql          # Migración SQL (solo referencia)
README/
  ├── AUDITORIA_ECOSISTEMA_GAME.md     # Auditoría completa
  └── FIX_DURABILIDAD_STACKABLE.md     # Este documento
```

---

## 🎯 Checklist Final

- [ ] Bot reiniciado con nuevos comandos cargados
- [ ] `a!debug-inv` ejecutado y verificado
- [ ] Inventario corrupto migrado con `a!reset-inventory` (si aplica)
- [ ] Combate sin arma testado (debe perder)
- [ ] Combate con arma testado (debe ganar)
- [ ] Durabilidad degrada progresivamente (100→95→90)
- [ ] Mensaje muestra durabilidad correctamente en lugar de cantidad

---

**Si persisten problemas después de seguir esta guía:**
1. Ejecuta `a!debug-inv` y comparte la salida
2. Verifica logs del bot durante `a!minar`
3. Revisa que `formatToolLabel` en `_helpers.ts` muestre durabilidad correctamente
