import { prisma } from "../../core/database/prisma";
import {
  ensurePlayerState,
  getEquipment,
  getEffectiveStats,
  adjustHP,
} from "./equipmentService";
import { reduceToolDurability } from "../minigames/service";

function getNumber(v: any, fallback = 0) {
  return typeof v === "number" ? v : fallback;
}

export async function processScheduledAttacks(limit = 25) {
  const now = new Date();
  const jobs = await prisma.scheduledMobAttack.findMany({
    where: { status: "scheduled", scheduleAt: { lte: now } },
    orderBy: { scheduleAt: "asc" },
    take: limit,
  });
  for (const job of jobs) {
    try {
      await prisma.$transaction(async (tx) => {
        // marcar processing
        await tx.scheduledMobAttack.update({
          where: { id: job.id },
          data: { status: "processing" },
        });

        const mob = await tx.mob.findUnique({ where: { id: job.mobId } });
        if (!mob) throw new Error("Mob inexistente");
        const stats = (mob.stats as any) || {};
        const mobAttack = Math.max(0, getNumber(stats.attack, 5));

        await ensurePlayerState(job.userId, job.guildId);
        const eff = await getEffectiveStats(job.userId, job.guildId);
        const dmg = Math.max(1, mobAttack - eff.defense);

        // aplicar daño
        await adjustHP(job.userId, job.guildId, -dmg);

        // desgastar arma equipada si existe
        const { eq, weapon } = await getEquipment(job.userId, job.guildId);
        if (weapon) {
          // buscar por key para reducir durabilidad con multiplicador de combate (50%)
          // weapon tiene id; buscamos para traer key
          const full = await tx.economyItem.findUnique({
            where: { id: weapon.id },
          });
          if (full) {
            await reduceToolDurability(
              job.userId,
              job.guildId,
              full.key,
              "combat"
            );
          }
        }

        // finalizar
        await tx.scheduledMobAttack.update({
          where: { id: job.id },
          data: { status: "done", processedAt: new Date() },
        });
      });
    } catch (e) {
      await prisma.scheduledMobAttack.update({
        where: { id: job.id },
        data: {
          status: "failed",
          processedAt: new Date(),
          metadata: { error: String(e) } as any,
        },
      });
    }
  }
  return { processed: jobs.length } as const;
}

if (require.main === module) {
  processScheduledAttacks()
    .then((r) => {
      console.log("[attacksWorker] processed", r.processed);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
