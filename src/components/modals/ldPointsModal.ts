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

      // Obtener valores del modal
      const totalInput = interaction.fields.getTextInputValue('total_points').trim();
      const weeklyInput = interaction.fields.getTextInputValue('weekly_points').trim();
      const monthlyInput = interaction.fields.getTextInputValue('monthly_points').trim();

      // Si no se ingresó nada, retornar
      if (!totalInput && !weeklyInput && !monthlyInput) {
        return interaction.reply({
          content: '❌ Debes ingresar al menos un valor para modificar.',
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
        if (!input) return currentValue;
        
        const firstChar = input[0];
        const numValue = parseInt(input.substring(1)) || 0;

        if (firstChar === '+') {
          return Math.max(0, currentValue + numValue);
        } else if (firstChar === '-') {
          return Math.max(0, currentValue - numValue);
        } else if (firstChar === '=') {
          return Math.max(0, numValue);
        } else {
          // Si no tiene símbolo, tratar como valor absoluto
          const parsedValue = parseInt(input);
          return isNaN(parsedValue) ? currentValue : Math.max(0, parsedValue);
        }
      };

      // Calcular nuevos valores
      const newTotalPoints = calculateNewValue(totalInput, stats.totalPoints);
      const newWeeklyPoints = calculateNewValue(weeklyInput, stats.weeklyPoints);
      const newMonthlyPoints = calculateNewValue(monthlyInput, stats.monthlyPoints);

      // Actualizar en base de datos
      const updatedStats = await prisma.partnershipStats.update({
        where: {
          userId_guildId: {
            userId,
            guildId: interaction.guild.id
          }
        },
        data: {
          totalPoints: newTotalPoints,
          weeklyPoints: newWeeklyPoints,
          monthlyPoints: newMonthlyPoints
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

      // Crear embed de confirmación
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Puntos Actualizados')
        .setDescription(`Se han actualizado los puntos de **${userName}**`)
        .addFields(
          { 
            name: '📊 Puntos Totales', 
            value: `${stats.totalPoints} → **${newTotalPoints}**`, 
            inline: true 
          },
          { 
            name: '📅 Puntos Semanales', 
            value: `${stats.weeklyPoints} → **${newWeeklyPoints}**`, 
            inline: true 
          },
          { 
            name: '🗓️ Puntos Mensuales', 
            value: `${stats.monthlyPoints} → **${newMonthlyPoints}**`, 
            inline: true 
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
