import { prisma } from "../../core/database/prisma";
import type {
  ItemProps,
  InventoryState,
  Price,
  OpenChestResult,
} from "./types";
import type { Prisma } from "@prisma/client";
import { ensureUserAndGuildExist } from "../core/userService";

// Utilidades de tiempo
function now(): Date {
  return new Date();
}

function isWithin(date: Date, from?: Date | null, to?: Date | null): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// Resuelve un EconomyItem por key con alcance de guild o global
export async function findItemByKey(guildId: string, key: string) {
  // buscamos ítem por guildId específico primero, si no, por global (guildId null)
  const item = await prisma.economyItem.findFirst({
    where: {
      key,
      OR: [{ guildId }, { guildId: null }],
    },
    orderBy: [
      // preferir coincidencia del servidor
      { guildId: "desc" },
    ],
  });
  return item;
}

export async function getOrCreateWallet(userId: string, guildId: string) {
  // Asegurar que User y Guild existan antes de crear/buscar wallet
  await ensureUserAndGuildExist(userId, guildId);

  return prisma.economyWallet.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: {},
    create: { userId, guildId, coins: 25 },
  });
}

export async function adjustCoins(
  userId: string,
  guildId: string,
  delta: number
) {
  const wallet = await getOrCreateWallet(userId, guildId);
  const next = Math.max(0, wallet.coins + delta);
  return prisma.economyWallet.update({
    where: { userId_guildId: { userId, guildId } },
    data: { coins: next },
  });
}

export type EnsureInventoryOptions = { createIfMissing?: boolean };

export async function getInventoryEntryByItemId(
  userId: string,
  guildId: string,
  itemId: string,
  opts?: EnsureInventoryOptions
) {
  const existing = await prisma.inventoryEntry.findUnique({
    where: { userId_guildId_itemId: { userId, guildId, itemId } },
  });
  if (existing) return existing;
  if (!opts?.createIfMissing) return null;
  return prisma.inventoryEntry.create({
    data: { userId, guildId, itemId, quantity: 0 },
  });
}

export async function getInventoryEntry(
  userId: string,
  guildId: string,
  itemKey: string,
  opts?: EnsureInventoryOptions
) {
  const item = await findItemByKey(guildId, itemKey);
  if (!item) throw new Error(`Item key not found: ${itemKey}`);
  const entry = await getInventoryEntryByItemId(userId, guildId, item.id, opts);
  return { item, entry } as const;
}

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== "object") return {};
  return json as ItemProps;
}

function parseState(json: unknown): InventoryState {
  if (!json || typeof json !== "object") return {};
  return json as InventoryState;
}

function checkUsableWindow(item: {
  usableFrom: Date | null;
  usableTo: Date | null;
  props: any;
}) {
  const props = parseItemProps(item.props);
  const from = props.usableFrom ? new Date(props.usableFrom) : item.usableFrom;
  const to = props.usableTo ? new Date(props.usableTo) : item.usableTo;
  if (!isWithin(now(), from ?? null, to ?? null)) {
    throw new Error("Item no usable por ventana de tiempo");
  }
}

function checkAvailableWindow(item: {
  availableFrom: Date | null;
  availableTo: Date | null;
  props: any;
}) {
  const props = parseItemProps(item.props);
  const from = props.availableFrom
    ? new Date(props.availableFrom)
    : item.availableFrom;
  const to = props.availableTo ? new Date(props.availableTo) : item.availableTo;
  if (!isWithin(now(), from ?? null, to ?? null)) {
    throw new Error("Item no disponible para adquirir");
  }
}

// Agrega cantidad respetando maxPerInventory y stackable
export async function addItemByKey(
  userId: string,
  guildId: string,
  itemKey: string,
  qty: number
) {
  if (qty <= 0) return { added: 0 } as const;
  const found = await getInventoryEntry(userId, guildId, itemKey, {
    createIfMissing: true,
  });
  const item = found.item;
  const entry = found.entry;
  if (!entry) throw new Error("No se pudo crear/obtener inventario");
  checkAvailableWindow(item);

  const max = item.maxPerInventory ?? Number.MAX_SAFE_INTEGER;
  if (item.stackable) {
    const currentQty = entry.quantity ?? 0;
    const added = Math.max(0, Math.min(qty, Math.max(0, max - currentQty)));
    if (added === 0) return { added: 0 } as const;
    const updated = await prisma.inventoryEntry.update({
      where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
      data: { quantity: { increment: added } },
    });
    return { added, entry: updated } as const;
  } else {
    // No apilable: usar state.instances
    const state = parseState(entry.state);
    state.instances ??= [];
    const canAdd = Math.max(
      0,
      Math.min(qty, Math.max(0, max - state.instances.length))
    );
    // Inicializar durabilidad si corresponde
    const props = parseItemProps(item.props);
    const breakable = props.breakable;
    const maxDurability =
      breakable?.enabled !== false ? breakable?.maxDurability : undefined;
    for (let i = 0; i < canAdd; i++) {
      if (maxDurability && maxDurability > 0) {
        state.instances.push({ durability: maxDurability });
      } else {
        state.instances.push({});
      }
    }
    const updated = await prisma.inventoryEntry.update({
      where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
        quantity: state.instances.length,
      },
    });
    return { added: canAdd, entry: updated } as const;
  }
}

