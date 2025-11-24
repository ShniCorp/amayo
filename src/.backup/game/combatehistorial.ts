import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";
import {
  buildDisplay,
  dividerBlock,
  textBlock,
} from "../../../core/lib/componentsV2";
import { combatSummaryRPG } from "../../../game/lib/rpgFormat";

export const command: CommandMessage = {
  name: "combate-historial",
  type: "message",
  aliases: ["fight-log", "combate-log", "battle-log"],
  cooldown: 5,
  description:
    "Muestra tus últimos combates (resumen de daño, mobs y resultado).",
  usage: "combate-historial [cantidad=5]",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const limit = Math.min(15, Math.max(1, parseInt(args[0] || "5")));

    const runs = await prisma.minigameRun.findMany({
      where: { userId, guildId },
      orderBy: { finishedAt: "desc" },
      take: limit * 2, // tomar extra por si algunas no tienen combate
    });

    if (!runs.length) {
      await message.reply("No tienes combates registrados aún.");
      return;
    }

    const blocks = [
      textBlock(`# 📜 Historial de Combates (${runs.length})`),
      dividerBlock(),
    ];

    let added = 0;
    for (const run of runs) {
      const result: any = run.result as any;
      const combat = result?.combat;
      if (!combat) continue;
      const areaId = run.areaId;
      const area = await prisma.gameArea.findUnique({ where: { id: areaId } });
      const areaLabel = area ? area.name || area.key : "Área desconocida";
      const line = combatSummaryRPG({
        mobs: combat.mobs?.length || result.mobs?.length || 0,
        mobsDefeated: combat.mobsDefeated || 0,
        totalDamageDealt: combat.totalDamageDealt || 0,
        totalDamageTaken: combat.totalDamageTaken || 0,
        playerStartHp: combat.playerStartHp,
        playerEndHp: combat.playerEndHp,
        outcome: combat.outcome,
      });
      blocks.push(textBlock(`**${areaLabel}** (Lv ${run.level})\n${line}`));
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      added++;
      if (added >= limit) break;
    }

    const display = buildDisplay(0x9156ec, blocks);
    await message.reply({ content: "", components: [display] });
  },
};
