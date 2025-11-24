import logger from "../../core/lib/logger";
import {ButtonInteraction, MessageFlags} from 'discord.js';
import {clearGlobalCommands} from '../../core/api/discordAPI';
import type { Button } from '../../core/types/components';
import type Amayo from '../../core/client';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_clear_global',
  run: async (interaction: ButtonInteraction, client: Amayo) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.', flags: MessageFlags.Ephemeral });
    }
    if (running) {
      return interaction.reply({ content: '⏳ Limpieza GLOBAL en progreso, espera.', flags: MessageFlags.Ephemeral });
    }
    running = true;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await clearGlobalCommands();
      await interaction.editReply('🧹 Comandos GLOBAL eliminados.');
    } catch (e: any) {
      logger.error('Error limpiando comandos globales:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error limpiando comandos globales.');
      } else {
        await interaction.reply({ content: '❌ Error limpiando comandos globales.', flags: MessageFlags.Ephemeral });
      }
    } finally {
      running = false;
    }
  }
} satisfies Button;
