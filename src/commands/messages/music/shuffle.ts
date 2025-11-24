import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { queues } from "./play";

export const command: CommandMessage = {
  name: "shuffle",
  type: "message",
  aliases: ["mezclar", "random"],
  cooldown: 3,
  description: "Mezcla aleatoriamente la cola de reproducción",
  category: "Música",
  usage: "shuffle",
  run: async (message, args, client: Amayo) => {
    if (!message.member?.voice.channel) {
      await message.reply(
        "❌ Debes estar en un canal de voz para usar este comando."
      );
      return;
    }

    const player = client.music.players.get(message.guild!.id);
    if (!player) {
      await message.reply("❌ No hay nada reproduciéndose en este servidor.");
      return;
    }

    const botVoiceChannel = message.guild!.members.cache.get(client.user!.id)
      ?.voice.channelId;
    if (botVoiceChannel !== message.member.voice.channel.id) {
      await message.reply(
        "❌ Debes estar en el mismo canal de voz que el bot."
      );
      return;
    }

    const queue = queues.get(message.guild!.id);

    if (!queue || queue.length === 0) {
      await message.reply("❌ No hay canciones en la cola para mezclar.");
      return;
    }

    try {
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }

      await message.reply(
        `🔀 **Cola mezclada!** ${queue.length} canciones reorganizadas aleatoriamente.`
      );
    } catch (error: any) {
      console.error("Error en comando shuffle:", error);
      await message.reply(
        `❌ Error al mezclar: ${error.message || "Error desconocido"}`
      );
    }
  },
};
