import logger from "../../core/lib/logger";
import { 
  ModalSubmitInteraction, 
  MessageFlags,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';
import { prisma } from '../../core/database/prisma';

export default {
  customId: 'ld_points_modal',
  run: async (interaction: ModalSubmitInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({ 
        content: '❌ Solo disponible en servidores.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    // Verificar permisos
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Solo los administradores pueden gestionar puntos.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Extraer el userId del customId (formato: ld_points_modal:userId)
      const userId = interaction.customId.split(':')[1];
      if (!userId) {
        return interaction.reply({
          content: '❌ Error al identificar el usuario.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Obtener valor del modal
      // @ts-ignore
      const totalInput = interaction.fields.getTextInputValue('total_points').trim();

      if (!totalInput) {
        return interaction.reply({
          content: '❌ Debes ingresar un valor para modificar.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Obtener o crear el registro de stats del usuario
      let stats = await prisma.partnershipStats.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId: interaction.guild.id
          }
        }
      });

      if (!stats) {
        // Crear nuevo registro si no existe
        stats = await prisma.partnershipStats.create({
          data: {
            userId,
            guildId: interaction.guild.id,
            totalPoints: 0,
            weeklyPoints: 0,
            monthlyPoints: 0
          }
        });
      }

      // Función para parsear el input y calcular el nuevo valor
      const calculateNewValue = (input: string, currentValue: number): number => {
        const firstChar = input[0];

        if (firstChar === '+') {
          // Añadir puntos
          const numValue = parseInt(input.substring(1)) || 0;
          return Math.max(0, currentValue + numValue);
        } else if (firstChar === '-') {
          // Quitar puntos (los últimos N puntos añadidos)
          const numValue = parseInt(input.substring(1)) || 0;
          return Math.max(0, currentValue - numValue);
        } else if (firstChar === '=') {
          // Establecer valor absoluto
          const numValue = parseInt(input.substring(1)) || 0;
          return Math.max(0, numValue);
        } else {
          // Si no tiene símbolo, tratar como valor absoluto
          const parsedValue = parseInt(input);
          return isNaN(parsedValue) ? currentValue : Math.max(0, parsedValue);
        }
      };

      // Calcular nuevo valor de puntos totales
      const newTotalPoints = calculateNewValue(totalInput, stats.totalPoints);

      // Actualizar en base de datos (solo puntos totales)
      await prisma.partnershipStats.update({
        where: {
          userId_guildId: {
            userId,
            guildId: interaction.guild.id
          }
        },
        data: {
          totalPoints: newTotalPoints
        }
      });

      // Obtener nombre del usuario
      let userName = 'Usuario';
      try {
        const targetMember = await interaction.guild.members.fetch(userId);
        userName = targetMember.displayName || targetMember.user.username;
      } catch {
        try {
          const user = await interaction.client.users.fetch(userId);
          userName = user.username;
        } catch {
          userName = userId;
        }
      }

      // Calcular la diferencia
      const difference = newTotalPoints - stats.totalPoints;
      const diffText = difference > 0 ? `+${difference}` : `${difference}`;

      // Crear embed de confirmación
      const embed = new EmbedBuilder()
        .setColor(difference >= 0 ? 0x00ff00 : 0xff9900)
        .setTitle('✅ Puntos Actualizados')
        .setDescription(`Se han actualizado los puntos de **${userName}**`)
        .addFields(
          { 
            name: '📊 Puntos Totales', 
            value: `${stats.totalPoints} → **${newTotalPoints}** (${diffText})`,
            inline: false
          },
          {
            name: '📝 Operación',
            value: `\`${totalInput}\``,
            inline: false
          }
        )
        .setFooter({ text: `Modificado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });

    } catch (e) {
      logger.error({ err: e }, 'Error en ldPointsModal');
      await interaction.reply({
        content: '❌ Error al actualizar los puntos.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
