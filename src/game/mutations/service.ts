import { prisma } from "../../core/database/prisma";
import type { ItemProps } from "../economy/types";
import { findItemByKey, getInventoryEntry } from "../economy/service";
import { parseItemProps } from "../core/utils";

export async function findMutationByKey(guildId: string, key: string) {
  return prisma.itemMutation.findFirst({
    where: { key, OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
}

export async function applyMutationToInventory(
  userId: string,
  guildId: string,
  itemKey: string,
  mutationKey: string
) {
  const { item, entry } = await getInventoryEntry(userId, guildId, itemKey, {
    createIfMissing: true,
  });
  if (!entry) throw new Error("Inventario inexistente");

  const props = parseItemProps(item.props);
  const policy = props.mutationPolicy;
  if (policy?.deniedKeys?.includes(mutationKey))
    throw new Error("Mutación denegada");
  if (policy?.allowedKeys && !policy.allowedKeys.includes(mutationKey))
    throw new Error("Mutación no permitida");

  const mutation = await findMutationByKey(guildId, mutationKey);
  if (!mutation) throw new Error("Mutación no encontrada");

  await prisma.inventoryItemMutation.create({
    data: { inventoryId: entry.id, mutationId: mutation.id },
  });
  return { ok: true } as const;
}
