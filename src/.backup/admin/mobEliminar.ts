import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import { prisma } from "../../../core/database/prisma";

export const command: CommandMessage = {
  name: "mob-eliminar",
  type: "message",
  aliases: ["eliminar-mob", "mob-delete"],
  cooldown: 5,
  description: "Eliminar un mob del servidor",
  usage: "mob-eliminar <key>",
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      prisma
    );
    if (!allowed) {
      await message.reply(
        "❌ No tienes permisos de ManageGuild ni rol de staff."
      );
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply(
        "Uso: `!mob-eliminar <key>`\nEjemplo: `!mob-eliminar mob.goblin`"
      );
      return;
    }

    // Use admin.deleteMob to centralize logic
    const { deleteMob } = await import("../../../game/mobs/admin.js");
    const deleted = await deleteMob(key);
    if (!deleted) {
      await message.reply(
        `❌ No se encontró el mob local con key ${key} en este servidor.`
      );
      return;
    }
    await message.reply(`✅ Mob ${key} eliminado exitosamente.`);
  },
};
