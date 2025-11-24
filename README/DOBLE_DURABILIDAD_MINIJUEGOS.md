# 🔧⚔️ Doble Degradación de Herramientas en Minijuegos

**Contexto**: Antes existía confusión: al minar, se mostraba que sólo se usaba la espada, cuando el jugador esperaba ver reflejado el pico usado + la espada degradándose por defenderse.

---

## ✅ Cambios Implementados

### 1. Separación de Herramientas (tool vs weaponTool)
- **`tool`**: Herramienta requerida para la actividad (pico para minar, caña para pescar, espada para pelear).
- **`weaponTool`**: Arma equipada que se degrada en **combate** (si hubo mobs y el jugador tenía espada equipada).

**Beneficio**: Ahora minar usa el pico para recolectar minerales **y** la espada equipada para defenderse de mobs, cada una con su propia degradación.

---

### 2. Balanceo de Durabilidad en Combate (50%)

**Problema original**: Las armas caras se rompían al instante tras combate (desgaste completo configurado en `durabilityPerUse`).

**Solución**: 
- `reduceToolDurability()` ahora acepta parámetro `usage`:
  - `"gather"` (default): desgaste completo (actividades de recolección/minería).
  - `"combat"`: desgaste **reducido al 50%** (arma usada en combate).
  
**Implementación**:
```typescript
async function reduceToolDurability(
  userId: string,
  guildId: string,
  toolKey: string,
  usage: "gather" | "combat" = "gather"
) {
  let perUse = Math.max(1, breakable.durabilityPerUse ?? 1);
  if (usage === "combat") {
    perUse = Math.max(1, Math.ceil(perUse * 0.5)); // Reduce a la mitad, mínimo 1
  }
  // ... resto de lógica
}
```

**Resultado**: Armas ahora duran el doble en combate, mejorando economía sin eliminar costo operativo.

---

### 3. Extensión del Tipo `RunResult`

Añadido campo opcional `weaponTool` al resultado de minijuegos:

```typescript
export type RunResult = {
  // ... campos existentes (tool, combat, rewards, etc.)
  weaponTool?: {
    key?: string;
    durabilityDelta?: number;
    broken?: boolean;
    remaining?: number;
    max?: number;
    brokenInstance?: boolean;
    instancesRemaining?: number;
    toolSource?: "equipped";
  };
};
```

---

### 4. Lógica de Degradación en `runMinigame`

Tras ejecutar combate, si hay mobs y el jugador tiene arma equipada:
1. Obtener `weapon` del slot equipment.
2. Validar que sea tipo `sword` y **no sea la misma herramienta principal** (evitar doble degradación en pelear).
3. Degradarla con `usage: "combat"`.
4. Adjuntar info a `weaponTool` en el resultado.

**Código clave** (en `service.ts`):
```typescript
if (combatSummary && combatSummary.mobs.length > 0) {
  const { weapon } = await getEquipment(userId, guildId);
  if (weapon && weaponProps?.tool?.type === "sword") {
    const alreadyMain = toolInfo?.key === weapon.key;
    if (!alreadyMain) {
      const wt = await reduceToolDurability(userId, guildId, weapon.key, "combat");
      weaponToolInfo = { ...wt, toolSource: "equipped" };
    }
  }
}
```

---

### 5. Actualización de Comandos (UX)

**Antes**:
```
Herramienta: Espada de Hierro (50/150) [⚔️ Equipado]
```
(El usuario pensaba que se estaba usando solo la espada para minar.)

**Ahora** (comando `!mina` o `!pescar`):
```
Pico: Pico Básico (95/100) [🔧 Auto]
Arma (defensa): Espada de Hierro (50/150) [⚔️ Equipado]
```

**Comando `!pelear`** (sin cambio visual, pues la espada es la herramienta principal):
```
Arma: Espada de Hierro (50/150) [⚔️ Equipado]
```

**Implementación**: 
- En `mina.ts`, `pescar.ts`, `pelear.ts` ahora se lee `result.weaponTool` adicional.
- Se construye `weaponInfo` con `formatToolLabel` y se incluye en el bloque de visualización.

---

### 6. Ataques Programados (ScheduledMobAttack)

Actualizado `attacksWorker.ts` para degradar arma equipada con `usage: "combat"` al recibir ataque de mobs.

**Cambio**:
```typescript
await reduceToolDurability(job.userId, job.guildId, full.key, "combat");
```

Asegura que ataques programados en background también respeten el balance del 50%.

---

## 🎯 Resultados

1. **Claridad**: Jugadores ven explícitamente qué herramienta se usó para recolectar y cuál para combate.
2. **Balance económico**: Armas duran el doble en combate, reduciendo costo operativo sin eliminar totalmente el desgaste.
3. **Consistencia**: El mismo sistema de doble degradación aplica para ataques programados, minijuegos activos y combate.

---

## 📊 Ejemplos de Uso

### Minar con Pico y Espada Equipada
```
!mina 2

Área: mine.cavern • Nivel: 2
Pico: Pico Básico (90/100) [-5 usos] [🔧 Auto]
Arma (defensa): Espada de Hierro (149/150) [-1 uso] [⚔️ Equipado]

Recompensas:
• 🪙 +50
• Mineral de Hierro x3

Mobs:
• slime
• goblin

Combate: ⚔️ 2 mobs → 2 derrotados | 💀 Daño infligido: 45 | 🩹 Daño recibido: 8
HP: ❤️❤️❤️❤️🤍 (85/100)
```

### Pescar con Caña y Arma
```
!pescar 1

Área: lagoon.shore • Nivel: 1
Caña: Caña Básica (77/80) [-3 usos] [🎣 Auto]
Arma (defensa): Espada de Hierro (148/150) [-1 uso] [⚔️ Equipado]

Recompensas:
• Pez Común x2
• 🪙 +10

Mobs: —
```

### Pelear (Espada como Tool Principal)
```
!pelear 1

Área: fight.arena • Nivel: 1
Arma: Espada de Hierro (148/150) [-2 usos] [⚔️ Equipado]

Recompensas:
• 🪙 +25

Enemigos:
• slime

Combate: ⚔️ 1 mob → 1 derrotado | 💀 Daño infligido: 18 | 🩹 Daño recibido: 3
Victoria ✅
HP: ❤️❤️❤️❤️❤️ (97/100)
```

---

## ⚙️ Configuración Recomendada

Para ajustar desgaste según dificultad de tu servidor:

1. **Herramientas de recolección** (picos, cañas): 
   - `durabilityPerUse`: 3-5 (se aplica completo en gather).
   
2. **Armas** (espadas):
   - `durabilityPerUse`: 2-4 (se reduce a 1-2 en combate por factor 0.5).
   
3. **Eventos extremos**: 
   - Puedes crear ítems especiales con `durabilityPerUse: 1` para mayor longevidad o eventos sin desgaste (`enabled: false`).

---

## 🔮 Próximos Pasos

- [ ] Extender sistema a herramientas agrícolas (`hoe`, `watering_can`) con `usage: "farming"` y factor ajustable.
- [ ] Añadir mutaciones de ítems que reduzcan `durabilityPerUse` (ej: encantamiento "Durabilidad+" reduce desgaste en 25%).
- [ ] Implementar `ToolBreakLog` (migración propuesta en `PROPUESTA_MIGRACIONES_RPG.md`) para auditoría completa.

---

**Fecha**: Octubre 2025  
**Autor**: Sistema RPG Integrado v2  
**Archivo**: `README/DOBLE_DURABILIDAD_MINIJUEGOS.md`
