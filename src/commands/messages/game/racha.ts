import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { getStreakInfo, updateStreak } from "../../../game/streaks/service";
import type { TextBasedChannel } from "discord.js";
import { fetchItemBasics, formatItemLabel, sendDisplayReply } from "./_helpers";
import { buildDisplay, textBlock, dividerBlock } from "../../../core/lib/componentsV2";

export const command: CommandMessage = {
  name: "racha",
  type: "message",
  aliases: ["streak", "daily"],
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
        textBlock(`# 🔥 Racha Diaria de ${message.author.username}`),
        dividerBlock(),
        textBlock(
          `**📊 ESTADÍSTICAS**\n` +
            `🔥 Racha Actual: **${streak.currentStreak}** días\n` +
            `⭐ Mejor Racha: **${streak.longestStreak}** días\n` +
            `📅 Días Activos: **${streak.totalDaysActive}** días`
        ),
        dividerBlock({ spacing: 1 }),
      ];

      // Mensaje de estado
      if (newDay) {
        if (daysIncreased) {
          blocks.push(
            textBlock(
              `**✅ ¡RACHA INCREMENTADA!**\nHas mantenido tu racha por **${streak.currentStreak}** días seguidos.`
            )
          );
        } else {
          blocks.push(
            textBlock(
              `**⚠️ RACHA REINICIADA**\nPasó más de un día sin actividad. Tu racha se ha reiniciado.`
            )
          );
        }

        // Mostrar recompensas
        if (rewards) {
          let rewardsText = "**🎁 RECOMPENSA DEL DÍA**\n";
          if (rewards.coins)
            rewardsText += `💰 **${rewards.coins.toLocaleString()}** monedas\n`;
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

          blocks.push(dividerBlock({ spacing: 1 }));
          blocks.push(textBlock(rewardsText));
        }
      } else {
        blocks.push(
          textBlock(
            `**ℹ️ YA RECLAMASTE HOY**\nYa has reclamado tu recompensa diaria. Vuelve mañana para continuar tu racha.`
          )
        );
      }

      // Próximos hitos
      const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
      const nextMilestone = milestones.find((m) => m > streak.currentStreak);

      if (nextMilestone) {
        const remaining = nextMilestone - streak.currentStreak;
        blocks.push(dividerBlock({ spacing: 1 }));
        blocks.push(
          textBlock(
            `**🎯 PRÓXIMO HITO**\nFaltan **${remaining}** días para alcanzar el día **${nextMilestone}**`
          )
        );
      }

      const display = buildDisplay(
        daysIncreased ? 0x00ff00 : 0xffa500,
        blocks
      );

      await sendDisplayReply(message, display);
    } catch (error) {
      console.error("Error en comando racha:", error);
      await message.reply("❌ Error al obtener tu racha diaria.");
    }
  },
};
