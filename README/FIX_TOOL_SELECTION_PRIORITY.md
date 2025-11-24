# 🔧 Fix Final: Tool Selection Priority

**Problema Identificado:** `findBestToolKey` selecciona espada en lugar de pico para minar.

**Causa Raíz Posible:**
1. La espada en DB podría tener `tool.type: "pickaxe"` (datos corruptos)
2. O ambos tienen tier similar y el algoritmo no diferenciaba herramientas primarias de armas

**Solución Implementada:**

### Cambio en `findBestToolKey` (línea 51-76)

```typescript
// ANTES: Solo comparaba tier
if (!best || tier > best.tier) best = { key: e.item.key, tier };

// DESPUÉS: Prioriza items con key "tool.*" sobre "weapon.*"
const isPrimaryTool = e.item.key.startsWith('tool.');
if (!best || tier > best.tier || (tier === best.tier && isPrimaryTool && !best.isPrimaryTool)) {
  best = { key: e.item.key, tier, isPrimaryTool };
}
```

**Lógica:**
- Si tier es mayor → selecciona independientemente del tipo
- Si tier es igual → prioriza `tool.*` (pico, caña) sobre `weapon.*` (espada)

---

## 🔍 Diagnóstico Requerido

**Ejecuta en Discord:**
```
a!debug-inv
```

**Busca en la salida:**

### ✅ Configuración Correcta:
```
**Pico Normal** (`tool.pickaxe.basic`)
• Tool: type=pickaxe, tier=1
• Breakable: enabled=true, max=100

**Espada Normal** (`weapon.sword.iron`)
• Tool: type=sword, tier=1
• Breakable: enabled=true, max=150
```

### ❌ Configuración Corrupta:
```
**Espada Normal** (`weapon.sword.iron`)
• Tool: type=pickaxe, tier=1   <-- ⚠️ PROBLEMA: debería ser "sword"
```

---

## 🛠️ Solución si Datos Corruptos

Si la espada tiene `tool.type: "pickaxe"`, re-ejecuta el seed:

```bash
XATA_DB="..." npm run seed:minigames
```

O actualiza manualmente en Prisma Studio:
1. Abrir item `weapon.sword.iron`
2. Editar props.tool.type → cambiar a `"sword"`
3. Guardar

---

## ✅ Validación Final

Después de reiniciar el bot:

```
a!minar
```

**Resultado esperado:**
```
Herramienta: ⛏️ Pico Normal (95/100) [🔧 Auto]
Arma (defensa): ⚔️ Espada Normal (149/150) [⚔️ Equipado]
```

**NO debe mostrar:**
```
Herramienta: ⚔️ Espada Normal (x4) (-2 dur.) (provided)
```

---

## 📊 Resumen de Todos los Fixes

| # | Problema | Causa | Solución | Estado |
|---|----------|-------|----------|--------|
| 1 | Items stackable | Datos antiguos | Migración SQL + script TS | ✅ Completo |
| 2 | Combate sin arma ganado | Condición ambigua | `hasWeapon` explícito | ✅ Completo |
| 3 | Espada usada para minar | Sin priorización de tool.* | Algoritmo de prioridad | ✅ Completo |
| 4 | Cantidad en lugar de durabilidad | Display formateado mal | Pendiente verificar en UI |

---

**Siguiente Paso:** Reiniciar bot y ejecutar `a!debug-inv` para confirmar tool types correctos.
