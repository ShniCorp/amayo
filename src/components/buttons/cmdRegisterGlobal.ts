import type { ButtonInteraction } from 'discord.js';
import { registeringGlobalCommands } from '../../core/api/discordAPI';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_reg_global',
  run: async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.', ephemeral: true });
    }
    if (running) {
      return interaction.reply({ content: '⏳ Ya hay un registro GLOBAL en curso, espera.', ephemeral: true });
    }
    running = true;
    try {
      await interaction.deferReply({ ephemeral: true });
      await registeringGlobalCommands();
      await interaction.editReply('✅ Comandos GLOBAL registrados (propagación puede tardar).');
    } catch (e: any) {
      console.error('Error registrando comandos globales:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error registrando comandos globales.');
      } else {
        await interaction.reply({ content: '❌ Error registrando comandos globales.', ephemeral: true });
      }
    } finally {
      running = false;
    }
  }
};

