# 🔧 Fix: Error `weaponItem` en PlayerEquipment

**Fecha**: Octubre 2025  
**Error**: `Unknown field 'weaponItem' for include statement on model PlayerEquipment`

---

## 🐛 Problema

Al ejecutar comandos `!pelear` y `!pescar`, aparecía el siguiente error de Prisma:

```
Invalid `prisma.playerEquipment.findUnique()` invocation:
{
  where: { userId_guildId: { ... } },
  include: {
    weaponItem: true,  // ❌ Campo desconocido
  }
}

Unknown field `weaponItem` for include statement on model `PlayerEquipment`.
Available options are marked with ?: user, guild
```

### Causa Raíz

El modelo `PlayerEquipment` en el schema de Prisma **no tiene relaciones explícitas** con `EconomyItem`, solo almacena los IDs:

```prisma
model PlayerEquipment {
  weaponItemId String?  // Solo el ID, sin relación @relation
  armorItemId  String?
  capeItemId   String?
  
  user  User  @relation(...)
  guild Guild @relation(...)
}
```

El código intentaba usar `include: { weaponItem: true }` asumiendo una relación que no existe.

---

## ✅ Solución

Cambié la lógica en `validateRequirements()` para buscar el item manualmente después de obtener el `PlayerEquipment`:

### Antes (❌ Incorrecto)
```typescript
const equip = await prisma.playerEquipment.findUnique({
  where: { userId_guildId: { userId, guildId } },
  include: { weaponItem: true } as any,  // ❌ Relación no existe
});
if (equip?.weaponItemId && equip?.weaponItem) {
  const wProps = parseItemProps((equip as any).weaponItem.props);
  // ...
}
```

### Después (✅ Correcto)
```typescript
const equip = await prisma.playerEquipment.findUnique({
  where: { userId_guildId: { userId, guildId } },
});
if (equip?.weaponItemId) {
  const weaponItem = await prisma.economyItem.findUnique({
    where: { id: equip.weaponItemId },
  });
  if (weaponItem) {
    const wProps = parseItemProps(weaponItem.props);
    // ...
  }
}
```

---

## 📝 Archivos Modificados

- **`src/game/minigames/service.ts`**: Función `validateRequirements()` (líneas ~145-165)

---

## 🔮 Alternativa Futura (Opcional)

Si prefieres usar relaciones de Prisma, puedes agregar al schema:

```prisma
model PlayerEquipment {
  weaponItemId String?
  armorItemId  String?
  capeItemId   String?

  // Relaciones explícitas (opcional)
  weaponItem EconomyItem? @relation("WeaponSlot", fields: [weaponItemId], references: [id])
  armorItem  EconomyItem? @relation("ArmorSlot", fields: [armorItemId], references: [id])
  capeItem   EconomyItem? @relation("CapeSlot", fields: [capeItemId], references: [id])
  
  // ...resto
}

model EconomyItem {
  // ...campos existentes
  
  // Relaciones inversas
  weaponSlots PlayerEquipment[] @relation("WeaponSlot")
  armorSlots  PlayerEquipment[] @relation("ArmorSlot")
  capeSlots   PlayerEquipment[] @relation("CapeSlot")
}
```

Luego ejecutar:
```bash
npx prisma migrate dev --name add-equipment-relations
```

**Ventaja**: Permite usar `include` sin queries adicionales.  
**Desventaja**: Requiere migración; el fix actual funciona sin cambiar el schema.

---

## ✅ Resultado

Comandos `!pelear`, `!pescar` y `!mina` ahora funcionan correctamente sin errores de Prisma.

---

**Typecheck**: ✅ Pasado  
**Status**: Resuelto
