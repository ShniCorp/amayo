import { PlaylistService } from "../../core/services/PlaylistService";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

export default {
  customId: "music_save_select",
  run: async (interaction: any, client: any) => {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild!.id;
      const selectedValue = interaction.values[0];

      // Extract trackIdHash from custom_id (format: music_save_select:trackIdHash)
      const customIdParts = interaction.customId.split(":");
      const trackIdHash = customIdParts[1] || "";

      // Get track info from the message components
      const message = interaction.message;
      const containers = message.components || [];

      // Extract track info from the second container's text
      let trackTitle = "Unknown";
      let trackAuthor = "Unknown";

      if (containers.length >= 2) {
        const secondContainer = containers[1];
        if (secondContainer.components) {
          // Find the text component with track info (format: "Title - Author")
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

      if (selectedValue === "create_new") {
        // Show modal to create new playlist
        const modal = new ModalBuilder()
          .setCustomId(`music_create_playlist:${trackIdHash}`)
          .setTitle("Crear nueva playlist");

        const nameInput = new TextInputBuilder()
          .setCustomId("playlist_name")
          .setLabel("Nombre de la playlist")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ej: Mis favoritas, Workout, Chill vibes...")
          .setRequired(true)
          .setMaxLength(50);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
          nameInput
        );
        modal.addComponents(row);

        await interaction.showModal(modal);
        return;
      }

      // Add track to selected playlist
      const result = await PlaylistService.addTrackToPlaylist(selectedValue, {
        trackId: trackIdHash,
        title: trackTitle,
        author: trackAuthor,
        duration: 0,
        thumbnail: "",
      });

      if (result.added) {
        const playlist = await PlaylistService.getPlaylist(selectedValue);
        await interaction.reply({
          content: `✅ **Guardado en "${playlist?.name}"**\n🎵 ${trackTitle} - ${trackAuthor}`,
          flags: 64,
        });
      } else {
        await interaction.reply({
          content: "❌ Esta canción ya está en la playlist seleccionada.",
          flags: 64,
        });
      }
    } catch (error: any) {
      console.error("Error en music_save_select:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message || "Error desconocido"}`,
        flags: 64,
      });
    }
  },
};
