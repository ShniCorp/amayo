import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";

export const command: CommandMessage = {
  name: "deathlog",
  aliases: ["muertes"],
  type: "message",
  cooldown: 8,
  category: "Economía",
  description: "Muestra tus últimas muertes y penalizaciones aplicadas.",
  usage: "deathlog [cantidad<=20]",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    let take = 10;
    if (args[0]) {
      const n = parseInt(args[0], 10);
      if (!isNaN(n) && n > 0) take = Math.min(20, n);
    }

    const logs = await prisma.deathLog.findMany({
      where: { userId, guildId },
      orderBy: { createdAt: "desc" },
      take,
    });
    if (!logs.length) {
      await message.reply("No hay registros de muerte.");
      return;
    }

    const lines = logs.map((l) => {
      const pct = Math.round((l.percentApplied || 0) * 100);
      const parts: string[] = [];
      parts.push(`💰-${l.goldLost}`);
      if (pct) parts.push(`${pct}%`);
      if (l.fatigueMagnitude)
        parts.push(`Fatiga ${Math.round(l.fatigueMagnitude * 100)}%`);
      const area = l.areaKey ? l.areaKey : "?";
      return `${l.createdAt.toISOString().slice(11, 19)} | ${area} L${
        l.level ?? "-"
      } | ${parts.join(" | ")}${l.autoDefeatNoWeapon ? " | sin arma" : ""}`;
    });

    await message.reply(
      `**DeathLog (últimos ${logs.length})**\n${lines.join("\n")}`
    );
  },
};
