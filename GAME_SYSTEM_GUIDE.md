# 📖 Guía del Sistema de Juegos - Amayo Bot

## Índice
- [Introducción](#introducción)
- [Estructura del Sistema](#estructura-del-sistema)
- [Creación de Items](#creación-de-items)
- [Sistema de Tienda](#sistema-de-tienda)
- [Áreas de Juego](#áreas-de-juego)
- [Mobs (Enemigos)](#mobs-enemigos)
- [Sistema de Crafteo](#sistema-de-crafteo)
- [Sistema de Fundición](#sistema-de-fundición)
- [Variables del Sistema](#variables-del-sistema)

---

## Introducción

Este sistema de juegos permite crear y gestionar un RPG completo dentro de Discord, con items, tienda, combate, crafteo, y más.

### Características Principales
- ✅ Sistema de economía con múltiples monedas
- ✅ Inventario por usuario y servidor
- ✅ Tienda con ofertas temporales y límites
- ✅ Sistema de crafteo con recetas
- ✅ Áreas explorables con niveles
- ✅ Enemigos (mobs) con drops
- ✅ Sistema de fundición para procesar items
- ✅ Mutaciones de items (mejoras/transformaciones)

---

## Estructura del Sistema

### Directorios Principales

```
/src/commands/messages/game/
├── itemCreate.ts      # Crear items
├── itemEdit.ts        # Editar items existentes
├── offerCreate.ts     # Crear ofertas de tienda
├── offerEdit.ts       # Editar ofertas
├── areaCreate.ts      # Crear áreas de juego
├── areaEdit.ts        # Editar áreas
├── areaNivel.ts       # Gestionar niveles de área
├── mobEdit.ts         # Crear/editar mobs
├── craftear.ts        # Sistema de crafteo
├── comprar.ts         # Comprar en la tienda
├── abrir.ts           # Abrir items consumibles
└── ...

/src/game/
├── economy/           # Sistema de economía
│   ├── service.ts
│   └── types.ts
├── combat/            # Sistema de combate
│   ├── equipmentService.ts
│   └── attacksWorker.ts
├── consumables/       # Items consumibles
│   └── service.ts
├── cooldowns/         # Sistema de cooldowns
│   └── service.ts
├── minigames/         # Minijuegos
│   ├── service.ts
│   ├── types.ts
│   └── seed.ts
├── mutations/         # Mutaciones de items
│   └── service.ts
└── smelting/          # Sistema de fundición
    └── service.ts
```

---

## Creación de Items

### Comando Base
```
!item-crear <key>
```

### Ejemplo Práctico

**1. Crear un item básico (Poción de Vida)**
```
!item-crear pocion_vida
```

Esto abrirá un editor interactivo con los siguientes botones:

#### 📝 **Base** - Información básica del item
- **Key**: `pocion_vida` (identificador único)
- **Name**: `Poción de Vida`
- **Description**: `Restaura 50 HP al usuario`
- **Type**: `consumable` (otros: `material`, `equipment`, `key_item`, `currency`)
- **Rarity**: `common` (otros: `uncommon`, `rare`, `epic`, `legendary`, `mythic`)
- **Stackable**: `true` (si se puede apilar en el inventario)
- **Max Stack**: `99` (cantidad máxima por stack)

#### 💎 **Valor Base**
Define el valor del item en el sistema económico:
```json
{
  "coins": 50,
  "gems": 0
}
```

#### 🎯 **Metadatos**
Información adicional para items especiales:

**Para consumibles:**
```json
{
  "effect": "heal",
  "amount": 50,
  "duration": 0
}
```

**Para equipamiento:**
```json
{
  "slot": "weapon",
  "attack": 10,
  "defense": 0,
  "speed": 5,
  "level_req": 1
}
```

**Para materiales de crafteo:**
```json
{
  "craftable": true,
  "tier": 1
}
```

#### 🖼️ **Icono/Emoji**
Emoji que representa el item: `🧪` o emoji personalizado `<:potion:123456789>`

---

### Tipos de Items Comunes

#### 1. **Consumibles** (`consumable`)
Items que se usan y desaparecen:
- Pociones de vida/maná
- Comida
- Buffs temporales
- Pergaminos de teletransporte

**Ejemplo:**
```json
{
  "type": "consumable",
  "metadata": {
    "effect": "heal_hp",
    "amount": 100,
    "cooldown": 30
  }
}
```

#### 2. **Materiales** (`material`)
Recursos para crafteo:
- Minerales
- Madera
- Hierbas
- Partes de mobs

**Ejemplo:**
```json
{
  "type": "material",
  "metadata": {
    "tier": 1,
    "craftable": true
  }
}
```

#### 3. **Equipamiento** (`equipment`)
Items equipables:
- Armas
- Armaduras
- Accesorios

**Ejemplo:**
```json
{
  "type": "equipment",
  "metadata": {
    "slot": "weapon",
    "attack": 25,
    "defense": 0,
    "speed": 10,
    "level_req": 5,
    "durability": 100
  }
}
```

#### 4. **Items Clave** (`key_item`)
Items importantes de quest:
- Llaves
- Documentos
- Objetos de misión

#### 5. **Moneda** (`currency`)
Items que actúan como moneda:
- Monedas alternativas
- Tokens de eventos
- Puntos de tienda

---

## Sistema de Tienda

### Crear una Oferta

```
!offer-crear
```

### Estructura de una Oferta

#### 📦 **Base**
- **Item Key**: `pocion_vida` (el item que se vende)
- **Enabled**: `true` (si la oferta está activa)

#### 💰 **Precio (JSON)**
Define cuánto cuesta el item:
```json
{
  "coins": 100,
  "gems": 0,
  "items": {
    "hierro": 5,
    "madera": 10
  }
}
```

Puedes combinar:
- `coins`: Moneda base
- `gems`: Gemas premium
- `items`: Otros items como pago (sistema de trueque)

#### 🕒 **Ventana Temporal**
Define cuándo está disponible la oferta:
- **Inicio (ISO)**: `2025-10-05T00:00:00Z` (opcional)
- **Fin (ISO)**: `2025-10-31T23:59:59Z` (opcional)

Si no se especifica, la oferta está disponible siempre.

#### 🎯 **Límites**
Control de compras:
- **Límite por usuario**: `5` (cada usuario puede comprar máximo 5)
- **Stock global**: `100` (solo hay 100 unidades disponibles en total)

Dejar vacío = sin límite

#### 📝 **Metadata (JSON)**
Información adicional:
```json
{
  "featured": true,
  "discount": 20,
  "bundle": ["pocion_vida", "pocion_mana"],
  "event": "halloween_2025"
}
```

### Ejemplo Completo: Oferta de Halloween

```
Item: pocion_halloween
Precio: { "coins": 50, "items": { "calabaza": 3 } }
Ventana: 2025-10-01 hasta 2025-10-31
Límite por usuario: 10
Stock global: 500
Metadata: { "event": "halloween_2025", "featured": true }
```

---

## Áreas de Juego

### Crear un Área

```
!area-crear <areaKey>
```

### Estructura de un Área

#### 📍 **Base**
- **Key**: `bosque_inicial` (identificador único)
- **Name**: `Bosque Inicial`
- **Description**: `Un bosque tranquilo perfecto para principiantes`
- **Image URL**: URL de imagen del área (opcional)

#### 🎮 **Configuración**
```json
{
  "minLevel": 1,
  "maxLevel": 5,
  "danger": "low",
  "biome": "forest"
}
```

### Niveles de Área

Cada área puede tener múltiples niveles con diferentes enemigos:

```
!area-nivel <areaKey>
```

**Ejemplo de configuración de nivel:**
```json
{
  "level": 1,
  "mobs": ["lobo_joven", "jabali_salvaje"],
  "weights": [60, 40],
  "bossKey": null,
  "requirements": {
    "minPlayerLevel": 1
  }
}
```

- **mobs**: Lista de keys de mobs que aparecen
- **weights**: Probabilidad de aparición (en porcentaje)
- **bossKey**: Mob especial de jefe (opcional)
- **requirements**: Requisitos para acceder

---

## Mobs (Enemigos)

### Crear/Editar un Mob

```
!mob-editar <mobKey>
```

### Estructura de un Mob

#### 🎯 **Base**
```json
{
  "key": "lobo_joven",
  "name": "Lobo Joven",
  "description": "Un lobo joven vagando por el bosque",
  "image": "🐺",
  "level": 2
}
```

#### ⚔️ **Stats**
```json
{
  "hp": 50,
  "attack": 8,
  "defense": 3,
  "speed": 12,
  "exp": 15
}
```

#### 🎁 **Drops (Recompensas)**
```json
{
  "coins": { "min": 5, "max": 15 },
  "items": {
    "piel_lobo": { "chance": 0.3, "min": 1, "max": 2 },
    "colmillo": { "chance": 0.15, "min": 1, "max": 1 },
    "carne_cruda": { "chance": 0.5, "min": 1, "max": 3 }
  }
}
```

- **coins**: Rango de monedas que dropea
- **items**: Items con probabilidad de drop
  - `chance`: Probabilidad (0.3 = 30%)
  - `min`/`max`: Cantidad que dropea

#### 🧬 **Comportamiento**
```json
{
  "aggressive": true,
  "pack": false,
  "flee_threshold": 0.2,
  "abilities": ["howl", "bite"]
}
```

---

## Sistema de Crafteo

### Crear Items Crafteables

Para que un item se pueda craftear, define su receta en los metadatos:

**Ejemplo: Espada de Hierro**

```json
{
  "type": "equipment",
  "metadata": {
    "slot": "weapon",
    "attack": 15,
    "craftable": true,
    "recipe": {
      "hierro": 5,
      "madera": 2,
      "cuero": 1
    },
    "crafting_time": 60,
    "success_rate": 0.95,
    "level_req": 3
  }
}
```

### Usar el Sistema de Crafteo

```
!craftear <itemKey>
```

El bot verificará:
1. ✅ Que tengas los materiales necesarios
2. ✅ Que cumplas el nivel requerido
3. ✅ Calculará el éxito basado en `success_rate`
4. ✅ Consumirá los materiales
5. ✅ Te dará el item (si tiene éxito)

---

## Sistema de Fundición

Procesa materiales crudos en refinados:

### Configuración de Items Fundibles

**Ejemplo: Hierro Crudo → Lingote de Hierro**

**Item: `hierro_crudo`**
```json
{
  "type": "material",
  "metadata": {
    "smeltable": true,
    "smelts_into": "lingote_hierro",
    "smelting_time": 30,
    "fuel_cost": 1
  }
}
```

### Usar el Sistema

```
!fundir <itemKey> <cantidad>
```

Ejemplo:
```
!fundir hierro_crudo 10
```

Esto iniciará un trabajo de fundición que se completará después del tiempo especificado.

---

## Sistema de Mutaciones

Transforma items en versiones mejoradas:

### Configurar Mutaciones

**Ejemplo: Espada de Hierro → Espada de Acero**

```json
{
  "from_item": "espada_hierro",
  "to_item": "espada_acero",
  "requirements": {
    "items": {
      "carbon": 3,
      "polvo_magico": 1
    },
    "coins": 500,
    "level": 10
  },
  "success_rate": 0.8,
  "keep_on_fail": false
}
```

- **keep_on_fail**: Si `false`, pierdes el item si falla
- **success_rate**: Probabilidad de éxito

---

## Variables del Sistema

Puedes usar variables dinámicas en descripciones y nombres:

### Variables de Usuario
- `{user}` - Nombre del usuario
- `{user.id}` - ID del usuario
- `{user.mention}` - Mención del usuario
- `{user.tag}` - Usuario#1234
- `{user.level}` - Nivel del jugador
- `{user.exp}` - Experiencia del jugador
- `{user.coins}` - Monedas del jugador
- `{user.gems}` - Gemas del jugador

### Variables de Servidor
- `{guild}` - Nombre del servidor
- `{guild.id}` - ID del servidor
- `{guild.members}` - Cantidad de miembros
- `{guild.owner}` - Dueño del servidor

### Variables de Item
- `{item.name}` - Nombre del item
- `{item.count}` - Cantidad en inventario
- `{item.value}` - Valor del item

### Ejemplo de Uso

**Descripción dinámica:**
```
"¡{user}, has encontrado {item.name}! Ahora tienes {item.count} en tu inventario."
```

**Resultado:**
```
"¡Shni, has encontrado Poción de Vida! Ahora tienes 15 en tu inventario."
```

---

## Comandos Útiles

### Gestión de Items
- `!item-crear <key>` - Crear nuevo item
- `!item-editar <key>` - Editar item existente
- `!inventario` - Ver tu inventario
- `!usar <item>` - Usar un item consumible

### Economía
- `!monedas` - Ver tus monedas
- `!daily` - Recompensa diaria
- `!dar <@user> <item> <cantidad>` - Dar items a otro usuario

### Tienda
- `!tienda` - Ver la tienda
- `!comprar <item> [cantidad]` - Comprar items
- `!offer-crear` - Crear oferta (admin)
- `!offer-editar <id>` - Editar oferta (admin)

### Combate
- `!explorar <area>` - Explorar un área
- `!atacar` - Atacar al mob actual
- `!huir` - Intentar huir del combate
- `!equipar <item>` - Equipar un item

### Crafteo
- `!craftear <item>` - Craftear un item
- `!receta <item>` - Ver la receta de un item
- `!fundir <item> <cantidad>` - Fundir materiales

### Áreas
- `!area-crear <key>` - Crear área (admin)
- `!area-editar <key>` - Editar área (admin)
- `!area-nivel <key>` - Configurar niveles (admin)
- `!areas` - Ver áreas disponibles

---

## Tips y Mejores Prácticas

### 1. **Nomenclatura de Keys**
Usa nombres descriptivos y sin espacios:
- ✅ `pocion_vida_grande`
- ✅ `espada_hierro_t2`
- ❌ `Poción de Vida Grande` (evitar espacios y mayúsculas)

### 2. **Balance Económico**
- Items comunes: 10-100 coins
- Items raros: 100-1000 coins
- Items épicos: 1000-10000 coins
- Items legendarios: 10000+ coins

### 3. **Drop Rates Recomendados**
- Comunes: 50-80%
- Raros: 20-30%
- Épicos: 5-10%
- Legendarios: 1-3%
- Míticos: <1%

### 4. **Organización de Áreas**
Crea áreas progresivas:
1. **Área Inicial** (Nivel 1-5): Mobs fáciles, drops básicos
2. **Área Intermedia** (Nivel 6-15): Mobs moderados, mejores drops
3. **Área Avanzada** (Nivel 16-30): Mobs difíciles, drops raros
4. **Área End-Game** (Nivel 31+): Jefes, drops legendarios

### 5. **Testing**
Antes de lanzar al público:
- ✅ Prueba todas las recetas de crafteo
- ✅ Verifica que los precios sean balanceados
- ✅ Asegúrate de que los mobs no sean muy fáciles/difíciles
- ✅ Revisa que todos los items tengan iconos
- ✅ Prueba las ofertas temporales

---

## Solución de Problemas

### "Item no encontrado"
- Verifica que la key esté escrita correctamente
- Asegúrate de que el item exista en la base de datos
- Revisa si el item es específico del servidor

### "No tienes suficientes materiales"
- Usa `!inventario` para verificar tus items
- Asegúrate de tener todos los materiales de la receta

### "No tienes nivel suficiente"
- Usa `!perfil` para ver tu nivel actual
- Combate más mobs para ganar experiencia

### "La oferta no está disponible"
- Verifica las fechas de la ventana temporal
- Asegúrate de que la oferta esté habilitada
- Revisa si alcanzaste el límite de compras

---

## Créditos

Sistema creado para **Amayo Bot**  
Documentación actualizada: Octubre 2025

Para soporte adicional, contacta a los administradores del servidor.

