import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";

export const command: CommandMessage = {
  name: "debug-inv",
  type: "message",
  aliases: ["dinv"],
  cooldown: 0,
  category: "Admin",
  description: "Muestra información detallada del inventario para debug.",
  usage: "debug-inv [@user]",
  run: async (message, args, _client: Amayo) => {
    if (message.author.id !== process.env.OWNER_ID) {
      await message.reply("❌ Solo el owner puede usar este comando.");
      return;
    }

    const targetUser = message.mentions.users.first() ?? message.author;
    const userId = targetUser.id;
    const guildId = message.guild!.id;

    const entries = await prisma.inventoryEntry.findMany({
      where: { userId, guildId },
      include: { item: true },
    });

    let output = `🔍 **Inventario de <@${userId}>**\n\n`;

    for (const entry of entries) {
      const item = entry.item;
      const state = entry.state as any;
      const instances = state?.instances ?? [];
      const props = item.props as any;

      output += `**${item.name}** (\`${item.key}\`)\n`;
      output += `• Stackable: ${item.stackable}\n`;
      output += `• Quantity: ${entry.quantity}\n`;
      output += `• Instances: ${instances.length}\n`;

      if (props?.breakable) {
        output += `• Breakable: enabled=${
          props.breakable.enabled !== false
        }, max=${props.breakable.maxDurability}\n`;
      }

      if (instances.length > 0) {
        instances.forEach((inst: any, idx: number) => {
          output += `  └ [${idx}] dur: ${inst.durability ?? "N/A"}\n`;
        });
      }

      if (!item.stackable && entry.quantity > 1 && instances.length === 0) {
        output += `⚠️ **CORRUPTO**: Non-stackable con qty>1 sin instances\n`;
      }

      output += "\n";
    }

    // Verificar equipo
    const equipment = await prisma.playerEquipment.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });

    if (equipment) {
      output += `🧰 **Equipo:**\n`;
      if (equipment.weaponItemId) {
        const weapon = await prisma.economyItem.findUnique({
          where: { id: equipment.weaponItemId },
        });
        output += `• Arma: ${weapon?.name ?? "Desconocida"}\n`;
      } else {
        output += `• Arma: ❌ NINGUNA\n`;
      }

      if (equipment.armorItemId) {
        const armor = await prisma.economyItem.findUnique({
          where: { id: equipment.armorItemId },
        });
        output += `• Armadura: ${armor?.name ?? "Desconocida"}\n`;
      }

      if (equipment.capeItemId) {
        const cape = await prisma.economyItem.findUnique({
          where: { id: equipment.capeItemId },
        });
        output += `• Capa: ${cape?.name ?? "Desconocida"}\n`;
      }
    }

    // Dividir en chunks si es muy largo
    const chunks = output.match(/[\s\S]{1,1900}/g) ?? [output];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  },
};
