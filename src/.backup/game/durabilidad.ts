import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";

type ItemProps = {
  tool?: { type: string; tier?: number };
  damage?: number;
  defense?: number;
  maxHpBonus?: number;
  breakable?: {
    enabled?: boolean;
    maxDurability?: number;
    durabilityPerUse?: number;
  };
  [k: string]: unknown;
};

type InventoryState = {
  instances?: Array<{
    durability?: number;
    [k: string]: unknown;
  }>;
  [k: string]: unknown;
};

export const command: CommandMessage = {
  name: "durabilidad",
  type: "message",
  aliases: ["dur", "durability"],
  cooldown: 3,
  category: "Juegos",
  description:
    "Muestra la durabilidad de tus items no-apilables (herramientas, armas, armaduras).",
  usage: "durabilidad",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;

    const entries = await prisma.inventoryEntry.findMany({
      where: { userId, guildId },
      include: { item: true },
    });

    const durableItems = entries.filter((e) => {
      const props = e.item.props as ItemProps;
      return (
        !e.item.stackable &&
        props.breakable &&
        props.breakable.enabled !== false
      );
    });

    if (durableItems.length === 0) {
      await message.reply(
        "📦 No tienes items con durabilidad en tu inventario."
      );
      return;
    }

    let output = `🔧 **Durabilidad de Items**\n\n`;

    for (const entry of durableItems) {
      const item = entry.item;
      const props = item.props as ItemProps;
      const state = entry.state as InventoryState;
      const instances = state?.instances ?? [];
      const maxDur = props.breakable?.maxDurability ?? 100;

      output += `**${item.name}** (\`${item.key}\`)\n`;

      if (instances.length === 0) {
        output += `⚠️ **CORRUPTO**: Quantity=${entry.quantity} pero sin instances\n`;
        output += `• Usa \`!reset-inventory\` para reparar\n\n`;
        continue;
      }

      // Mostrar cada instancia con su durabilidad
      instances.forEach((inst, idx) => {
        const dur = inst.durability ?? 0;
        const percentage = Math.round((dur / maxDur) * 100);
        const bars = Math.floor(percentage / 10);
        const barDisplay = "█".repeat(bars) + "░".repeat(10 - bars);

        output += `  [${
          idx + 1
        }] ${barDisplay} ${dur}/${maxDur} (${percentage}%)\n`;
      });

      output += `• Total: ${instances.length} unidad(es)\n\n`;
    }

    // Dividir en chunks si es muy largo
    const chunks = output.match(/[\s\S]{1,1900}/g) ?? [output];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  },
};
