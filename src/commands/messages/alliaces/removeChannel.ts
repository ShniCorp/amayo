import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { EmbedBuilder, ButtonStyle, MessageFlags, ChannelType } from "discord.js";

export const command: CommandMessage = {
    name: "eliminar-canal-alianza",
    type: "message",
    aliases: ["removechannel-alliance", "removealchannel", "delalchannel"],
    cooldown: 10,
    // @ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        // Obtener canales configurados existentes
        const existingChannels = await client.prisma.allianceChannel.findMany({
            where: { guildId: message.guildId! }
        });

        if (existingChannels.length === 0) {
            const noChannelsEmbed = new EmbedBuilder()
                .setTitle("🗑️ Eliminar Canal de Alianzas")
                .setDescription("📭 **No hay canales configurados**\n\nNo existen canales de alianza configurados en este servidor para eliminar.\n\n💡 **Sugerencia:** Usa `!setchannel-alliance` para configurar canales primero.")
                .setColor(0xf04747)
                .setTimestamp();

            return message.reply({
                embeds: [noChannelsEmbed]
            });
        }

        // Embed principal
        const removeEmbed = new EmbedBuilder()
            .setTitle("🗑️ Eliminar Canal de Alianzas")
            .setDescription(`⚠️ **Atención:** Estás a punto de eliminar la configuración de alianzas de un canal.\n\n📊 **Estado actual:**\n• **${existingChannels.length}** canal(es) configurado(s)\n• **${existingChannels.filter((c: any) => c.isActive).length}** canal(es) activo(s)\n\n🎯 Selecciona el canal que deseas eliminar:`)
            .setColor(0xf04747)
            .setTimestamp();

        // Crear opciones para el selector de canales
        const channelOptions = existingChannels.map((config: any) => {
            const channel = message.guild!.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : `Canal Eliminado`;
            const status = config.isActive ? "🟢 Activo" : "🔴 Inactivo";
            
            return {
                label: channelName.length > 100 ? channelName.substring(0, 97) + "..." : channelName,
                value: config.channelId,
                description: `${config.blockConfigName} • ${status}`,
                emoji: channel ? "💬" : "⚠️"
            };
        }).slice(0, 25);

        const channelSelectRow = {
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: "channel_remove_select",
                    placeholder: "🗑️ Selecciona el canal a eliminar...",
                    options: channelOptions
                }
            ]
        };

        const cancelRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "❌ Cancelar",
                    custom_id: "cancel_removal"
                },
                {
                    type: 2,
                    style: ButtonStyle.Primary,
                    label: "📋 Ver Configurados",
                    custom_id: "view_all_channels"
                }
            ]
        };

        const panelMessage = await message.reply({
            embeds: [removeEmbed],
            components: [channelSelectRow, cancelRow]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 300000, // 5 minutos
            filter: (i) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction) => {
            switch (interaction.customId) {
                case "channel_remove_select":
                    if (interaction.isStringSelectMenu()) {
                        const selectedChannelId = interaction.values[0];
                        const selectedConfig = existingChannels.find((c: any) => c.channelId === selectedChannelId);
                        const selectedChannel = message.guild!.channels.cache.get(selectedChannelId);
                        const channelName = selectedChannel ? `#${selectedChannel.name}` : "Canal Eliminado";

                        // Embed de confirmación
                        const confirmEmbed = new EmbedBuilder()
                            .setTitle("⚠️ Confirmar Eliminación")
                            .setDescription(`🎯 **Canal seleccionado:** ${channelName}\n🧩 **Configuración:** \`${selectedConfig?.blockConfigName}\`\n📊 **Estado:** ${selectedConfig?.isActive ? "🟢 Activo" : "🔴 Inactivo"}\n\n❗ **¿Estás seguro de eliminar esta configuración?**\n\n📝 **Efectos:**\n• Los usuarios ya no ganarán puntos en este canal\n• El historial de puntos se mantendrá\n• Esta acción NO se puede deshacer`)
                            .setColor(0xff6b6b)
                            .setTimestamp();

                        const confirmRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: ButtonStyle.Danger,
                                    label: "✅ Sí, Eliminar",
                                    custom_id: `confirm_remove_${selectedChannelId}`
                                },
                                {
                                    type: 2,
                                    style: ButtonStyle.Secondary,
                                    label: "❌ Cancelar",
                                    custom_id: "cancel_removal"
                                }
                            ]
                        };

                        await interaction.update({
                            embeds: [confirmEmbed],
                            components: [confirmRow]
                        });
                    }
                    break;

                case "cancel_removal":
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle("❌ Operación Cancelada")
                        .setDescription("La eliminación ha sido cancelada.\nNingún canal fue modificado.")
                        .setColor(0x36393f)
                        .setTimestamp();

                    await interaction.update({
                        embeds: [cancelEmbed],
                        components: []
                    });
                    collector.stop();
                    break;

                case "view_all_channels":
                    const channelsList = existingChannels.map((config: any, index: number) => {
                        const channel = message.guild!.channels.cache.get(config.channelId);
                        const channelName = channel ? `#${channel.name}` : "Canal Eliminado";
                        const status = config.isActive ? "🟢 Activo" : "🔴 Inactivo";
                        return `**${index + 1}.** ${channelName} - \`${config.blockConfigName}\` • ${status}`;
                    }).join('\n');

                    await interaction.reply({
                        content: `📋 **Canales Configurados**\n\n${channelsList}`,
                        flags: 64 // Ephemeral
                    });
                    break;

                default:
                    // Manejo de confirmación de eliminación
                    if (interaction.customId.startsWith("confirm_remove_")) {
                        const channelId = interaction.customId.replace("confirm_remove_", "");
                        const channelConfig = existingChannels.find((c: any) => c.channelId === channelId);
                        const channel = message.guild!.channels.cache.get(channelId);
                        const channelName = channel ? `#${channel.name}` : "Canal Eliminado";

                        try {
                            // Eliminar la configuración del canal
                            await client.prisma.allianceChannel.delete({
                                where: {
                                    guildId_channelId: {
                                        guildId: message.guildId!,
                                        channelId: channelId
                                    }
                                }
                            });

                            const successEmbed = new EmbedBuilder()
                                .setTitle("✅ Eliminación Exitosa")
                                .setDescription(`🗑️ **Canal eliminado de la configuración:**\n\n📺 **Canal:** ${channelName}\n🧩 **Configuración eliminada:** \`${channelConfig?.blockConfigName}\`\n\n✅ **Completado:** Los usuarios ya no ganarán puntos de alianza en este canal.\n\n💡 **Nota:** El historial de puntos anterior se mantiene intacto.`)
                                .setColor(0x57f287)
                                .setTimestamp();

                            const successActionsRow = {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: ButtonStyle.Success,
                                        label: "🏠 Finalizar",
                                        custom_id: "finish_removal"
                                    },
                                    {
                                        type: 2,
                                        style: ButtonStyle.Danger,
                                        label: "🗑️ Eliminar Otro",
                                        custom_id: "remove_another"
                                    }
                                ]
                            };

                            await interaction.update({
                                embeds: [successEmbed],
                                components: [successActionsRow]
                            });

                        } catch (error) {
                            logger.info(error)
                            const errorEmbed = new EmbedBuilder()
                                .setTitle("❌ Error de Eliminación")
                                .setDescription(`💥 **Error al eliminar el canal:**\n\n📺 Canal: ${channelName}\n🧩 Configuración: \`${channelConfig?.blockConfigName}\`\n\n🔍 **Posibles causas:**\n• El canal ya fue eliminado\n• Error de base de datos\n• Permisos insuficientes\n\n🔄 Intenta nuevamente.`)
                                .setColor(0xf04747)
                                .setTimestamp();

                            await interaction.update({
                                embeds: [errorEmbed],
                                components: []
                            });
                        }
                    } else if (interaction.customId === "finish_removal" || interaction.customId === "remove_another") {
                        collector.stop();
                        if (interaction.customId === "remove_another") {
                            // Reiniciar el comando
                            return module.exports.command.run(message, args, client);
                        }
                    }
                    break;
            }
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time") {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("⏰ Sesión Expirada")
                    .setDescription("El panel de eliminación ha expirado.\nUsa el comando nuevamente para continuar.")
                    .setColor(0x36393f)
                    .setTimestamp();

                try {
                    await panelMessage.edit({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                } catch (error) {
                    // Mensaje eliminado o error de edición
                }
            }
        });
    }
}
