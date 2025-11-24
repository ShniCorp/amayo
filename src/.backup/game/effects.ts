import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import {
  getActiveStatusEffects,
  removeStatusEffect,
  clearAllStatusEffects,
} from "../../../game/combat/statusEffectsService";
import { consumeItemByKey } from "../../../game/economy/service";

// Item key que permite purgar efectos. Configurable más adelante.
const PURGE_ITEM_KEY = "potion.purga"; // placeholder

export const command: CommandMessage = {
  name: "efectos",
  aliases: ["effects"],
  type: "message",
  cooldown: 5,
  category: "Economía",
  description:
    "Lista tus efectos de estado activos y permite purgarlos con un ítem de purga.",
  usage: "efectos [purgar|remover <TIPO>|todo]",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const sub = (args[0] || "").toLowerCase();

    if (
      sub === "purgar" ||
      sub === "purga" ||
      sub === "remover" ||
      sub === "remove" ||
      sub === "todo"
    ) {
      // Requiere el item de purga
      try {
        const consume = await consumeItemByKey(
          userId,
          guildId,
          PURGE_ITEM_KEY,
          1
        );
        if (!consume.consumed) {
          await message.reply(
            `Necesitas 1 **${PURGE_ITEM_KEY}** en tu inventario para purgar efectos.`
          );
          return;
        }
      } catch {
        await message.reply(
          `No se pudo consumir el ítem de purga (${PURGE_ITEM_KEY}). Asegúrate de que existe.`
        );
        return;
      }

      // Modo remover tipo específico: efectos remover <TIPO>
      if (sub === "remover" || sub === "remove") {
        const typeArg = args[1];
        if (!typeArg) {
          await message.reply("Debes indicar el tipo: efectos remover FATIGUE");
          return;
        }
        await removeStatusEffect(userId, guildId, typeArg.toUpperCase());
        await message.reply(`Efecto **${typeArg.toUpperCase()}** eliminado.`);
        return;
      }

      // Modo todo
      if (sub === "todo" || sub === "purgar" || sub === "purga") {
        await clearAllStatusEffects(userId, guildId);
        await message.reply("Todos los efectos han sido purgados.");
        return;
      }
    }

    // Listar efectos
    const effects = await getActiveStatusEffects(userId, guildId);
    if (!effects.length) {
      await message.reply("No tienes efectos activos.");
      return;
    }

    const now = Date.now();
    const lines = effects.map((e) => {
      let remain = "permanente";
      if (e.expiresAt) {
        const ms = e.expiresAt.getTime() - now;
        if (ms > 0) {
          const m = Math.floor(ms / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          remain = `${m}m ${s}s`;
        } else remain = "exp";
      }
      const pct = e.magnitude ? ` (${Math.round(e.magnitude * 100)}%)` : "";
      return `• ${e.type}${pct} - ${remain}`;
    });

    await message.reply(
      `**Efectos Activos:**\n${lines.join(
        "\n"
      )}\n\nUsa: efectos purgar | efectos remover <TIPO> | efectos todo (requiere ${PURGE_ITEM_KEY}).`
    );
    return;
  },
};
