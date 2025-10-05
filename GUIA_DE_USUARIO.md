# 🎮 Guía de Usuario - Sistema de Economía y Minijuegos

> **Bienvenido a la guía completa para crear contenido de juego en tu servidor de Discord**

Esta guía te enseñará cómo crear items, enemigos, áreas de juego y ofertas de tienda usando comandos simples de Discord. No necesitas saber programación, solo seguir los pasos.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Conceptos Básicos](#conceptos-básicos)
3. [Creando tu Primer Item](#creando-items)
4. [Creando Enemigos](#creando-enemigos)
5. [Configurando Áreas de Juego](#configurando-áreas)
6. [Configurando Niveles](#configurando-niveles)
7. [Creando Ofertas de Tienda](#creando-ofertas)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🔑 Requisitos Previos {#requisitos-previos}

Para usar los comandos de creación de contenido, necesitas:
- Tener el permiso **"Administrar Servidor"** en Discord, **O**
- Tener un rol de Staff configurado en tu servidor

---

## 💡 Conceptos Básicos {#conceptos-básicos}

### ¿Qué es una "key"?
Una **key** es un identificador único para cada elemento que crees. Piénsalo como el "nombre interno" del elemento.

**Ejemplos de keys:**
- `iron_sword` (para una espada de hierro)
- `health_potion` (para una poción de vida)
- `cave_spider` (para un enemigo araña)

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

## ❓ Preguntas Frecuentes {#preguntas-frecuentes}

### ¿Puedo editar un item después de crearlo?
Sí, usa el comando:
```
!item-editar <key>
```

### ¿Cómo elimino un item?
Actualmente debes contactar a un administrador del bot o hacerlo directamente desde la base de datos.

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

## 📞 Soporte

Si tienes problemas o preguntas:
1. Verifica que tengas los permisos necesarios
2. Revisa que tus JSONs estén bien formateados
3. Contacta al soporte del bot en el servidor oficial

---

**¡Feliz creación de contenido! 🎉**
