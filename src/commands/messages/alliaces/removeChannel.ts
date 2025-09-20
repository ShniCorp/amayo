import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { ComponentType, ButtonStyle, MessageFlags, ChannelType } from "discord.js";

export const command: CommandMessage = {
    name: "removechannel-alliance",
    type: "message",
    aliases: ["removealchannel", "removechannelally", "delalchannel"],
    cooldown: 10,
    // @ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        // Obtener canales configurados existentes
        const existingChannels = await client.prisma.allianceChannel.findMany({
            where: { guildId: message.guildId! },
            include: { blockConfig: true }
        });

        if (existingChannels.length === 0) {
            const noChannelsPanel = {
                type: 17,
                accent_color: 0xf04747,
                components: [
                    {
                        type: 10,
                        content: "# 🗑️ **Eliminar Canal de Alianzas**"
                    },
                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },
                    {
                        type: 10,
                        content: "📭 **No hay canales configurados**\n\nNo existen canales de alianza configurados en este servidor para eliminar.\n\n💡 **Sugerencia:** Usa `!setchannel-alliance` para configurar canales primero."
                    }
                ]
            };

            return message.reply({
                flags: MessageFlags.SuppressEmbeds,
                components: [noChannelsPanel]
            });
        }

        // Panel principal de eliminación
        const removePanel = {
            type: 17,
            accent_color: 0xf04747, // Rojo para eliminación
            components: [
                {
                    type: 10,
                    content: "# 🗑️ **Eliminar Canal de Alianzas**"
                },
                {
                    type: 14,
                    spacing: 2,
                    divider: true
                },
                {
                    type: 10,
                    content: `⚠️ **Atención:** Estás a punto de eliminar la configuración de alianzas de un canal.\n\n📊 **Estado actual:**\n• **${existingChannels.length}** canal(es) configurado(s)\n• **${existingChannels.filter((c: any) => c.isActive).length}** canal(es) activo(s)\n\n🎯 Selecciona el canal que deseas eliminar de la configuración:`
                }
            ]
        };

        // Crear opciones para el selector de canales
        const channelOptions = existingChannels.map((config: any) => {
            const channel = message.guild!.channels.cache.get(config.channelId);
            const channelName = channel ? `#${channel.name}` : `Canal Eliminado`;
            const status = config.isActive ? "🟢 Activo" : "🔴 Inactivo";
            
            return {
                label: channelName,
                value: config.channelId,
                description: `${config.blockConfigName} • ${status}`,
                emoji: { name: channel ? "💬" : "⚠️" }
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
            flags: MessageFlags.SuppressEmbeds,
            components: [removePanel, channelSelectRow, cancelRow]
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

                        // Panel de confirmación
                        const confirmPanel = {
                            type: 17,
                            accent_color: 0xff6b6b,
                            components: [
                                {
                                    type: 10,
                                    content: "⚠️ **Confirmar Eliminación**"
                                },
                                {
                                    type: 14,
                                    divider: true,
                                    spacing: 2
                                },
                                {
                                    type: 10,
                                    content: `🎯 **Canal seleccionado:** ${channelName}\n` +
                                             `🧩 **Configuración:** \`${selectedConfig?.blockConfigName}\`\n` +
                                             `📊 **Estado:** ${selectedConfig?.isActive ? "🟢 Activo" : "🔴 Inactivo"}\n\n` +
                                             `❗ **¿Estás seguro de eliminar esta configuración?**\n\n` +
                                             `📝 **Efectos:**\n` +
                                             `• Los usuarios ya no ganarán puntos en este canal\n` +
                                             `• El historial de puntos se mantendrá\n` +
                                             `• Esta acción NO se puede deshacer`
                                }
                            ]
                        };

                        const confirmRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: ButtonStyle.Danger,
                                    label: "✅ Sí, Eliminar",
                                    custom_id: `confirm_remove_${selectedChannelId}`,
                                    emoji: { name: "🗑️" }
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
                            components: [confirmPanel, confirmRow]
                        });
                    }
                    break;

                case "cancel_removal":
                    const cancelPanel = {
                        type: 17,
                        accent_color: 0x36393f,
                        components: [
                            {
                                type: 10,
                                content: "❌ **Operación Cancelada**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 1
                            },
                            {
                                type: 10,
                                content: "La eliminación ha sido cancelada.\nNingún canal fue modificado."
                            }
                        ]
                    };

                    await interaction.update({
                        components: [cancelPanel]
                    });
                    collector.stop();
                    break;

                case "view_all_channels":
                    await interaction.reply({
                        content: `📋 **Canales Configurados**\n\n${existingChannels.map((config: any, index: number) => {
                            const channel = message.guild!.channels.cache.get(config.channelId);
                            const channelName = channel ? `#${channel.name}` : "Canal Eliminado";
                            const status = config.isActive ? "🟢 Activo" : "🔴 Inactivo";
                            return `**${index + 1}.** ${channelName} - \`${config.blockConfigName}\` • ${status}`;
                        }).join('\n')}`,
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

                            const successPanel = {
                                type: 17,
                                accent_color: 0x57f287,
                                components: [
                                    {
                                        type: 10,
                                        content: "✅ **Eliminación Exitosa**"
                                    },
                                    {
                                        type: 14,
                                        divider: true,
                                        spacing: 2
                                    },
                                    {
                                        type: 10,
                                        content: `🗑️ **Canal eliminado de la configuración:**\n\n` +
                                                 `📺 **Canal:** ${channelName}\n` +
                                                 `🧩 **Configuración eliminada:** \`${channelConfig?.blockConfigName}\`\n\n` +
                                                 `✅ **Completado:** Los usuarios ya no ganarán puntos de alianza en este canal.\n\n` +
                                                 `💡 **Nota:** El historial de puntos anterior se mantiene intacto.`
                                    }
                                ]
                            };

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
                                components: [successPanel, successActionsRow]
                            });

                        } catch (error) {
                            const errorPanel = {
                                type: 17,
                                accent_color: 0xf04747,
                                components: [
                                    {
                                        type: 10,
                                        content: "❌ **Error de Eliminación**"
                                    },
                                    {
                                        type: 14,
                                        divider: true,
                                        spacing: 2
                                    },
                                    {
                                        type: 10,
                                        content: `💥 **Error al eliminar el canal:**\n\n` +
                                                 `📺 Canal: ${channelName}\n` +
                                                 `🧩 Configuración: \`${channelConfig?.blockConfigName}\`\n\n` +
                                                 `🔍 **Posibles causas:**\n` +
                                                 `• El canal ya fue eliminado\n` +
                                                 `• Error de base de datos\n` +
                                                 `• Permisos insuficientes\n\n` +
                                                 `🔄 Intenta nuevamente.`
                                    }
                                ]
                            };

                            await interaction.update({ components: [errorPanel] });
                        }
                    }
                    break;
            }
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time") {
                const timeoutPanel = {
                    type: 17,
                    accent_color: 0x36393f,
                    components: [
                        {
                            type: 10,
                            content: "⏰ **Sesión Expirada**"
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: "El panel de eliminación ha expirado.\nUsa el comando nuevamente para continuar."
                        }
                    ]
                };

                try {
                    await panelMessage.edit({
                        components: [timeoutPanel]
                    });
                } catch (error) {
                    // Mensaje eliminado o error de edición
                }
            }
        });
    }
}
