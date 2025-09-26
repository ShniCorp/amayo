import {ButtonInteraction, MessageFlags} from 'discord.js';
import { registeringCommands } from '../../core/api/discordAPI';
import type { Button } from '../../core/types/components';
import type Amayo from '../../core/client';

const OWNER_ID = '327207082203938818';
let running = false;

export default {
  customId: 'cmd_reg_guild',
  run: async (interaction: ButtonInteraction, client: Amayo) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.',  flags: MessageFlags.Ephemeral });
    }
    if (running) {
      return interaction.reply({ content: '⏳ Ya hay un registro de comandos guild en curso, espera.',  flags: MessageFlags.Ephemeral });
    }
    running = true;
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral});
      await registeringCommands();
      await interaction.editReply('✅ Comandos de GUILD registrados correctamente.');
    } catch (e: any) {
      console.error('Error registrando comandos guild:', e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Error registrando comandos de guild. Revisa logs.');
      } else {
        await interaction.reply({ content: '❌ Error registrando comandos de guild.', flags: MessageFlags.Ephemeral});
      }
    } finally {
      running = false;
    }
  }
} satisfies Button;
