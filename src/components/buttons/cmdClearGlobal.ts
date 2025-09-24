import {ButtonInteraction, MessageFlags} from 'discord.js';
import {clearGlobalCommands} from '../../core/api/discordAPI';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_clear_global',
  run: async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.', flags: MessageFlags.Ephemeral });
    }
    if (running) {
      return interaction.reply({ content: '⏳ Limpieza GLOBAL en progreso, espera.', ephemeral: true });
    }
    running = true;
    try {
      await interaction.deferReply({ ephemeral: true });
      await clearGlobalCommands();
      await interaction.editReply('🧹 Comandos GLOBAL eliminados.');
    } catch (e: any) {
      console.error('Error limpiando comandos globales:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error limpiando comandos globales.');
      } else {
        await interaction.reply({ content: '❌ Error limpiando comandos globales.', ephemeral: true });
      }
    } finally {
      running = false;
    }
  }
};

