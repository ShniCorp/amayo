import { PlaylistService } from "../../core/services/PlaylistService";

export default {
  customId: "music_create_playlist",
  run: async (interaction: any, client: any) => {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild!.id;

      // Extract trackIdHash from custom_id (format: music_create_playlist:trackIdHash)
      const customIdParts = interaction.customId.split(":");
      const trackIdHash = customIdParts[1] || "";

      // Get track info from the original message
      const message = interaction.message;
      const containers = message?.components || [];

      let trackTitle = "Unknown";
      let trackAuthor = "Unknown";

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

      // Get playlist name from modal input
      const playlistName =
        interaction.fields.getTextInputValue("playlist_name");

      if (!playlistName || playlistName.trim().length === 0) {
        await interaction.reply({
          content: "❌ El nombre de la playlist no puede estar vacío.",
          flags: 64,
        });
        return;
      }

      // Create new playlist
      const newPlaylist = await PlaylistService.createPlaylist(
        userId,
        guildId,
        playlistName.trim()
      );

      // Add the current track to the new playlist
      await PlaylistService.addTrackToPlaylist(newPlaylist.id, {
        trackId: trackIdHash,
        title: trackTitle,
        author: trackAuthor,
        duration: 0,
        thumbnail: "",
      });

      await interaction.reply({
        content: `✨ **Playlist creada: "${playlistName}"**\n✅ ${trackTitle} - ${trackAuthor} agregado a la playlist.`,
        flags: 64,
      });
    } catch (error: any) {
      console.error("Error en music_create_playlist modal:", error);
      await interaction.reply({
        content: `❌ Error al crear playlist: ${
          error.message || "Error desconocido"
        }`,
        flags: 64,
      });
    }
  },
};
