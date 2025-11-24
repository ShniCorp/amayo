import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";

export const command: CommandMessage = {
  name: "stop",
  type: "message",
  aliases: ["disconnect", "dc", "leave", "parar"],
  cooldown: 3,
  description: "Detiene la reproducción y desconecta el bot del canal de voz",
  category: "Música",
  usage: "stop",
  run: async (message, args, client: Amayo) => {
    // Verificar que el usuario esté en un canal de voz
    if (!message.member?.voice.channel) {
      await message.reply(
        "❌ Debes estar en un canal de voz para usar este comando."
      );
      return;
    }

    // Verificar que exista un reproductor activo
    const player = client.music.players.get(message.guild!.id);
    if (!player) {
      await message.reply("❌ No hay nada reproduciéndose en este servidor.");
      return;
    }

    // Verificar que el bot esté en el mismo canal de voz
    if (player.channelId !== message.member.voice.channel.id) {
      await message.reply(
        "❌ Debes estar en el mismo canal de voz que el bot."
      );
      return;
    }

    try {
      // Destruir el reproductor (limpia la cola y desconecta)
      player.connection.disconnect();
      client.music.players.delete(message.guild!.id);
      await message.reply(
        "⏹️ Reproducción detenida y desconectado del canal de voz."
      );
    } catch (error: any) {
      console.error("Error en comando stop:", error);
      await message.reply(
        `❌ Error al detener: ${error.message || "Error desconocido"}`
      );
    }
  },
};
