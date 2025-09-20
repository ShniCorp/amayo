import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: "lista-embeds",
    type: "message",
    aliases: ["embeds", "ver-embeds", "embedlist"],
    cooldown: 10,
    run: async (message: any, args: string[], client: any) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const blocks = await client.prisma.blockV2Config.findMany({
            where: { guildId: message.guildId! },
            select: {
                name: true,
                id: true,
                config: true
            },
            orderBy: { name: 'asc' }
        });

        if (blocks.length === 0) {
            const emptyEmbed = {
                color: 0x5865f2,
                title: "📚 Centro de Gestión de Bloques",
                description: "📭 **No hay bloques disponibles**\n\nEste servidor aún no tiene bloques configurados.\n\n🚀 **¿Quieres empezar?**\n• Usa `!crear-embed <nombre>` para crear tu primer bloque\n• Usa `!editar-embed <nombre>` para editar bloques existentes",
                footer: { text: "Sistema de gestión de bloques • Amayo Bot" }
            };

            const createRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: "📝 Crear Primer Bloque",
                        custom_id: "show_create_help"
                    }
                ]
            };

            const helpMessage = await message.reply({
                embeds: [emptyEmbed],
                components: [createRow]
            });

            const helpCollector = helpMessage.createMessageComponentCollector({
                time: 60000,
                filter: (i: any) => i.user.id === message.author.id
            });

            helpCollector.on("collect", async (interaction: any) => {
                if (interaction.customId === "show_create_help") {
                    const helpEmbed = {
                        color: 0x57f287,
                        title: "📖 Guía de Creación de Bloques",
                        description: "🔧 **Comandos disponibles:**\n\n• `!crear-embed <nombre>` - Crear nuevo bloque\n• `!editar-embed <nombre>` - Editar bloque existente\n• `!eliminar-embed <nombre>` - Eliminar bloque\n• `!lista-embeds` - Ver todos los bloques\n\n💡 **Tip:** Los bloques permiten crear interfaces modernas e interactivas.",
                        footer: { text: "Guía de comandos de creación" }
                    };

                    await interaction.update({
                        embeds: [helpEmbed],
                        components: []
                    });
                }
            });

            return;
        }

        // Dividir bloques en páginas de 5
        const itemsPerPage = 5;
        const totalPages = Math.ceil(blocks.length / itemsPerPage);
        let currentPage = 0;

        const generateBlockListEmbed = (page: number) => {
            const startIndex = page * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, blocks.length);
            const pageBlocks = blocks.slice(startIndex, endIndex);

            let blockListText = `📊 **Página ${page + 1} de ${totalPages}** (${blocks.length} total)\n\n`;

            pageBlocks.forEach((block: any, index: number) => {
                const globalIndex = startIndex + index + 1;
                const componentsCount = Array.isArray(block.config?.components) ? block.config.components.length : 0;
                const hasImage = block.config?.coverImage ? "🖼️" : "";

                blockListText += `**${globalIndex}.** \`${block.name}\` ${hasImage}\n`;
                blockListText += `   └ ${componentsCount} componente(s) • ID: ${block.id.slice(-8)}\n\n`;
            });

            return {
                color: 0x5865f2,
                title: "📚 Centro de Gestión de Bloques",
                description: blockListText,
                footer: { text: `Página ${page + 1}/${totalPages} • ${blocks.length} bloques total` }
            };
        };

        const generateActionRows = (page: number) => {
            const rows = [];

            // Select menu para acciones rápidas
            const currentPageBlocks = blocks.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
            if (currentPageBlocks.length > 0) {
                const selectOptions = currentPageBlocks.map((block: any) => ({
                    label: block.name,
                    value: block.name,
                    description: `${Array.isArray(block.config?.components) ? block.config.components.length : 0} componente(s)`,
                    emoji: { name: "⚙️" }
                }));

                rows.push({
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: "block_actions_select",
                            placeholder: "⚙️ Selecciona un bloque para gestionar...",
                            options: selectOptions
                        }
                    ]
                });
            }

            // Botones de navegación y acciones generales
            const navigationRow: any = {
                type: 1,
                components: []
            };

            // Navegación
            if (totalPages > 1) {
                navigationRow.components.push({
                    type: 2,
                    style: 2,
                    label: "◀️ Anterior",
                    custom_id: "prev_page",
                    disabled: page === 0
                });

                navigationRow.components.push({
                    type: 2,
                    style: 2,
                    label: `${page + 1}/${totalPages}`,
                    custom_id: "page_info",
                    disabled: true
                });

                navigationRow.components.push({
                    type: 2,
                    style: 2,
                    label: "▶️ Siguiente",
                    custom_id: "next_page",
                    disabled: page === totalPages - 1
                });
            }

            // Botón de refrescar
            navigationRow.components.push({
                type: 2,
                style: 1,
                label: "🔄 Refrescar",
                custom_id: "refresh_list"
            });

            rows.push(navigationRow);

            // Acciones principales
            const actionsRow = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        label: "📝 Crear Nuevo",
                        custom_id: "show_create_commands"
                    },
                    {
                        type: 2,
                        style: 2,
                        label: "📋 Exportar Lista",
                        custom_id: "export_block_list"
                    },
                    {
                        type: 2,
                        style: 4,
                        label: "🗑️ Eliminar",
                        custom_id: "show_delete_commands"
                    }
                ]
            };

            rows.push(actionsRow);

            return rows;
        };

        const panelMessage = await message.reply({
            embeds: [generateBlockListEmbed(currentPage)],
            components: generateActionRows(currentPage)
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 600000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            switch (interaction.customId) {
                case "prev_page":
                    if (currentPage > 0) {
                        currentPage--;
                        await interaction.update({
                            embeds: [generateBlockListEmbed(currentPage)],
                            components: generateActionRows(currentPage)
                        });
                    }
                    break;

                case "next_page":
                    if (currentPage < totalPages - 1) {
                        currentPage++;
                        await interaction.update({
                            embeds: [generateBlockListEmbed(currentPage)],
                            components: generateActionRows(currentPage)
                        });
                    }
                    break;

                case "refresh_list":
                    // Recargar datos
                    const refreshedBlocks = await client.prisma.blockV2Config.findMany({
                        where: { guildId: message.guildId! },
                        select: {
                            name: true,
                            id: true,
                            config: true
                        },
                        orderBy: { name: 'asc' }
                    });

                    blocks.length = 0;
                    blocks.push(...refreshedBlocks);

                    const newTotalPages = Math.ceil(blocks.length / itemsPerPage);
                    if (currentPage >= newTotalPages) {
                        currentPage = Math.max(0, newTotalPages - 1);
                    }

                    await interaction.update({
                        embeds: [generateBlockListEmbed(currentPage)],
                        components: generateActionRows(currentPage)
                    });
                    break;

                case "block_actions_select":
                    if (interaction.isStringSelectMenu()) {
                        const selectedBlock = interaction.values[0];

                        const blockActionEmbed = {
                            color: 0xff9500,
                            title: `⚙️ Gestión de Bloque: \`${selectedBlock}\``,
                            description: "Selecciona la acción que deseas realizar con este bloque:",
                            footer: { text: "Acciones disponibles para el bloque seleccionado" }
                        };

                        const blockActionsRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 1,
                                    label: "✏️ Editar",
                                    custom_id: `edit_block_${selectedBlock}`
                                },
                                {
                                    type: 2,
                                    style: 2,
                                    label: "👁️ Vista Previa",
                                    custom_id: `preview_block_${selectedBlock}`
                                },
                                {
                                    type: 2,
                                    style: 2,
                                    label: "📋 Duplicar",
                                    custom_id: `duplicate_block_${selectedBlock}`
                                },
                                {
                                    type: 2,
                                    style: 4,
                                    label: "🗑️ Eliminar",
                                    custom_id: `delete_block_${selectedBlock}`
                                }
                            ]
                        };

                        const backRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 2,
                                    label: "↩️ Volver a la Lista",
                                    custom_id: "back_to_list"
                                }
                            ]
                        };

                        await interaction.update({
                            embeds: [blockActionEmbed],
                            components: [blockActionsRow, backRow]
                        });
                    }
                    break;

                case "back_to_list":
                    await interaction.update({
                        embeds: [generateBlockListEmbed(currentPage)],
                        components: generateActionRows(currentPage)
                    });
                    break;

                case "show_create_commands":
                    await interaction.reply({
                        content: `🔧 **Crear nuevos bloques:**\n\n• \`!crear-embed <nombre>\` - Crear bloque básico\n• \`!editar-embed <nombre>\` - Editor avanzado\n\n💡 **Ejemplo:** \`!crear-embed bienvenida\`\n\n📖 **Guía completa:** Los bloques usan DisplayComponents para crear interfaces modernas e interactivas.`,
                        flags: 64
                    });
                    break;

                case "show_delete_commands":
                    await interaction.reply({
                        content: `⚠️ **Eliminar bloques:**\n\n• \`!eliminar-embed\` - Panel interactivo de eliminación\n• \`!eliminar-embed <nombre>\` - Eliminación directa\n\n❗ **Advertencia:** La eliminación es irreversible.`,
                        flags: 64
                    });
                    break;

                case "export_block_list":
                    const exportText = blocks.map((block: any, index: number) => {
                        const componentsCount = Array.isArray(block.config?.components) ? block.config.components.length : 0;
                        return `${index + 1}. ${block.name} (${componentsCount} componentes) - ID: ${block.id}`;
                    }).join('\n');

                    await interaction.reply({
                        content: `📋 **Lista Exportada:**\n\`\`\`\n${exportText}\`\`\``,
                        flags: 64
                    });
                    break;

                default:
                    // Manejar acciones específicas de bloques
                    if (interaction.customId.startsWith("edit_block_")) {
                        const blockName = interaction.customId.replace("edit_block_", "");
                        await interaction.reply({
                            content: `Usa: \`!editar-embed ${blockName}\``,
                            flags: 64
                        });
                    } else if (interaction.customId.startsWith("delete_block_")) {
                        const blockName = interaction.customId.replace("delete_block_", "");
                        await interaction.reply({
                            content: `Usa: \`!eliminar-embed ${blockName}\` para eliminar este bloque de forma segura.`,
                            flags: 64
                        });
                    } else if (interaction.customId.startsWith("preview_block_")) {
                        const blockName = interaction.customId.replace("preview_block_", "");
                        await interaction.reply({
                            content: `Vista previa de \`${blockName}\` - Funcionalidad en desarrollo`,
                            flags: 64
                        });
                    } else if (interaction.customId.startsWith("duplicate_block_")) {
                        const blockName = interaction.customId.replace("duplicate_block_", "");
                        await interaction.reply({
                            content: `Funcionalidad de duplicación de \`${blockName}\` en desarrollo`,
                            flags: 64
                        });
                    }
                    break;
            }
        });

        collector.on("end", async (collected: any, reason: string) => {
            if (reason === "time") {
                const timeoutEmbed = {
                    color: 0x36393f,
                    title: "⏰ Panel Expirado",
                    description: "El panel de gestión ha expirado por inactividad.\n\nUsa `!lista-embeds` para abrir un nuevo panel de gestión.",
                    footer: { text: "Panel expirado por inactividad" }
                };

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
    },
};