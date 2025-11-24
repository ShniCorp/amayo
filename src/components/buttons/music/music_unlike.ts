import { LikeService } from "../../../core/services/LikeService";
import { PlaylistService } from "../../../core/services/PlaylistService";

export default {
  customId: "music_unlike",
  run: async (interaction: any, client: any) => {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild!.id;

      // Get track info from ComponentsV2 message
      const message = interaction.message;
      const containers = message.components || [];

      let trackTitle = "Unknown";
      let trackAuthor = "Unknown";

      // Extract from second container
      if (containers.length >= 2) {
        const secondContainer = containers[1];
        if (secondContainer.components) {
          const textComponent = secondContainer.components.find(
            (c: any) => c.type === 10 && c.content && c.content.includes(" - ")
          );
          if (textComponent?.content) {
            const parts = textComponent.content.split(" - ");
            if (parts.length >= 2) {
              trackTitle = parts[0].trim();
              trackAuthor = parts[1].trim();
            }
          }
        }
      }

      const trackId = Buffer.from(`${trackTitle}:${trackAuthor}`)
        .toString("base64")
        .substring(0, 50);

      // Unlike the track
      const success = await LikeService.unlikeTrack(userId, guildId, trackId);

      if (success) {
        await interaction.reply({
          content: `💔 **Like removido**\n${trackTitle} - ${trackAuthor}`,
          flags: 64, // ephemeral
        });
      } else {
        await interaction.reply({
          content: "❌ No pudimos remover el like de esta canción.",
          flags: 64,
        });
      }
    } catch (error: any) {
      console.error("Error en music_unlike button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        flags: 64,
      });
    }
  },
};
