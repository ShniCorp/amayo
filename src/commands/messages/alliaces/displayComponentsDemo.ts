import {
    Message,
    ButtonInteraction, 
    MessageComponentInteraction,
    ComponentType,
    ButtonStyle,
    MessageFlags
} from "discord.js";
import { CommandMessage } from "../../../core/types/commands";
import type { 
    DisplayComponentContainer
} from "../../../core/types/displayComponents";
import type Amayo from "../../../core/client";

interface ActionRowBuilder {
    type: ComponentType.ActionRow;
    components: any[]; // Discord.js API components
}


export const command: CommandMessage = {
    name: "displaydemo",
    type: "message",
    aliases: ["ddemo", "componentsdemo"],
    cooldown: 10,
    description: "Demostración de DisplayComponents con accesorios y acciones.",
    category: "Alianzas",
    usage: "displaydemo",
    run: async (message: Message, _args: string[], _client: Amayo): Promise<void> => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        const mainPanel = createMainPanel(message);
        const actionRow = createActionRow();

        const demoMessage = await message.reply({
            // Enable Display Components V2 and suppress embeds
            flags: MessageFlags.SuppressEmbeds | 32768,
            components: [mainPanel, actionRow]
        });

        await handleDemoInteractions(demoMessage, message);
    },
};

function createMainPanel(message: Message): DisplayComponentContainer {
    return {
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
            // Section with button accessory
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
                    style: ButtonStyle.Primary,
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
            // Section with thumbnail accessory
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
            // Section with link button accessory
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
                    style: ButtonStyle.Link,
                    label: "Ir a Discord",
                    url: "https://discord.com",
                    emoji: { name: "🚀" }
                }
            }
        ]
    };
}

function createActionRow(): ActionRowBuilder {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                label: "✨ Más Ejemplos",
                custom_id: "show_more_examples"
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "🔄 Cambiar Estilos",
                custom_id: "change_styles"
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                label: "❌ Cerrar",
                custom_id: "close_demo"
            }
        ]
    };
}

async function handleDemoInteractions(demoMessage: Message, originalMessage: Message): Promise<void> {
    const collector = demoMessage.createMessageComponentCollector({
        time: 300000, // 5 minutes
        filter: (interaction: MessageComponentInteraction) => interaction.user.id === originalMessage.author.id
    });

    collector.on("collect", async (interaction: MessageComponentInteraction) => {
        try {
            if (interaction.isButton()) {
                switch (interaction.customId) {
                    case "quick_action":
                        await interaction.reply({
                            content: "⚡ **Acción Rápida Ejecutada!**\n\nEste botón estaba como accesorio en una sección.",
                            flags: 64
                        });
                        break;

                    case "show_more_examples":
                        await handleMoreExamples(interaction, originalMessage);
                        break;

                    case "change_styles":
                        await handleStylesDemo(interaction);
                        break;

                    case "back_to_main":
                        const mainPanel = createMainPanel(originalMessage);
                        const actionRow = createActionRow();
                        await interaction.update({
                            components: [mainPanel, actionRow]
                        });
                        break;

                    case "close_demo":
                        await handleCloseDemo(interaction);
                        collector.stop();
                        break;

                    default:
                        await handleStyleButtons(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error("Error handling demo interaction:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Ocurrió un error al procesar la interacción.",
                    flags: 64
                });
            }
        }
    });

    collector.on("end", async (collected, reason) => {
        if (reason === "time") {
            await handleDemoTimeout(demoMessage);
        }
    });
}

async function handleMoreExamples(interaction: ButtonInteraction, originalMessage: Message): Promise<void> {
    const examplesPanel: DisplayComponentContainer = {
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
            // Example with user avatar
            {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: `👤 **Perfil de ${originalMessage.author.username}**\n\nEjemplo usando tu avatar como thumbnail accesorio.`
                    }
                ],
                accessory: {
                    type: 11,
                    media: {
                        url: originalMessage.author.displayAvatarURL({ forceStatic: false })
                    }
                }
            },
            {
                type: 14,
                divider: false,
                spacing: 1
            },
            // Example with different button style
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
                    style: ButtonStyle.Danger,
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
            // Custom image as accessory
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
                        url: "https://cdn.discordapp.com/attachments/1234/5678/discord-logo.png"
                    }
                }
            }
        ]
    };

    const backRow: ActionRowBuilder = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "↩️ Volver",
                custom_id: "back_to_main"
            }
        ]
    };

    await interaction.update({
        components: [examplesPanel, backRow]
    });
}

async function handleStylesDemo(interaction: ButtonInteraction): Promise<void> {
    const stylesPanel: DisplayComponentContainer = {
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
            // Primary button as accessory
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
                    style: ButtonStyle.Primary,
                    label: "Principal",
                    custom_id: "style_primary"
                }
            },
            // Secondary button as accessory
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
                    style: ButtonStyle.Secondary,
                    label: "Secundario",
                    custom_id: "style_secondary"
                }
            },
            // Success button as accessory
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
                    style: ButtonStyle.Success,
                    label: "Confirmar",
                    custom_id: "style_success"
                }
            },
            // Danger button as accessory
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
                    style: ButtonStyle.Danger,
                    label: "Eliminar",
                    custom_id: "style_danger"
                }
            }
        ]
    };

    const backRow: ActionRowBuilder = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "↩️ Volver",
                custom_id: "back_to_main"
            }
        ]
    };

    await interaction.update({
        components: [stylesPanel, backRow]
    });
}

async function handleStyleButtons(interaction: ButtonInteraction): Promise<void> {
    const styleMap: Record<string, string> = {
        "danger_button": "Peligro",
        "style_primary": "Primary",
        "style_secondary": "Secondary",
        "style_success": "Success",
        "style_danger": "Danger"
    };

    const styleName = styleMap[interaction.customId];
    if (styleName) {
        await interaction.reply({
            content: `🎯 **Botón ${styleName} activado!**\n\nEste botón era un accesorio de una sección.`,
            flags: 64
        });
    }
}

async function handleCloseDemo(interaction: ButtonInteraction): Promise<void> {
    const closedPanel: DisplayComponentContainer = {
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
}

async function handleDemoTimeout(demoMessage: Message): Promise<void> {
    try {
        const timeoutPanel: DisplayComponentContainer = {
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
        // Message was deleted or other edit error - ignore
        console.log("Could not edit demo message on timeout, likely deleted");
    }
}
