import type { ButtonInteraction } from 'discord.js';
import { clearAllCommands } from '../../core/api/discordAPI';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_clear_guild',
  run: async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }
    if (running) {
      return interaction.reply({ content: '⏳ Limpieza GUILD en progreso, espera.', ephemeral: true });
    }
    running = true;
    try {
      await interaction.deferReply({ ephemeral: true });
      await clearAllCommands();
      await interaction.editReply('🧹 Comandos de GUILD eliminados.');
    } catch (e: any) {
      console.error('Error limpiando comandos guild:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error limpiando comandos de guild.');
      } else {
        await interaction.reply({ content: '❌ Error limpiando comandos de guild.', ephemeral: true });
      }
    } finally {
      running = false;
    }
  }
};

