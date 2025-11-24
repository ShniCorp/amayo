import { prisma } from "../../core/database/prisma";
import type { Prisma } from "@prisma/client";

export function now(): Date {
  return new Date();
}

export function isWithin(
  date: Date,
  from?: Date | null,
  to?: Date | null
): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function ensureArray<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : [];
}

export function parseItemProps(json: unknown): any {
  if (!json || typeof json !== "object") return {};
  return json as any;
}

export function parseState(json: unknown): any {
  if (!json || typeof json !== "object") return {};
  return json as any;
}

export async function updateInventoryEntryState(
  userId: string,
  guildId: string,
  itemId: string,
  state: any
) {
  const quantity =
    state.instances && Array.isArray(state.instances)
      ? state.instances.length
      : 0;
  return prisma.inventoryEntry.update({
    where: { userId_guildId_itemId: { userId, guildId, itemId } },
    data: { state: state as unknown as Prisma.InputJsonValue, quantity },
  });
}

export default {
  now,
  isWithin,
  ensureArray,
  parseItemProps,
  parseState,
  updateInventoryEntryState,
};
