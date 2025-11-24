import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";

export const command: CommandMessage = {
  name: "volume",
  type: "message",
  aliases: ["vol", "v", "volumen"],
  cooldown: 2,
  description: "Ajusta el volumen de reproducción (0-100)",
  category: "Música",
  usage: "volume <0-100>",
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

    if (!args.length) {
      const currentVolume = (player.filters?.volume || 1) * 100;
      await message.reply(
        `🔊 Volumen actual: **${Math.round(currentVolume)}%**`
      );
      return;
    }

    const volume = parseInt(args[0]);

    if (isNaN(volume) || volume < 0 || volume > 100) {
      await message.reply("❌ El volumen debe ser un número entre 0 y 100.");
      return;
    }

    try {
      await player.setGlobalVolume(volume);

      if (volume === 0) {
        await message.reply("🔇 Volumen silenciado.");
      } else if (volume <= 30) {
        await message.reply(`🔉 Volumen ajustado a **${volume}%**`);
      } else if (volume <= 70) {
        await message.reply(`🔊 Volumen ajustado a **${volume}%**`);
      } else {
        await message.reply(`📢 Volumen ajustado a **${volume}%**`);
      }
    } catch (error: any) {
      console.error("Error en comando volume:", error);
      await message.reply(
        `❌ Error al ajustar volumen: ${error.message || "Error desconocido"}`
      );
    }
  },
};
