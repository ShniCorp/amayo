import { prisma } from '../../core/database/prisma';
import type { Prisma } from '@prisma/client';
import { findItemByKey, addItemByKey } from '../economy/service';

export type SmeltInput = { itemKey: string; qty: number };

export async function createSmeltJob(userId: string, guildId: string, inputs: SmeltInput[], outputItemKey: string, outputQty: number, smeltSeconds: number) {
  if (!inputs.length) throw new Error('No hay insumos');
  if (outputQty <= 0) throw new Error('Cantidad inválida');
  const readyAt = new Date(Date.now() + Math.max(1, smeltSeconds) * 1000);

  // Validar output item id
  const outItem = await findItemByKey(guildId, outputItemKey);
  if (!outItem) throw new Error('Output item no encontrado');

  // Validar y descontar inputs
  // Nota: para simplificar, chequeo y descuento debería ser transaccional; usamos una transacción
  await prisma.$transaction(async (tx) => {
    // Chequeo
    for (const i of inputs) {
      const it = await tx.economyItem.findFirst({ where: { key: i.itemKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
      if (!it) throw new Error(`Input no encontrado: ${i.itemKey}`);
      const inv = await tx.inventoryEntry.findUnique({ where: { userId_guildId_itemId: { userId, guildId, itemId: it.id } } });
      if ((inv?.quantity ?? 0) < i.qty) throw new Error(`Faltan insumos: ${i.itemKey}`);
    }
    // Descuento
    for (const i of inputs) {
      const it = await tx.economyItem.findFirst({ where: { key: i.itemKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
      if (!it) continue;
      await tx.inventoryEntry.update({ where: { userId_guildId_itemId: { userId, guildId, itemId: it.id } }, data: { quantity: { decrement: i.qty } } });
    }
    // Crear job
    await tx.smeltJob.create({
      data: {
        userId,
        guildId,
        inputs: { items: inputs } as unknown as Prisma.InputJsonValue,
        outputItemId: outItem.id,
        outputQty,
        readyAt,
        status: 'pending',
      },
    });
  });

  return { readyAt } as const;
}

export async function claimSmeltJob(userId: string, guildId: string, jobId: string) {
  const job = await prisma.smeltJob.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== userId || job.guildId !== guildId) throw new Error('Job inválido');
  if (job.status !== 'pending' && job.status !== 'ready') throw new Error('Estado inválido');
  if (job.readyAt > new Date()) throw new Error('Aún no está listo');

  // Otorgar outputs y marcar claimed
  await prisma.$transaction(async (tx) => {
    await tx.smeltJob.update({ where: { id: job.id }, data: { status: 'claimed' } });
    const outItem = await tx.economyItem.findUnique({ where: { id: job.outputItemId } });
    if (outItem) {
      // usamos servicio economy por fuera de la transacción (para evitar nested client); hacemos simple aquí
      // añadir con tx: replicamos addItem
      const inv = await tx.inventoryEntry.findUnique({ where: { userId_guildId_itemId: { userId, guildId, itemId: outItem.id } } });
      if (inv) {
        await tx.inventoryEntry.update({ where: { userId_guildId_itemId: { userId, guildId, itemId: outItem.id } }, data: { quantity: { increment: job.outputQty } } });
      } else {
        await tx.inventoryEntry.create({ data: { userId, guildId, itemId: outItem.id, quantity: job.outputQty } });
      }
    }
  });

  return { ok: true } as const;
}

