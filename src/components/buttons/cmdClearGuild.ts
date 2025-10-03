import logger from "../../core/lib/logger";
import {ButtonInteraction, MessageFlags} from 'discord.js';
import { clearAllCommands } from '../../core/api/discordAPI';
import type { Button } from '../../core/types/components';
import type Amayo from '../../core/client';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_clear_guild',
  run: async (interaction: ButtonInteraction, client: Amayo) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.', flags: MessageFlags.Ephemeral});
    }
    if (running) {
      return interaction.reply({ content: '⏳ Limpieza GUILD en progreso, espera.',  flags: MessageFlags.Ephemeral });
    }
    running = true;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await clearAllCommands();
      await interaction.editReply('🧹 Comandos de GUILD eliminados.');
    } catch (e: any) {
      logger.error('Error limpiando comandos guild:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error limpiando comandos de guild.');
      } else {
        await interaction.reply({ content: '❌ Error limpiando comandos de guild.',  flags: MessageFlags.Ephemeral });
      }
    } finally {
      running = false;
    }
  }
} satisfies Button;
