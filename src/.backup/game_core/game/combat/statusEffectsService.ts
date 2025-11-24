import { prisma } from "../../core/database/prisma";

export type StatusEffectType = "FATIGUE" | string;

export interface StatusEffectOptions {
  magnitude?: number; // porcentaje o valor genérico según tipo
  durationMs?: number; // duración; si no se pasa => permanente
  data?: Record<string, any>;
}

export async function applyStatusEffect(
  userId: string,
  guildId: string,
  type: StatusEffectType,
  opts?: StatusEffectOptions
) {
  const now = Date.now();
  const expiresAt = opts?.durationMs ? new Date(now + opts.durationMs) : null;
  return prisma.playerStatusEffect.upsert({
    where: { userId_guildId_type: { userId, guildId, type } },
    update: {
      magnitude: opts?.magnitude ?? 0,
      expiresAt,
      data: opts?.data ?? {},
    },
    create: {
      userId,
      guildId,
      type,
      magnitude: opts?.magnitude ?? 0,
      expiresAt,
      data: opts?.data ?? {},
    },
  });
}

export async function getActiveStatusEffects(userId: string, guildId: string) {
  // Limpieza perezosa de expirados
  await prisma.playerStatusEffect.deleteMany({
    where: { userId, guildId, expiresAt: { lt: new Date() } },
  });
  return prisma.playerStatusEffect.findMany({
    where: { userId, guildId },
  });
}

export function computeDerivedModifiers(
  effects: { type: string; magnitude: number }[]
) {
  let damageMultiplier = 1;
  let defenseMultiplier = 1;
  for (const e of effects) {
    switch (e.type) {
      case "FATIGUE":
        // Reducción lineal: magnitude = 0.15 => -15% daño y -10% defensa, configurable
        damageMultiplier *= 1 - Math.min(0.9, e.magnitude); // cap 90% reducción
        defenseMultiplier *= 1 - Math.min(0.9, e.magnitude * 0.66);
        break;
      default:
        break; // otros efectos futuros
    }
  }
  return { damageMultiplier, defenseMultiplier };
}

export async function applyDeathFatigue(
  userId: string,
  guildId: string,
  magnitude = 0.15,
  minutes = 5
) {
  return applyStatusEffect(userId, guildId, "FATIGUE", {
    magnitude,
    durationMs: minutes * 60 * 1000,
    data: { reason: "death" },
  });
}

export async function removeStatusEffect(
  userId: string,
  guildId: string,
  type: StatusEffectType
) {
  await prisma.playerStatusEffect.deleteMany({
    where: { userId, guildId, type },
  });
}

export async function clearAllStatusEffects(userId: string, guildId: string) {
  await prisma.playerStatusEffect.deleteMany({ where: { userId, guildId } });
}
