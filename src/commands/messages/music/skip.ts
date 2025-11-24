import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { MusicHistoryService } from "../../../core/services/MusicHistoryService";
import { queues } from "./play";

export const command: CommandMessage = {
  name: "skip",
  type: "message",
  aliases: ["s", "next", "saltar"],
  cooldown: 2,
  description: "Salta la canción actual y reproduce la siguiente",
  category: "Música",
  usage: "skip",
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

    try {
      const currentTrack = player.track;

      if (currentTrack) {
        await MusicHistoryService.trackSongEnd(
          message.author.id,
          message.guild!.id,
          true,
          "manual"
        );
      }

      const queue = queues.get(message.guild!.id);

      if (!queue || queue.length === 0) {
        await message.reply("⏭️ No hay más canciones en la cola.");
        player.stopTrack();
        return;
      }

      const trackInfo =
        typeof currentTrack === "string"
          ? "Desconocida"
          : (currentTrack as any)?.info?.title || "Desconocida";
      await message.reply(`⏭️ Canción saltada: **${trackInfo}**`);

      player.stopTrack();
    } catch (error: any) {
      console.error("Error en comando skip:", error);
      await message.reply(
        `❌ Error al saltar: ${error.message || "Error desconocido"}`
      );
    }
  },
};
