# Mobs module

## Propósito

- Contener definiciones de mobs (plantillas) y helpers para obtener instancias escaladas por nivel.

## Convenciones

- `MOB_DEFINITIONS` contiene objetos `BaseMobDefinition` con configuración declarativa.
- Usar `getMobInstance(key, areaLevel)` para obtener una instancia lista para combate.
- Evitar lógica de combate en este archivo; este módulo solo expone datos y transformaciones determinísticas.

## Futuro

- Migrar `MOB_DEFINITIONS` a la base de datos o AppWrite y añadir cache si se requiere edición en runtime.
- Añadir validadores y tests para las definiciones.
