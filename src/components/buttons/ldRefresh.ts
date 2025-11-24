import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { buildLeaderboardPanel } from '../../commands/messages/alliaces/leaderboard';
import { hasManageGuildOrStaff } from "../../core/lib/permissions";
import { prisma } from "../../core/database/prisma";

export default {
  customId: 'ld_refresh',
  run: async (interaction: ButtonInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Solo disponible en servidores.', flags: MessageFlags.Ephemeral });
    }
    try {
      await interaction.deferUpdate();

      // Verificar si el usuario es admin o staff
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const isAdmin = await hasManageGuildOrStaff(member, interaction.guild.id, prisma);

      // Reusar el builder esperando un objeto con guild y author
      const fakeMessage: any = { guild: interaction.guild, author: interaction.user };
      const panel = await buildLeaderboardPanel(fakeMessage, isAdmin);
      await interaction.message.edit({ components: [panel] });
    } catch (e) {
      // @ts-ignore
        logger.error('Error refrescando leaderboard:', e);
      if (!interaction.deferred && !interaction.replied)
        await interaction.reply({ content: '❌ Error refrescando leaderboard.', flags: MessageFlags.Ephemeral });
    }
  }
};