export async function consumeItemByKey(
  userId: string,
  guildId: string,
  itemKey: string,
  qty: number
) {
  if (qty <= 0) return { consumed: 0 } as const;
  const { item, entry } = await getInventoryEntry(userId, guildId, itemKey);
  if (!entry || (entry.quantity ?? 0) <= 0) return { consumed: 0 } as const;

  if (item.stackable) {
    const consumed = Math.min(qty, entry.quantity);
    const updated = await prisma.inventoryEntry.update({
      where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
      data: { quantity: { decrement: consumed } },
    });
    return { consumed, entry: updated } as const;
  } else {
    const state = parseState(entry.state);
    const instances = state.instances ?? [];
    const consumed = Math.min(qty, instances.length);
    if (consumed === 0) return { consumed: 0 } as const;
    instances.splice(0, consumed);
    const newState: InventoryState = { ...state, instances };
    const updated = await prisma.inventoryEntry.update({
      where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
      data: {
        state: newState as unknown as Prisma.InputJsonValue,
        quantity: instances.length,
      },
    });
    return { consumed, entry: updated } as const;
  }
}

export async function openChestByKey(
  userId: string,
  guildId: string,
  itemKey: string
): Promise<OpenChestResult> {
  const { item, entry } = await getInventoryEntry(userId, guildId, itemKey);
  if (!entry || (entry.quantity ?? 0) <= 0)
    throw new Error("No tienes este cofre");
  checkUsableWindow(item);

  const props = parseItemProps(item.props);
  const chest = props.chest ?? {};
  if (!chest.enabled) throw new Error("Este ítem no se puede abrir");
  const rewards = Array.isArray(chest.rewards) ? chest.rewards : [];
  const mode = chest.randomMode || "all";
  const result: OpenChestResult = {
    coinsDelta: 0,
    itemsToAdd: [],
    rolesToGrant: [],
    consumed: false,
  };

  function pickOneWeighted<T extends { probability?: number }>(
    arr: T[]
  ): T | null {
    const prepared = arr.map((a) => ({
      ...a,
      _w: a.probability != null ? Math.max(0, a.probability) : 1,
    }));
    const total = prepared.reduce((s, a) => s + a._w, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const a of prepared) {
      r -= a._w;
      if (r <= 0) return a;
    }
    return prepared[prepared.length - 1] ?? null;
  }

  if (mode === "single") {
    const one = pickOneWeighted(rewards);
    if (one) {
      if (one.type === "coins") result.coinsDelta += Math.max(0, one.amount);
      else if (one.type === "item")
        result.itemsToAdd.push({
          itemKey: one.itemKey,
          itemId: one.itemId,
          qty: one.qty,
        });
      else if (one.type === "role") result.rolesToGrant.push(one.roleId);
    }
  } else {
    // 'all' y 'roll-each': procesar cada reward con probabilidad (default 100%)
    for (const r of rewards) {
      const p = r.probability != null ? Math.max(0, r.probability) : 1; // p en [0,1] recomendado; si usan valores >1 se interpretan como peso
      // Si p > 1 asumimos error o peso -> para modo 'all' lo tratamos como 1 (100%)
      const chance = p > 1 ? 1 : p; // normalizado
      if (Math.random() <= chance) {
        if (r.type === "coins") result.coinsDelta += Math.max(0, r.amount);
        else if (r.type === "item")
          result.itemsToAdd.push({
            itemKey: r.itemKey,
            itemId: r.itemId,
            qty: r.qty,
          });
        else if (r.type === "role") result.rolesToGrant.push(r.roleId);
      }
    }
  }

  // Roles fijos adicionales en chest.roles
  if (Array.isArray(chest.roles) && chest.roles.length) {
    for (const roleId of chest.roles) {
      if (typeof roleId === "string" && roleId.length > 0)
        result.rolesToGrant.push(roleId);
    }
  }

  if (result.coinsDelta) await adjustCoins(userId, guildId, result.coinsDelta);
  for (const it of result.itemsToAdd) {
    if (it.itemKey) await addItemByKey(userId, guildId, it.itemKey, it.qty);
    else if (it.itemId) {
      const item = await prisma.economyItem.findUnique({
        where: { id: it.itemId },
      });
      if (item) await addItemByKey(userId, guildId, item.key, it.qty);
    }
  }

  if (chest.consumeOnOpen) {
    const c = await consumeItemByKey(userId, guildId, itemKey, 1);
    result.consumed = c.consumed > 0;
  }

  return result;
}

