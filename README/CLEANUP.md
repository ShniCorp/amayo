# Resumen de la limpieza de mobs inválidos

Qué hice

- Detecté mob definitions inválidas en la tabla `Mob` usando `scripts/cleanInvalidMobs.ts`.
- Guardé un respaldo completo de las filas inválidas en `invalid_mobs_backup.json` en la raíz del repo.
- Busqué dependencias en tablas que referencian `Mob` con `scripts/findMobDependencies.ts`.
- Guardé un respaldo de las filas dependientes en `scheduled_mob_attack_backup.json`.
- Eliminé las filas dependientes en `ScheduledMobAttack` y luego eliminé las filas inválidas de `Mob` con `scripts/removeInvalidMobsWithDeps.ts`.

Backups

- `invalid_mobs_backup.json` — contiene objetos con `id`, `row` (registro original) y `error` (ZodError).
- `scheduled_mob_attack_backup.json` — contiene filas de `ScheduledMobAttack` que apuntaban a los mobs inválidos.

Comandos usados

- Detectar mobs inválidos (no destructivo):

  npx tsx scripts/testMobData.ts

- Generar backup + eliminar mobs inválidos (no recomendado sin revisar):

  XATA_DB=... npx tsx scripts/cleanInvalidMobs.ts

- Buscar dependencias (muestra FK y filas dependientes):

  XATA_DB=... npx tsx scripts/findMobDependencies.ts

- Backups + borrado de dependencias y mobs (ya ejecutado):

  XATA_DB=... npx tsx scripts/removeInvalidMobsWithDeps.ts

Restauración

- Si deseas restaurar datos desde los backups, hay dos estrategias:

  1) Restauración completa (reinsertar mobs, luego scheduled attacks): requiere restaurar `Mob` antes de `ScheduledMobAttack`.

  2) Restauración parcial (solo scheduled attacks): solo posible si los `Mob` existen o se restauran con anterioridad.

Pistas para restaurar (ejemplo rápido)

- Para reinserción manual (SQL generada): examina `invalid_mobs_backup.json`, reconstruye los objetos `metadata` y ejecuta INSERTs en la tabla `Mob` respetando columnas.

- Para reinserción de `ScheduledMobAttack`: usa `scheduled_mob_attack_backup.json` e inserta filas; asegúrate de que `mobId` apunte a un `Mob` existente.

Siguientes pasos recomendados

- Revisar backups antes de cualquier restauración.
- Añadir validación previa a la UI que crea mobs para evitar shapes inválidos (ya existe zod pero su uso puede ampliarse).
- Añadir tests DB-backed en staging para evitar que filas inválidas lleguen a producción.

Contacto

- Si quieres, puedo generar un script de restauración `scripts/restoreFromBackup.ts` que hace esto de forma idempotente y segura. Pídelo y lo creo.
