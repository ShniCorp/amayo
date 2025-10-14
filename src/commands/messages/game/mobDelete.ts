import {
  Message,
  MessageFlags,
  MessageComponentInteraction,
  ButtonInteraction,
  TextBasedChannel,
} from "discord.js";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type { CommandMessage } from "../../../core/types/commands";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import logger from "../../../core/lib/logger";
import type Amayo from "../../../core/client";
import { promptKeySelection } from "./_helpers";

export const command: CommandMessage = {
  name: "mob-eliminar",
  type: "message",
  aliases: ["eliminar-mob", "mobdelete"],
  cooldown: 10,
  description: "Elimina un mob del servidor (requiere permisos de staff)",
  category: "Minijuegos",
  usage: "mob-eliminar",
  run: async (message: Message, _args: string[], client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      client.prisma
    );
    if (!allowed) {
      await channel.send({
        content: undefined,
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0xff0000,
            components: [
              {
                type: 10,
                content:
                  "❌ No tienes permisos de ManageGuild ni rol de staff.",
              },
            ],
          },
        ],
      });
      return;
    }

    const guildId = message.guild!.id;
    try {
      const { listMobsWithRows } = await import("../../../game/mobs/admin.js");
      const all = await listMobsWithRows();
      const localEntries = all.filter(
        (e: any) => e.guildId === guildId && e.id
      );
      const selection = await promptKeySelection(message, {
        entries: localEntries,
        customIdPrefix: "mob_delete",
        title: "Selecciona un mob para eliminar",
        emptyText: "⚠️ No hay mobs locales configurados.",
        placeholder: "Elige un mob…",
        filterHint: "Filtra por nombre, key o categoría.",
        getOption: (entry: any) => ({
          value: entry.id ?? entry.def.key,
          label: entry.def.name ?? entry.def.key,
          description: [entry.def?.category ?? "Sin categoría", entry.def.key]
            .filter(Boolean)
            .join(" • "),
        }),
      });

      if (!selection.entry) return;
      const entry = selection.entry as any;

      // confirm
      const confirmMsg = await channel.send({
        content: `¿Eliminar mob \`${
          entry.def.name || entry.def.key
        }\`? Esta acción es irreversible.`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Danger,
                label: "Confirmar",
                custom_id: "confirm_delete",
              },
              {
                type: 2,
                style: ButtonStyle.Secondary,
                label: "Cancelar",
                custom_id: "cancel_delete",
              },
            ],
          },
        ],
      });

      const collector = confirmMsg.createMessageComponentCollector({
        time: 60_000,
        filter: (i) => i.user.id === message.author.id,
      });
      collector.on("collect", async (i: MessageComponentInteraction) => {
        try {
          if (!i.isButton()) return;
          if (i.customId === "cancel_delete") {
            await i.update({ content: "❌ Cancelado.", components: [] });
            collector.stop("cancel");
            return;
          }
          if (i.customId === "confirm_delete") {
            await i.deferUpdate();
            try {
              const { deleteMob } = await import("../../../game/mobs/admin.js");
              const ok = await deleteMob(entry.def.key);
              if (ok) {
                await i.followUp({
                  content: "✅ Mob eliminado.",
                  flags: MessageFlags.Ephemeral,
                });
                try {
                  await confirmMsg.edit({
                    content: "✅ Eliminado.",
                    components: [],
                  });
                } catch {}
              } else {
                // fallback to direct Prisma delete by id
                await client.prisma.mob.delete({ where: { id: entry.id } });
                await i.followUp({
                  content: "✅ Mob eliminado (fallback).",
                  flags: MessageFlags.Ephemeral,
                });
                try {
                  await confirmMsg.edit({
                    content: "✅ Eliminado (fallback).",
                    components: [],
                  });
                } catch {}
              }
            } catch (e: any) {
              // If FK prevents deletion, inform user and suggest running cleanup script
              const msg = (e && e.message) || String(e);
              await i.followUp({
                content: `❌ No se pudo eliminar: ${msg}`,
                flags: MessageFlags.Ephemeral,
              });
            }
            collector.stop("done");
            return;
          }
        } catch (err) {
          logger.error({ err }, "mob-eliminar");
        }
      });
      collector.on("end", async (_c, reason) => {
        if (reason === "time") {
          try {
            await confirmMsg.edit({
              content: "⏰ Confirmación expirada.",
              components: [],
            });
          } catch {}
        }
      });
    } catch (e) {
      logger.error({ e }, "mob-eliminar");
      await channel.send({
        content: "❌ Error al intentar eliminar mob.",
        flags: 32768,
      });
    }
  },
};
