# Guía rápida para el staff: crear y ajustar contenido desde Discord

Este documento reúne ejemplos prácticos y flujos de trabajo completos **para el equipo de staff**. Todo lo que ves aquí se realiza directamente con los comandos del bot (prefijo `!`), sin tocar código ni ejecutar scripts. Los comandos viven en `src/commands/messages/admin` y `src/commands/messages/game`, pero no necesitas abrir esos archivos: la idea es que puedas hacerlo todo desde Discord siguiendo estos pasos.

---

## Tabla de contenidos

1. [Antes de empezar](#antes-de-empezar)
2. [Items: creación, edición y revisión](#items-creación-edición-y-revisión)
3. [Crafteos y materiales](#crafteos-y-materiales) ⭐ **¡Ahora con editor integrado!**
4. [Fundición y refinado](#fundición-y-refinado)
5. [Mutaciones y encantamientos](#mutaciones-y-encantamientos)
6. [Mobs: enemigos y NPCs](#mobs-enemigos-y-npcs)
7. [Áreas y niveles](#áreas-y-niveles)
8. [Misiones (Quests)](#misiones-quests)
9. [Logros (Achievements)](#logros-achievements)
10. [Workflows completos de ejemplo](#workflows-completos-de-ejemplo)

---

## 🎯 Flujo rápido: Crear un ítem con receta de crafteo

**Nuevo proceso (2025)** - Todo desde Discord, sin código:

```
1. !item-crear iron_ingot          → Crear ingrediente 1
2. !item-crear wood_plank          → Crear ingrediente 2
3. !item-crear iron_sword          → Crear producto
   ├─ Pulsar "Base"                → Nombre, descripción, etc.
   ├─ Pulsar "Props"               → Agregar {"craftable": {"enabled": true}}
   ├─ Pulsar "Receta" ⭐ NUEVO     → Escribir: iron_ingot:3, wood_plank:1
   └─ Pulsar "Guardar"             → ¡Listo! Receta activa
4. !craftear iron_sword            → Los jugadores pueden craftear
```

**Antes (2024)**: Había que pedirle al equipo dev que ejecutara scripts de Prisma 🚫

---

## Antes de empezar

> ⭐ **¡NUEVO!** Ahora puedes crear y editar recetas de crafteo directamente desde Discord sin necesidad del equipo dev. Usa el botón **Receta** en los comandos `!item-crear` e `!item-editar`. Ver [sección de Crafteos](#crear-nuevas-recetas-de-crafteo-directo-desde-discord) para más detalles.

- Asegúrate de tener el permiso `Manage Guild` o el rol de staff configurado; varios comandos lo revisan con `hasManageGuildOrStaff`.
- Siempre usa claves (`key`) en minúsculas y sin espacios. Son únicas por servidor y no se pueden repetir.
- Todos los editores funcionan con botones + modales. Si cierras la ventana o pasa más de 30 min sin responder, el editor caduca y debes reabrirlo.
- Cuando un modal pida JSON, puedes copiar los ejemplos de esta guía y ajustarlos. Si el JSON no es válido, el bot te avisará y no guardará los cambios.

---

## Items: creación, edición y revisión

### Crear un ítem nuevo — `!item-crear <key>`
1. Escribe `!item-crear piedra_mistica` (usa la key que necesites).
2. Pulsa **Base** y completa:
   - **Nombre** y **Descripción**: lo que verán los jugadores.
   - **Categoría** (opcional) para agrupar en listados (`weapon`, `material`, `consumible`, etc.).
   - **Icon URL** si tienes una imagen.
   - **Stackable y Máx inventario** en formato `true,10`. Ejemplos: `true,64`, `false,1`, o deja vacío para infinito.
3. Pulsa **Tags** y agrega etiquetas separadas por coma (`rare, evento`); sirven para filtrar en `!items-lista`.
4. Pulsa **Props (JSON)** y pega solo lo que necesites. Ejemplo rápido para una herramienta que también cura al uso:

```json
{
  "tool": { "type": "pickaxe", "tier": 2 },
  "breakable": { "enabled": true, "maxDurability": 120 },
  "food": { "healHp": 25, "cooldownSeconds": 180 }
}
```

5. Pulsa **Receta** (⭐ nuevo) si quieres que el ítem sea crafteable. Ver [sección de Crafteos](#crear-nuevas-recetas-de-crafteo-directo-desde-discord) para más detalles.
6. Cuando todo esté listo, pulsa **Guardar**. El bot confirmará con "✅ Item creado".

### 🎮 Cómo se ve el editor de ítems

El editor interactivo muestra toda la información del ítem y los botones de configuración:

```
┌─────────────────────────────────────────────────────┐
│  📦 Editor de Ítem: iron_sword                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Nombre: Espada de Hierro                          │
│  Key: iron_sword                                   │
│  Stackable: ❌  |  Max Inv: 1                      │
│  Tags: weapon, tier2                               │
│  Receta: ✅ Habilitada (3 ingredientes → 1 unidad)│  ← ¡NUEVO!
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [📝 Base]  [🏷️ Tags]  [⚙️ Receta]  [🔧 Props]    │  ← Botón Receta
│                                                     │
│  [💾 Guardar]  [❌ Cancelar]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Elementos clave**:
- **Línea "Receta"**: Estado actual (✅ Habilitada o ❌ Deshabilitada) + detalles
- **Botón "⚙️ Receta"**: Click para configurar ingredientes y cantidad producida
- **Actualización en tiempo real**: Los cambios se reflejan inmediatamente

### Editar, listar y borrar

- `!item-editar` abre el mismo editor, pero cargando un ítem existente.
- `!item-eliminar <key>` borra la versión local (solicita confirmación).
- `!items-lista` y `!item-ver <key>` sirven para revisar lo que ya existe.

> 💡 Tip: si solo quieres revisar las propiedades de un ítem, usa `!item-ver <key>`; mostrará los `props` formateados en JSON.

### Preparar ítems especiales

- **Consumibles**: en Props agrega

  ```json
  "food": {
    "healHp": 40,
    "healPercent": 10,
    "cooldownKey": "food:pocion_epica",
    "cooldownSeconds": 120
  }
  ```

  Luego prueba con `!comer pocion_epica` (usa la key real) para ver el mensaje de curación y el cooldown.

- **Cofres**: añade

  ```json
  "chest": {
    "enabled": true,
    "consumeOnOpen": true,
    "rewards": [
      { "type": "coins", "amount": 500 },
      { "type": "item", "itemKey": "token_evento", "qty": 3 }
    ]
  }
  ```

  Después abre el cofre con `!abrir <key>`.

- **Armas/armaduras**: usa `damage`, `defense` o `maxHpBonus`. Si quieres limitar mutaciones, agrega `mutationPolicy` (ver sección más abajo).

---

## Crafteos y materiales

El crafteo permite combinar materiales para crear ítems más valiosos. A diferencia de la fundición, el crafteo es instantáneo y no requiere tiempo de espera.

### Cómo funciona el crafteo

1. El jugador ejecuta `!craftear <productKey>`.
2. El bot verifica que tenga todos los ingredientes.
3. Si los tiene, los descuenta del inventario y entrega el producto inmediatamente.
4. Las estadísticas del jugador se actualizan (`itemsCrafted`).

---

## Mutaciones y encantamientos

Las mutaciones permiten mejorar ítems agregándoles bonificaciones especiales. Son consumibles permanentes que se aplican a un ítem específico.

### Crear mutaciones (requiere equipo dev)

Las mutaciones se crean directamente en la base de datos. Envía al equipo dev:

- **Key**: identificador único (ej. `ruby_core`, `sharpness_enchant`)
- **Nombre**: nombre visible
- **Efectos** (JSON):
  ```json
  {
    "damageBonus": 15,
    "defenseBonus": 0,
    "maxHpBonus": 0
  }
  ```

### Configurar políticas de mutación en ítems

Decide qué mutaciones puede recibir cada ítem editando sus **Props**:

1. Ejecuta `!item-editar` y selecciona el ítem (ej. `iron_sword`).
2. Abre **Props (JSON)** y agrega o modifica:

```json
"mutationPolicy": {
  "allowedKeys": ["ruby_core", "emerald_core", "sharpness_enchant"],
  "deniedKeys": ["curse_weakness"]
}
```

- `allowedKeys`: solo estas mutaciones se pueden aplicar (si está vacío o ausente, acepta todas excepto las denegadas).
- `deniedKeys`: estas mutaciones están prohibidas explícitamente.

### Ejemplos de mutaciones por tipo de ítem

#### Armas (espadas, arcos, alabardas)
```json
"mutationPolicy": {
  "allowedKeys": [
    "sharpness_enchant",
    "fire_aspect",
    "vampire_core",
    "ruby_core"
  ],
  "deniedKeys": ["defense_boost", "hp_regen"]
}
```

#### Armaduras (petos, cascos, botas)
```json
"mutationPolicy": {
  "allowedKeys": [
    "defense_boost",
    "hp_regen",
    "emerald_core",
    "thorns_enchant"
  ],
  "deniedKeys": ["sharpness_enchant", "fire_aspect"]
}
```

#### Herramientas (picos, hachas)
```json
"mutationPolicy": {
  "allowedKeys": [
    "efficiency_boost",
    "unbreaking_core",
    "fortune_enchant"
  ],
  "deniedKeys": ["combat_related"]
}
```

### Aplicar mutaciones como staff (para pruebas)

1. Asegúrate de tener el ítem en tu inventario (`!inventario`).
2. Ejecuta:
   ```
   !encantar iron_sword ruby_core
   ```
3. El bot verificará:
   - Que tienes el ítem.
   - Que la mutación existe.
   - Que la política del ítem lo permite.
4. Si todo es correcto: "✨ Aplicada mutación `ruby_core` a **Espada de Hierro**."

### Verificar mutaciones aplicadas

- Usa `!player <@usuario>` o `!stats` para ver bonificaciones de combate.
- Las mutaciones aparecen sumadas en `damage`, `defense` o `maxHp` según corresponda.

### Catálogo de mutaciones sugeridas

| Mutación Key | Nombre | Efectos | Tipo de Ítem |
| --- | --- | --- | --- |
| `ruby_core` | Núcleo de Rubí | +15 damage | Armas |
| `emerald_core` | Núcleo de Esmeralda | +10 defense, +20 maxHp | Armaduras |
| `sapphire_core` | Núcleo de Zafiro | +25 maxHp | Capas/Accesorios |
| `sharpness_enchant` | Filo Mejorado | +8 damage | Armas cortantes |
| `fire_aspect` | Aspecto ígneo | +12 damage | Armas de fuego |
| `defense_boost` | Refuerzo Defensivo | +7 defense | Armaduras |
| `hp_regen` | Regeneración | +30 maxHp | Armaduras/Capas |
| `efficiency_boost` | Eficiencia | (lógica custom) | Herramientas |
| `fortune_enchant` | Fortuna | (lógica custom) | Picos |
| `unbreaking_core` | Irrompible | +50% durabilidad | Herramientas |
| `vampire_core` | Vampirismo | +10 damage, lifesteal | Armas |
| `thorns_enchant` | Espinas | refleja daño | Armaduras |

> 💡 **Tip**: las mutaciones con efectos custom (como `fortune_enchant` que aumenta drops) requieren lógica adicional en el código. Consulta con el equipo dev antes de anunciarlas.

---

## Mobs: enemigos y NPCs

- Asegúrate de tener el permiso `Manage Guild` o el rol de staff configurado; varios comandos lo revisan con `hasManageGuildOrStaff`.
- Siempre usa claves (`key`) en minúsculas y sin espacios. Son únicas por servidor y no se pueden repetir.
- Todos los editores funcionan con botones + modales. Si cierras la ventana o pasa más de 30 min sin responder, el editor caduca y debes reabrirlo.
- Cuando un modal pida JSON, puedes copiar los ejemplos de esta guía y ajustarlos. Si el JSON no es válido, el bot te avisará y no guardará los cambios.

---

## Items: creación, edición y revisión

### Crear un ítem nuevo — `!item-crear <key>`
1. Escribe `!item-crear piedra_mistica` (usa la key que necesites).
2. Pulsa **Base** y completa:
   - **Nombre** y **Descripción**: lo que verán los jugadores.
   - **Categoría** (opcional) para agrupar en listados (`weapon`, `material`, `consumible`, etc.).
   - **Icon URL** si tienes una imagen.
   - **Stackable y Máx inventario** en formato `true,10`. Ejemplos: `true,64`, `false,1`, o deja vacío para infinito.
3. Pulsa **Tags** y agrega etiquetas separadas por coma (`rare, evento`); sirven para filtrar en `!items-lista`.
4. Pulsa **Props (JSON)** y pega solo lo que necesites. Ejemplo rápido para una herramienta que también cura al uso:

```json
{
  "tool": { "type": "pickaxe", "tier": 2 },
  "breakable": { "enabled": true, "maxDurability": 120 },
  "food": { "healHp": 25, "cooldownSeconds": 180 }
}
```

5. Cuando todo esté listo, pulsa **Guardar**. El bot confirmará con “✅ Item creado”.

### Editar, listar y borrar

- `!item-editar` abre el mismo editor, pero cargando un ítem existente.
- `!item-eliminar <key>` borra la versión local (solicita confirmación).
- `!items-lista` y `!item-ver <key>` sirven para revisar lo que ya existe.

> 💡 Tip: si solo quieres revisar las propiedades de un ítem, usa `!item-ver <key>`; mostrará los `props` formateados en JSON.

### Preparar ítems especiales

- **Consumibles**: en Props agrega

  ```json
  "food": {
    "healHp": 40,
    "healPercent": 10,
    "cooldownKey": "food:pocion_epica",
    "cooldownSeconds": 120
  }
  ```

  Luego prueba con `!comer pocion_epica` (usa la key real) para ver el mensaje de curación y el cooldown.

- **Cofres**: añade

  ```json
  "chest": {
    "enabled": true,
    "consumeOnOpen": true,
    "rewards": [
      { "type": "coins", "amount": 500 },
      { "type": "item", "itemKey": "token_evento", "qty": 3 }
    ]
  }
  ```

  Después abre el cofre con `!abrir <key>`.

- **Armas/armaduras**: usa `damage`, `defense` o `maxHpBonus`. Si quieres limitar mutaciones, agrega `mutationPolicy` (ver sección más abajo).

---

## Crafteos y materiales

El crafteo permite combinar materiales para crear ítems más valiosos. A diferencia de la fundición, el crafteo es instantáneo y no requiere tiempo de espera.

### Cómo funciona el crafteo

1. El jugador ejecuta `!craftear <productKey>`.
2. El bot verifica que tenga todos los ingredientes.
3. Si los tiene, los descuenta del inventario y entrega el producto inmediatamente.
4. Las estadísticas del jugador se actualizan (`itemsCrafted`).

### Crear nuevas recetas de crafteo (¡directo desde Discord!)

Ya **NO necesitas al equipo dev** para crear recetas. Ahora puedes configurarlas directamente al crear o editar un ítem.

#### Paso 1: Crear todos los ítems involucrados

**Ejemplo: Espada de Hierro**

1. **Ingredientes**:
   ```
   !item-crear iron_ingot
   ```
   - Nombre: Lingote de Hierro
   - Stackable: true,999
   - Props: `{"craftingOnly": true}`

   ```
   !item-crear wood_plank
   ```
   - Nombre: Tablón de Madera
   - Stackable: true,999
   - Props: `{"craftingOnly": true}`

2. **Producto final con receta**:
   ```
   !item-crear iron_sword
   ```
   - Nombre: Espada de Hierro
   - Descripción: Espada básica de hierro forjado
   - Stackable: false,1
   - Props:
     ```json
     {
       "craftable": {"enabled": true},
       "tool": {"type": "sword", "tier": 2},
       "damage": 15,
       "breakable": {"enabled": true, "maxDurability": 200}
     }
     ```

#### Paso 2: Configurar la receta (¡NUEVO!)

Antes de guardar el ítem, pulsa el botón **Receta** en el editor. Aparecerá un modal como este:

```
┌─────────────────────────────────────────┐
│      📝 Receta de Crafteo               │
├─────────────────────────────────────────┤
│ Habilitar receta? (true/false)          │
│ [ true                          ]       │
├─────────────────────────────────────────┤
│ Cantidad que produce                    │
│ [ 1                             ]       │
├─────────────────────────────────────────┤
│ Ingredientes (itemKey:qty, ...)         │
│ ┌───────────────────────────────────┐   │
│ │ iron_ingot:3, wood_plank:1        │   │
│ │                                   │   │
│ └───────────────────────────────────┘   │
│                                         │
│           [Enviar]  [Cancelar]          │
└─────────────────────────────────────────┘
```

**Campos del modal:**

1. **Habilitar receta?**: escribe `true` para activar, `false` para desactivar
2. **Cantidad que produce**: cuántas unidades del producto se crean (ej. `1` espada, `3` lingotes, `10` flechas)
3. **Ingredientes**: lista separada por comas en formato `itemKey:cantidad`

El formato de ingredientes es: `itemKey:cantidad, itemKey:cantidad, ...`

**Ejemplos válidos:**
- `iron_ingot:3, wood_plank:1` → necesita 3 lingotes y 1 tablón
- `leather:8, string:2` → necesita 8 cueros y 2 cuerdas
- `ruby:1, gold_ingot:5, magic_dust:2` → necesita 1 rubí, 5 lingotes de oro y 2 polvos mágicos

El bot automáticamente:
- ✅ Valida que las claves (`itemKey`) existan en tu servidor
- ✅ Convierte las claves a IDs de base de datos
- ✅ Guarda la receta junto con el ítem
- ❌ Rechaza ingredientes que no existen con mensaje de error claro

Finalmente pulsa **Guardar** y listo. ¡La receta ya está activa!

#### 📋 Ejemplo JSON completo de un ítem con receta

Después de guardar, el ítem quedará estructurado así en la base de datos:

**EconomyItem (iron_sword)**:
```json
{
  "id": "uuid-123",
  "key": "iron_sword",
  "guildId": "guild-456",
  "name": "Espada de Hierro",
  "description": "Espada básica de hierro forjado",
  "stackable": false,
  "maxInventory": 1,
  "props": {
    "craftable": {"enabled": true},
    "tool": {"type": "sword", "tier": 2},
    "damage": 15,
    "breakable": {"enabled": true, "maxDurability": 200}
  },
  "tags": ["weapon", "tier2"],
  "itemRecipe": {
    "id": "recipe-789",
    "productItemId": "uuid-123",
    "productQuantity": 1,
    "ingredients": [
      {
        "id": "ing-001",
        "recipeId": "recipe-789",
        "itemId": "uuid-iron-ingot",
        "quantity": 3
      },
      {
        "id": "ing-002",
        "recipeId": "recipe-789",
        "itemId": "uuid-wood-plank",
        "quantity": 1
      }
    ]
  }
}
```

> 💡 **Nota**: No necesitas escribir este JSON manualmente. El editor lo crea automáticamente cuando pulsas "Receta" y guardas.

#### Paso 3: Editar recetas existentes

Si ya creaste un ítem y quieres agregar/modificar su receta:

```
!item-editar iron_sword
```

Pulsa **Receta** y edita:
- Para **agregar** una receta nueva: pon `true` y escribe los ingredientes
- Para **modificar** ingredientes: cambia el texto (ej. `iron_ingot:5, wood_plank:2`)
- Para **deshabilitar** la receta: pon `false` en "Habilitar receta?"
- Para **eliminar** completamente: pon `false` y deja ingredientes vacío

Cuando guardas, el bot:
- 🔄 Actualiza la receta si cambió
- ➕ Crea la receta si es nueva
- 🗑️ Elimina la receta si la deshabilitaste

#### Paso 4: Probar la receta

1. Asegúrate de tener los ingredientes en tu inventario.
2. Ejecuta:
   ```
   !craftear iron_sword
   ```
3. El bot responderá:
   - ✅ Si tienes todo: "✨ Crafteaste **Espada de Hierro** x1"
   - ❌ Si falta algo: "No tienes suficientes ingredientes: necesitas 3 iron_ingot, 1 wood_plank"

### 📦 Ejemplos de Props JSON para diferentes tipos de crafteo

#### Arma crafteable con durabilidad
```json
{
  "craftable": {"enabled": true},
  "tool": {"type": "sword", "tier": 2},
  "damage": 15,
  "breakable": {
    "enabled": true,
    "maxDurability": 200,
    "repairItem": "iron_ingot",
    "repairAmount": 20
  }
}
```
**Receta sugerida**: `iron_ingot:3, wood_plank:1`

---

#### Armadura crafteable con bonificaciones
```json
{
  "craftable": {"enabled": true},
  "wearable": {
    "slot": "chest",
    "visual": "https://example.com/iron_chestplate.png"
  },
  "defense": 12,
  "maxHpBonus": 20,
  "breakable": {
    "enabled": true,
    "maxDurability": 300
  }
}
```
**Receta sugerida**: `iron_ingot:8, leather:2`

---

#### Consumible crafteable (pociones)
```json
{
  "craftable": {"enabled": true},
  "food": {
    "healHp": 50,
    "healPercent": 0,
    "cooldownKey": "potion:health",
    "cooldownSeconds": 60
  },
  "stackable": true,
  "maxInventory": 10
}
```
**Receta sugerida**: `red_herb:2, water_bottle:1, magic_dust:1`

---

#### Material de crafteo (produce múltiples unidades)
```json
{
  "craftable": {"enabled": true},
  "craftingOnly": true,
  "description": "Material refinado usado en crafteo avanzado",
  "stackable": true,
  "maxInventory": 999
}
```
**Receta sugerida**: `iron_ore:2, coal:1` → **Produce 3 unidades** (configurar en "Cantidad que produce": `3`)

---

#### Herramienta con efectos especiales
```json
{
  "craftable": {"enabled": true},
  "tool": {
    "type": "pickaxe",
    "tier": 3,
    "efficiency": 1.5,
    "fortune": true
  },
  "breakable": {
    "enabled": true,
    "maxDurability": 500,
    "unbreaking": 2
  }
}
```
**Receta sugerida**: `steel_ingot:3, diamond:2, enchanted_core:1`

---

#### Ítem decorativo/coleccionable
```json
{
  "craftable": {"enabled": true},
  "collectible": true,
  "rarity": "legendary",
  "tradeable": false,
  "description": "Trofeo único obtenido al craftear materiales legendarios",
  "stackable": false,
  "maxInventory": 1
}
```
**Receta sugerida**: `mythril_ingot:10, dragon_scale:5, phoenix_feather:3`

---

#### Cofre crafteable con recompensas
```json
{
  "craftable": {"enabled": true},
  "chest": {
    "enabled": true,
    "consumeOnOpen": true,
    "rewards": [
      {"type": "coins", "amount": 1000},
      {"type": "item", "itemKey": "rare_gem", "qty": 2}
    ]
  }
}
```
**Receta sugerida**: `wood_plank:8, iron_ingot:2, gold_ingot:1`

---

### 📋 Tabla resumen de Props JSON por tipo

| Tipo de Ítem | Props Esenciales | Receta Ejemplo |
| --- | --- | --- |
| **Arma** | `craftable`, `tool`, `damage`, `breakable` | `iron_ingot:3, wood_plank:1` |
| **Armadura** | `craftable`, `wearable`, `defense`, `maxHpBonus` | `iron_ingot:8, leather:2` |
| **Consumible** | `craftable`, `food`, `stackable` | `red_herb:2, water_bottle:1` |
| **Material** | `craftable`, `craftingOnly`, `stackable` | `iron_ore:2, coal:1` (x3 output) |
| **Herramienta** | `craftable`, `tool`, `breakable` | `steel_ingot:3, diamond:2` |
| **Cofre** | `craftable`, `chest`, `stackable` | `wood_plank:8, iron_ingot:2` |
| **Coleccionable** | `craftable`, `collectible`, `rarity` | `mythril:10, dragon_scale:5` |

> 💡 **Tip**: Todos los ítems crafteables **DEBEN** tener `"craftable": {"enabled": true}` en sus props para que el comando `!craftear` funcione.

---

### Categorías de recetas sugeridas

#### 🛠️ Herramientas

**Pico de Hierro**
- Ingredientes: 3 iron_ingot + 2 wood_plank
- Output: 1 iron_pickaxe (tier 2, 150 durabilidad)

**Caña de Pescar Mejorada**
- Ingredientes: 2 wood_plank + 1 string + 1 iron_ingot
- Output: 1 advanced_fishing_rod (tier 2, bonus catch rate)

**Hacha de Batalla**
- Ingredientes: 4 steel_ingot + 2 leather + 1 ruby
- Output: 1 battle_axe (tier 3, 20 damage)

#### ⚔️ Armas

**Daga de Bronce**
- Ingredientes: 2 bronze_ingot + 1 leather
- Output: 1 bronze_dagger (10 damage, tier 1)

**Espada de Acero**
- Ingredientes: 5 steel_ingot + 2 leather + 1 gold_ingot
- Output: 1 steel_sword (25 damage, tier 3)

**Arco Largo**
- Ingredientes: 3 wood_plank + 2 string + 1 iron_ingot
- Output: 1 longbow (18 damage, tier 2)

#### 🛡️ Armaduras

**Peto de Cuero**
- Ingredientes: 8 leather + 2 string
- Output: 1 leather_chestplate (5 defense, tier 1)

**Casco de Hierro**
- Ingredientes: 5 iron_ingot + 1 leather
- Output: 1 iron_helmet (8 defense, tier 2)

**Botas de Acero**
- Ingredientes: 4 steel_ingot + 2 leather
- Output: 1 steel_boots (10 defense, tier 3)

#### 🍖 Consumibles

**Poción de Curación Menor**
- Ingredientes: 1 red_herb + 1 water_bottle
- Output: 1 minor_healing_potion (cura 25 HP)

**Poción de Curación Mayor**
- Ingredientes: 2 red_herb + 1 magic_dust + 1 glass_bottle
- Output: 1 major_healing_potion (cura 75 HP)

**Pan**
- Ingredientes: 3 wheat + 1 water
- Output: 5 bread (cura 15 HP cada uno)

#### 🎨 Decorativos y Utilidad

**Antorcha**
- Ingredientes: 1 wood_plank + 1 coal
- Output: 8 torch

**Cofre de Madera**
- Ingredientes: 8 wood_plank
- Output: 1 wooden_chest (container)

**Llave Maestra**
- Ingredientes: 3 gold_ingot + 1 ruby + 1 magic_dust
- Output: 1 master_key (abre cofres especiales)

### Árbol de progresión de crafteo

```
Nivel 1 (Principiante)
├─ Herramientas de Madera (wood_pickaxe, wood_axe)
├─ Armas Básicas (wooden_sword, stone_dagger)
└─ Comida Simple (bread, cooked_fish)

Nivel 2 (Aprendiz)
├─ Herramientas de Cobre/Bronce (copper_pickaxe, bronze_axe)
├─ Armadura de Cuero (leather_armor set)
├─ Armas de Hierro (iron_sword, iron_bow)
└─ Pociones Menores (minor_healing_potion)

Nivel 3 (Artesano)
├─ Herramientas de Hierro (iron_pickaxe tier 2)
├─ Armadura de Hierro (iron_armor set)
├─ Armas de Acero (steel_sword, steel_halberd)
└─ Pociones Mayores (major_healing_potion)

Nivel 4 (Maestro)
├─ Herramientas Encantadas (enchanted_pickaxe tier 3)
├─ Armadura de Acero (steel_armor set)
├─ Armas Legendarias (legendary_sword, dragon_bow)
└─ Pociones Épicas (epic_elixir, immortality_potion)

Nivel 5 (Legendario)
├─ Herramientas Míticas (mythril_pickaxe tier 4)
├─ Armadura Divina (divine_armor set)
├─ Armas Divinas (godslayer_sword, infinity_bow)
└─ Elixires Divinos (phoenix_tears, gods_blessing)
```

### Materiales base recomendados

| Material | Key | Obtención | Uso Principal |
| --- | --- | --- | --- |
| Madera | `wood_plank` | Talar árboles | Herramientas tier 1 |
| Cuero | `leather` | Mobs, caza | Armaduras tier 1 |
| Cobre | `copper_ingot` | Fundir copper_ore | Herramientas tier 1-2 |
| Estaño | `tin_ingot` | Fundir tin_ore | Aleaciones (bronce) |
| Bronce | `bronze_ingot` | Fundir copper+tin | Herramientas tier 2 |
| Hierro | `iron_ingot` | Fundir iron_ore | Armas/armor tier 2 |
| Carbón | `coal` | Minar | Fundición universal |
| Acero | `steel_ingot` | Fundir hierro+carbón | Armas/armor tier 3 |
| Oro | `gold_ingot` | Fundir gold_ore | Joyería, ítems raros |
| Rubí | `ruby` | Mobs raros, cofres | Encantamientos |
| Esmeralda | `emerald` | Mobs raros, cofres | Encantamientos |
| Zafiro | `sapphire` | Mobs raros, cofres | Encantamientos |
| Polvo Mágico | `magic_dust` | Bosses, eventos | Crafteo avanzado |
| Cristal de Lava | `lava_crystal` | Área volcánica | Crafteo legendario |
| Mythril | `mythril_ingot` | Fundir mythril_ore | Armas/armor tier 4 |

### Verificar y solucionar problemas con recetas

#### Ver información de una receta

Para verificar si un ítem tiene receta activa, usa:

```
!item-ver iron_sword
```

En el editor aparecerá:
- **Receta**: `Habilitada (3 ingredientes → 1 unidades)` ← tiene receta activa
- **Receta**: `Deshabilitada` ← no tiene receta o está desactivada

#### Errores comunes y soluciones

**Error**: "No se encontró el ítem `xxx_ingot` en este servidor"
- **Causa**: La clave (`itemKey`) del ingrediente no existe o tiene un typo
- **Solución**: Verifica con `!items-lista` que todos los ingredientes existan. Crea los que falten con `!item-crear`

**Error**: "No tienes suficientes ingredientes"
- **Causa**: El jugador no tiene todos los materiales en su inventario
- **Solución**: Usa `!inventario` para verificar qué falta. Añade ítems con `!give @usuario itemKey cantidad`

**Problema**: La receta no se guarda
- **Causa**: El prop `craftable.enabled` está en `false` o falta
- **Solución**: En Props (JSON) asegúrate de tener: `"craftable": {"enabled": true}`

**Problema**: La receta desapareció después de editar el ítem
- **Causa**: No marcaste "Habilitar receta?" como `true` al editar
- **Solución**: Vuelve a `!item-editar`, pulsa **Receta**, pon `true` y reingresa los ingredientes

#### Workflow de debug para recetas

1. **Verificar que el producto existe**:
   ```
   !item-ver iron_sword
   ```
   Debe aparecer en la lista y tener `craftable.enabled: true` en props.

2. **Verificar que todos los ingredientes existen**:
   ```
   !items-lista
   ```
   Busca `iron_ingot` y `wood_plank` en la lista.

3. **Probar con admin**:
   - Añádete los ingredientes: `!give @tuUsuario iron_ingot 10`
   - Intenta craftear: `!craftear iron_sword`
   - Si funciona: la receta está bien configurada
   - Si falla: revisa los errores del bot

4. **Verificar la base de datos (solo si todo lo anterior falló)**:
   - Pide al equipo dev que revise la tabla `ItemRecipe`
   - Debe haber un registro con `productItemId` apuntando al ítem correcto
   - Los `RecipeIngredient` deben tener `itemId` y `quantity` correctos

### Cadenas de crafteo complejas

**Ejemplo: Espada Legendaria**

1. **Recolectar materiales base**:
   - Minar 20 iron_ore
   - Minar 15 coal
   - Derrotar boss para obtener 3 magic_dust

2. **Fundición (fase 1)**:
   - Fundir iron_ore → iron_ingot (15 unidades)
   - Tiempo total: ~40 minutos

3. **Fundición (fase 2)**:
   - Fundir iron_ingot + coal + carbon → steel_ingot (8 unidades)
   - Tiempo total: ~60 minutos

4. **Crafteo (fase 1)**:
   - Craftear steel_ingot + leather → steel_sword_base

5. **Encantamiento**:
   - Aplicar ruby_core al steel_sword_base (+15 damage)

6. **Crafteo final**:
   - Craftear steel_sword_base(enchanted) + magic_dust + dragon_scale → legendary_dragon_slayer
   - Resultado: Arma tier 4 con 45 damage, 300 durabilidad, efectos especiales

### Marcado de ítems crafteable-only

Para materiales que **solo** sirven para craftear y no tienen uso directo:

```json
{
  "craftingOnly": true,
  "description": "Material usado únicamente para crafteo"
}
```

Esto ayuda a los jugadores a entender que deben combinarlo con otros ítems para obtener valor.

### 💡 Tips y mejores prácticas para recetas

#### Organización de recetas

- **Nombra consistentemente**: Usa sufijos como `_ingot`, `_ore`, `_plank` para que sean fáciles de identificar
- **Agrupa por tier**: Crea materiales tier 1, tier 2, tier 3... para facilitar progresión
- **Documenta ingredientes raros**: Si una receta usa ítems de eventos o bosses, menciónalo en la descripción del producto

#### Balance de economía

- **Recetas básicas**: 2-3 ingredientes, cantidades bajas (< 5 unidades)
- **Recetas intermedias**: 3-5 ingredientes, algunas de tier anterior
- **Recetas avanzadas**: 5+ ingredientes, incluyen materiales raros y crafteos previos
- **Recetas legendarias**: Cadenas complejas que requieren múltiples pasos de fundición y crafteo

#### Productividad del staff

- **Crea plantillas**: Guarda en un documento los props JSON comunes para copiar/pegar rápidamente
- **Batch creation**: Crea todos los ingredientes primero, luego todos los productos
- **Usa el mismo editor**: No cierres el editor entre ítems similares, solo cambia la key y ajusta valores
- **Prueba inmediatamente**: Después de crear una receta, añádete los ingredientes y prueba `!craftear` para validar

#### Errores a evitar

- ❌ **No crear los ingredientes primero**: Si creas el producto con receta pero los ingredientes no existen, la receta fallará
- ❌ **Typos en itemKeys**: `iron_ingott` vs `iron_ingot` - el bot no encontrará el ítem
- ❌ **Olvidar craftable.enabled**: Si el prop no está en `true`, la receta no funcionará aunque esté guardada
- ❌ **Cantidades desbalanceadas**: 100 unidades de un material común no debe producir 1 ítem legendario

#### Ejemplos de recetas balanceadas

| Tier | Ingredientes Típicos | Output Typical | Ejemplo |
| --- | --- | --- | --- |
| 1 (Común) | 2-3 materiales básicos x2-5 | 1-5 unidades | 3 wood + 2 stone → 1 basic_axe |
| 2 (Poco común) | 3-4 materiales, algunos refinados x3-10 | 1-3 unidades | 5 iron_ingot + 2 leather → 1 iron_sword |
| 3 (Raro) | 4-5 materiales, crafteos tier 2 x5-15 | 1-2 unidades | 8 steel_ingot + 3 ruby + 1 iron_sword → 1 steel_sword |
| 4 (Épico) | 5-7 materiales, incluye raros x10-30 | 1 unidad | 10 mythril + 5 magic_dust + 3 dragon_scale → 1 mythril_sword |
| 5 (Legendario) | 6+ materiales, cadenas complejas x20+ | 1 unidad | 15 divine_ore + 10 phoenix_feather + 1 mythril_sword → 1 godslayer |

---

## Mutaciones y encantamientos

1. Asegúrate de que existe la mutación (pide la `mutationKey` al equipo dev si aún no está en la base).
2. Desde `!item-editar`, abre **Props (JSON)** y agrega:

```json
"mutationPolicy": {
  "allowedKeys": ["ruby_core", "emerald_core"],
  "deniedKeys": ["curse_core"]
}
```

3. Entrega al jugador la mutación correspondiente y pídele que use `!encantar <itemKey> <mutationKey>`.
4. Para probarlo tú mismo, equipa el ítem y ejecuta `!encantar`. Si la política lo permite, el bot responde con “✨ Aplicada mutación…”.

---

## Fundición y refinado

La fundición es un proceso que transforma materiales crudos en recursos refinados con un tiempo de espera. Es útil para economías más realistas donde los jugadores deben planificar.

### Cómo funciona la fundición

1. El jugador ejecuta `!fundir` especificando inputs y output.
2. El bot verifica que tenga los materiales, los descuenta del inventario y crea un **job** con tiempo de espera.
3. Cuando el tiempo expira, el jugador usa `!fundir-reclamar` para obtener el resultado.

### Crear nuevas recetas de fundición

#### Paso 1: Crear los ítems necesarios

1. **Materiales de entrada** (ej. minerales crudos):
   ```
   !item-crear copper_ore
   ```
   - Nombre: Mineral de Cobre
   - Descripción: Mineral sin refinar extraído de las minas
   - Stackable: true,999
   - Props: `{"craftingOnly": true}`

   ```
   !item-crear coal
   ```
   - Nombre: Carbón
   - Descripción: Combustible para fundición
   - Stackable: true,999

2. **Material de salida** (ej. lingote refinado):
   ```
   !item-crear copper_ingot
   ```
   - Nombre: Lingote de Cobre
   - Descripción: Cobre puro listo para craftear
   - Stackable: true,999

#### Paso 2: Coordinar con el equipo dev

Envía la siguiente información al equipo de desarrollo:

**Receta de fundición: Lingote de Cobre**
- **Inputs**:
  - `copper_ore`: 5 unidades
  - `coal`: 2 unidades
- **Output**:
  - `copper_ingot`: 2 unidades
- **Duración**: 300 segundos (5 minutos)

El equipo dev ejecutará:
```typescript
// Ejemplo de lo que hará el dev (tú no necesitas hacerlo)
await createSmeltJob(userId, guildId,
  [
    { itemKey: 'copper_ore', qty: 5 },
    { itemKey: 'coal', qty: 2 }
  ],
  'copper_ingot',
  2,
  300
);
```

#### Paso 3: Probar la receta

1. Asegúrate de tener los materiales:
   ```
   !inventario
   ```
2. Inicia la fundición:
   ```
   !fundir copper_ore:5,coal:2 copper_ingot:2 300
   ```
   (El comando exacto puede variar, verifica con `!help fundir`)

3. Espera el tiempo configurado o usa un comando de admin para acelerar (si existe).

4. Reclama el resultado:
   ```
   !fundir-reclamar
   ```

### Ejemplos de recetas de fundición por nivel

#### Nivel Básico (5-10 minutos)
| Entrada | Salida | Tiempo | Uso |
| --- | --- | --- | --- |
| 5 copper_ore + 2 coal | 2 copper_ingot | 5 min | Crafteo básico |
| 5 iron_ore + 3 coal | 2 iron_ingot | 8 min | Armas tier 1 |
| 3 sand + 1 coal | 2 glass | 3 min | Construcción |

#### Nivel Intermedio (15-30 minutos)
| Entrada | Salida | Tiempo | Uso |
| --- | --- | --- | --- |
| 8 iron_ore + 5 coal | 3 steel_ingot | 20 min | Armas tier 2 |
| 10 gold_ore + 5 coal | 3 gold_ingot | 25 min | Joyería |
| 5 copper_ingot + 5 tin_ingot | 8 bronze_ingot | 15 min | Aleaciones |

#### Nivel Avanzado (1-2 horas)
| Entrada | Salida | Tiempo | Uso |
| --- | --- | --- | --- |
| 15 iron_ingot + 10 coal + 5 carbon | 5 steel_alloy | 60 min | Armas legendarias |
| 20 mythril_ore + 10 coal + 3 magic_dust | 3 mythril_ingot | 90 min | Equipo épico |
| 10 diamond_ore + 15 coal + 5 lava_crystal | 2 diamond_refined | 120 min | Crafteo endgame |

### Cadenas de producción

Puedes crear economías complejas encadenando fundiciones:

**Ejemplo: Espada de Acero**
1. Fundir `copper_ore` → `copper_ingot` (5 min)
2. Fundir `tin_ore` → `tin_ingot` (5 min)
3. Fundir `copper_ingot + tin_ingot` → `bronze_ingot` (15 min)
4. Fundir `iron_ore` → `iron_ingot` (8 min)
5. Fundir `iron_ingot + coal + carbon` → `steel_ingot` (20 min)
6. Craftear `steel_ingot + bronze_ingot + wood` → `steel_sword`

### Fundición para eventos

**Ejemplo: Evento de Halloween**
```
!item-crear pumpkin_ore
```
- Nombre: Mineral de Calabaza Maldita
- Props: `{"eventCurrency": {"enabled": true, "eventKey": "halloween2025"}}`

**Receta especial (temporal):**
- Inputs: 10 pumpkin_ore + 5 coal + 1 cursed_essence
- Output: 1 halloween_legendary_sword
- Duración: 60 min
- Ventana: solo durante octubre 2025

### Consejos de balance

- **Fundiciones rápidas (1-5 min)**: para materiales básicos que se usan constantemente.
- **Fundiciones medias (10-30 min)**: para recursos intermedios, fomenta planificación.
- **Fundiciones largas (1-3 horas)**: para ítems raros/épicos, crea anticipación.
- **Usa carbón/coal**: como costo fijo universal para evitar fundiciones sin límite.
- **Output menor que input**: ej. 5 mineral → 2 lingotes, crea escasez y valor.

---

## Logros (Achievements)

### Crear un logro — `!logro-crear <key>`
1. Ejecuta el comando y completa el editor:
   - **Base**: Nombre, descripción, categoría, icono y puntos.
   - **Requisitos**: JSON con `type` y `value`. Ejemplo:

     ```json
     { "type": "mine_count", "value": 100 }
     ```

   - **Recompensas**: JSON con monedas, ítems o títulos. Ejemplo:

     ```json
     { "coins": 1000, "items": [{ "key": "pickaxe_mythic", "quantity": 1 }] }
     ```

2. Pulsa **Guardar**. El bot mostrará “✅ Logro creado”.
3. Usa `!logro-ver <key>` y `!logros-lista` para revisar lo que quedó configurado.

Cuando anuncies el logro, recuerda qué acción lo desbloquea (`mine_count`, `fish_count`, `craft_count`, etc.).

---

## Misiones (Quests)

### Crear una misión — `!mision-crear <key>`
1. Completa la pestaña **Base** (nombre, descripción, categoría y tipo: `daily`, `weekly`, `permanent` o `event`).
2. En **Requisitos**, indica el contador que debe alcanzar:

   ```json
   { "type": "craft_count", "count": 3 }
   ```

   También puedes usar `variety` con varias condiciones.

3. En **Recompensas**, define el premio (mismo formato que los logros).
4. Guarda y revisa con `!mision-ver <key>` o `!misiones-lista`.
5. Para pruebas, `!misiones` muestra al jugador su progreso y si puede reclamar con `!mision-reclamar <key>`.

---

## Tienda y economía

- **Crear oferta** — `!offer-crear`
  1. En **Base**, especifica `itemKey` y si la oferta está habilitada.
  2. En **Precio (JSON)**, indica monedas y/o ítems de pago:

     ```json
     { "coins": 1500, "items": [{ "itemKey": "token_evento", "qty": 2 }] }
     ```

  3. En **Ventana**, puedes fijar fechas `YYYY-MM-DD` o dejarlas vacías.
  4. En **Límites**, define cupo por usuario o stock global.
  5. Guarda y revisa la tienda con `!tienda`.

- **Monedas y recursos**: usa `!monedas <@usuario>` para revisar balances y `!inventario <@usuario>` para confirmar que recibieron lo esperado.

---

## Resumen rápido de comandos útiles

| Acción | Comando | Notas |
| --- | --- | --- |
| Crear/editar ítems | `!item-crear`, `!item-editar`, `!item-eliminar` | Requiere staff. Props en JSON. |
| Revisar ítems | `!items-lista`, `!item-ver <key>` | Incluye props y tags. |
| Consumir o probar ítems | `!comer <key>`, `!encantar <itemKey> <mutationKey>` | Útiles para QA. |
| Ofertas de tienda | `!offer-crear`, `!offer-editar` | Define precios, stock y ventanas. |
| Logros | `!logro-crear`, `!logro-ver`, `!logros-lista`, `!logro-eliminar` | Requisitos y recompensas en JSON. |
| Misiones | `!mision-crear`, `!mision-ver`, `!misiones-lista`, `!mision-eliminar` | Tipos: daily/weekly/permanent/event. |
| Progreso de jugadores | `!stats`, `!player <@usuario>`, `!racha` | Ayuda a validar nuevas recompensas. |

---

## Áreas de juego y niveles

Las áreas son lugares donde los jugadores realizan actividades (minar, pescar, pelear, plantar). Cada área tiene varios niveles, y cada nivel puede tener requisitos, recompensas y mobs específicos.

### Crear un área — `!area-crear <key>`

1. Ejecuta el comando con la key deseada (ej. `!area-crear mina_profunda`).
2. Pulsa **Base** y completa:
   - **Nombre**: Lo que verán los jugadores.
   - **Tipo**: `MINE`, `LAGOON`, `FIGHT` o `FARM` (en mayúsculas).
3. Pulsa **Config (JSON)** si necesitas configuración técnica adicional (raramente usado, pregunta al equipo dev).
4. Pulsa **Meta (JSON)** para metadatos adicionales (opcional).
5. Guarda. Usa `!areas-lista` para verificar.

### Editar un área — `!area-editar`

Abre un selector con todas las áreas del servidor, elige una y usa el mismo editor que en crear.

### Configurar niveles de área — `!area-nivel <areaKey> <level>`

Cada nivel puede tener:
- **Requisitos**: herramienta mínima, nivel de personaje, etc.
- **Recompensas**: qué se obtiene al completar (monedas, ítems, XP).
- **Mobs**: lista de enemigos que aparecen en ese nivel.
- **Ventana**: fechas ISO para eventos temporales.

#### Ejemplo: crear el nivel 1 de una mina

```bash
!area-nivel mina_profunda 1
```

1. **Requisitos** (JSON):

```json
{
  "toolType": "pickaxe",
  "minToolTier": 1,
  "minLevel": 1
}
```

2. **Recompensas** (JSON):

```json
{
  "coins": 50,
  "items": [
    { "key": "copper_ore", "quantity": 3 }
  ],
  "xp": 10
}
```

3. **Mobs** (JSON) — Aquí defines qué mobs aparecen y su peso:

```json
{
  "draws": 1,
  "table": [
    { "mobKey": "slime_verde", "weight": 10 },
    { "mobKey": "murcielago", "weight": 5 }
  ]
}
```

> 💡 **Importante**: los mobs deben existir previamente. Créalos con `!mob-crear` antes de referenciarlos aquí.

4. **Ventana** (opcional): si quieres que este nivel solo esté disponible durante un evento, agrega fechas ISO:
   - Desde: `2025-12-01T00:00:00Z`
   - Hasta: `2025-12-31T23:59:59Z`

5. Guarda. Verifica con `!mina mina_profunda` (o el comando correspondiente al tipo de área).

### Borrar áreas y niveles

- `!area-eliminar <key>` borra el área completa (solicita confirmación).
- Para borrar un nivel específico, coordina con el equipo dev o edita manualmente la base de datos (por seguridad no hay comando público).

---

## Mobs (enemigos)

Los mobs son enemigos que aparecen en áreas de tipo `FIGHT` o en niveles de minas/lagunas. También se pueden usar en eventos especiales.

### Crear un mob — `!mob-crear <key>`

1. Ejecuta el comando (ej. `!mob-crear slime_verde`).
2. Pulsa **Base** y completa:
   - **Nombre**: Nombre visible del mob.
   - **Categoría** (opcional): para agrupar (ej. `slime`, `undead`, `boss`).
3. Pulsa **Stats (JSON)** y define las estadísticas:

```json
{
  "attack": 8,
  "hp": 50,
  "defense": 2,
  "xpReward": 15
}
```

4. Pulsa **Drops (JSON)** para configurar la tabla de recompensas:

```json
{
  "draws": 2,
  "table": [
    { "type": "coins", "amount": 25, "weight": 10 },
    { "type": "item", "itemKey": "slime_gel", "qty": 1, "weight": 7 },
    { "type": "item", "itemKey": "healing_potion", "qty": 1, "weight": 3 }
  ]
}
```

   - `draws`: cuántos premios saca al morir.
   - `table`: lista de posibles recompensas con su peso (más peso = más probable).

5. Guarda y revisa con `!mobs-lista` o `!mob-ver <key>`.

### Editar y borrar mobs

- `!mob-editar` abre el mismo editor, pero cargando un mob existente.
- `!mob-eliminar <key>` borra el mob (solicita confirmación).

### Probar mobs en combate

- Usa `!pelear <mobKey>` para simular un combate. El bot mostrará el resultado, daño infligido, drops recibidos y XP ganado.
- Ajusta `attack`, `hp` y `defense` según el balance deseado.

---

## Recetas de crafteo y fundición

Aunque el crafteo funciona con `!craftear <productKey>` y la fundición con `!fundir`, las **recetas** (`itemRecipe`) y los **trabajos de fundición** se administran desde backoffice o scripts porque involucran múltiples relaciones.

### ¿Cómo agrego una nueva receta de crafteo?

1. Asegúrate de que el producto final y todos los ingredientes existen (créalos con `!item-crear`).
2. Envía al equipo dev la siguiente información:
   - **Product Key**: ej. `iron_sword`
   - **Product Quantity**: cuánto entrega (normalmente 1).
   - **Ingredientes**: lista con `itemKey` y cantidad. Ejemplo:
     ```
     - iron_ingot: 3
     - wood_plank: 1
     ```
3. El equipo dev ejecutará el seed o script correspondiente.
4. Verifica con `!craftear iron_sword` que funcione correctamente.

### ¿Cómo agrego una nueva receta de fundición?

1. Crea los ítems de entrada (ej. `iron_ore`, `coal`) y el de salida (ej. `iron_ingot`).
2. Coordina con el equipo dev para que configuren el `smeltJob` indicando:
   - **Inputs**: lista de `itemKey` + cantidad.
   - **Output**: `itemKey` + cantidad.
   - **Duración**: segundos que tarda el proceso.
3. Prueba con `!fundir` y verifica el tiempo restante con `!fundir-reclamar`.

> 📌 **Nota**: si necesitas muchas recetas, considera crear un archivo JSON con todas y enviarlo al equipo dev para carga masiva.

---

## Checklist para lanzar contenido nuevo

- [ ] El ítem tiene nombre, descripción, tags y props correctos en `!item-ver`.
- [ ] Hay una forma de conseguirlo (oferta, misión, logro, drop o craft).
- [ ] Si es un mob, tiene stats y drops configurados; pruébalo con `!pelear`.
- [ ] Si es un área con niveles, cada nivel tiene requisitos, recompensas y mobs válidos.
- [ ] Probaste el flujo como jugador (`!craftear`, `!fundir`, `!comprar`, `!mina`, `!pelear`, etc.).
- [ ] Los requisitos y recompensas de logros/misiones muestran JSON válido.
- [ ] Comunicaste al equipo cuándo entra y cómo se consigue.

Si algo falla, copia el mensaje de error completo y súbelo al canal de soporte interno; así el equipo de desarrollo puede ayudarte sin reproducir todo desde cero.

---

## Comandos de consulta rápida

Estos comandos te ayudan a revisar lo que ya está configurado sin abrir editores:

| Comando | Descripción |
| --- | --- |
| `!items-lista` | Lista todos los ítems del servidor. |
| `!item-ver <key>` | Muestra detalles completos de un ítem (props, tags, etc.). |
| `!mobs-lista` | Lista todos los mobs del servidor. |
| `!areas-lista` | Lista todas las áreas del servidor. |
| `!logros-lista` | Lista todos los logros disponibles. |
| `!logro-ver <key>` | Muestra requisitos y recompensas de un logro. |
| `!misiones-lista` | Lista todas las misiones del servidor. |
| `!mision-ver <key>` | Muestra detalles de una misión específica. |

---

## Ejemplos completos de flujos comunes

### Ejemplo 1: Crear una zona de combate con mobs

1. Crea los mobs:
   ```
   !mob-crear goblin_scout
   ```
   - Nombre: Goblin Explorador
   - Stats: `{"attack": 10, "hp": 60, "defense": 3, "xpReward": 20}`
   - Drops: `{"draws": 1, "table": [{"type": "coins", "amount": 30, "weight": 10}, {"type": "item", "itemKey": "goblin_ear", "qty": 1, "weight": 5}]}`

2. Crea el área:
   ```
   !area-crear bosque_oscuro
   ```
   - Nombre: Bosque Oscuro
   - Tipo: FIGHT

3. Crea el nivel 1:
   ```
   !area-nivel bosque_oscuro 1
   ```
   - Requisitos: `{"minLevel": 3}`
   - Recompensas: `{"coins": 100, "xp": 30}`
   - Mobs: `{"draws": 1, "table": [{"mobKey": "goblin_scout", "weight": 10}]}`

4. Prueba con `!pelear bosque_oscuro` (si el comando acepta áreas) o `!pelear goblin_scout` directamente.

### Ejemplo 2: Crear una misión diaria de minería

1. Asegúrate de que existe el área de mina (`!areas-lista`).
2. Crea la misión:
   ```
   !mision-crear daily_mine_10
   ```
   - Nombre: Minero Diario
   - Descripción: Mina 10 veces hoy
   - Tipo: daily
   - Categoría: mining
   - Requisitos: `{"type": "mine_count", "count": 10}`
   - Recompensas: `{"coins": 500, "items": [{"key": "mining_token", "quantity": 1}]}`

3. Los jugadores verán la misión en `!misiones` y podrán reclamarla con `!mision-reclamar daily_mine_10` cuando completen los 10 minados.

### Ejemplo 3: Crear un cofre de evento

1. Crea el ítem cofre:
   ```
   !item-crear event_chest_winter
   ```
   - Nombre: Cofre de Invierno
   - Descripción: Un cofre especial lleno de sorpresas invernales
   - Stackable: true,10
   - Props:
     ```json
     {
       "chest": {
         "enabled": true,
         "consumeOnOpen": true,
         "rewards": [
           { "type": "coins", "amount": 1000 },
           { "type": "item", "itemKey": "snowflake_rare", "qty": 5 },
           { "type": "item", "itemKey": "ice_sword", "qty": 1 }
         ]
       }
     }
     ```

2. Crea una oferta para venderlo:
   ```
   !offer-crear
   ```
   - Item Key: event_chest_winter
   - Habilitada: true
   - Precio: `{"coins": 2500}`
   - Ventana: desde `2025-12-01` hasta `2025-12-31`
   - Límite por usuario: 3

3. Anuncia el cofre en el servidor y los jugadores podrán comprarlo con `!comprar` y abrirlo con `!abrir event_chest_winter`.