export async function craftByProductKey(
  userId: string,
  guildId: string,
  productKey: string
) {
  const product = await findItemByKey(guildId, productKey);
  if (!product) throw new Error(`Producto no encontrado: ${productKey}`);
  const recipe = await prisma.itemRecipe.findUnique({
    where: { productItemId: product.id },
    include: { ingredients: true },
  });
  if (!recipe) throw new Error("No existe receta para este ítem");

  // Verificar ingredientes suficientes
  const shortages: string[] = [];
  for (const ing of recipe.ingredients) {
    const inv = await prisma.inventoryEntry.findUnique({
      where: { userId_guildId_itemId: { userId, guildId, itemId: ing.itemId } },
    });
    const have = inv?.quantity ?? 0;
    if (have < ing.quantity) shortages.push(ing.itemId);
  }
  if (shortages.length) throw new Error("Ingredientes insuficientes");

  // Consumir ingredientes
  for (const ing of recipe.ingredients) {
    await prisma.inventoryEntry.update({
      where: { userId_guildId_itemId: { userId, guildId, itemId: ing.itemId } },
      data: { quantity: { decrement: ing.quantity } },
    });
  }

  // Agregar producto
  const add = await addItemByKey(
    userId,
    guildId,
    product.key,
    recipe.productQuantity
  );
  return { added: add.added, product } as const;
}

export async function buyFromOffer(
  userId: string,
  guildId: string,
  offerId: string,
  qty = 1
) {
  if (qty <= 0) throw new Error("Cantidad inválida");
  const offer = await prisma.shopOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.guildId !== guildId)
    throw new Error("Oferta no encontrada");
  if (!offer.enabled) throw new Error("Oferta deshabilitada");
  const nowD = now();
  if (!isWithin(nowD, offer.startAt ?? null, offer.endAt ?? null))
    throw new Error("Oferta fuera de fecha");

  const price = (offer.price as unknown as Price) ?? {};
  // Limites
  if (offer.perUserLimit != null) {
    const count = await prisma.shopPurchase.aggregate({
      where: { offerId: offer.id, userId, guildId },
      _sum: { qty: true },
    });
    const already = count._sum.qty ?? 0;
    if (already + qty > offer.perUserLimit)
      throw new Error("Excede el límite por usuario");
  }

  if (offer.stock != null) {
    if (offer.stock < qty) throw new Error("Stock insuficiente");
  }

  // Cobro: coins
  if (price.coins && price.coins > 0) {
    const wallet = await getOrCreateWallet(userId, guildId);
    const total = price.coins * qty;
    if (wallet.coins < total) throw new Error("Monedas insuficientes");
    await prisma.economyWallet.update({
      where: { userId_guildId: { userId, guildId } },
      data: { coins: wallet.coins - total },
    });
  }
  // Cobro: items
  if (price.items && price.items.length) {
    for (const comp of price.items) {
      const key = comp.itemKey;
      const compQty = comp.qty * qty;
      let itemId: string | null = null;
      if (key) {
        const it = await findItemByKey(guildId, key);
        if (!it) throw new Error(`Item de precio no encontrado: ${key}`);
        itemId = it.id;
      } else if (comp.itemId) {
        itemId = comp.itemId;
      }
      if (!itemId) throw new Error("Item de precio inválido");
      const inv = await prisma.inventoryEntry.findUnique({
        where: { userId_guildId_itemId: { userId, guildId, itemId } },
      });
      if ((inv?.quantity ?? 0) < compQty)
        throw new Error("No tienes suficientes items para pagar");
    }
    // si todo está ok, descontar
    for (const comp of price.items) {
      const key = comp.itemKey;
      const compQty = comp.qty * qty;
      let itemId: string | null = null;
      if (key) {
        const it = await findItemByKey(guildId, key);
        itemId = it?.id ?? null;
      } else if (comp.itemId) {
        itemId = comp.itemId;
      }
      if (!itemId) continue;
      await prisma.inventoryEntry.update({
        where: { userId_guildId_itemId: { userId, guildId, itemId } },
        data: { quantity: { decrement: compQty } },
      });
    }
  }

  // Entregar producto
  const item = await prisma.economyItem.findUnique({
    where: { id: offer.itemId },
  });
  if (!item) throw new Error("Ítem de oferta no existente");
  await addItemByKey(userId, guildId, item.key, qty);

  // Registrar compra
  await prisma.shopPurchase.create({
    data: { offerId: offer.id, userId, guildId, qty },
  });

  // Reducir stock global
  if (offer.stock != null) {
    await prisma.shopOffer.update({
      where: { id: offer.id },
      data: { stock: offer.stock - qty },
    });
  }

  return { ok: true, item, qty } as const;
}

// ---------------------------
// Mutaciones
// ---------------------------
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

  // Política de mutaciones
  const props = parseItemProps(item.props);
  const policy = props.mutationPolicy;
  if (policy?.deniedKeys?.includes(mutationKey))
    throw new Error("Mutación denegada");
  if (policy?.allowedKeys && !policy.allowedKeys.includes(mutationKey))
    throw new Error("Mutación no permitida");

  const mutation = await findMutationByKey(guildId, mutationKey);
  if (!mutation) throw new Error("Mutación no encontrada");

  // Registrar vínculo
  await prisma.inventoryItemMutation.create({
    data: { inventoryId: entry.id, mutationId: mutation.id },
  });
  return { ok: true } as const;
}
