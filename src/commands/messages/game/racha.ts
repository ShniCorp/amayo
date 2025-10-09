import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { getStreakInfo, updateStreak } from "../../../game/streaks/service";
import type { TextBasedChannel } from "discord.js";
import { fetchItemBasics, formatItemLabel, sendDisplayReply } from "./_helpers";
import {
  buildDisplay,
  textBlock,
  dividerBlock,
} from "../../../core/lib/componentsV2";

export const command: CommandMessage = {
  name: "racha",
  type: "message",
  aliases: ["streak", "daily"],
  category: "Economía",
  cooldown: 10,
  description: "Ver tu racha diaria y reclamar recompensa",
  usage: "racha",
  run: async (message, args, client: Amayo) => {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;

      // Actualizar racha
      const { streak, newDay, rewards, daysIncreased } = await updateStreak(
        userId,
        guildId
      );

      // Construir bloques de display (evitando type:9 sin accessory)
      const blocks: any[] = [
        textBlock(
          `## <a:0fire:1425690572945100860> Racha diaria de ${message.author.username}`
        ),
        dividerBlock(),
        textBlock(
          `**<:stats:1425689271788113991> ESTADÍSTICAS**\n` +
            `<a:0fire:1425690572945100860> Racha Actual: **${streak.currentStreak}** días\n` +
            `<a:bluestargif:1425691124214927452> Mejor Racha: **${streak.longestStreak}** días\n` +
            `<:events:1425691310194561106> Días Activos: **${streak.totalDaysActive}** días`
        ),
        dividerBlock({ spacing: 1 }),
      ];

      // Mensaje de estado
      if (newDay) {
        if (daysIncreased) {
          blocks.push(
            textBlock(
              `**<:Sup_res:1420535051162095747> ¡RACHA INCREMENTADA!**\nHas mantenido tu racha por **${streak.currentStreak}** días seguidos.`
            )
          );
        } else {
          blocks.push(
            textBlock(
              `**<:Sup_urg:1420535068056748042> RACHA REINICIADA**\nPasó más de un día sin actividad. Tu racha se ha reiniciado.`
            )
          );
        }

        // Mostrar recompensas
        if (rewards) {
          let rewardsText =
            "**<a:Chest:1425691840614764645> RECOMPENSA DEL DÍA**\n";
          if (rewards.coins)
            rewardsText += `<:coin:1425667511013081169> **${rewards.coins.toLocaleString()}** monedas\n`;
          if (rewards.items && rewards.items.length) {
            const basics = await fetchItemBasics(
              guildId,
              rewards.items.map((item) => item.key)
            );
            rewards.items.forEach((item) => {
              const info = basics.get(item.key) ?? {
                key: item.key,
                name: null,
                icon: null,
              };
              const label = formatItemLabel(info, { bold: true });
              rewardsText += `${label} ×${item.quantity}\n`;
            });
          }

          blocks.push(dividerBlock({ spacing: 1, divider: false }));
          blocks.push(textBlock(rewardsText));
        }
      } else {
        blocks.push(
          textBlock(
            `**<:apin:1336533845541126174> YA RECLAMASTE HOY**\nYa has reclamado tu recompensa diaria. Vuelve mañana para continuar tu racha.`
          )
        );
      }

      // Próximos hitos
      const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
      const nextMilestone = milestones.find((m) => m > streak.currentStreak);

      if (nextMilestone) {
        const remaining = nextMilestone - streak.currentStreak;
        blocks.push(dividerBlock({ spacing: 1, divider: false }));
        blocks.push(
          textBlock(
            `**🎯 PRÓXIMO HITO**\nFaltan **${remaining}** días para alcanzar el día **${nextMilestone}**`
          )
        );
      }

      const display = buildDisplay(daysIncreased ? 0x00ff00 : 0xffa500, blocks);

      await sendDisplayReply(message, display);
    } catch (error) {
      console.error("Error en comando racha:", error);
      await message.reply(
        "<:Cross:1420535096208920576> Error al obtener tu racha diaria."
      );
    }
  },
};
