import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: "eliminar-embed",
    type: "message",
    aliases: ["embed-eliminar", "borrar-embed", "embeddelete"],
    cooldown: 10,
    run: async (message: any, args: string[], client: any) => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        // Obtener todos los bloques del servidor
        const blocks = await client.prisma.blockV2Config.findMany({
            where: { guildId: message.guildId! },
            select: { name: true, id: true }
        });

        if (blocks.length === 0) {
            const noBlocksEmbed = {
                color: 0xf04747,
                title: "🗂️ Panel de Eliminación de Bloques",
                description: "📭 **No hay bloques disponibles**\n\nNo se encontraron bloques para eliminar en este servidor.\n\nPuedes crear nuevos bloques usando `!blockcreate`.",
                footer: {
                    text: "Sistema de gestión de bloques • Amayo Bot"
                }
            };

            await message.reply({
                embeds: [noBlocksEmbed]
            });
            return;
        }

        // Crear opciones para el select menu
        const selectOptions = blocks.slice(0, 25).map((block: any, index: number) => ({
            label: block.name,
            value: block.name,
            description: `ID: ${block.id}`,
            emoji: index < 10 ? { name: `${index + 1}️⃣` } : { name: "📄" }
        }));

        // Crear embed principal de eliminación
        const deleteEmbed = {
            color: 0xff6b35,
            title: "🗑️ Panel de Eliminación de Bloques",
            description: `📊 **${blocks.length} bloque(s) encontrado(s)**\n\n⚠️ **ADVERTENCIA:** La eliminación es permanente e irreversible.\n\nSelecciona el bloque que deseas eliminar del menú de abajo:`,
            footer: {
                text: "Selecciona un bloque para eliminar • Timeout: 5 minutos"
            }
        };

        const actionRow = {
            type: 1,
            components: [
                {
                    type: 3, // StringSelect
                    custom_id: "delete_block_select",
                    placeholder: "🗑️ Selecciona un bloque para eliminar...",
                    min_values: 1,
                    max_values: 1,
                    options: selectOptions
                }
            ]
        };

        const cancelRow = {
            type: 1,
            components: [
                {
                    type: 2, // Button
                    style: 4, // Danger
                    label: "❌ Cancelar",
                    custom_id: "cancel_delete"
                }
            ]
        };

        const panelMessage = await message.reply({
            embeds: [deleteEmbed],
            components: [actionRow, cancelRow]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 300000, // 5 minutos
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            if (interaction.customId === "cancel_delete") {
                const canceledEmbed = {
                    color: 0x36393f,
                    title: "❌ Operación Cancelada",
                    description: "La eliminación de bloques ha sido cancelada.\nNingún bloque fue eliminado.",
                    footer: { text: "Operación cancelada por el usuario" }
                };

                await interaction.update({
                    embeds: [canceledEmbed],
                    components: []
                });

                collector.stop("cancelled");
                return;
            }

            if (interaction.customId === "delete_block_select" && interaction.isStringSelectMenu()) {
                const selectedBlock = interaction.values[0];

                const confirmationEmbed = {
                    color: 0xf04747,
                    title: "⚠️ CONFIRMAR ELIMINACIÓN",
                    description: `🗑️ **Bloque a eliminar:** \`${selectedBlock}\`\n\n❗ **ESTA ACCIÓN ES IRREVERSIBLE**\n\nUna vez eliminado, no podrás recuperar:\n• Toda la configuración del bloque\n• Los componentes y contenido\n• Las imágenes y colores personalizados\n\n¿Estás seguro de que quieres continuar?`,
                    footer: { text: "⚠️ Acción irreversible - Piénsalo bien" }
                };

                const confirmationRow = {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 4, // Danger
                            label: "🗑️ SÍ, ELIMINAR",
                            custom_id: `confirm_delete_${selectedBlock}`
                        },
                        {
                            type: 2,
                            style: 2, // Secondary
                            label: "↩️ Volver Atrás",
                            custom_id: "back_to_selection"
                        }
                    ]
                };

                await interaction.update({
                    embeds: [confirmationEmbed],
                    components: [confirmationRow]
                });
                return;
            }

            if (interaction.customId.startsWith("confirm_delete_")) {
                const blockName = interaction.customId.replace("confirm_delete_", "");

                try {
                    await client.prisma.blockV2Config.delete({
                        where: {
                            guildId_name: {
                                guildId: message.guildId!,
                                name: blockName,
                            },
                        },
                    });

                    const successEmbed = {
                        color: 0x57f287,
                        title: "✅ Eliminación Exitosa",
                        description: `🗑️ **Bloque eliminado:** \`${blockName}\`\n\n✨ El bloque ha sido eliminado permanentemente de la base de datos.\n\n📋 Para ver los bloques restantes, usa: \`!embedlist\`\n📝 Para crear un nuevo bloque, usa: \`!blockcreate\``,
                        footer: { text: "Bloque eliminado exitosamente" }
                    };

                    await interaction.update({
                        embeds: [successEmbed],
                        components: []
                    });

                    collector.stop("success");

                } catch (error) {
                    const errorEmbed = {
                        color: 0xf04747,
                        title: "❌ Error en la Eliminación",
                        description: `🔍 **Bloque no encontrado:** \`${blockName}\`\n\n💭 Posibles causas:\n• El bloque ya fue eliminado\n• Error de conexión con la base de datos\n• El nombre del bloque cambió\n\n🔄 Intenta refrescar la lista con \`!embedlist\``,
                        footer: { text: "Error de eliminación" }
                    };

                    await interaction.update({
                        embeds: [errorEmbed],
                        components: []
                    });

                    collector.stop("error");
                }
                return;
            }

            if (interaction.customId === "back_to_selection") {
                await interaction.update({
                    embeds: [deleteEmbed],
                    components: [actionRow, cancelRow]
                });
                return;
            }
        });

        collector.on("end", async (collected: any, reason: string) => {
            if (reason === "time") {
                const timeoutEmbed = {
                    color: 0x36393f,
                    title: "⏰ Tiempo Agotado",
                    description: "El panel de eliminación ha expirado por inactividad.\nUsa el comando nuevamente si necesitas eliminar bloques.",
                    footer: { text: "Panel expirado por inactividad" }
                };

                try {
                    await panelMessage.edit({
                        embeds: [timeoutEmbed],
                        components: []
                    });
                } catch (error) {
                    // Mensaje ya eliminado o error de edición
                }
            }
        });
    },
};
