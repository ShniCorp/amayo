import { queues } from "../../../commands/messages/music/play";

export default {
  customId: "music_skip",
  run: async (interaction: any, client: any) => {
    try {
      const member = interaction.member;
      const guild = interaction.guild!;

      // Check if user is in voice channel
      if (!member.voice.channel) {
        await interaction.reply({
          content: "❌ Debes estar en un canal de voz para usar este comando.",
          ephemeral: true,
        });
        return;
      }

      // Get player
      const player = client.music.players.get(guild.id);
      if (!player) {
        await interaction.reply({
          content: "❌ No hay nada reproduciéndose en este servidor.",
          ephemeral: true,
        });
        return;
      }

      // Check if user is in same voice channel as bot
      const botVoiceChannel = guild.members.cache.get(client.user!.id)?.voice
        .channelId;
      if (botVoiceChannel !== member.voice.channel.id) {
        await interaction.reply({
          content: "❌ Debes estar en el mismo canal de voz que el bot.",
          ephemeral: true,
        });
        return;
      }

      // Get queue to check if there's a next song
      const queue = queues.get(guild.id);
      const nextSong = queue && queue.length > 0;

      // Stop current track (will trigger 'end' event and play next)
      player.stopTrack();

      await interaction.reply({
        content: nextSong
          ? "⏭️ Canción saltada. Reproduciendo siguiente..."
          : "⏭️ Canción saltada. Cola vacía.",
        ephemeral: true,
      });
    } catch (error: any) {
      console.error("Error en music_skip button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        ephemeral: true,
      });
    }
  },
};
