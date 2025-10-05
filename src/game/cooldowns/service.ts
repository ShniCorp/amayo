import { prisma } from '../../core/database/prisma';

export async function getCooldown(userId: string, guildId: string, key: string) {
  return prisma.actionCooldown.findUnique({ where: { userId_guildId_key: { userId, guildId, key } } });
}

export async function setCooldown(userId: string, guildId: string, key: string, seconds: number) {
  const until = new Date(Date.now() + Math.max(0, seconds) * 1000);
  return prisma.actionCooldown.upsert({
    where: { userId_guildId_key: { userId, guildId, key } },
    update: { until },
    create: { userId, guildId, key, until },
  });
}

export async function assertNotOnCooldown(userId: string, guildId: string, key: string) {
  const cd = await getCooldown(userId, guildId, key);
  if (cd && cd.until > new Date()) throw new Error('Cooldown activo');
}

