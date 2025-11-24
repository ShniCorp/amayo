Crear un Mob (guía para usuario final)

Este documento explica cómo crear o editar un mob en el proyecto Amayo.
Incluye: campos obligatorios, ejemplos JSON, validación y formas de persistir (UI o DB).

1) Datos requeridos

- key (string, único): identificador del mob. Ej: "slime.green".
- name (string): nombre legible. Ej: "Slime Verde".
- tier (number): nivel/tier del mob (entero no negativo). Ej: 1.
- base (objeto): contiene stats base obligatorias:
  - hp (number): puntos de vida base.
  - attack (number): valor de ataque base.
  - defense (number, opcional): defensa base.

2) Campos opcionales útiles

- scaling (objeto): parámetros de escalado por nivel de área.
  - hpPerLevel, attackPerLevel, defensePerLevel (number, opcional)
  - hpMultiplierPerTier (number, opcional)
- tags (string[]): etiquetas libres (ej: ["undead","slime"]).
- rewardMods (objeto): ajustes de recompensa (coinMultiplier, extraDropChance).
- behavior (objeto): comportamiento en combate (maxRounds, aggressive, critChance, critMultiplier).

3) Ejemplo JSON mínimo

{
  "key": "slime.green",
  "name": "Slime Verde",
  "tier": 1,
  "base": { "hp": 18, "attack": 4 }
}

4) Ejemplo JSON completo

{
  "key": "skeleton.basic",
  "name": "Esqueleto",
  "tier": 2,
  "base": { "hp": 30, "attack": 6, "defense": 1 },
  "scaling": { "hpPerLevel": 4, "attackPerLevel": 0.8, "defensePerLevel": 0.2 },
  "tags": ["undead"],
  "rewardMods": { "coinMultiplier": 1.1, "extraDropChance": 0.05 },
  "behavior": { "aggressive": true, "critChance": 0.05, "critMultiplier": 1.5 }
}

  ## Formato de "drops" soportado

  Para permitir que los mobs otorguen ítems al morir o por `extraDropChance`, el motor soporta dos formatos para el campo `drops` en la definición del mob:

  - Formato BÁSICO (mapa simple):

  ```json
  {"ore.iron": 1, "ore.gold": 1}
  ```

  Cada key es `itemKey` y el valor es la cantidad (qty). Cuando se necesita elegir un ítem se selecciona una key al azar.

  - Formato PONDERADO (array):

  ```json
  [
    { "itemKey": "ore.iron", "qty": 1, "weight": 8 },
    { "itemKey": "ore.gold", "qty": 1, "weight": 2 }
  ]
  ```

  Cada entrada puede incluir `weight` (entero/numero) para definir probabilidad relativa. El motor hace una tirada ponderada y entrega el item seleccionado.

  Si no hay `drops` configurados o la selección falla, se aplicará un `fallback` que entrega 1 moneda.


5) Validación

El proyecto usa Zod para validar la definición. Puedes ejecutar localmente:

  npx tsx scripts/testMobData.ts

Eso intentará inicializar el repositorio de mobs y mostrará errores Zod si la definición es inválida.

6) Formas de persistir

- Interfaz del bot (UI): actualmente algunos comandos admin usan `createOrUpdateMob` y persisten en la tabla `Mob` en la DB. Usa los comandos del bot (si tienes permisos administrador) para crear/editar mobs.

- Directamente en la DB: insertar un row en la tabla `Mob` con `metadata` JSON conteniendo la definición. Recomendado: usa `createOrUpdateMob` o valida con Zod antes.

7) Pruebas y comprobaciones

- Obtener una instancia de prueba:
  - Usa `src/game/mobs/mobData.getMobInstance(key, areaLevel)` en la consola o en un script para ver stats escaladas.
- Lista de keys disponibles:
  - `src/game/mobs/mobData.listMobKeys()`

8) Precauciones

- Evita crear mobs con shapes incompletas (faltas de `key`, `name`, `tier`, `base`) — provocará rechazos de validación y puede romper procesos que esperen campos.
- Si actualizas a mano la DB, haz un backup antes y valida con Zod.

9) Soporte

- Si quieres que el equipo integre campos adicionales (por ejemplo `lootTable`), coméntalo y añadiré la extensión al esquema y pruebas.

---

Creado automáticamente por scripts de mantenimiento. Si quieres que lo formatee o añada más ejemplos, lo actualizo.

---

Sección añadida: Formatos de drops

Para detalle técnico sobre cómo definir `drops` en la definición de un mob (soporte de mapa simple y array ponderado), ver la sección "Formato de \"drops\" soportado" al final de este README o en los comentarios del archivo `src/game/mobs/mobData.ts`.
