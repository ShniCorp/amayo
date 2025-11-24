import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { getInventoryEntry } from "../../../game/economy/service";
import {
  buildDisplay,
  textBlock,
  dividerBlock,
} from "../../../core/lib/componentsV2";
import { formatItemLabel, sendDisplayReply } from "./_helpers";

// Inspecciona la durabilidad de una herramienta (no apilable) mostrando barra.

function parseJSON<T>(v: unknown): T | null {
  if (!v || typeof v !== "object") return null;
  return v as T;
}

export const command: CommandMessage = {
  name: "tool-info",
  type: "message",
  aliases: ["toolinfo", "herramienta", "inspectar", "inspeccionar"],
  cooldown: 3,
  description: "Muestra la durabilidad restante de una herramienta por su key.",
  usage: "tool-info <itemKey>",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const key = args[0];
    if (!key) {
      await message.reply(
        "⚠️ Debes indicar la key del item. Ej: `tool-info tool.pickaxe.basic`"
      );
      return;
    }
    try {
      const { item, entry } = await getInventoryEntry(userId, guildId, key);
      if (!entry || !item) {
        await message.reply("❌ No tienes este ítem en tu inventario.");
        return;
      }
      const props = parseJSON<any>(item.props) ?? {};
      const breakable = props.breakable;
      if (!breakable || breakable.enabled === false) {
        await message.reply("ℹ️ Este ítem no tiene durabilidad activa.");
        return;
      }
      if (item.stackable) {
        await message.reply(`ℹ️ Ítem apilable. Cantidad: ${entry.quantity}`);
        return;
      }
      const state = parseJSON<any>(entry.state) ?? {};
      const instances: any[] = Array.isArray(state.instances)
        ? state.instances
        : [];
      const max = Math.max(1, breakable.maxDurability ?? 1);
      const label = formatItemLabel(
        { key: item.key, name: item.name, icon: item.icon },
        { fallbackIcon: "🛠️" }
      );
      const renderBar = (cur: number) => {
        const ratio = cur / max;
        const totalSegs = 20;
        const filled = Math.round(ratio * totalSegs);
        return Array.from({ length: totalSegs })
          .map((_, i) => (i < filled ? "█" : "░"))
          .join("");
      };
      const durLines = instances.length
        ? instances
            .map((inst, idx) => {
              const cur = Math.min(Math.max(0, inst?.durability ?? max), max);
              return `#${idx + 1} [${renderBar(cur)}] ${cur}/${max}`;
            })
            .join("\n")
        : "(sin instancias)";
      const blocks = [
        textBlock("# 🔍 Herramienta"),
        dividerBlock(),
        textBlock(`**Item:** ${label}`),
        textBlock(`Instancias: ${instances.length}`),
        textBlock(durLines),
      ];
      const accent = 0x95a5a6;
      const display = buildDisplay(accent, blocks);
      await sendDisplayReply(message, display);
    } catch (e: any) {
      await message.reply(`❌ No se pudo inspeccionar: ${e?.message ?? e}`);
    }
  },
};
