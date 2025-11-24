import { LikeService } from "../../../core/services/LikeService";
import { PlaylistService } from "../../../core/services/PlaylistService";

export default {
  customId: "music_like",
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

      // Like the track
      const result = await LikeService.likeTrack(userId, guildId, {
        trackId,
        title: trackTitle,
        author: trackAuthor,
        duration: 0,
        thumbnail: "",
      });

      if (result.alreadyLiked) {
        await interaction.reply({
          content: "💙 Ya te gusta esta canción!",
          flags: 64,
        });
      } else {
        const playlist = await PlaylistService.getOrCreateDefaultPlaylist(
          userId,
          guildId
        );

        await interaction.reply({
          content: `❤️ **Me gusta agregado!**\nGuardado en tu playlist "${playlist.name}"`,
          flags: 64,
        });
      }
    } catch (error: any) {
      console.error("Error en music_like button:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        flags: 64,
      });
    }
  },
};
