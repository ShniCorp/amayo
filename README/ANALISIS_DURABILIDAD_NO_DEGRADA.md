# 🔍 Análisis: Durabilidad No Degrada (Items se Rompen Inmediatamente)

**Fecha**: Octubre 2025  
**Problema reportado**: Los items no degradan durabilidad gradualmente, sino que se rompen tras el primer uso.

---

## 🐛 Síntomas

1. Usuario compra/recibe herramienta (pico, espada, caña).
2. Al usar el item en minijuego, **se rompe inmediatamente** (instancesRemaining = 0).
3. No hay degradación visible progresiva (ej: 100 → 95 → 90...).
4. El jugador debe re-comprar constantemente tras cada uso.

---

## 🔬 Análisis del Código

### ✅ Sistema de Durabilidad (Funcionamiento Esperado)

El sistema está **correctamente implementado** en teoría:

#### 1. **Añadir Items** (`economy/service.ts:addItemByKey`)
```typescript
// Para items NO stackable con durabilidad:
for (let i = 0; i < canAdd; i++) {
  if (maxDurability && maxDurability > 0) {
    state.instances.push({ durability: maxDurability }); // ✅ Inicializa correctamente
  } else {
    state.instances.push({});
  }
}
```

#### 2. **Reducir Durabilidad** (`minigames/service.ts:reduceToolDurability`)
```typescript
const inst = state.instances[0];
const max = maxConfigured;

// Si la instancia no tiene durabilidad inicial, la inicializamos
if (inst.durability == null) (inst as any).durability = max; // ✅ Fallback correcto

const current = Math.min(Math.max(0, inst.durability ?? max), max);
const next = current - delta; // Resta durabilityPerUse

if (next <= 0) {
  state.instances.shift(); // Rompe instancia
  brokenInstance = true;
} else {
  (inst as any).durability = next; // Actualiza durabilidad
  state.instances[0] = inst;
}
```

### 🔴 Problema Identificado

**Causa Raíz**: Items creados **antes de implementar el sistema de durabilidad** (o mediante seed incompleto) tienen `state.instances` vacíos o sin campo `durability`:

```json
// ❌ Item problemático en base de datos
{
  "instances": [
    {},              // Sin durability definido
    {}
  ]
}
```

Cuando `reduceToolDurability` ejecuta:
1. Lee instancia: `inst = {}`
2. Inicializa: `inst.durability = max` (ej: 100)
3. Calcula: `current = 100`, `next = 100 - 5 = 95`
4. **PERO**: Como modificó `inst` (referencia local), no actualiza correctamente el array `state.instances[0]`.

**El bug está en la asignación**:
```typescript
(inst as any).durability = next;
state.instances[0] = inst;  // ✅ Esto DEBERÍA funcionar pero...
```

**Si `inst` es un objeto nuevo creado por el fallback**, la referencia se pierde.

---

## 🛠️ Solución Propuesta

### Opción 1: Fix en `reduceToolDurability` (Rápido)

Modificar para asegurar que siempre se actualiza el objeto del array directamente:

```typescript
const state = parseInvState(entry.state);
state.instances ??= [{}];
if (state.instances.length === 0) state.instances.push({});

const inst = state.instances[0];
const max = maxConfigured;

// Inicializar durabilidad si no existe (directamente en el array)
if (inst.durability == null) {
  state.instances[0].durability = max;
}

const current = Math.min(Math.max(0, state.instances[0].durability ?? max), max);
const next = current - delta;

if (next <= 0) {
  state.instances.shift(); // Rompe instancia
  brokenInstance = true;
} else {
  state.instances[0].durability = next; // Actualiza DIRECTO en array
}
```

**Ventaja**: Fix inmediato sin migración de datos.  
**Desventaja**: No resuelve items ya en inventarios con state corrupto.

---

### Opción 2: Migración de Inventarios (Completa)

Crear script que recorra todos los `InventoryEntry` y regenere `state.instances` con durabilidad correcta:

