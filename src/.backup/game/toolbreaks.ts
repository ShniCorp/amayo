import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { getToolBreaks } from "../../../game/lib/toolBreakLog";
import {
  buildDisplay,
  dividerBlock,
  textBlock,
} from "../../../core/lib/componentsV2";

export const command: CommandMessage = {
  name: "tool-breaks",
  type: "message",
  aliases: ["rupturas", "breaks"],
  cooldown: 4,
  description:
    "Muestra las últimas rupturas de herramientas registradas (memoria).",
  usage: "tool-breaks [limite=10]",
  run: async (message, args, _client: Amayo) => {
    const guildId = message.guild!.id;
    const limit = Math.min(50, Math.max(1, parseInt(args[0] || "10")));
    const events = getToolBreaks(limit, guildId);

    if (!events.length) {
      await message.reply(
        "No se han registrado rupturas de herramientas todavía."
      );
      return;
    }

    const blocks = [
      textBlock(`# 🧩 Rupturas de Herramienta (${events.length})`),
      dividerBlock(),
    ];

    for (const ev of events) {
      const when = new Date(ev.ts).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      blocks.push(
        textBlock(`• ${when} • \
Tool: \
\`${ev.toolKey}\` • ${
          ev.brokenInstance ? "Instancia rota" : "Agotada totalmente"
        } • Restantes: ${ev.instancesRemaining} • User: <@${ev.userId}>`)
      );
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
    }

    const display = buildDisplay(0x444444, blocks);
    await message.reply({ content: "", components: [display] });
  },
};
