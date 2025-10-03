import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { buildLeaderboardPanel } from '../../commands/messages/alliaces/leaderboard';

export default {
  customId: 'ld_refresh',
  run: async (interaction: ButtonInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Solo disponible en servidores.', flags: MessageFlags.Ephemeral });
    }
    try {
      await interaction.deferUpdate();
      // Reusar el builder esperando un objeto con guild y author
      const fakeMessage: any = { guild: interaction.guild, author: interaction.user };
      const panel = await buildLeaderboardPanel(fakeMessage);
      await interaction.message.edit({ components: [panel] });
    } catch (e) {
      // @ts-ignore
        logger.error('Error refrescando leaderboard:', e);
      if (!interaction.deferred && !interaction.replied)
        await interaction.reply({ content: '❌ Error refrescando leaderboard.', flags: MessageFlags.Ephemeral });
    }
  }
};
