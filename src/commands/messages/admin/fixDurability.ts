import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";

export const command: CommandMessage = {
  name: "fix-durability",
  type: "message",
  aliases: ["fixdur", "repair-tools"],
  description:
    "Regenera la durabilidad de items sin inicializar (migración para items antiguos)",
  usage: "fix-durability [@usuario]",
  run: async (message, args, _client: Amayo) => {
    const guildId = message.guild!.id;
    const mention = message.mentions.users.first();
    const targetUserId = mention?.id || args[0] || message.author.id;

    try {
      const entries = await prisma.inventoryEntry.findMany({
        where: { userId: targetUserId, guildId },
        include: { item: true },
      });

      let fixed = 0;
      let skipped = 0;

      for (const entry of entries) {
        // Solo items no apilables
        if (entry.item.stackable) {
          skipped++;
          continue;
        }

        const props = (entry.item.props as any) ?? {};
        const breakable = props.breakable;

        // Sin durabilidad configurada o deshabilitada
        if (!breakable || breakable.enabled === false) {
          skipped++;
          continue;
        }

        const maxDurability = Math.max(1, breakable.maxDurability ?? 100);
        const state = (entry.state as any) ?? {};
        const instances = Array.isArray(state.instances) ? state.instances : [];

        let needsFix = false;
        const regenerated = instances.map((inst: any) => {
          if (
            inst.durability == null ||
            typeof inst.durability !== "number" ||
            inst.durability <= 0
          ) {
            needsFix = true;
            return { ...inst, durability: maxDurability };
          }
          return inst;
        });

        // Si no hay instancias pero quantity > 0, crearlas
        if (regenerated.length === 0 && entry.quantity > 0) {
          for (let i = 0; i < entry.quantity; i++) {
            regenerated.push({ durability: maxDurability });
          }
          needsFix = true;
        }

        if (needsFix) {
          await prisma.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              state: { ...state, instances: regenerated } as any,
              quantity: regenerated.length,
            },
          });
          fixed++;
        } else {
          skipped++;
        }
      }

      if (fixed === 0) {
        await message.reply(
          `✅ Todos los items de <@${targetUserId}> ya tienen durabilidad correcta (${skipped} items revisados).`
        );
      } else {
        await message.reply(
          `🔧 Regeneradas **${fixed}** herramientas para <@${targetUserId}>. (${skipped} items no requerían fix)`
        );
      }
    } catch (e: any) {
      await message.reply(
        `❌ Error al regenerar durabilidad: ${e?.message ?? e}`
      );
    }
  },
};
