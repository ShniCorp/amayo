import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { ComponentType, ButtonStyle, MessageFlags, ChannelType } from "discord.js";

export const command: CommandMessage = {
    name: "canal-alianza",
    type: "message",
    aliases: ["alchannel", "channelally"],
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

        const availableBlocks = await client.prisma.blockV2Config.findMany({
            where: { guildId: message.guildId! },
            select: { name: true, id: true, config: true }
        });

        // Panel principal de configuración
        const setupPanel = {
            type: 17,
            accent_color: 0x00ff88, // Verde alliance
            components: [
                {
                    type: 10,
                    content: "# 🤝 **Centro de Configuración de Alianzas**"
                },
                {
                    type: 14,
                    spacing: 2,
                    divider: true
                },
                {
                    type: 10,
                    content: `📊 **Estado Actual:**\n` +
                             `• **${existingChannels.length}** canales configurados\n` +
                             `• **${availableBlocks.length}** bloques disponibles\n` +
                             `• **${existingChannels.filter((c: any) => c.isActive).length}** canales activos\n\n` +
                             `⚙️ Selecciona una acción para continuar:`
                }
            ]
        };

        const mainActionsRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: ButtonStyle.Success,
                    label: "➕ Configurar Canal",
                    custom_id: "setup_new_channel",
                    emoji: { name: "🔧" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Primary,
                    label: "📋 Ver Configurados",
                    custom_id: "view_configured_channels",
                    emoji: { name: "📊" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "🧪 Crear Bloque",
                    custom_id: "help_create_block",
                    emoji: { name: "📝" }
                }
            ]
        };

        const managementRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "🔄 Refrescar",
                    custom_id: "refresh_status"
                },
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "📖 Ayuda",
                    custom_id: "show_help"
                },
                {
                    type: 2,
                    style: ButtonStyle.Danger,
                    label: "🗑️ Gestionar",
                    custom_id: "manage_channels",
                    disabled: existingChannels.length === 0
                }
            ]
        };

        // Importante: activar Display Components V2 (32768) y mantener SuppressEmbeds
        const panelMessage = await message.reply({
            // @ts-ignore - combinar flags numéricamente (V2 + SuppressEmbeds)
            flags: (32768 | MessageFlags.SuppressEmbeds),
            components: [setupPanel, mainActionsRow, managementRow]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 600000, // 10 minutos
            filter: (i) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction) => {
            switch (interaction.customId) {
                case "setup_new_channel":
                    // Obtener canales de texto disponibles
                    const textChannels = message.guild!.channels.cache
                        .filter(channel =>
                            channel.type === ChannelType.GuildText &&
                            // @ts-ignore
                            !existingChannels.some(ec => ec.channelId === channel.id)
                        )
                        .map(channel => ({
                            label: `#${channel.name}`,
                            value: channel.id,
                            description: `ID: ${channel.id}`,
                            emoji: { name: "💬" }
                        }))
                        .slice(0, 25);

                    if (textChannels.length === 0) {
                        const noChannelsPanel = {
                            type: 17,
                            accent_color: 0xffa500,
                            components: [
                                {
                                    type: 10,
                                    content: "⚠️ **Sin Canales Disponibles**"
                                },
                                {
                                    type: 14,
                                    divider: true,
                                    spacing: 2
                                },
                                {
                                    type: 10,
                                    content: "No hay canales de texto disponibles para configurar.\n\n**Posibles causas:**\n• Todos los canales ya están configurados\n• No hay canales de texto en el servidor\n• Faltan permisos para ver canales"
                                }
                            ]
                        };

                        await interaction.update({ components: [noChannelsPanel] });
                        return;
                    }

                    const channelSelectPanel = {
                        type: 17,
                        accent_color: 0x5865f2,
                        components: [
                            {
                                type: 10,
                                content: "📺 **Seleccionar Canal**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 2
                            },
                            {
                                type: 10,
                                content: `🎯 Selecciona el canal que quieres configurar para alianzas:\n\n💡 **Tip:** Solo se muestran canales de texto que aún no están configurados.`
                            }
                        ]
                    };

                    const channelSelectRow = {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "channel_select",
                                placeholder: "📺 Selecciona un canal...",
                                options: textChannels
                            }
                        ]
                    };

                    const backRow = {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "↩️ Volver al Inicio",
                                custom_id: "back_to_main"
                            }
                        ]
                    };

                    await interaction.update({
                        components: [channelSelectPanel, channelSelectRow, backRow]
                    });
                    break;

                case "channel_select":
                    if (interaction.isStringSelectMenu()) {
                        const selectedChannelId = interaction.values[0];
                        const selectedChannel = message.guild!.channels.cache.get(selectedChannelId);

                        if (availableBlocks.length === 0) {
                            const noBlocksPanel = {
                                type: 17,
                                accent_color: 0xf04747,
                                components: [
                                    {
                                        type: 10,
                                        content: "❌ **Sin Bloques Disponibles**"
                                    },
                                    {
                                        type: 14,
                                        divider: true,
                                        spacing: 2
                                    },
                                    {
                                        type: 10,
                                        content: `📺 **Canal seleccionado:** #${selectedChannel?.name}\n\n⚠️ **Problema:** No hay bloques de configuración disponibles.\n\n🔧 **Solución:**\n• Crea un bloque usando: \`!blockcreate <nombre>\`\n• Edita bloques usando: \`!blockeditv2 <nombre>\``
                                    }
                                ]
                            };

                            const createBlockRow = {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: ButtonStyle.Success,
                                        label: "📝 Ayuda Crear Bloque",
                                        custom_id: "help_create_block"
                                    },
                                    {
                                        type: 2,
                                        style: ButtonStyle.Secondary,
                                        label: "↩️ Volver",
                                        custom_id: "setup_new_channel"
                                    }
                                ]
                            };

                            await interaction.update({
                                components: [noBlocksPanel, createBlockRow]
                            });
                            return;
                        }
