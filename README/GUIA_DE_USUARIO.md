# 🎮 Guía de Usuario Completa - Amayo Bot

> **Última actualización: Enero 2025 • Versión 0.11.20**

Esta es la guía completa de Amayo Bot para usuarios finales de Discord. Aprende a usar todos los comandos, jugar minijuegos, gestionar tu economía y, si eres administrador, cómo crear contenido personalizado para tu servidor.

---

## 📋 Tabla de Contenidos

### Para Todos los Usuarios
1. [Primeros Pasos](#primeros-pasos)
2. [Comandos Básicos](#comandos-basicos)
3. [Sistema de Juego](#sistema-juego)
4. [Minijuegos](#minijuegos)
5. [Inventario y Equipo](#inventario)
6. [Economía](#economia)
7. [Tienda](#tienda)
8. [Crafteo](#crafteo)
9. [Logros](#logros)
10. [Misiones](#misiones)
11. [Racha Diaria](#racha)
12. [Consumibles](#consumibles)
13. [Cofres](#cofres)
14. [Encantamientos](#encantamientos)
15. [Fundición](#fundicion)
16. [IA Conversacional](#ia)
17. [Recordatorios](#recordatorios)
18. [Sistema de Alianzas](#alianzas)

### Para Administradores
19. [Creación de Contenido](#creacion-contenido)
20. [Gestión de Items](#gestion-items)
21. [Gestión de Mobs](#gestion-mobs)
22. [Gestión de Áreas](#gestion-areas)
23. [Gestión de Ofertas](#gestion-ofertas)
24. [Configuración del Servidor](#configuracion)

### Recursos
25. [Tips y Trucos](#tips)
26. [Preguntas Frecuentes](#faq)

---

## 🚀 Primeros Pasos {#primeros-pasos}

### ¿Qué es Amayo Bot?

Amayo Bot es un bot de Discord completo que añade un sistema de juego RPG a tu servidor con:
- **Minijuegos**: Mina, pesca, pelea y cultiva
- **Economía**: Sistema de monedas, tienda e inventario
- **Progresión**: Logros, misiones y rachas diarias
- **Personalización**: Equipo, encantamientos y crafteo
- **IA**: Chat con Gemini AI
- **Alianzas**: Sistema de puntos para servidores

### Prefix del Bot

El prefix por defecto es `!` pero los administradores pueden cambiarlo.

**Ejemplos:**
- `!ayuda` - Ver comandos disponibles
- `!player` - Ver tu perfil
- `!mina` - Jugar al minijuego de minería

---

## ⚡ Comandos Básicos {#comandos-basicos}

### Información General

- `!ayuda` o `!help` - Lista todos los comandos
- `!ayuda <comando>` - Ayuda sobre un comando específico
- `!ping` - Ver la latencia del bot
- `!player [@usuario]` - Ver perfil de jugador

### Ver tu Progreso

- `!inventario` o `!inv` - Ver tu inventario
- `!stats` - Ver tus estadísticas detalladas
- `!logros` - Ver tus logros
- `!misiones` - Ver misiones disponibles
- `!cooldowns` - Ver tus cooldowns activos

---

## 🎮 Sistema de Juego {#sistema-juego}

### Estadísticas de Combate

Tu personaje tiene las siguientes estadísticas:

- **HP (Vida)**: Puntos de vida actuales y máximos
- **ATK (Ataque)**: Daño que infliges
- **DEF (Defensa)**: Reduce el daño recibido

### Equipo

Puedes equipar:
- **Arma (weapon)**: Aumenta tu ataque
- **Armadura (armor)**: Aumenta tu defensa
- **Capa (cape)**: Bonos especiales (HP, stats adicionales)

**Comando:**
```
!equipar <slot> <itemKey>
```

**Ejemplos:**
- `!equipar weapon iron_sword`
- `!equipar armor leather_armor`
- `!equipar cape red_cape`

---

## 🎯 Minijuegos {#minijuegos}

Los minijuegos son la forma principal de obtener recursos y monedas.

### ⛏️ Minar

Extrae minerales valiosos de la mina.

**Comando:** `!mina [nivel] [herramienta] [area:clave]`

**Ejemplos:**
- `!mina` - Mina en el nivel más alto desbloqueado
- `!mina 2` - Mina en el nivel 2
- `!mina 1 iron_pickaxe` - Usa un pico específico

**Herramienta requerida:** Pico (pickaxe)

### 🎣 Pescar

Captura peces y tesoros en la laguna.

**Comando:** `!pescar [nivel] [herramienta] [area:clave]`

**Ejemplos:**
- `!pescar` - Pesca automática
- `!pescar 3` - Pesca en nivel 3

**Herramienta requerida:** Caña de pescar (rod)

### ⚔️ Pelear

Enfrenta enemigos en la arena.

**Comando:** `!pelear [nivel] [arma] [area:clave]`

**Ejemplos:**
- `!pelear` - Combate automático
- `!pelear 1 iron_sword` - Usa espada específica

**Herramienta requerida:** Arma (sword, bow, halberd)

### 🌾 Plantar

Cultiva plantas y cosecha alimentos.

**Comando:** `!plantar [nivel] [herramienta]`

**Herramienta requerida:** Azada (hoe)

### Cooldowns

Cada minijuego tiene un tiempo de espera entre usos. Usa `!cooldowns` para ver cuánto tiempo falta.

---

## 💡 Conceptos Básicos {#conceptos-básicos}

### ¿Qué es una "key"?
Una **key** es un identificador único para cada elemento (item, mob, área, etc.). Es como el "nombre interno" del elemento.

**Ejemplos de keys:**
- `iron_sword` - Espada de hierro
- `health_potion` - Poción de vida  
- `cave_spider` - Enemigo araña

**⚠️ Importante:** Las keys no pueden repetirse y deben ser únicas.

### Sistema de Pesos (Weights)
Cuando configuras recompensas o enemigos que aparecen, usas un sistema de **pesos** para decidir qué tan común es cada cosa.

**Ejemplo:**
```json
{ "itemKey": "iron_ore", "weight": 10 }  ← Aparece 10 veces de cada 13
{ "itemKey": "gold_ore", "weight": 3 }   ← Aparece 3 veces de cada 13
```

Cuanto **mayor** sea el número, **más probable** es que aparezca.

---

## 🎒 Creando Items {#creando-items}

### Paso 1: Iniciar el Editor
Escribe en Discord:
```
!item-crear <key>
```

**Ejemplo:**
```
!item-crear iron_sword
```

### Paso 2: Configurar la Base
Haz clic en el botón **"Base"** y llena los campos:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre visible del item | `Espada de Hierro` |
| **Descripción** | Descripción del item | `Una espada forjada con hierro resistente` |
| **Categoría** | Tipo de item | `weapons` |
| **Icon URL** | URL de una imagen (opcional) | `https://...` |
| **Stackable y Máx** | Si se apila y máximo por inventario | `true,10` o `false,1` |

#### ¿Qué significa "Stackable"?
- **`true,10`** = Se pueden apilar hasta 10 unidades del mismo item
- **`false,1`** = Solo puedes tener 1 unidad (común para armas/herramientas)
- **`true,`** (dejar vacío el número) = Apilable sin límite

### Paso 3: Agregar Tags (Opcional)
Los tags te ayudan a organizar tus items. Haz clic en **"Tags"** y escribe:
```
weapon, rare, crafteable
```

### Paso 4: Configurar Propiedades Avanzadas (Props)
Aquí defines qué hace especial a tu item. Haz clic en **"Props (JSON)"**.

#### 🛠️ **Props para Herramientas**

Usa esto si tu item es una herramienta (pico, caña, espada, etc.):

```json
{
  "tool": {
    "type": "pickaxe",
    "tier": 2
  },
  "breakable": {
    "enabled": true,
    "maxDurability": 150,
    "durabilityPerUse": 1
  }
}
```

**Tipos de herramientas disponibles:**
- `pickaxe` (pico para minar)
- `rod` (caña para pescar)
- `sword` (espada para pelear)
- `bow` (arco)
- `halberd` (alabarda)
- `net` (red)

**Durabilidad:**
- `maxDurability`: Cuántos usos tiene antes de romperse
- `durabilityPerUse`: Cuánta durabilidad pierde por uso (normalmente 1)

#### ⚔️ **Props para Armas/Armaduras**

```json
{
  "damage": 15,
  "defense": 0
}
```

- `damage`: Daño que hace el arma
- `defense`: Defensa que da la armadura
- `maxHpBonus`: HP extra que otorga (para capas)

#### 🍖 **Props para Comida/Pociones**

```json
{
  "food": {
    "healHp": 50,
    "cooldownSeconds": 30
  }
}
```

- `healHp`: Cuánta vida cura
- `healPercent`: Porcentaje de vida que cura (opcional)
- `cooldownSeconds`: Segundos antes de poder usar otra vez

#### 📦 **Props para Cofres**

Los cofres pueden dar monedas, items o roles cuando se abren:

```json
{
  "chest": {
    "enabled": true,
    "rewards": [
      { "type": "coins", "amount": 100 },
      { "type": "item", "itemKey": "iron_ore", "qty": 5 },
      { "type": "role", "roleId": "123456789012345678" }
    ],
    "consumeOnOpen": true
  }
}
```

- `consumeOnOpen`: Si es `true`, el cofre se consume al abrirse

### Paso 5: Guardar
Haz clic en **"Guardar"** y ¡listo! Tu item ha sido creado.

---

## 🔍 Gestionando Items {#gestionando-items}

### Ver Lista de Items
Para ver todos los items creados en tu servidor:
```
!items-lista [página]
```

**Ejemplo:**
```
!items-lista 1
```

Esto mostrará una lista interactiva con botones para:
- Ver detalles completos de cada item
- Navegar entre páginas
- Ver información de categorías y props

### Ver Detalles de un Item
Para ver información detallada de un item específico:
```
!item-ver <key>
```

**Ejemplo:**
```
!item-ver iron_sword
```

Esto mostrará:
- Nombre y descripción
- Categoría y tags
- Propiedades (damage, defense, tool, etc.)
- Configuración de stackable
- Si es breakable y su durabilidad

### Editar un Item
Para editar un item existente:
```
!item-editar <key>
```

Funciona igual que el comando de crear, pero con los valores actuales pre-cargados.

### Eliminar un Item
Para eliminar un item permanentemente:
```
!item-eliminar <key>
```

**⚠️ Advertencia:** Esta acción es permanente y no se puede deshacer.

---

## 👹 Creando Enemigos (Mobs) {#creando-enemigos}

### Paso 1: Iniciar el Editor
```
!mob-crear <key>
```

**Ejemplo:**
```
!mob-crear goblin
```

### Paso 2: Configurar Base
Haz clic en **"Base"**:
- **Nombre:** `Goblin`
- **Categoría:** `enemies` (opcional)

### Paso 3: Configurar Stats
Haz clic en **"Stats (JSON)"**:

```json
{
  "attack": 10,
  "hp": 50,
  "defense": 3,
  "xpReward": 25
}
```

- `attack`: Daño que hace el enemigo
- `hp`: Vida del enemigo
- `defense`: Defensa del enemigo
- `xpReward`: Experiencia que da al derrotarlo

### Paso 4: Configurar Drops (Recompensas)
Haz clic en **"Drops (JSON)"**:

```json
{
  "draws": 2,
  "table": [
    { "type": "coins", "amount": 20, "weight": 10 },
    { "type": "item", "itemKey": "leather", "qty": 1, "weight": 5 },
    { "type": "item", "itemKey": "goblin_tooth", "qty": 1, "weight": 2 }
  ]
}
```

- `draws`: Cuántos premios saca de la tabla
- `table`: Lista de posibles premios con su peso (probabilidad)

**En este ejemplo:**
- Hace 2 extracciones
- Más probable: 20 monedas (peso 10)
- Medianamente probable: 1 cuero (peso 5)
- Poco probable: 1 diente de goblin (peso 2)

### Paso 5: Guardar
Haz clic en **"Guardar"**.

---

## 🔍 Gestionando Enemigos {#gestionando-enemigos}

### Ver Lista de Mobs
Para ver todos los enemigos creados en tu servidor:
```
!mobs-lista [página]
```

**Ejemplo:**
```
!mobs-lista 1
```

Esto mostrará una lista interactiva con:
- Nombre y categoría de cada mob
- Stats básicos (HP, ATK, DEF, XP)
- Botones para ver más detalles

### Eliminar un Mob
Para eliminar un enemigo permanentemente:
```
!mob-eliminar <key>
```

**Ejemplo:**
```
!mob-eliminar goblin
```

**⚠️ Advertencia:** Esta acción es permanente. Si el mob está siendo usado en áreas, puede causar errores.

---

## 🗺️ Configurando Áreas de Juego {#configurando-áreas}

Las áreas son lugares donde los jugadores pueden realizar actividades como minar, pescar o pelear.

### Paso 1: Crear el Área
```
!area-crear <key>
```

**Ejemplo:**
```
!area-crear mine.iron_cavern
```

### Paso 2: Configurar Base
Haz clic en **"Base"**:
- **Nombre:** `Caverna de Hierro`
- **Tipo:** Elige uno:
  - `MINE` (minar)
  - `LAGOON` (pescar)
  - `FIGHT` (pelear)
  - `FARM` (plantar)

### Paso 3: Configurar Config
Haz clic en **"Config (JSON)"**:

```json
{
  "cooldownSeconds": 60,
  "description": "Una profunda caverna llena de minerales de hierro",
  "icon": "⛏️"
}
```

- `cooldownSeconds`: Segundos que deben esperar entre usos

### Paso 4: Guardar
Haz clic en **"Guardar"**.

---

## 🔍 Gestionando Áreas {#gestionando-áreas}

### Ver Lista de Áreas
Para ver todas las áreas configuradas en tu servidor:
```
!areas-lista [página]
```

**Ejemplo:**
```
!areas-lista 1
```

Esto mostrará:
- Nombre y tipo de cada área (MINE, LAGOON, FIGHT, FARM)
- Cooldown configurado
- Si es global o del servidor
- Botones para ver detalles de niveles

### Eliminar un Área
Para eliminar un área permanentemente:
```
!area-eliminar <key>
```

**Ejemplo:**
```
!area-eliminar mine.iron_cavern
```

**⚠️ Advertencia:** 
- Esta acción eliminará el área Y todos sus niveles
- Se perderá todo el progreso de los jugadores en esa área
- Esta acción no se puede deshacer

---

## 📊 Configurando Niveles de Área {#configurando-niveles}

Los niveles son las "dificultades" de cada área. Cada nivel puede tener diferentes requisitos, recompensas y enemigos.

### Paso 1: Crear el Nivel
```
!area-nivel <key-del-área> <número-de-nivel>
```

**Ejemplo:**
```
!area-nivel mine.iron_cavern 1
```

### Paso 2: Configurar Requisitos
Haz clic en **"Requisitos"**:

```json
{
  "tool": {
    "required": true,
    "toolType": "pickaxe",
    "minTier": 2
  }
}
```

**Significado:**
- Es **obligatorio** tener un pico (`required: true`)
- Debe ser un pico de nivel 2 o superior (`minTier: 2`)

**Si no quieres requisitos:**
```json
{}
```

### Paso 3: Configurar Recompensas
Haz clic en **"Recompensas"**:

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

**En este ejemplo:**
- Hace 3 extracciones de la tabla
- Más probable: 50 monedas
- Probable: 2 minerales de hierro
- Poco probable: 1 mineral de oro

### Paso 4: Configurar Mobs (Enemigos que Aparecen)
Haz clic en **"Mobs"**:

```json
{
  "draws": 1,
  "table": [
    { "mobKey": "cave_spider", "weight": 10 },
    { "mobKey": "bat", "weight": 5 },
    { "mobKey": "cave_troll", "weight": 1 }
  ]
}
```

- `draws`: Cuántos enemigos pueden aparecer (en este caso, 1)
- Más probable: araña de cueva
- Menos probable: murciélago
- Muy poco probable: troll de cueva

**Si no quieres enemigos:**
```json
{
  "draws": 0,
  "table": []
}
```

### Paso 5: Configurar Ventana de Disponibilidad (Opcional)
Si quieres que el nivel solo esté disponible en ciertas fechas, haz clic en **"Ventana"**:

- **Desde:** `2025-12-01T00:00:00Z` (formato ISO)
- **Hasta:** `2025-12-31T23:59:59Z`

**Deja en blanco si quieres que esté siempre disponible.**

### Paso 6: Guardar
Haz clic en **"Guardar"**.

---

## 🏪 Creando Ofertas de Tienda {#creando-ofertas}

Las ofertas permiten vender items a los jugadores.

### Paso 1: Crear la Oferta
```
!offer-crear
```

### Paso 2: Configurar Base
Haz clic en **"Base"**:
- **Item Key:** `iron_sword` (el item que quieres vender)
- **Habilitada?:** `true` (o `false` para deshabilitarla)

### Paso 3: Configurar Precio
Haz clic en **"Precio (JSON)"**:

#### Precio solo en monedas:
```json
{
  "coins": 100
}
```

#### Precio en monedas e items:
```json
{
  "coins": 50,
  "items": [
    { "itemKey": "iron_ore", "qty": 5 },
    { "itemKey": "wood", "qty": 10 }
  ]
}
```

**Significado:** Cuesta 50 monedas + 5 minerales de hierro + 10 maderas.

### Paso 4: Configurar Límites (Opcional)
Haz clic en **"Límites"**:

- **Límite por usuario:** `5` (cada jugador puede comprar máximo 5)
- **Stock global:** `100` (solo hay 100 unidades disponibles en total)

**Deja en blanco para ilimitado.**

### Paso 5: Configurar Ventana (Opcional)
Si es una oferta temporal (como evento), haz clic en **"Ventana"**:

- **Inicio:** `2025-12-20T00:00:00Z`
- **Fin:** `2025-12-25T23:59:59Z`

### Paso 6: Guardar
Haz clic en **"Guardar"**.

---

## 📚 Ejemplos Prácticos {#ejemplos-prácticos}

### Ejemplo 1: Sistema de Minería Completo

#### 1. Crear el Pico de Madera
```
!item-crear wooden_pickaxe
```

**Base:**
- Nombre: `Pico de Madera`
- Descripción: `Un pico básico para empezar a minar`
- Stackable: `false,1`

**Props:**
```json
{
  "tool": { "type": "pickaxe", "tier": 1 },
  "breakable": { "enabled": true, "maxDurability": 50, "durabilityPerUse": 1 }
}
```

#### 2. Crear el Mineral de Cobre
```
!item-crear copper_ore
```

**Base:**
- Nombre: `Mineral de Cobre`
- Descripción: `Un mineral común encontrado en las minas`
- Stackable: `true,999`

**Props:**
```json
{
  "craftingOnly": false
}
```

#### 3. Crear el Área de Mina
```
!area-crear mine.starter
```

**Base:**
- Nombre: `Mina Inicial`
- Tipo: `MINE`

**Config:**
```json
{
  "cooldownSeconds": 30,
  "icon": "⛏️"
}
```

#### 4. Crear Nivel 1 de la Mina
```
!area-nivel mine.starter 1
```

**Requisitos:**
```json
{
  "tool": { "required": true, "toolType": "pickaxe", "minTier": 1 }
}
```

**Recompensas:**
```json
{
  "draws": 2,
  "table": [
    { "type": "coins", "amount": 10, "weight": 10 },
    { "type": "item", "itemKey": "copper_ore", "qty": 1, "weight": 8 }
  ]
}
```

**Mobs:**
```json
{
  "draws": 0,
  "table": []
}
```

---

### Ejemplo 2: Cofre de Recompensa Diaria

```
!item-crear daily_chest
```

**Base:**
- Nombre: `Cofre Diario`
- Descripción: `Un cofre que contiene recompensas aleatorias`
- Stackable: `true,10`

**Props:**
```json
{
  "chest": {
    "enabled": true,
    "rewards": [
      { "type": "coins", "amount": 500 },
      { "type": "item", "itemKey": "health_potion", "qty": 3 }
    ],
    "consumeOnOpen": true
  }
}
```

---

### Ejemplo 3: Espada Legendaria

```
!item-crear legendary_sword
```

**Base:**
- Nombre: `⚔️ Espada Legendaria de los Dragones`
- Descripción: `Una espada forjada con escamas de dragón. Aumenta tu poder de ataque en 50 puntos.`
- Categoría: `legendary_weapons`
- Stackable: `false,1`

**Tags:**
```
legendary, weapon, sword, dragon
```

**Props:**
```json
{
  "damage": 50,
  "tool": { "type": "sword", "tier": 5 },
  "breakable": { "enabled": false }
}
```

---

### Ejemplo 4: Enemigo Boss

```
!mob-crear dragon_boss
```

**Base:**
- Nombre: `🐉 Dragón Ancestral`
- Categoría: `boss`

**Stats:**
```json
{
  "attack": 50,
  "hp": 1000,
  "defense": 30,
  "xpReward": 1000
}
```

**Drops:**
```json
{
  "draws": 5,
  "table": [
    { "type": "coins", "amount": 1000, "weight": 10 },
    { "type": "item", "itemKey": "dragon_scale", "qty": 3, "weight": 8 },
    { "type": "item", "itemKey": "legendary_sword", "qty": 1, "weight": 1 }
  ]
}
```

---

## 🏆 Creando Logros {#creando-logros}

Los logros son recompensas que los jugadores pueden obtener al completar ciertos objetivos.

### Paso 1: Crear el Logro
```
!logro-crear <key-única>
```

**Ejemplo:**
```
!logro-crear master_miner
```

### Paso 2: Configurar Base
Haz clic en **"Base"**:
- **Nombre:** `Maestro Minero`
- **Descripción:** `Mina 1000 veces en áreas de minería`
- **Categoría:** `mining` (mining, combat, economy, fishing, etc.)
- **Icono:** `⛏️` (emoji o URL)
- **Puntos:** `100` (puntos que otorga el logro)
- **Oculto:** `false` (si es `true`, no se muestra hasta desbloquearlo)

### Paso 3: Configurar Requisitos
Haz clic en **"Requisitos (JSON)"**:

#### Requisitos de Conteo de Acción:
```json
{
  "type": "mine_count",
  "value": 1000
}
```

Tipos disponibles:
- `mine_count`: Veces que ha minado
- `fish_count`: Veces que ha pescado  
- `fight_count`: Veces que ha peleado
- `craft_count`: Veces que ha crafteado
- `coins_earned`: Monedas ganadas en total
- `items_collected`: Items colectados

#### Requisitos de Item:
```json
{
  "type": "item_owned",
  "itemKey": "diamond_pickaxe",
  "quantity": 1
}
```

### Paso 4: Configurar Recompensas
Haz clic en **"Recompensas (JSON)"**:

```json
{
  "coins": 5000,
  "items": [
    { "itemKey": "legendary_pickaxe", "qty": 1 }
  ]
}
```

### Paso 5: Guardar
Haz clic en **"Guardar"**.

---

## 🔍 Gestionando Logros {#gestionando-logros}

### Ver Lista de Logros
```
!logros-lista [página]
```

Muestra todos los logros del servidor con:
- Nombre y descripción
- Puntos que otorga
- Si está oculto
- Botones para ver detalles

### Ver Detalles de un Logro
```
!logro-ver <key>
```

**Ejemplo:**
```
!logro-ver master_miner
```

### Eliminar un Logro
```
!logro-eliminar <key>
```

**⚠️ Advertencia:** Esto eliminará el logro y el progreso de todos los jugadores.

---

## 🎯 Creando Misiones {#creando-misiones}

Las misiones son tareas que los jugadores pueden completar para obtener recompensas.

### Paso 1: Crear la Misión
```
!mision-crear <key-única>
```

**Ejemplo:**
```
!mision-crear daily_mining_quest
```

### Paso 2: Configurar Base
Haz clic en **"Base"**:
- **Nombre:** `Misión Diaria: Minería`
- **Descripción:** `Mina 10 veces en cualquier área`
- **Categoría:** `mining`
- **Tipo:** `daily` (daily, weekly, one_time, repeatable)
- **Icono:** `⛏️`
- **Repetible:** `true`

### Paso 3: Configurar Requisitos
Haz clic en **"Requisitos (JSON)"**:

#### Contar Acción:
```json
{
  "type": "mine_count",
  "count": 10
}
```

#### Recolectar Items:
```json
{
  "type": "collect_items",
  "items": [
    { "itemKey": "iron_ore", "quantity": 20 }
  ]
}
```

#### Derrotar Enemigos:
```json
{
  "type": "defeat_mobs",
  "mobKey": "goblin",
  "count": 5
}
```

### Paso 4: Configurar Recompensas
Haz clic en **"Recompensas (JSON)"**:

```json
{
  "coins": 1000,
  "xp": 500,
  "items": [
    { "itemKey": "mystery_chest", "qty": 1 }
  ]
}
```

### Paso 5: Guardar
Haz clic en **"Guardar"**.

---

## 🔍 Gestionando Misiones {#gestionando-misiones}

### Ver Lista de Misiones
```
!misiones-lista [página]
```

### Ver Detalles de una Misión
```
!mision-ver <key>
```

### Eliminar una Misión
```
!mision-eliminar <key>
```

---

## 👤 Comandos de Jugador {#comandos-jugador}

### Ver Perfil
```
!player [@usuario]
```

### Ver Estadísticas
```
!stats [@usuario]
```

### Ver Cooldowns
```
!cooldowns
```

### Ver Saldo
```
!monedas
```

### Ver Racha Diaria
```
!racha
```

### Ver Inventario
```
!inventario [página]
```

### Ver Logros
```
!logros [@usuario]
```

### Ver Misiones
```
!misiones
```

### Reclamar Misión
```
!mision-reclamar <key>
```

---

## ❓ Preguntas Frecuentes {#preguntas-frecuentes}

### ¿Puedo editar un item después de crearlo?
Sí, usa el comando:
```
!item-editar <key>
```

### ¿Cómo elimino un item?
Usa el comando:
```
!item-eliminar <key>
```
**Advertencia:** Esta acción es permanente y no se puede deshacer.

### ¿Cómo veo todos los items creados?
Usa el comando:
```
!items-lista
```
Esto mostrará una lista interactiva paginada con todos los items del servidor.

### ¿Qué formato tienen las fechas ISO?
El formato ISO es: `YYYY-MM-DDTHH:MM:SSZ`

**Ejemplos:**
- `2025-01-15T00:00:00Z` (15 de enero de 2025 a las 00:00 UTC)
- `2025-12-25T23:59:59Z` (25 de diciembre de 2025 a las 23:59 UTC)

### ¿Puedo crear items globales para todos los servidores?
Solo los administradores del bot pueden crear items globales. Los items que crees estarán limitados a tu servidor.

### ¿Cuántos niveles puedo crear por área?
No hay límite técnico, pero se recomienda entre 5-10 niveles por área para mantener la progresión balanceada.

### ¿Qué pasa si un jugador no tiene la herramienta requerida?
El bot le mostrará un mensaje indicando qué herramienta necesita y de qué nivel.

### ¿Cómo funcionan los pesos (weights)?
Los pesos determinan la probabilidad relativa. Por ejemplo:
- Item A (weight: 10) y Item B (weight: 5)
- Item A tiene el doble de probabilidad de salir que Item B
- Probabilidad de A: 10/15 = 66.7%
- Probabilidad de B: 5/15 = 33.3%

### ¿Puedo hacer que un item cure un porcentaje de vida en lugar de cantidad fija?
Sí, usa `healPercent` en las props de food:
```json
{
  "food": {
    "healPercent": 50,
    "cooldownSeconds": 60
  }
}
```
Esto curará el 50% de la vida máxima del jugador.

### ¿Cómo hago que un nivel sea más difícil que otro?
Aumenta:
- El tier mínimo de herramienta requerida
- El peso de enemigos más fuertes
- Reduce el peso de recompensas comunes
- Aumenta el cooldown del área

### ¿Puedo combinar diferentes tipos de props en un item?
Sí, puedes combinar múltiples props. Por ejemplo, un item que sea arma y herramienta:
```json
{
  "tool": { "type": "sword", "tier": 3 },
  "damage": 25,
  "breakable": { "enabled": true, "maxDurability": 200, "durabilityPerUse": 1 }
}
```

---

## 🎓 Consejos Pro

### Balanceo de Economía
- Items iniciales: 10-100 monedas
- Items raros: 500-1000 monedas
- Items legendarios: 5000+ monedas

### Progresión de Herramientas
Tier recomendado:
- Tier 1: Madera/Piedra
- Tier 2: Cobre/Bronce
- Tier 3: Hierro
- Tier 4: Acero
- Tier 5: Mithril/Legendario

### Durabilidad Recomendada
- Herramientas básicas: 50-100 usos
- Herramientas intermedias: 150-300 usos
- Herramientas avanzadas: 500+ usos

### Cooldowns Recomendados
- Actividades básicas: 30-60 segundos
- Actividades intermedias: 2-5 minutos
- Actividades difíciles: 10-30 minutos

---

## 🆕 Preguntas Frecuentes sobre Logros y Misiones

### ¿Cómo funcionan los logros?
Los logros son objetivos permanentes que los jugadores desbloquean al cumplir requisitos específicos. Otorgan puntos y recompensas únicas.

### ¿Cuál es la diferencia entre logros y misiones?
- **Logros:** Permanentes, se desbloquean una vez, dan puntos y prestigio
- **Misiones:** Pueden ser repetibles, tienen tipos (diarias, semanales), dan recompensas cada vez

### ¿Los logros pueden ser ocultos?
Sí, puedes marcar un logro como `hidden: true`. Los jugadores no verán su existencia hasta desbloquearlo.

### ¿Puedo crear misiones que se repitan cada día?
Sí, configura el tipo como `daily` y `repeatable: true`. Los jugadores podrán completarla cada día.

### ¿Cómo veo el progreso de los jugadores en misiones?
Usa `!mision-ver <key>` para ver estadísticas generales, o pídele al jugador que use `!misiones` para ver su progreso personal.

### ¿Los logros y misiones pueden dar items como recompensa?
Sí, ambos pueden recompensar con:
- Monedas
- XP (experiencia)
- Items específicos
- Roles de Discord (solo en logros especiales)

### ¿Qué pasa si elimino un logro que los jugadores ya desbloquearon?
Se eliminará el registro de desbloqueo de todos los jugadores. Es mejor desactivar o editar en lugar de eliminar.

### ¿Puedo tener misiones con múltiples requisitos?
Sí, usa el tipo `all` en los requisitos y lista todos los que deben cumplirse:
```json
{
  "type": "all",
  "requirements": [
    { "type": "mine_count", "count": 10 },
    { "type": "collect_items", "items": [...] }
  ]
}
```

---

## 📞 Soporte

Si tienes problemas o preguntas:
1. Verifica que tengas los permisos necesarios
2. Revisa que tus JSONs estén bien formateados
3. Usa los comandos de lista (`!items-lista`, `!mobs-lista`, etc.) para verificar que todo se creó correctamente
4. Revisa los logs del bot en caso de errores
5. Contacta al soporte del bot en el servidor oficial

---

**¡Feliz creación de contenido! 🎉**

---

## 📚 Documentación Completa

Esta guía es un resumen. Para la **documentación completa, interactiva y moderna** con todas las secciones detalladas, incluyendo:

- ✅ Todos los comandos con ejemplos
- ✅ Sistema completo de creación de contenido (Items, Mobs, Áreas, Niveles, Ofertas)
- ✅ Guía de Props y configuraciones JSON
- ✅ Ejemplos prácticos completos
- ✅ Tips, trucos y FAQ
- ✅ Diseño moderno con navegación interactiva

**Accede a:** `src/server/public/index.html`

O visita la URL de tu servidor: `http://tu-servidor:puerto/`

---

## 🔗 Recursos Adicionales

- **CREACION_DE_CONTENIDO.md** - Documentación técnica detallada para administradores sobre creación de contenido
- **index.html** - Documentación web completa e interactiva
- **Repositorio del Bot** - Código fuente y documentación técnica

---

**Última actualización:** Enero 2025 • Versión 0.11.20  
**Amayo Bot** © 2025 - Documentación para usuarios finales de Discord
