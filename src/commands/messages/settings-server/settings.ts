import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: 'configuracion',
    type: "message",
    aliases: ['config', 'ajustes', 'settings'],
    cooldown: 5,
    description: 'Abre el panel de configuración del servidor (prefix y más).',
    category: 'Configuración',
    usage: 'configuracion',
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        const server = await client.prisma.guild.findFirst({
            where: { id: message.guild!.id }
        });

        const currentPrefix = server?.prefix || "!";

        // Panel de configuración usando DisplayComponents
        const settingsPanel = {
            type: 17,
            accent_color: 6178018, // Color del ejemplo
            components: [
                {
                    type: 10,
                    content: "### <:invisible:1418684224441028608> 梅，panel admin，📢\n"
                },
                {
                    type: 14,
                    spacing: 1,
                    divider: false
                },
                {
                    type: 10,
                    content: "Configuracion del Servidor:"
                },
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10,
                            content: `**Prefix:**<:invisible:1418684224441028608>\`${currentPrefix}\``
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        style: 2, // Secondary
                        emoji: {
                            name: "⚙️"
                        },
                        custom_id: "open_prefix_modal",
                        label: "Cambiar"
                    }
                },
                {
                    type: 14,
                    divider: false
                }
            ]
        };

        const panelMessage = await message.reply({
            flags: 32768, // SuppressEmbeds
            components: [settingsPanel]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 300000, // 5 minutos
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            if (interaction.customId === "open_prefix_modal") {
                // Crear y mostrar modal para cambiar prefix
                const prefixModal = {
                    title: "⚙️ Configurar Prefix del Servidor",
                    custom_id: "prefix_settings_modal",
                    components: [
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 4, // TextInput
                                    custom_id: "new_prefix_input",
                                    label: "Nuevo Prefix",
                                    style: 1, // Short
                                    placeholder: `Prefix actual: ${currentPrefix}`,
                                    required: true,
                                    max_length: 10,
                                    min_length: 1,
                                    value: currentPrefix
                                }
                            ]
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 4,
                                    custom_id: "prefix_description",
                                    label: "¿Por qué cambiar el prefix? (Opcional)",
                                    style: 2, // Paragraph
                                    placeholder: "Ej: Evitar conflictos con otros bots...",
                                    required: false,
                                    max_length: 200
                                }
                            ]
                        }
                    ]
                };

                await interaction.showModal(prefixModal);

                // Crear un collector específico para este modal
                const modalCollector = interaction.awaitModalSubmit({
                    time: 300000, // 5 minutos
                    filter: (modalInt: any) => modalInt.customId === "prefix_settings_modal" && modalInt.user.id === message.author.id
                });

                modalCollector.then(async (modalInteraction: any) => {
                    const newPrefix = modalInteraction.fields.getTextInputValue("new_prefix_input");
                    const description = modalInteraction.fields.getTextInputValue("prefix_description") || "Sin descripción";

                    // Validar prefix
                    if (!newPrefix || newPrefix.length > 10) {
                        await modalInteraction.reply({
                            content: "❌ **Error:** El prefix debe tener entre 1 y 10 caracteres.",
                            flags: 64 // Ephemeral
                        });
                        return;
                    }

                    try {
                        // Actualizar prefix en la base de datos
                        await client.prisma.guild.upsert({
                            where: { id: message.guild!.id },
                            create: {
                                id: message.guild!.id,
                                name: message.guild!.name,
                                prefix: newPrefix
                            },
                            update: {
                                prefix: newPrefix,
                                name: message.guild!.name
                            }
                        });

                        // Panel de confirmación
                        const successPanel = {
                            type: 17,
                            accent_color: 3066993, // Verde
                            components: [
                                {
                                    type: 10,
                                    content: "### ✅ **Prefix Actualizado Exitosamente**"
                                },
                                {
                                    type: 14,
                                    spacing: 2,
                                    divider: true
                                },
                                {
                                    type: 9,
                                    components: [
                                        {
                                            type: 10,
                                            content: `**Prefix anterior:** \`${currentPrefix}\`\n**Prefix nuevo:** \`${newPrefix}\`\n\n**Motivo:** ${description}`
                                        }
                                    ],
                                    accessory: {
                                        type: 2,
                                        style: 3, // Success
                                        label: "✓ Listo",
                                        custom_id: "prefix_confirmed",
                                        emoji: { name: "✅" }
                                    }
                                },
                                {
                                    type: 14,
                                    spacing: 1,
                                    divider: false
                                },
                                {
                                    type: 10,
                                    content: "🚀 **¡Listo!** Ahora puedes usar los comandos con el nuevo prefix.\n\n💡 **Ejemplo:** `" + newPrefix + "help`, `" + newPrefix + "embedlist`"
                                }
                            ]
                        };

                        // Botón para volver al panel principal
                        const backToSettingsRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 2, // Secondary
                                    label: "↩️ Volver a Configuración",
                                    custom_id: "back_to_settings"
                                }
                            ]
                        };

                        // Actualizar el panel original
                        await modalInteraction.update({
                            components: [successPanel, backToSettingsRow]
                        });

                    } catch (error) {
                        const errorPanel = {
                            type: 17,
                            accent_color: 15548997, // Rojo
                            components: [
                                {
                                    type: 10,
                                    content: "### ❌ **Error al Actualizar Prefix**"
                                },
                                {
                                    type: 14,
                                    spacing: 2,
                                    divider: true
                                },
                                {
                                    type: 10,
                                    content: `**Error:** No se pudo actualizar el prefix a \`${newPrefix}\`\n\n**Posibles causas:**\n• Error de conexión con la base de datos\n• Prefix contiene caracteres no válidos\n• Permisos insuficientes\n\n🔄 **Solución:** Intenta nuevamente con un prefix diferente.`
                                }
                            ]
                        };

                        const retryRow = {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 2,
                                    label: "🔄 Reintentar",
                                    custom_id: "open_prefix_modal"
                                },
                                {
                                    type: 2,
                                    style: 4, // Danger
                                    label: "❌ Cancelar",
                                    custom_id: "cancel_prefix_change"
                                }
                            ]
                        };

                        await modalInteraction.update({
                            components: [errorPanel, retryRow]
                        });
                    }
                }).catch(async (error: any) => {
                    // Modal timeout o cancelado
                    logger.info("Modal timeout o error:", error.message);
                });
            }

            // Manejar botones adicionales
            if (interaction.customId === "back_to_settings") {
                // Volver al panel principal
                const updatedServer = await client.prisma.guild.findFirst({
                    where: { id: message.guild!.id }
                });
                const newCurrentPrefix = updatedServer?.prefix || "!";

                const updatedSettingsPanel = {
                    type: 17,
                    accent_color: 6178018,
                    components: [
                        {
                            type: 10,
                            content: "### <:invisible:1418684224441028608> 梅，panel admin，📢\n"
                        },
                        {
                            type: 14,
                            spacing: 1,
                            divider: false
                        },
                        {
                            type: 10,
                            content: "Configuracion del Servidor:"
                        },
                        {
                            type: 9,
                            components: [
                                {
                                    type: 10,
                                    content: `**Prefix:** \`${newCurrentPrefix}\``
                                }
                            ],
                            accessory: {
                                type: 2,
                                style: 2,
                                emoji: { name: "⚙️" },
                                custom_id: "open_prefix_modal",
                                label: "Cambiar"
                            }
                        },
                        {
                            type: 14,
                            divider: false
                        }
                    ]
                };

                await interaction.update({
                    components: [updatedSettingsPanel]
                });
            }

            if (interaction.customId === "cancel_prefix_change") {
                // Volver al panel original sin cambios
                await interaction.update({
                    components: [settingsPanel]
                });
            }
        });

        collector.on("end", async (collected: any, reason: string) => {
            if (reason === "time") {
                const timeoutPanel = {
                    type: 17,
                    accent_color: 6178018,
                    components: [
                        {
                            type: 10,
                            content: "### ⏰ **Panel Expirado**"
                        },
                        {
                            type: 14,
                            spacing: 1,
                            divider: true
                        },
                        {
                            type: 10,
                            content: "El panel de configuración ha expirado por inactividad.\n\nUsa `!settings` para abrir un nuevo panel."
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
};
