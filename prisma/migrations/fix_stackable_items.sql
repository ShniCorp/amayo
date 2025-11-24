-- Migración: Corrección de items stackable y regeneración de inventarios
-- Fecha: 2025-10-09
-- Problema: Items de herramientas/armas marcados como stackable=true en base de datos antigua
--           Inventarios con quantity>1 pero sin state.instances con durabilidad

-- PASO 1: Actualizar definiciones de items (EconomyItem)
-- Marcar herramientas, armas, armaduras y capas como NO apilables
UPDATE "EconomyItem"
SET "stackable" = false
WHERE "key" LIKE 'tool.%'
   OR "key" LIKE 'weapon.%'
   OR "key" LIKE 'armor.%'
   OR "key" LIKE 'cape.%';

-- PASO 2: Migrar inventarios existentes de stackable a non-stackable
-- Para cada entrada con quantity>1 de items que ahora son non-stackable,
-- generar state.instances[] con durabilidad máxima

-- Nota: Esta operación debe hacerse en código TypeScript porque:
-- 1. Necesitamos leer item.props.breakable.maxDurability
-- 2. Generar JSON dinámico de state.instances es complejo en SQL
-- 3. Requerimos validación de integridad por item

-- Ver: scripts/migrateStackableToInstanced.ts

-- PASO 3: Validar integridad post-migración
-- Verificar que no existan items non-stackable con quantity>1 y state.instances vacío
SELECT 
  ie.id,
  ie."userId",
  ie."guildId",
  ei.key,
  ei.name,
  ie.quantity,
  ie.state
FROM "InventoryEntry" ie
JOIN "EconomyItem" ei ON ie."itemId" = ei.id
WHERE ei."stackable" = false
  AND ie.quantity > 1
  AND (
    ie.state IS NULL 
    OR jsonb_array_length(COALESCE((ie.state->>'instances')::jsonb, '[]'::jsonb)) = 0
  );

-- Si esta query devuelve resultados, hay inconsistencias que deben corregirse

-- PASO 4 (Opcional): Resetear inventarios específicos corruptos
-- Si un usuario tiene datos inconsistentes, ejecutar:
-- DELETE FROM "InventoryEntry" WHERE "userId" = '<USER_ID>' AND "guildId" = '<GUILD_ID>' AND "itemId" IN (
--   SELECT id FROM "EconomyItem" WHERE "key" LIKE 'tool.%' OR "key" LIKE 'weapon.%'
-- );
-- Luego el usuario deberá re-adquirir items vía !comprar o admin !dar-item
