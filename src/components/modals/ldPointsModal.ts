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
    logger.info(`🔍 Modal ldPointsModal ejecutado. CustomId: ${interaction.customId}`);

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
      logger.info(`🔍 UserId extraído: ${userId}`);

      if (!userId) {
        return interaction.reply({
          content: '❌ Error al identificar el usuario.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Obtener valor del modal
      // @ts-ignore
      const totalInput = interaction.fields.getTextInputValue('total_points').trim();
      logger.info(`🔍 Input recibido: ${totalInput}`);

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
        logger.info(`🔍 Creando nuevo registro de stats para userId: ${userId}`);
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

      logger.info(`🔍 Stats actuales - Total: ${stats.totalPoints}, Semanal: ${stats.weeklyPoints}, Mensual: ${stats.monthlyPoints}`);

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
      const totalDifference = newTotalPoints - stats.totalPoints;

      logger.info(`🔍 Nuevo total calculado: ${newTotalPoints} (diferencia: ${totalDifference})`);

      // Calcular nuevos puntos semanales y mensuales
      let newWeeklyPoints = stats.weeklyPoints;
      let newMonthlyPoints = stats.monthlyPoints;

      if (totalInput[0] === '+') {
        // Si añadimos puntos, sumar a semanal y mensual también
        const pointsToAdd = parseInt(totalInput.substring(1)) || 0;
        newWeeklyPoints = stats.weeklyPoints + pointsToAdd;
        newMonthlyPoints = stats.monthlyPoints + pointsToAdd;
        logger.info(`➕ Añadiendo ${pointsToAdd} puntos a todas las categorías`);
      } else if (totalInput[0] === '-') {
        // Si quitamos puntos, restar proporcionalmente de semanal y mensual
        const pointsToRemove = parseInt(totalInput.substring(1)) || 0;
        newWeeklyPoints = Math.max(0, stats.weeklyPoints - pointsToRemove);
        newMonthlyPoints = Math.max(0, stats.monthlyPoints - pointsToRemove);
        logger.info(`➖ Quitando ${pointsToRemove} puntos de todas las categorías`);
      } else if (totalInput[0] === '=') {
        // Si establecemos un valor absoluto, ajustar semanal y mensual proporcionalmente
        const targetTotal = parseInt(totalInput.substring(1)) || 0;

        if (stats.totalPoints > 0) {
          // Calcular el ratio y aplicarlo
          const ratio = targetTotal / stats.totalPoints;
          newWeeklyPoints = Math.round(stats.weeklyPoints * ratio);
          newMonthlyPoints = Math.round(stats.monthlyPoints * ratio);
        } else {
          // Si no había puntos antes, establecer todo a 0
          newWeeklyPoints = 0;
          newMonthlyPoints = 0;
        }
        logger.info(`🎯 Estableciendo total a ${targetTotal} y ajustando proporcionalmente`);
      }

      // Asegurar que semanal no exceda mensual, y mensual no exceda total
      newWeeklyPoints = Math.min(newWeeklyPoints, newMonthlyPoints, newTotalPoints);
      newMonthlyPoints = Math.min(newMonthlyPoints, newTotalPoints);

      logger.info(`🔍 Nuevos valores calculados - Total: ${newTotalPoints}, Semanal: ${newWeeklyPoints}, Mensual: ${newMonthlyPoints}`);

      // Actualizar en base de datos (todos los puntos)
      await prisma.partnershipStats.update({
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

      logger.info(`✅ Puntos actualizados exitosamente en la base de datos`);

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

      // Calcular las diferencias
      const totalDiff = newTotalPoints - stats.totalPoints;
      const weeklyDiff = newWeeklyPoints - stats.weeklyPoints;
      const monthlyDiff = newMonthlyPoints - stats.monthlyPoints;

      const totalDiffText = totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
      const weeklyDiffText = weeklyDiff > 0 ? `+${weeklyDiff}` : `${weeklyDiff}`;
      const monthlyDiffText = monthlyDiff > 0 ? `+${monthlyDiff}` : `${monthlyDiff}`;

      // Crear embed de confirmación
      const embed = new EmbedBuilder()
        .setColor(totalDiff >= 0 ? 0x00ff00 : 0xff9900)
        .setTitle('✅ Puntos Actualizados')
        .setDescription(`Se han actualizado los puntos de **${userName}**`)
        .addFields(
          { 
            name: '📊 Puntos Totales', 
            value: `${stats.totalPoints} → **${newTotalPoints}** (${totalDiffText})`,
            inline: true
          },
          {
            name: '🗓️ Puntos Mensuales',
            value: `${stats.monthlyPoints} → **${newMonthlyPoints}** (${monthlyDiffText})`,
            inline: true
          },
          {
            name: '📅 Puntos Semanales',
            value: `${stats.weeklyPoints} → **${newWeeklyPoints}** (${weeklyDiffText})`,
            inline: true
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

      logger.info(`✅ Respuesta enviada al usuario`);

    } catch (e) {
      logger.error({ err: e }, 'Error en ldPointsModal');

      // Intentar responder con el error
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Error al actualizar los puntos.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        logger.error({ err: replyError }, 'Error al enviar respuesta de error');
      }
    }
  }
};
