# Guía de creación de contenido (Items, Mobs, Áreas, Niveles, Ofertas)

Este README explica cómo crear y editar contenido del motor de juego mediante los comandos de mensajes interactivos del bot. Está pensado para administradores o staff con permisos Manage Guild.

Fuentes de verdad y alcance
- Código del bot: comandos bajo `src/commands/messages/game/**` y lógica bajo `src/game/**` (rutas reales del repo).
- Tipos de economía: `src/game/economy/types.ts` (autor-provided, referencia principal para los JSON).
- Librería Discord: `discord.js@15.0.0-dev...` instalada en `node_modules` (autoritaria). La documentación oficial puede estar desfasada.

Requisitos previos
- Permisos: debes tener Manage Guild o rol de staff (el bot lo comprueba en cada editor).
- Prefijo: usa el prefijo configurado del bot en tu servidor (en los ejemplos usaremos `!`).
- Canales: ejecuta los comandos en un canal donde el bot pueda enviar mensajes y componentes.

Límites prácticos en Discord
- Máximo 5 componentes por fila de acciones (action row). Los editores ya respetan esto.
- Los modales aceptan hasta ~4000 caracteres por campo; el bot recorta valores largos.
- Los editores expiran a los 30 minutos si no hay interacción.

Arranque y validación (opcional para desarrolladores)
- Typecheck de tipos:
  ```bash
  npx tsc --noEmit
  ```
- Ejecutar en desarrollo:
  ```bash
  npm run dev
  ```
- Saludo de salud (memoria/CPU) durante pruebas:
  ```js
  console.log(process.memoryUsage());
  ```

Comandos disponibles (editores interactivos)
1) Items (Economía)
- Crear: `!item-crear <key-única>`
- Editar: `!item-editar <key-única>`

Flujo del editor de Items
- Base: nombre, descripción, categoría, icon URL, stackable y máximo por inventario.
- Tags: lista separada por comas.
- Props (JSON): configuración libre extendida, basada en `ItemProps`.
- Guardar/Cancelar.

Plantilla de Props (JSON)
Referencias de `src/game/economy/types.ts` (autor-provided):
```json
{
  "breakable": { "enabled": true, "maxDurability": 100, "durabilityPerUse": 1 },
  "craftable": { "enabled": false },
  "chest": { "enabled": false, "rewards": [], "consumeOnOpen": true },
  "eventCurrency": { "enabled": false, "eventKey": "HALLOWEEN" },
  "passiveEffects": [ { "key": "xpBoost", "value": 0.1 } ],
  "mutationPolicy": { "allowedKeys": ["reforged"], "deniedKeys": [] },
  "craftingOnly": false,
  "availableFrom": "2025-10-05T00:00:00.000Z",
  "availableTo": null,
  "usableFrom": null,
  "usableTo": null,
  "shop": { "purchasable": true },
  "tool": { "type": "pickaxe", "tier": 1 },
  "food": { "healHp": 25, "cooldownKey": "food", "cooldownSeconds": 30 },
  "damage": 10,
  "defense": 0,
  "maxHpBonus": 0
}
```
Campos opcionales y extensibles: cualquier clave adicional se acepta, el motor trata `ItemProps` como JSON flexible.

2) Mobs (Enemigos)
- Crear: `!mob-crear <key-única>`
- Editar: `!mob-editar <key-única>`

Flujo del editor de Mobs
- Base: nombre y categoría.
- Stats (JSON): libre (p. ej., `{ "attack": 5, "hp": 50, "defense": 2 }`).
- Drops (JSON): libre (tabla de recompensas que tu juego interpretará).
- Guardar/Cancelar.

Ejemplo de `stats` y `drops`
```json
{
  "stats": { "attack": 8, "hp": 60, "defense": 3 },
  "drops": {
    "coins": { "min": 5, "max": 20 },
    "items": [ { "itemKey": "mineral_cobre", "qty": 1 } ]
  }
}
```

3) Áreas del juego
- Crear: `!area-crear <key-única>`
- Editar: `!area-editar <key-única>`

