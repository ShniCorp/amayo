import { queues } from "../../../commands/messages/music/play";

export default {
  customId: "music_shuffle",
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

      // Get queue
      const queue = queues.get(guild.id);

      if (!queue || queue.length === 0) {
        await interaction.reply({
          content: "❌ No hay canciones en la cola para mezclar.",
          ephemeral: true,
        });
        return;
      }

      // Shuffle using Fisher-Yates algorithm
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }

      await interaction.reply({
        content: `🔀 **Cola mezclada!** ${queue.length} cancion${
          queue.length === 1 ? "" : "es"
        } reorganizadas aleatoriamente.`,
        ephemeral: true,
      });
    } catch (error: any) {
      console.error("Error en music_shuffle button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        ephemeral: true,
      });
    }
  },
};
