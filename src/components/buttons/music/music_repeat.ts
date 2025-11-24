export default {
  customId: "music_repeat",
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

      // Toggle repeat mode (this is a simple implementation - you might want to store this)
      // For now, this will just restart the current track
      const currentTrack = player.track;
      if (currentTrack) {
        await player.playTrack({ encodedTrack: currentTrack });
        await interaction.reply({
          content: "🔁 **Repitiendo canción actual...**",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ No hay ninguna canción reproduciéndose actualmente.",
          ephemeral: true,
        });
      }
    } catch (error: any) {
      console.error("Error en music_repeat button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        ephemeral: true,
      });
    }
  },
};
