import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { EmbedBuilder, ButtonStyle, MessageFlags, ChannelType } from "discord.js";

export const command: CommandMessage = {
    name: "listchannels-alliance",
    type: "message",
    aliases: ["listalchannel", "channelsally", "alliancechannels"],
    cooldown: 5,
    // @ts-ignore
    run: async (message, args, client) => {
        // Obtener canales configurados existentes con estadísticas
        const existingChannels = await client.prisma.allianceChannel.findMany({
            where: { guildId: message.guildId! },
            include: {
                _count: {
                    select: {
                        pointsHistory: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Obtener estadísticas generales
        const totalPointsHistory = await client.prisma.pointHistory.count({
            where: { guildId: message.guildId! }
        });

        const availableBlocks = await client.prisma.blockV2Config.count({
            where: { guildId: message.guildId! }
        });

        if (existingChannels.length === 0) {
            // Embed cuando no hay canales configurados
            const noChannelsEmbed = new EmbedBuilder()
                .setTitle("📋 Canales de Alianza Configurados")
                .setDescription("```\n🗂️ Lista vacía\n```\n\n📭 **No hay canales configurados** para alianzas en este servidor.\n\n🚀 **¿Quieres empezar?**\n• Usa `!setchannel-alliance` para configurar tu primer canal\n• Crea bloques con `!blockcreate <nombre>`")
                .setColor(0x36393f)
                .addFields([
                    {
                        name: "📊 Estadísticas Generales",
                        value: `🧩 **Bloques disponibles:** ${availableBlocks}\n📈 **Puntos totales otorgados:** ${totalPointsHistory}`,
                        inline: false
                    }
                ])
                .setFooter({
                    text: `📅 ${new Date().toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}`
                })
                .setTimestamp();

            const helpRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: ButtonStyle.Success,
                        label: "➕ Configurar Canal",
                        custom_id: "setup_first_channel",
                        emoji: { name: "🔧" }
                    },
                    {
                        type: 2,
                        style: ButtonStyle.Secondary,
                        label: "📖 Ayuda",
                        custom_id: "show_setup_help",
                        emoji: { name: "❓" }
                    }
                ]
            };

            const response = await message.reply({
                embeds: [noChannelsEmbed],
                components: [helpRow]
            });

            // Collector para botones de ayuda
            const collector = response.createMessageComponentCollector({
                time: 300000,
                filter: (i) => i.user.id === message.author.id
            });

            collector.on("collect", async (interaction) => {
                if (interaction.customId === "setup_first_channel") {
                    await interaction.reply({
                        content: "🔧 **Configurar Canal**\n\nUsa el comando: `!setchannel-alliance`\n\nEste comando te guiará paso a paso para configurar tu primer canal de alianzas.",
                        flags: 64 // Ephemeral
                    });
                } else if (interaction.customId === "show_setup_help") {
                    await interaction.reply({
                        content: "📖 **Guía de Configuración**\n\n**Paso 1:** Crear un bloque\n`!blockcreate mi-alianza`\n\n**Paso 2:** Configurar canal\n`!setchannel-alliance`\n\n**Paso 3:** ¡Listo!\nLos usuarios ganarán puntos automáticamente.",
                        flags: 64 // Ephemeral
                    });
                }
            });

            return;
        }

        // Crear descripción detallada de canales
        let channelListDescription = "```\n📋 Lista de Canales Configurados\n```\n\n";
        
        const channelDetails = await Promise.all(
            existingChannels.map(async (config: any, index: number) => {
                const channel = message.guild!.channels.cache.get(config.channelId);
                const channelName = channel ? `#${channel.name}` : "❌ *Canal Eliminado*";
                const status = config.isActive ? "🟢 **Activo**" : "🔴 **Inactivo**";
                const pointsCount = config._count.pointsHistory;
                
                // Obtener información del bloque
                const blockInfo = await client.prisma.blockV2Config.findFirst({
                    where: {
                        guildId: message.guildId!,
                        name: config.blockConfigName
                    },
                    select: { name: true, id: true }
                });

                const blockStatus = blockInfo ? "✅ Válido" : "⚠️ Bloque Eliminado";
                
                const createdDate = new Date(config.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                return {
                    index: index + 1,
                    channelName,
                    status,
                    pointsCount,
                    blockName: config.blockConfigName,
                    blockStatus,
                    createdDate,
                    isValid: !!channel && !!blockInfo
                };
            })
        );

        // Agrupar por estado
        const activeChannels = channelDetails.filter(c => c.status.includes("Activo"));
        const inactiveChannels = channelDetails.filter(c => c.status.includes("Inactivo"));

        // Construir embed principal
        const mainEmbed = new EmbedBuilder()
            .setTitle("📋 Canales de Alianza Configurados")
            .setDescription(`${channelListDescription}📊 **Resumen:** ${existingChannels.length} canal(es) configurado(s)\n🟢 **Activos:** ${activeChannels.length} • 🔴 **Inactivos:** ${inactiveChannels.length}`)
            .setColor(0x5865f2)
            .setThumbnail(message.guild!.iconURL({ size: 128 }) || null)
            .setFooter({
                text: `📅 Actualizado • ${message.guild!.name}`,
                iconURL: message.guild!.iconURL({ size: 32 }) || undefined
            })
            .setTimestamp();

        // Añadir campos de canales activos
        if (activeChannels.length > 0) {
            const activeList = activeChannels.slice(0, 10).map(c => 
                `**${c.index}.** ${c.channelName}\n` +
                `└ \`${c.blockName}\` • ${c.blockStatus}\n` +
                `└ 📈 **${c.pointsCount}** puntos otorgados\n` +
                `└ 📅 Desde: ${c.createdDate}`
            ).join('\n\n');

            mainEmbed.addFields([
                {
                    name: `🟢 Canales Activos (${activeChannels.length})`,
                    value: activeList || "Ninguno",
                    inline: false
                }
            ]);
        }

        // Añadir campos de canales inactivos (si los hay)
        if (inactiveChannels.length > 0) {
            const inactiveList = inactiveChannels.slice(0, 5).map(c => 
                `**${c.index}.** ${c.channelName}\n` +
                `└ \`${c.blockName}\` • ${c.blockStatus}`
            ).join('\n\n');

            mainEmbed.addFields([
                {
                    name: `🔴 Canales Inactivos (${inactiveChannels.length})`,
                    value: inactiveList || "Ninguno",
                    inline: false
                }
            ]);
        }

        // Añadir estadísticas generales
        mainEmbed.addFields([
            {
                name: "📊 Estadísticas del Servidor",
                value: `🧩 **Bloques disponibles:** ${availableBlocks}\n📈 **Total puntos otorgados:** ${totalPointsHistory}\n⚡ **Canales más activos:** ${channelDetails.sort((a, b) => b.pointsCount - a.pointsCount).slice(0, 3).map((c, i) => `${i + 1}. ${c.channelName.replace(/[#❌*]/g, '').trim()}`).join(', ') || 'N/A'}`,
                inline: false
            }
        ]);

        // Botones de acción
        const actionRow1 = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: ButtonStyle.Success,
                    label: "➕ Añadir Canal",
                    custom_id: "add_channel",
                    emoji: { name: "🔧" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Danger,
                    label: "🗑️ Eliminar Canal",
                    custom_id: "remove_channel",
                    emoji: { name: "🗑️" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Primary,
                    label: "🔄 Actualizar",
                    custom_id: "refresh_list",
                    emoji: { name: "🔄" }
                }
            ]
        };

        const actionRow2 = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "📊 Estadísticas",
                    custom_id: "show_stats",
                    emoji: { name: "📈" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "🧩 Ver Bloques",
                    custom_id: "show_blocks",
                    emoji: { name: "🧩" }
                },
                {
                    type: 2,
                    style: ButtonStyle.Secondary,
                    label: "❓ Ayuda",
                    custom_id: "show_help",
                    emoji: { name: "📖" }
                }
            ]
        };

        const response = await message.reply({
            embeds: [mainEmbed],
            components: [actionRow1, actionRow2]
        });

        // Collector para manejar interacciones
        const collector = response.createMessageComponentCollector({
            time: 600000, // 10 minutos
            filter: (i) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction) => {
            switch (interaction.customId) {
                case "add_channel":
                    await interaction.reply({
                        content: "➕ **Añadir Canal**\n\nUsa el comando: `!setchannel-alliance`\n\nEste comando te guiará para configurar un nuevo canal de alianzas.",
                        flags: 64 // Ephemeral
                    });
                    break;

                case "remove_channel":
                    await interaction.reply({
                        content: "🗑️ **Eliminar Canal**\n\nUsa el comando: `!removechannel-alliance`\n\nEste comando te permitirá eliminar canales de la configuración de alianzas.",
                        flags: 64 // Ephemeral
                    });
                    break;

                case "refresh_list":
                    await interaction.reply({
                        content: "🔄 **Lista Actualizada**\n\nUsa el comando nuevamente: `!listchannels-alliance`\n\nEsto mostrará la información más reciente.",
                        flags: 64 // Ephemeral
                    });
                    break;

                case "show_stats":
                    const detailedStats = channelDetails.map(c => 
                        `• ${c.channelName}: **${c.pointsCount}** puntos`
                    ).join('\n');

                    await interaction.reply({
                        content: `📊 **Estadísticas Detalladas**\n\n**Puntos por Canal:**\n${detailedStats}\n\n**Total del Servidor:** ${totalPointsHistory} puntos`,
                        flags: 64 // Ephemeral
                    });
                    break;

                case "show_blocks":
                    const blocksList = await client.prisma.blockV2Config.findMany({
                        where: { guildId: message.guildId! },
                        select: { name: true, id: true }
                    });

                    const blocksText = blocksList.length > 0 
                        ? blocksList.map((block: any, i: number) => `${i + 1}. \`${block.name}\``).join('\n')
                        : "No hay bloques configurados";

                    await interaction.reply({
                        content: `🧩 **Bloques Disponibles (${blocksList.length})**\n\n${blocksText}\n\n💡 Crea bloques con: \`!blockcreate <nombre>\``,
                        flags: 64 // Ephemeral
                    });
                    break;

                case "show_help":
                    await interaction.reply({
                        content: `📖 **Ayuda - Sistema de Alianzas**\n\n**Comandos principales:**\n• \`!setchannel-alliance\` - Configurar canal\n• \`!removechannel-alliance\` - Eliminar canal\n• \`!listchannels-alliance\` - Ver configurados\n\n**Comandos de bloques:**\n• \`!blockcreate <nombre>\` - Crear bloque\n• \`!blockeditv2 <nombre>\` - Editar bloque\n• \`!embedlist\` - Ver todos los bloques`,
                        flags: 64 // Ephemeral
                    });
                    break;
            }
        });

        collector.on("end", async () => {
            try {
                await response.edit({
                    components: [] // Remover botones cuando expire
                });
            } catch (error) {
                // Ignorar errores si el mensaje fue eliminado
            }
        });
    }
}
