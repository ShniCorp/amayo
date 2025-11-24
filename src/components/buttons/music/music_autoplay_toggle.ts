import { isAutoplayEnabled } from "../../../commands/messages/music/autoplay";

// Import the shared autoplay state
let autoplayEnabled: Map<string, boolean>;
// Dynamic import to get the autoplay state
import("../../../commands/messages/music/autoplay").then((module) => {
  autoplayEnabled = (module as any).autoplayEnabled;
});

export default {
  customId: "music_autoplay_toggle",
  run: async (interaction: any, client: any) => {
    try {
      const guildId = interaction.guild!.id;
      const member = interaction.member;

      // Check if user is in voice channel
      if (!member.voice.channel) {
        await interaction.reply({
          content: "❌ Debes estar en un canal de voz para usar este comando.",
          flags: 64, // ephemeral
        });
        return;
      }

      // Get player
      const player = client.music.players.get(guildId);
      if (!player) {
        await interaction.reply({
          content: "❌ No hay nada reproduciéndose en este servidor.",
          flags: 64,
        });
        return;
      }

      // Check if user is in same voice channel as bot
      const botVoiceChannel = interaction.guild!.members.cache.get(
        client.user!.id
      )?.voice.channelId;
      if (botVoiceChannel !== member.voice.channel.id) {
        await interaction.reply({
          content: "❌ Debes estar en el mismo canal de voz que el bot.",
          flags: 64,
        });
        return;
      }

      // Import and toggle autoplay using the shared module
      const { toggleAutoplay } = await import(
        "../../../commands/messages/music/autoplay"
      );
      const newStatus = toggleAutoplay(guildId);

      await interaction.reply({
        content: newStatus
          ? "🎲 **Autoplay activado!**\n🎵 El bot agregará canciones automáticamente basadas en tu historial de escucha.\n💡 Mientras más escuches, mejores serán las recomendaciones."
          : "🎲 **Autoplay desactivado!**\nEl bot se desconectará cuando termine la cola.",
        flags: 64,
      });
    } catch (error: any) {
      console.error("Error en music_autoplay_toggle button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        flags: 64,
      });
    }
  },
};
