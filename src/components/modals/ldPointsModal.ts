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
      // Obtener valores del modal con manejo seguro de errores
      let totalInput: string;
      let selectedUsers: any;
      let userId: string;
      let userName: string;

      try {
        totalInput = interaction.components.getTextInputValue('points_input').trim();
      } catch (error) {
        logger.error('Error obteniendo points_input:', error);
        return interaction.reply({
          content: '❌ Error al obtener el valor de puntos del modal.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Manejo seguro del UserSelect con fallback
      try {
        selectedUsers = interaction.components.getSelectedUsers('user_select');

        if (!selectedUsers || selectedUsers.size === 0) {
          // Fallback: intentar obtener los IDs directamente de los datos raw
          const rawData = (interaction as any).data?.components;
          if (rawData) {
            const userSelectComponent = this.findUserSelectComponent(rawData, 'user_select');
            if (userSelectComponent?.values?.length > 0) {
              userId = userSelectComponent.values[0];
              logger.info(`🔄 Fallback: UserId extraído de datos raw: ${userId}`);
            }
          }

          if (!userId) {
            return interaction.reply({
              content: '❌ Debes seleccionar un usuario del leaderboard.',
              flags: MessageFlags.Ephemeral
            });
          }
        } else {
          const selectedUser = Array.from(selectedUsers.values())[0];
          userId = selectedUser?.id;
          userName = selectedUser?.tag ?? selectedUser?.username ?? userId;
        }
      } catch (error) {
        logger.error('Error procesando UserSelect, intentando fallback:', error);

        // Fallback más agresivo: obtener directamente de los datos raw
        try {
          const rawData = (interaction as any).data?.components;
          const userSelectComponent = this.findUserSelectComponent(rawData, 'user_select');

          if (userSelectComponent?.values?.length > 0) {
            userId = userSelectComponent.values[0];
            logger.info(`🔄 Fallback agresivo: UserId extraído: ${userId}`);
          } else {
            throw new Error('No se pudo extraer userId de los datos raw');
          }
        } catch (fallbackError) {
          logger.error('Falló el fallback:', fallbackError);
          return interaction.reply({
            content: '❌ Error procesando la selección de usuario. Inténtalo de nuevo.',
            flags: MessageFlags.Ephemeral
          });
        }
      }

      logger.info(`🔍 Input recibido: ${totalInput}`);
      logger.info(`🔍 UserId extraído: ${userId}`);

      if (!totalInput) {
        return interaction.reply({
          content: '❌ Debes ingresar un valor para modificar.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!userId) {
        return interaction.reply({
          content: '❌ Error al identificar el usuario seleccionado.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Si no tenemos userName, intentar obtenerlo del servidor
      if (!userName) {
        try {
          const targetMember = await interaction.guild.members.fetch(userId);
          userName = targetMember.displayName || targetMember.user.username;
        } catch (error) {
          logger.warn(`No se pudo obtener info del usuario ${userId}:`, error);
          userName = `Usuario ${userId}`;
        }
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
          }
        )
        .setFooter({ text: `Actualizado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      //@ts-ignore
      logger.error('❌ Error en ldPointsModal:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Error interno al procesar la solicitud. Revisa los logs para más detalles.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },

  // Función auxiliar para buscar componentes UserSelect en datos raw
  findUserSelectComponent(components: any[], customId: string): any {
    if (!components) return null;

    for (const comp of components) {
      if (comp.components) {
        const found = this.findUserSelectComponent(comp.components, customId);
        if (found) return found;
      }

      if (comp.component) {
        if (comp.component.custom_id === customId) {
          return comp.component;
        }
        const found = this.findUserSelectComponent([comp.component], customId);
        if (found) return found;
      }

      if (comp.custom_id === customId) {
        return comp;
      }
    }

    return null;
  }
};
