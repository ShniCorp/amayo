import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: "displaydemo",
    type: "message",
    aliases: ["ddemo", "componentsdemo"],
    cooldown: 10,
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        // 🎯 DEMOSTRACIÓN COMPLETA DE DISPLAYCOMPONENTS CON ACCESORIOS

        // Panel principal con accessory de thumbnail
        const mainPanel = {
            type: 17, // Container
            accent_color: 0x5865f2,
            components: [
                {
                    type: 10, // TextDisplay
                    content: "🎨 **Demostración de DisplayComponents Avanzados**"
                },
                {
                    type: 14, // Separator
                    divider: true,
                    spacing: 2
                },
                // Sección con accessory de botón
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10,
                            content: "🔘 **Sección con Botón Accesorio**\n\nEste texto aparece junto a un botón como accesorio. Los accesorios permiten añadir elementos interactivos sin ocupar una fila completa."
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        style: 1, // Primary
                        label: "Acción Rápida",
                        custom_id: "quick_action",
                        emoji: { name: "⚡" }
                    }
                },
                {
                    type: 14,
                    divider: true,
                    spacing: 1
                },
                // Sección con accessory de thumbnail
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10,
                            content: "🖼️ **Sección con Thumbnail**\n\nAquí se muestra texto con una imagen en miniatura como accesorio. Perfecto para mostrar íconos de servidores, avatares o logotipos."
                        }
                    ],
                    accessory: {
                        type: 11, // Thumbnail
                        media: { 
                            url: message.guild?.iconURL({ forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png"
                        }
                    }
                },
                {
                    type: 14,
                    divider: true,
                    spacing: 1
                },
                // Sección con accessory de link button
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10,
                            content: "🔗 **Sección con Botón de Enlace**\n\nEste tipo de accesorio permite enlaces externos directos sin necesidad de interacciones complejas."
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        style: 5, // Link
                        label: "Ir a Discord",
                        url: "https://discord.com",
                        emoji: { name: "🚀" }
                    }
                }
            ]
        };

        // Fila de botones normales para interacción
        const actionRow = {
            type: 1, // ActionRow
            components: [
                {
                    type: 2,
                    style: 3, // Success
                    label: "✨ Más Ejemplos",
                    custom_id: "show_more_examples"
                },
                {
                    type: 2,
                    style: 2, // Secondary
                    label: "🔄 Cambiar Estilos",
                    custom_id: "change_styles"
                },
                {
                    type: 2,
                    style: 4, // Danger
                    label: "❌ Cerrar",
                    custom_id: "close_demo"
                }
            ]
        };

        const demoMessage = await message.reply({
            flags: 4096, // SuppressEmbeds
            components: [mainPanel, actionRow]
        });

        const collector = demoMessage.createMessageComponentCollector({
            time: 300000, // 5 minutos
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            switch (interaction.customId) {
                case "quick_action":
                    await interaction.reply({
                        content: "⚡ **Acción Rápida Ejecutada!**\n\nEste botón estaba como accesorio en una sección.",
                        flags: 64 // Ephemeral
                    });
                    break;

                case "show_more_examples":
                    // Panel con múltiples ejemplos de accesorios
                    const examplesPanel = {
                        type: 17,
                        accent_color: 0xff9500,
                        components: [
                            {
                                type: 10,
                                content: "🎯 **Más Ejemplos de Accesorios**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 2
                            },
                            // Ejemplo con avatar del usuario
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: `👤 **Perfil de ${message.author.username}**\n\nEjemplo usando tu avatar como thumbnail accesorio.`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: { 
                                        url: message.author.displayAvatarURL({ forceStatic: false })
                                    }
                                }
                            },
                            {
                                type: 14,
                                divider: false,
                                spacing: 1
                            },
                            // Ejemplo con botón de estilo diferente
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "🎨 **Botones con Diferentes Estilos**\n\nLos accesorios pueden tener distintos estilos y emojis personalizados."
                                    }
                                ],
                                accessory: {
                                    type: 2,
                                    style: 4, // Danger
                                    label: "Peligro",
                                    custom_id: "danger_button",
                                    emoji: { name: "⚠️" }
                                }
                            },
                            {
                                type: 14,
                                divider: false,
                                spacing: 1
                            },
                            // Imagen como accessory
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "🖼️ **Imágenes Personalizadas**\n\nTambién puedes usar imágenes personalizadas, íconos de servidores invitados, etc."
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: { 
                                        url: "https://cdn.discordapp.com/attachments/123/456/discord-logo.png"
                                    }
                                }
                            }
                        ]
                    };

                    await interaction.update({
                        components: [examplesPanel, {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 2, // Secondary
                                    label: "↩️ Volver",
                                    custom_id: "back_to_main"
                                }
                            ]
                        }]
                    });
                    break;

                case "change_styles":
                    // Panel mostrando diferentes combinaciones de estilos
                    const stylesPanel = {
                        type: 17,
                        accent_color: 0x57f287,
                        components: [
                            {
                                type: 10,
                                content: "🎨 **Galería de Estilos**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 2
                            },
                            // Botón Primary como accesorio
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "🔵 **Botón Primary (Azul)**\nEstilo: 1 - Para acciones principales"
                                    }
                                ],
                                accessory: {
                                    type: 2,
                                    style: 1, // Primary
                                    label: "Principal",
                                    custom_id: "style_primary"
                                }
                            },
                            // Botón Secondary como accesorio  
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "⚫ **Botón Secondary (Gris)**\nEstilo: 2 - Para acciones secundarias"
                                    }
                                ],
                                accessory: {
                                    type: 2,
                                    style: 2, // Secondary
                                    label: "Secundario",
                                    custom_id: "style_secondary"
                                }
                            },
                            // Botón Success como accesorio
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "🟢 **Botón Success (Verde)**\nEstilo: 3 - Para confirmar acciones"
                                    }
                                ],
                                accessory: {
                                    type: 2,
                                    style: 3, // Success
                                    label: "Confirmar",
                                    custom_id: "style_success"
                                }
                            },
                            // Botón Danger como accesorio
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: "🔴 **Botón Danger (Rojo)**\nEstilo: 4 - Para acciones destructivas"
                                    }
                                ],
                                accessory: {
                                    type: 2,
                                    style: 4, // Danger
                                    label: "Eliminar",
                                    custom_id: "style_danger"
                                }
                            }
                        ]
                    };

                    await interaction.update({
                        components: [stylesPanel, {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    style: 2,
                                    label: "↩️ Volver",
                                    custom_id: "back_to_main"
                                }
                            ]
                        }]
                    });
                    break;

                case "danger_button":
                case "style_primary":
                case "style_secondary":
                case "style_success":
                case "style_danger":
                    await interaction.reply({
                        content: `🎯 **Botón ${interaction.customId.replace('style_', '').replace('_', ' ')} activado!**\n\nEste botón era un accesorio de una sección.`,
                        flags: 64 // Ephemeral
                    });
                    break;

                case "back_to_main":
                    await interaction.update({
                        components: [mainPanel, actionRow]
                    });
                    break;

                case "close_demo":
                    const closedPanel = {
                        type: 17,
                        accent_color: 0x36393f,
                        components: [
                            {
                                type: 10,
                                content: "✅ **Demostración Finalizada**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 1
                            },
                            {
                                type: 10,
                                content: "Gracias por probar DisplayComponents con accesorios!\n\n💡 **Recuerda:** Los accesorios son ideales para:\n• Botones de acción rápida\n• Thumbnails e íconos\n• Enlaces externos\n• Elementos decorativos"
                            }
                        ]
                    };

                    await interaction.update({
                        components: [closedPanel]
                    });
                    collector.stop();
                    break;
            }
        });

        collector.on("end", async (collected: any, reason: string) => {
            if (reason === "time") {
                try {
                    const timeoutPanel = {
                        type: 17,
                        accent_color: 0x36393f,
                        components: [
                            {
                                type: 10,
                                content: "⏰ **Demostración Expirada**"
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 1
                            },
                            {
                                type: 10,
                                content: "La demostración ha expirado por inactividad.\nUsa `!displaydemo` nuevamente para verla."
                            }
                        ]
                    };

                    await demoMessage.edit({
                        components: [timeoutPanel]
                    });
                } catch (error) {
                    // Mensaje eliminado o error de edición
                }
            }
        });
    },
};