Flujo del editor de Áreas
- Base: nombre y tipo (`MINE`, `LAGOON`, `FIGHT`, `FARM`, etc.).
- Config (JSON): libre, define reglas de esa área (p. ej., rates, spawns, etc.).
- Meta (JSON): libre, metadatos no funcionales o de UI.
- Guardar/Cancelar.

Ejemplo de `config` para mina
```json
{
  "spawnRates": { "mineral_cobre": 0.6, "mineral_hierro": 0.3, "gema_rara": 0.1 },
  "toolRequired": "pickaxe",
  "tierMin": 1
}
```

4) Niveles por Área
- Crear/Editar: `!area-nivel <areaKey> <level>`

Flujo del editor de Niveles
- Requisitos (JSON): condiciones para acceder/subir al nivel.
- Recompensas (JSON): lo que se otorga al completar el nivel.
- Mobs (JSON): configuración de enemigos que aparecen en ese nivel.
- Ventana: fechas (ISO) opcionales `Desde/Hasta` de disponibilidad.
- Guardar/Cancelar.

Ejemplo de `requirements`, `rewards`, `mobs`
```json
{
  "requirements": { "level": 10, "items": [{ "itemKey": "permiso_mina", "qty": 1 }] },
  "rewards": { "coins": 100, "xp": 250 },
  "mobs": [ { "key": "slime_verde", "count": 5 }, { "key": "golem_piedra", "count": 1 } ]
}
```

5) Ofertas de Tienda (Shop Offers)
- Crear: `!offer-crear`
- Editar: `!offer-editar <offerId>` (usa el ID ya existente)

Flujo del editor de Ofertas
- Base: `itemKey` del ítem a vender y si está habilitada.
- Precio (JSON): ver tipo `Price`.
- Ventana: fechas (ISO) opcionales `Inicio/Fin` de venta.
- Límites: por usuario (int o vacío = sin límite) y stock global (int o vacío = ilimitado).
- Meta (JSON): libre (banderas, tags, notas, etc.).
- Guardar/Cancelar.

Plantilla de `price` (Price)
Derivada de `src/game/economy/types.ts`:
```json
{
  "coins": 150,
  "items": [ { "itemKey": "ticket_evento", "qty": 2 } ],
  "extra": { "promo": "octubre", "descuento": 0.1 }
}
```

Notas importantes del editor de ofertas
- El `itemKey` debe existir (el editor valida buscando por `guildId` actual o global `null`).
- Si usas ventanas de tiempo, emplea formato ISO válido: `YYYY-MM-DDTHH:mm:ss.sssZ`.
- Límites en blanco significan sin límites; los valores se normalizan a enteros >= 0.

Referencias de tipos (economía)
Archivo: `src/game/economy/types.ts` (autor-provided).
- `Price`: monedas, componentes de ítem y `extra` libre.
- `ItemProps`: bloques opcionales (`tool`, `food`, `chest`, `breakable`, stats de combate, etc.).
- `InventoryState`: si manejas instancias no apilables con durabilidad/caducidad.

Consejos y solución de problemas
- Error 400 `BASE_TYPE_BAD_LENGTH: Must be between 1 and 5 in length.`
  - Causa: una fila de botones superó 5 componentes. Los editores actuales ya agrupan en 2 filas cuando hace falta.
- JSON inválido en modales
  - Asegúrate de pegar JSON válido. El editor responderá con error si no puede parsearlo.
- Editor expirado
  - Tras 30 minutos sin interacción, el editor se desactiva. Vuelve a lanzar el comando.
- Permisos insuficientes
  - Necesitas Manage Guild o rol de staff para abrir editores.

Anexos
- Semillas de minijuegos (opcional):
  ```bash
  npm run seed:minigames
  ```
- Ayuda general del bot: consulta el comando de ayuda y/o paneles en `src/commands/messages/help.ts`.

Historial de comprobación
- Comandos y flujos validados contra los editores implementados en `src/commands/messages/game/**` (código del repo).
- Formatos de JSON basados en `src/game/economy/types.ts` (autor-provided, principal).
- Límite de 5 componentes por fila y comportamiento de componentes verificados con `discord.js` dev instalada en `node_modules` (autoritaria); la documentación oficial puede no reflejar cambios de la versión dev.