// @ts-ignore
                        const blockOptions = availableBlocks.map(block => ({
                            label: block.name,
                            value: `${selectedChannelId}_${block.name}`,
                            description: `ID: ${block.id}`,
                            emoji: { name: "🧩" }
                        }));

                        const blockSelectPanel = {
                            type: 17,
                            accent_color: 0xff9500,
                            components: [
                                {
                                    type: 10,
                                    content: "🧩 **Seleccionar Configuración**"
                                },
                                {
                                    type: 14,
                                    divider: true,
                                    spacing: 2
                                },
                                {
                                    type: 10,
                                    content: `📺 **Canal:** #${selectedChannel?.name}\n\n🎯 Selecciona qué bloque de configuración usar para este canal:\n\n💡 Los bloques definen cómo se verán los mensajes de alianza.`
                                }
                            ]
                        };

                        const blockSelectRow = {
                            type: 1,
                            components: [
                                {
                                    type: 3,
                                    custom_id: "block_select",
                                    placeholder: "🧩 Selecciona una configuración...",
                                    options: blockOptions
                                }
                            ]
                        };

                        await interaction.update({
                            // @ts-ignore
                            components: [blockSelectPanel, blockSelectRow, backRow]
                        });
                    }
                    break;

                case "block_select":
                    if (interaction.isStringSelectMenu()) {
                        const [channelId, blockName] = interaction.values[0].split('_');
                        const channel = message.guild!.channels.cache.get(channelId);

                        try {
                            // Verificar que el bloque existe
                            const blockConfig = await client.prisma.blockV2Config.findFirst({
                                where: {
                                    guildId: message.guildId,
                                    name: blockName
                                }
                            });

                            if (!blockConfig) {
                                throw new Error("Bloque no encontrado");
                            }

                            // Configurar el canal
                            await client.prisma.allianceChannel.upsert({
                                where: {
                                    guildId_channelId: {
                                        guildId: message.guildId!,
                                        channelId: channelId
                                    }
                                },
                                create: {
                                    guildId: message.guildId!,
                                    channelId: channelId,
                                    blockConfigName: blockName,
                                    isActive: true
                                },
                                update: {
                                    blockConfigName: blockName,
                                    isActive: true,
                                    updatedAt: new Date()
                                }
                            });

                            const successPanel = {
                                type: 17,
                                accent_color: 0x57f287,
                                components: [
                                    {
                                        type: 10,
                                        content: "✅ **Configuración Exitosa**"
                                    },
                                    {
                                        type: 14,
                                        divider: true,
                                        spacing: 2
                                    },
                                    {
                                        type: 10,
                                        content: `🎉 **Canal configurado correctamente:**\n\n` +
                                                 `📺 **Canal:** <#${channelId}>\n` +
                                                 `🧩 **Configuración:** \`${blockName}\`\n` +
                                                 `🟢 **Estado:** Activo\n\n` +
                                                 `🚀 **¡Listo!** Los enlaces de Discord válidos en este canal ahora otorgarán puntos de alianza usando la configuración especificada.`
                                    }
                                ]
                            };

                            const successActionsRow = {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: ButtonStyle.Success,
                                        label: "🏠 Volver al Inicio",
                                        custom_id: "back_to_main"
                                    },
                                    {
                                        type: 2,
                                        style: ButtonStyle.Primary,
                                        label: "➕ Configurar Otro",
                                        custom_id: "setup_new_channel"
                                    },
                                    {
                                        type: 2,
                                        style: ButtonStyle.Secondary,
                                        label: "📋 Ver Todos",
                                        custom_id: "view_configured_channels"
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
                                        content: "❌ **Error de Configuración**"
                                    },
                                    {
                                        type: 14,
                                        divider: true,
                                        spacing: 2
                                    },
                                    {
                                        type: 10,
                                        content: `🔍 **Detalles del error:**\n\n` +
                                                 `📺 Canal: <#${channelId}>\n` +
                                                 `🧩 Bloque: \`${blockName}\`\n\n` +
                                                 `💭 **Posibles causas:**\n` +
                                                 `• El bloque fue eliminado\n` +
                                                 `• Error de base de datos\n` +
                                                 `• Permisos insuficientes\n\n` +
                                                 `🔄 Intenta nuevamente o contacta al soporte.`
                                    }
                                ]
                            };

                            await interaction.update({ components: [errorPanel] });
                        }
                    }
                    break;

                case "view_configured_channels":
                    if (existingChannels.length === 0) {
                        const emptyListPanel = {
                            type: 17,
                            accent_color: 0x36393f,
                            components: [
                                {
                                    type: 10,
                                    content: "📋 **Canales Configurados**"
                                },
                                {
                                    type: 14,
                                    divider: true,
                                    spacing: 2
                                },
                                {
                                    type: 10,
                                    content: "🗂️ **Lista vacía**\n\nNo hay canales configurados para alianzas en este servidor.\n\n🚀 **¿Quieres empezar?**\n• Usa el botón \"Configurar Canal\" para añadir tu primer canal"
                                }
                            ]
                        };

                        await interaction.update({ components: [emptyListPanel] });
                        return;
                    }

                    let channelListText = `📊 **${existingChannels.length} canal(es) configurado(s)**\n\n`;
                        // @ts-ignore
                    existingChannels.forEach((config, index) => {
                        const channel = message.guild!.channels.cache.get(config.channelId);
                        const channelName = channel ? `#${channel.name}` : `Canal Eliminado`;
                        const status = config.isActive ? "🟢 Activo" : "🔴 Inactivo";

                        channelListText += `**${index + 1}.** ${channelName}\n`;
                        channelListText += `   └ \`${config.blockConfigName}\` • ${status}\n\n`;
                    });

                    const channelListPanel = {
                        type: 17,
                        accent_color: 0x5865f2,
                        components: [
                            {
                                type: 10,
                                content: "📋 **Canales Configurados**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 2
                            },
                            {
                                type: 10,
                                content: channelListText
                            }
                        ]
                    };

                    const listActionsRow = {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "🏠 Volver al Inicio",
                                custom_id: "back_to_main"
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Primary,
                                label: "➕ Configurar Más",
                                custom_id: "setup_new_channel"
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Danger,
                                label: "🔧 Gestionar",
                                custom_id: "manage_channels"
                            }
                        ]
                    };

                    await interaction.update({
                        components: [channelListPanel, listActionsRow]
                    });
                    break;

                case "help_create_block":
                    await interaction.reply({
                        content: `📖 **Guía de Bloques**\n\n🧩 **¿Qué son los bloques?**\nLos bloques son configuraciones que definen cómo se ven los mensajes de alianza.\n\n🔧 **Comandos para gestionar bloques:**\n\n• \`!blockcreate <nombre>\` - Crear nuevo bloque\n• \`!blockeditv2 <nombre>\` - Editor completo\n• \`!embedlist\` - Ver todos los bloques\n• \`!embeddelete\` - Eliminar bloques\n\n💡 **Ejemplo:** \`!blockcreate alianza-general\``,
                        flags: 64 // Ephemeral
                    });
                    break;

                case "show_help":
                    await interaction.reply({
                        content: `📚 **Ayuda Completa**\n\n🤝 **Sistema de Alianzas:**\nConfigura canales donde los enlaces de Discord válidos otorgan puntos.\n\n🏗️ **Proceso de configuración:**\n1. Crear un bloque con \`!blockcreate\`\n2. Configurar canal con este comando\n3. ¡Los usuarios empezarán a ganar puntos!\n\n⚙️ **Gestión avanzada:**\n• Usar \`!embedlist\` para ver bloques\n• Usar \`!blockeditv2\` para personalizar\n• Este comando para gestionar canales`,
                        flags: 64 // Ephemeral
                    });
                    break;

                case "back_to_main":
                case "refresh_status":
                    // Recargar datos y volver al panel principal
                    const refreshedChannels = await client.prisma.allianceChannel.findMany({
                        where: { guildId: message.guildId! },
                        include: { blockConfig: true }
                    });

                    const refreshedBlocks = await client.prisma.blockV2Config.findMany({
                        where: { guildId: message.guildId! },
                        select: { name: true, id: true, config: true }
                    });

                    const refreshedPanel = {
                        type: 17,
                        accent_color: 0x00ff88,
                        components: [
                            {
                                type: 10,
                                content: "🤝 **Centro de Configuración de Alianzas**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 2
                            },
                            {
                                type: 10,
                                content: `📊 **Estado Actual:**\n` +
                                         `• **${refreshedChannels.length}** canales configurados\n` +
                                         `• **${refreshedBlocks.length}** bloques disponibles\n` +
                                                                    // @ts-ignore
                                         `• **${refreshedChannels.filter(c => c.isActive).length}** canales activos\n\n` +
                                         `⚙️ Selecciona una acción para continuar:`
                            }
                        ]
                    };

                    const refreshedMainActions = {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Success,
                                label: "➕ Configurar Canal",
                                custom_id: "setup_new_channel",
                                emoji: { name: "🔧" }
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Primary,
                                label: "📋 Ver Configurados",
                                custom_id: "view_configured_channels",
                                emoji: { name: "📊" }
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "🧪 Crear Bloque",
                                custom_id: "help_create_block",
                                emoji: { name: "📝" }
                            }
                        ]
                    };

                    const refreshedManagement = {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "🔄 Refrescar",
                                custom_id: "refresh_status"
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "📖 Ayuda",
                                custom_id: "show_help"
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Danger,
                                label: "🗑️ Gestionar",
                                custom_id: "manage_channels",
                                disabled: refreshedChannels.length === 0
                            }
                        ]
                    };

                    await interaction.update({
                        components: [refreshedPanel, refreshedMainActions, refreshedManagement]
                    });
                    break;

                case "manage_channels":
                    await interaction.reply({
                        content: `🔧 **Gestión Avanzada**\n\n⚠️ **Funciones de gestión avanzada:**\n\n🔄 Activar/desactivar canales\n🗑️ Eliminar configuraciones\n✏️ Cambiar bloques asignados\n\n💡 **Próximamente:** Panel interactivo completo`,
                        flags: 64 // Ephemeral
                    });
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
                            content: "El panel de configuración ha expirado.\nUsa el comando nuevamente para continuar."
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