```typescript
// scripts/fixItemDurability.ts
import { prisma } from '../src/core/database/prisma';

async function fixDurability() {
  const entries = await prisma.inventoryEntry.findMany({
    include: { item: true },
    where: { item: { stackable: false } } // Solo items no apilables
  });

  for (const entry of entries) {
    const props = entry.item.props as any;
    const breakable = props?.breakable;
    
    if (!breakable || breakable.enabled === false) continue;
    
    const maxDurability = breakable.maxDurability ?? 100;
    const state = (entry.state as any) ?? {};
    const instances = state.instances ?? [];
    
    // Regenerar instancias con durabilidad completa
    const fixed = instances.map((inst: any) => {
      if (inst.durability == null || inst.durability <= 0) {
        return { ...inst, durability: maxDurability };
      }
      return inst;
    });
    
    // Si no hay instancias pero quantity > 0, crearlas
    if (fixed.length === 0 && entry.quantity > 0) {
      for (let i = 0; i < entry.quantity; i++) {
        fixed.push({ durability: maxDurability });
      }
    }
    
    await prisma.inventoryEntry.update({
      where: { id: entry.id },
      data: {
        state: { ...state, instances: fixed },
        quantity: fixed.length
      }
    });
    
    console.log(`Fixed ${entry.item.key} for user ${entry.userId}`);
  }
  
  console.log('✅ Durability migration complete');
}

fixDurability()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
```

**Ejecución**:
```bash
npx ts-node scripts/fixItemDurability.ts
```

**Ventaja**: Resuelve todos los items existentes.  
**Desventaja**: Requiere downtime o aviso a usuarios.

---

### Opción 3: Comando Admin (Híbrido)

Crear comando `!fix-durability [userId]` que regenera instancias bajo demanda:

```typescript
// src/commands/messages/admin/fixDurability.ts
export const command: CommandMessage = {
  name: 'fix-durability',
  run: async (message, args) => {
    const targetUserId = args[0] || message.author.id;
    const guildId = message.guild!.id;
    
    const entries = await prisma.inventoryEntry.findMany({
      where: { userId: targetUserId, guildId },
      include: { item: true }
    });
    
    let fixed = 0;
    for (const entry of entries) {
      if (entry.item.stackable) continue;
      
      const props = entry.item.props as any;
      const breakable = props?.breakable;
      if (!breakable || breakable.enabled === false) continue;
      
      const maxDur = breakable.maxDurability ?? 100;
      const state = (entry.state as any) ?? {};
      const instances = state.instances ?? [];
      
      const regenerated = instances.map((inst: any) => 
        inst.durability == null ? { ...inst, durability: maxDur } : inst
      );
      
      if (regenerated.length !== instances.length || 
          JSON.stringify(regenerated) !== JSON.stringify(instances)) {
        await prisma.inventoryEntry.update({
          where: { id: entry.id },
          data: { state: { ...state, instances: regenerated } }
        });
        fixed++;
      }
    }
    
    await message.reply(`✅ Regeneradas ${fixed} herramientas para <@${targetUserId}>`);
  }
};
```

**Ventaja**: Los usuarios pueden auto-fixear sin downtime.  
**Desventaja**: Requiere que cada usuario ejecute el comando.

---

## 🎯 Recomendación

**Implementar Opción 1 (fix en código) + Opción 3 (comando admin)**:

1. **Fix inmediato**: Modificar `reduceToolDurability` para actualizar directamente `state.instances[0].durability`.
2. **Comando de rescate**: Añadir `!fix-durability` para que usuarios con items corruptos puedan regenerarlos.
3. **Seed mejorado**: Asegurar que `seed.ts` use `addItemByKey` en lugar de crear inventarios manualmente.

---

## 📋 Checklist de Implementación

- [ ] Modificar `reduceToolDurability` para actualizar durabilidad directamente en array.
- [ ] Crear comando `!fix-durability` para regeneración bajo demanda.
- [ ] Validar que `seed.ts` use `addItemByKey` correctamente.
- [ ] Añadir logs de debug temporales para confirmar degradación.
- [ ] Testear con herramienta tier 1 y tier 2 (50+ durabilidad).

---

## 🧪 Validación Post-Fix

Ejecutar:
```bash
!inventario
# Ver durabilidad inicial (ej: 100/100)

!mina
# Debería reducir (ej: 95/100)

!mina
# Seguir reduciendo (ej: 90/100)

# Repetir hasta agotar instancia
```

**Resultado esperado**: Degradación gradual visible hasta romper instancia.

---

**Archivo**: `README/ANALISIS_DURABILIDAD_NO_DEGRADA.md`
