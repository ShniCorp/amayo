
# Documentación del Sistema de Economía y Minijuegos

## Índice
1. [Items (EconomyItem)](#items)
2. [Mobs (Enemigos)](#mobs)
3. [Áreas de Juego (GameArea)](#areas)
4. [Niveles de Área (GameAreaLevel)](#niveles)
5. [Ofertas de Tienda (ShopOffer)](#ofertas)s
6. [Servicios del Sistema](#servicios)

---

## Items (EconomyItem) {#items}

### Crear Items
**Comando:** `!item-crear <key-única>`  
**Archivos:** `src/commands/messages/game/itemCreate.ts`

#### Editor Interactivo
El comando abre un editor con botones:
- **Base**: Configuración básica del item
- **Tags**: Etiquetas del item (separadas por coma)
- **Props (JSON)**: Propiedades avanzadas en formato JSON
- **Guardar**: Crea el item en la base de datos
- **Cancelar**: Cancela la operación

#### Modal "Base"
- **Nombre** (requerido): Nombre del item
- **Descripción**: Descripción del item
- **Categoría**: Categoría del item
- **Icon URL**: URL de la imagen del item
- **Stackable y Máx inventario**: Formato `true,10` donde:
    - Primer valor: `true`/`false` (si es apilable)
    - Segundo valor: número máximo por inventario (vacío = ilimitado)

#### Modal "Tags"
Lista de tags separados por comas (ej: `weapon, rare, sword`)

#### Modal "Props (JSON)"
Objeto JSON con propiedades avanzadas. Plantilla:

```json
{
  "tool": { "type": "pickaxe", "tier": 1 },
  "breakable": { "enabled": true, "maxDurability": 100, "durabilityPerUse": 1 },
  "chest": { "enabled": true, "rewards": [
    { "type": "coins", "amount": 100 },
    { "type": "item", "itemKey": "copper_ore", "qty": 5 }
  ], "consumeOnOpen": true },
  "eventCurrency": { "enabled": false, "eventKey": "" },
  "passiveEffects": [],
  "mutationPolicy": { "allowedKeys": [], "deniedKeys": [] },
  "craftingOnly": false,
  "food": { "healHp": 50, "cooldownSeconds": 60 },
  "damage": 10,
  "defense": 5,
  "maxHpBonus": 20
}
```


### Editar Items
**Comando:** `!item-editar <key-única>`  
**Archivos:** `src/commands/messages/game/itemEdit.ts`

Mismo editor que crear, pero carga los datos existentes del item.

### Tipos de Props Disponibles

#### 1. **tool** (Herramientas)
```json
{
  "tool": {
    "type": "pickaxe|rod|sword|bow|halberd|net",
    "tier": 1
  }
}
```

- `type`: Tipo de herramienta (pico, caña, espada, arco, alabarda, red)
- `tier`: Nivel/calidad de la herramienta (usado en requisitos de minijuegos)

#### 2. **breakable** (Rompible/Durabilidad)
```json
{
  "breakable": {
    "enabled": true,
    "maxDurability": 100,
    "durabilityPerUse": 1
  }
}
```

Para items no apilables que se desgastan con el uso.

#### 3. **chest** (Cofres)
```json
{
  "chest": {
    "enabled": true,
    "rewards": [
      { "type": "coins", "amount": 100 },
      { "type": "item", "itemKey": "iron_ore", "qty": 5 },
      { "type": "role", "roleId": "1234567890" }
    ],
    "consumeOnOpen": true
  }
}
```


#### 4. **food** (Comida/Pociones)
```json
{
  "food": {
    "healHp": 50,
    "healPercent": 25,
    "cooldownKey": "healing_potion",
    "cooldownSeconds": 60
  }
}
```


#### 5. **Stats de Combate**
```json
{
  "damage": 10,
  "defense": 5,
  "maxHpBonus": 20
}
```


---

## Mobs (Enemigos) {#mobs}

### Crear Mobs
**Comando:** `!mob-crear <key-única>`  
**Archivos:** `src/commands/messages/game/mobCreate.ts`

#### Editor Interactivo
- **Base**: Nombre y categoría
- **Stats (JSON)**: Estadísticas del mob
- **Drops (JSON)**: Tabla de recompensas al derrotar
- **Guardar/Cancelar**

#### Modal "Base"
- **Nombre** (requerido)
- **Categoría** (opcional)

#### Modal "Stats (JSON)"
```json
{
  "attack": 10,
  "hp": 100,
  "defense": 5,
  "xpReward": 50
}
```


#### Modal "Drops (JSON)"
```json
{
  "draws": 2,
  "table": [
    { "type": "coins", "amount": 50, "weight": 10 },
    { "type": "item", "itemKey": "leather", "qty": 1, "weight": 5 }
  ]
}
```


### Editar Mobs
**Comando:** `!mob-editar <key-única>`  
**Archivos:** `src/commands/messages/game/mobEdit.ts`

Mismo editor que crear, pero carga los datos existentes.

---

## Áreas de Juego (GameArea) {#areas}

### Crear Áreas
**Comando:** `!area-crear <key-única>`  
**Archivos:** `src/commands/messages/game/areaCreate.ts`

Las áreas representan lugares donde se pueden realizar actividades (minar, pescar, pelear, plantar).

#### Editor Interactivo
- **Base**: Nombre y tipo
- **Config (JSON)**: Configuración del área
- **Meta (JSON)**: Metadatos adicionales
- **Guardar/Cancelar**

#### Modal "Base"
- **Nombre** (requerido)
- **Tipo** (requerido): `MINE`, `LAGOON`, `FIGHT`, `FARM`

#### Modal "Config (JSON)"
```json
{
  "cooldownSeconds": 60,
  "description": "Una mina profunda",
  "icon": "⛏️"
}
```


#### Modal "Meta (JSON)"
```json
{
  "difficulty": "medium",
  "recommendedLevel": 5
}
```


### Editar Áreas
**Comando:** `!area-editar <key-única>`  
**Archivos:** `src/commands/messages/game/areaEdit.ts`

---

## Niveles de Área (GameAreaLevel) {#niveles}

### Crear/Editar Niveles
**Comando:** `!area-nivel <areaKey> <level>`  
**Archivos:** `src/commands/messages/game/areaNivel.ts`

Los niveles definen requisitos, recompensas y mobs que aparecen en cada nivel de un área.

#### Editor Interactivo
- **Requisitos**: Qué se necesita para acceder al nivel
- **Recompensas**: Qué se obtiene al completarlo
- **Mobs**: Qué enemigos pueden aparecer
- **Ventana**: Fechas de disponibilidad
- **Guardar/Cancelar**

#### Modal "Requisitos (JSON)"
```json
{
  "tool": {
    "required": true,
    "toolType": "pickaxe",
    "minTier": 2,
    "allowedKeys": ["iron_pickaxe", "diamond_pickaxe"]
  }
}
```

- `required`: Si es obligatorio tener herramienta
- `toolType`: Tipo de herramienta requerida
- `minTier`: Nivel mínimo de la herramienta
- `allowedKeys`: Lista de items específicos permitidos

#### Modal "Recompensas (JSON)"
```json
{
  "draws": 3,
  "table": [
    { "type": "coins", "amount": 100, "weight": 10 },
    { "type": "item", "itemKey": "iron_ore", "qty": 2, "weight": 5 },
    { "type": "item", "itemKey": "gold_ore", "qty": 1, "weight": 1 }
  ]
}
```

- `draws`: Número de extracciones de la tabla
- `table`: Array de recompensas ponderadas por `weight`

#### Modal "Mobs (JSON)"
```json
{
  "draws": 2,
  "table": [
    { "mobKey": "goblin", "weight": 10 },
    { "mobKey": "troll", "weight": 3 },
    { "mobKey": "dragon", "weight": 1 }
  ]
}
```


#### Modal "Ventana"
- **Desde (ISO)**: Fecha inicio (ej: `2025-01-01T00:00:00Z`)
- **Hasta (ISO)**: Fecha fin (opcional)

---

## Ofertas de Tienda (ShopOffer) {#ofertas}

### Crear Ofertas
**Comando:** `!offer-crear`  
**Archivos:** `src/commands/messages/game/offerCreate.ts`

#### Editor Interactivo
- **Base**: Item y estado
- **Precio (JSON)**: Costo de la oferta
- **Ventana**: Fechas de disponibilidad
- **Límites**: Stock y límite por usuario
- **Meta (JSON)**: Metadatos
- **Guardar/Cancelar**

#### Modal "Base"
- **Item Key** (requerido): Key del item a vender
- **Habilitada?**: `true`/`false`

#### Modal "Precio (JSON)"
```json
{
  "coins": 100,
  "items": [
    { "itemKey": "iron_ore", "qty": 5 },
    { "itemKey": "wood", "qty": 10 }
  ]
}
```


#### Modal "Ventana"
- **Inicio (ISO)**: Fecha inicio (opcional)
- **Fin (ISO)**: Fecha fin (opcional)

#### Modal "Límites"
- **Límite por usuario**: Máximo que puede comprar cada usuario (vacío = ilimitado)
- **Stock global**: Stock total disponible (vacío = ilimitado)

### Editar Ofertas
**Comando:** `!offer-editar <offerId>`  
**Archivos:** `src/commands/messages/game/offerEdit.ts`

---

## Servicios del Sistema {#servicios}

### Economy Service
**Archivo:** `src/game/economy/service.ts`

#### Funciones Principales:

**Gestión de Items:**
- `findItemByKey(guildId, key)`: Busca un item por key (servidor o global)
- `addItemByKey(userId, guildId, itemKey, qty)`: Agrega items al inventario
- `consumeItemByKey(userId, guildId, itemKey, qty)`: Consume items del inventario
- `getInventoryEntry(userId, guildId, itemKey)`: Obtiene entrada de inventario

**Wallet:**
- `getOrCreateWallet(userId, guildId)`: Obtiene/crea billetera
- `adjustCoins(userId, guildId, delta)`: Ajusta monedas (positivo o negativo)

**Cofres:**
- `openChestByKey(userId, guildId, itemKey)`: Abre un cofre y entrega recompensas

**Crafting:**
- `craftByProductKey(userId, guildId, productKey)`: Craftea un item según receta

**Compras:**
- `buyFromOffer(userId, guildId, offerId, qty)`: Compra desde una oferta

**Mutaciones:**
- `findMutationByKey(guildId, key)`: Busca una mutación
- `applyMutationToInventory(userId, guildId, itemKey, mutationKey)`: Aplica mutación a item

### Minigames Service
**Archivo:** `src/game/minigames/service.ts`

#### Funciones Principales:

**Motor de Minijuegos:**
- `runMinigame(userId, guildId, areaKey, level, opts)`: Ejecuta un minijuego
    - Valida cooldowns
    - Verifica requisitos (herramientas, etc.)
    - Aplica recompensas
    - Genera mobs
    - Reduce durabilidad de herramientas
    - Actualiza progreso del jugador

**Atajos:**
- `runMining(userId, guildId, level?, toolKey?)`: Ejecuta minería
- `runFishing(userId, guildId, level?, toolKey?)`: Ejecuta pesca

**Herramientas:**
- `findBestToolKey(userId, guildId, toolType, opts)`: Busca mejor herramienta del inventario
- `reduceToolDurability(userId, guildId, toolKey)`: Reduce durabilidad de herramienta

### Equipment Service
**Archivo:** `src/game/combat/equipmentService.ts`

#### Funciones Principales:

**Equipamiento:**
- `getEquipment(userId, guildId)`: Obtiene equipamiento actual
- `setEquipmentSlot(userId, guildId, slot, itemId)`: Equipa item en slot (weapon/armor/cape)

**Stats:**
- `getEffectiveStats(userId, guildId)`: Calcula stats efectivos incluyendo:
    - Daño de arma + mutaciones
    - Defensa de armadura + mutaciones
    - HP máximo de capa + mutaciones
    - HP actual
- `adjustHP(userId, guildId, delta)`: Ajusta HP del jugador

**Mutaciones:**
- Calcula bonos de mutaciones aplicadas a items equipados
- Los bonos incluyen: `damageBonus`, `defenseBonus`, `maxHpBonus`

---

## Tipos de Datos Importantes

### ItemProps (src/game/economy/types.ts:74-96)
Propiedades opcionales de items:
- `tool`: Metadatos de herramienta
- `breakable`: Configuración de durabilidad
- `chest`: Configuración de cofre
- `food`: Configuración de comida/poción
- `eventCurrency`: Moneda de evento
- `passiveEffects`: Efectos pasivos
- `mutationPolicy`: Política de mutaciones
- `craftingOnly`: Solo para crafteo
- `damage/defense/maxHpBonus`: Stats de combate
- `availableFrom/To`: Ventana de disponibilidad
- `usableFrom/To`: Ventana de uso

### Price (src/game/economy/types.ts:10-14)
Precio de ofertas:
```typescript
{
  coins?: number;
  items?: Array<{ itemKey?: string; itemId?: string; qty: number }>;
}
```


### LevelRequirements (src/game/minigames/types.ts:11-15)
Requisitos para niveles de área:
```typescript
{
  tool?: {
    required?: boolean;
    toolType?: string;
    minTier?: number;
    allowedKeys?: string[];
  };
}
```


---

## Ejemplos Completos

### Ejemplo 1: Crear Pico de Hierro
```
!item-crear iron_pickaxe
```

**Base:**
- Nombre: `Pico de Hierro`
- Descripción: `Un pico resistente para minar minerales`
- Categoría: `tools`
- Stackable: `false,1`

**Props:**
```json
{
  "tool": { "type": "pickaxe", "tier": 2 },
  "breakable": { "enabled": true, "maxDurability": 150, "durabilityPerUse": 1 }
}
```


### Ejemplo 2: Crear Área de Mina
```
!area-crear mine.iron_cavern
```

**Base:**
- Nombre: `Caverna de Hierro`
- Tipo: `MINE`

**Config:**
```json
{ "cooldownSeconds": 60 }
```


### Ejemplo 3: Crear Nivel de Mina
```
!area-nivel mine.iron_cavern 1
```

**Requisitos:**
```json
{
  "tool": { "required": true, "toolType": "pickaxe", "minTier": 2 }
}
```


**Recompensas:**
```json
{
  "draws": 3,
  "table": [
    { "type": "coins", "amount": 50, "weight": 10 },
    { "type": "item", "itemKey": "iron_ore", "qty": 2, "weight": 8 },
    { "type": "item", "itemKey": "gold_ore", "qty": 1, "weight": 2 }
  ]
}
```


**Mobs:**
```json
{
  "draws": 1,
  "table": [
    { "mobKey": "cave_spider", "weight": 10 },
    { "mobKey": "bat", "weight": 5 }
  ]
}
```


---

## Permisos Requeridos

Todos los comandos de creación/edición requieren:
- Permiso `ManageGuild` en Discord, **O**
- Rol de staff configurado en el servidor (verificado en `hasManageGuildOrStaff`)