import {
    ButtonInteraction,
    Message,
    MessageComponentInteraction,
    MessageFlags,
    TextChannel,
} from "discord.js";
import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import logger from "../../../core/lib/logger";
import {CommandMessage} from "../../../core/types/commands";
import {listVariables} from "../../../core/lib/vars";
import type Amayo from "../../../core/client";
import {BlockState, DisplayComponentUtils, EditorActionRow} from "../../../core/types/displayComponentEditor";
import type {DisplayComponentContainer} from "../../../core/types/displayComponents";

interface EditorData {
    content?: string;
    flags?: MessageFlags;
    display?: DisplayComponentContainer;
    components?: EditorActionRow[];
}

// Helper para actualizar el editor combinando Display Container dentro de components (tipado)
async function updateEditor(message: Message, data: EditorData): Promise<void> {
    const container = data.display;
    const rows = Array.isArray(data.components) ? data.components : [];
    const components = container ? [container, ...rows] : rows;

    const payload: any = { ...data };
    delete payload.display;
    payload.components = components;

    if (payload.flags === undefined) {
        payload.flags = MessageFlags.IsComponentsV2;
    }

    // Si usamos Components V2, no podemos incluir content
    if (payload.flags === MessageFlags.IsComponentsV2) {
        delete payload.content;
    }

    await message.edit(payload);
}

export const command: CommandMessage = {
    name: "crear-embed",
    type: "message",
    aliases: ["embed-crear", "nuevo-embed", "blockcreatev2"],
    cooldown: 20,
    description: "Crea un nuevo bloque/embedded con editor interactivo (DisplayComponents).",
    category: "Alianzas",
    usage: "crear-embed <nombre>",
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        const blockName = args[0]?.trim();
        if (!blockName) {
            await message.reply("Debes proporcionar un nombre. Uso: `!crear-embed <nombre>`");
            return;
        }

        // Check if block name already exists
        const existingBlock = await client.prisma.blockV2Config.findFirst({
            where: {
                guildId: message.guild!.id,
                name: blockName
            }
        });

        if (existingBlock) {
            await message.reply("❌ Ya existe un bloque con ese nombre!");
            return;
        }

        // Estado inicial
        let blockState: BlockState = {
            title: `Editor de Block: ${blockName}`,
            color: 0x5865f2,
            coverImage: undefined,
            components: [
                { type: 14, divider: false, spacing: 1 },
                { type: 10, content: "Usa los botones para configurar.", thumbnail: null }
            ]
        };

        //@ts-ignore
        const channelSend: If<boolean, GuildTextBasedChannel, TextBasedChannel> = message.channel;
        if (!channelSend?.isTextBased()) {
            await message.reply("❌ This command can only be used in a text-based channel.");
            return;
        }

        const editorMessage = await channelSend.send({
            content: "⚠️ **IMPORTANTE:** Prepara tus títulos, descripciones y URLs antes de empezar.\n" +
                     "Este editor usa **modales interactivos** y no podrás ver el chat mientras los usas.\n\n" +
                     "📝 **Recomendaciones:**\n" +
                     "• Ten preparados tus títulos y descripciones\n" +
                     "• Ten las URLs de imágenes listas para copiar\n" +
                     "• Los colores en formato HEX (#FF5733)\n" +
                     "• Las variables de usuario/servidor que necesites\n\n" +
                     "*Iniciando editor en 5 segundos...*"
        });

        // Esperar 5 segundos para que lean el mensaje
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Actualizar para mostrar el editor
        await updateEditor(editorMessage, {
            content: undefined,
            flags: MessageFlags.IsComponentsV2,
            display: await DisplayComponentUtils.renderPreview(blockState, message.member!, message.guild!),
            components: DisplayComponentUtils.createEditorButtons(false)
        });

        await handleEditorInteractions(editorMessage, message, client, blockName, blockState);
    },
};

async function handleEditorInteractions(
    editorMessage: Message,
    originalMessage: Message,
    client: Amayo,
    blockName: string,
    blockState: BlockState
): Promise<void> {
    const collector = editorMessage.createMessageComponentCollector({
        time: 3600000, // 1 hour
        filter: (interaction: MessageComponentInteraction) => interaction.user.id === originalMessage.author.id
    });

    collector.on("collect", async (interaction: MessageComponentInteraction) => {
        // Verificar que sea una interacción de botón
        if (!interaction.isButton()) return;

        try {
            await handleButtonInteraction(
                interaction,
                editorMessage,
                originalMessage,
                client,
                blockName,
                blockState
            );
        } catch (error) {
            //@ts-ignore
            logger.error("Error handling editor interaction:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Ocurrió un error al procesar la interacción.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    });

    collector.on("end", async (_collected, reason) => {
        if (reason === "time") {
            await handleEditorTimeout(editorMessage);
        }
    });
}

async function handleButtonInteraction(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    client: Amayo,
    blockName: string,
    blockState: BlockState
): Promise<void> {
    const { customId } = interaction;

    switch (customId) {
        case "edit_title":
            await handleEditTitle(interaction, editorMessage, originalMessage, blockState);
            break;

        case "edit_description":
            await handleEditDescription(interaction, editorMessage, originalMessage, blockState);
            break;

        case "edit_color":
            await handleEditColor(interaction, editorMessage, originalMessage, blockState);
            break;

        case "add_content":
            await handleAddContent(interaction, editorMessage, originalMessage, blockState);
            break;

        case "add_separator":
            await handleAddSeparator(interaction, editorMessage, originalMessage, blockState);
            break;

        case "add_image":
            await handleAddImage(interaction, editorMessage, originalMessage, blockState);
            break;

        case "cover_image":
            await handleCoverImage(interaction, editorMessage, originalMessage, blockState);
            break;

        case "show_variables":
            await handleShowVariables(interaction);
            break;

        case "show_raw":
            await handleShowRaw(interaction, blockState);
            break;

        case "save_block":
            await handleSaveBlock(interaction, client, blockName, blockState, originalMessage.guildId!);
            break;

        case "cancel_block":
            await handleCancelBlock(interaction, editorMessage);
            break;

        default:
            await interaction.reply({
                content: `⚠️ Funcionalidad \`${customId}\` en desarrollo.`,
                flags: MessageFlags.Ephemeral
            });
            break;
    }
}

async function handleEditTitle(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Editar Título del Bloque",
        customId: "edit_title_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "Título",
                component: {
                    type: ComponentType.TextInput,
                    customId: "title_input",
                    style: TextInputStyle.Short,
                    required: true,
                    placeholder: "Escribe el título del bloque...",
                    value: blockState.title || "",
                    maxLength: 256
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const newTitle = modalInteraction.components.getTextInputValue("title_input").trim();

        if (newTitle) {
            blockState.title = newTitle;
            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });
        }

        await modalInteraction.reply({
            content: "✅ Título actualizado correctamente.",
            flags: MessageFlags.Ephemeral
        });
    } catch {
        // Modal timed out or error occurred
    }
}

async function handleEditDescription(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Editar Descripción del Bloque",
        customId: "edit_description_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "Descripción",
                component: {
                    type: ComponentType.TextInput,
                    customId: "description_input",
                    style: TextInputStyle.Paragraph,
                    required: false,
                    placeholder: "Escribe la descripción del bloque...",
                    value: blockState.description || "",
                    maxLength: 4000
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const newDescription = modalInteraction.components.getTextInputValue("description_input").trim();

        blockState.description = newDescription || undefined;
        await updateEditor(editorMessage, {
            display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
            components: DisplayComponentUtils.createEditorButtons(false)
        });

        await modalInteraction.reply({
            content: "✅ Descripción actualizada correctamente.",
            flags: MessageFlags.Ephemeral
        });
    } catch {
        // ignore
    }
}

async function handleEditColor(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Editar Color del Bloque",
        customId: "edit_color_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "Color (formato HEX)",
                component: {
                    type: ComponentType.TextInput,
                    customId: "color_input",
                    style: TextInputStyle.Short,
                    required: false,
                    placeholder: "#FF5733 o FF5733",
                    value: blockState.color ? `#${blockState.color.toString(16).padStart(6, '0')}` : "",
                    maxLength: 7
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const colorValue = modalInteraction.components.getTextInputValue("color_input").trim();

        if (colorValue) {
            const cleanColor = colorValue.replace('#', '');
            const colorNumber = parseInt(cleanColor, 16);

            if (!isNaN(colorNumber) && cleanColor.length === 6) {
                blockState.color = colorNumber;
                await updateEditor(editorMessage, {
                    display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                    components: DisplayComponentUtils.createEditorButtons(false)
                });

                await modalInteraction.reply({
                    content: "✅ Color actualizado correctamente.",
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await modalInteraction.reply({
                    content: "❌ Color inválido. Usa formato HEX como #FF5733",
                    flags: MessageFlags.Ephemeral
                });
            }
        } else {
            blockState.color = undefined;
            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });

            await modalInteraction.reply({
                content: "✅ Color removido.",
                flags: MessageFlags.Ephemeral
            });
        }
    } catch {
        // ignore
    }
}

async function handleAddContent(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Añadir Contenido de Texto",
        customId: "add_content_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "Contenido",
                component: {
                    type: ComponentType.TextInput,
                    customId: "content_input",
                    style: TextInputStyle.Paragraph,
                    required: true,
                    placeholder: "Escribe el contenido de texto...",
                    maxLength: 4000
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const content = modalInteraction.components.getTextInputValue("content_input").trim();

        if (content) {
            blockState.components.push({
                type: 10,
                content,
                thumbnail: null
            });

            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });

            await modalInteraction.reply({
                content: "✅ Contenido añadido correctamente.",
                flags: MessageFlags.Ephemeral
            });
        }
    } catch {
        // ignore
    }
}

async function handleAddSeparator(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    blockState.components.push({
        type: 14,
        divider: true,
        spacing: 1
    });

    await updateEditor(editorMessage, {
        display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
        components: DisplayComponentUtils.createEditorButtons(false)
    });

    await interaction.reply({
        content: "✅ Separador añadido correctamente.",
        flags: MessageFlags.Ephemeral
    });
}

async function handleAddImage(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Añadir Imagen",
        customId: "add_image_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "URL de la Imagen",
                component: {
                    type: ComponentType.TextInput,
                    customId: "image_input",
                    style: TextInputStyle.Short,
                    required: true,
                    placeholder: "https://ejemplo.com/imagen.png",
                    maxLength: 512
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const imageUrl = modalInteraction.components.getTextInputValue("image_input").trim();

        if (imageUrl && DisplayComponentUtils.isValidUrl(imageUrl)) {
            blockState.components.push({
                type: 12,
                url: imageUrl
            });

            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });

            await modalInteraction.reply({
                content: "✅ Imagen añadida correctamente.",
                flags: MessageFlags.Ephemeral
            });
        } else {
            await modalInteraction.reply({
                content: "❌ URL de imagen inválida.",
                flags: MessageFlags.Ephemeral
            });
        }
    } catch {
        // ignore
    }
}

async function handleCoverImage(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = {
        title: "Imagen de Portada",
        customId: "cover_image_modal",
        components: [
            {
                type: ComponentType.Label,
                label: "URL de la Imagen de Portada",
                component: {
                    type: ComponentType.TextInput,
                    customId: "cover_input",
                    style: TextInputStyle.Short,
                    required: false,
                    placeholder: "https://ejemplo.com/portada.png",
                    value: blockState.coverImage || "",
                    maxLength: 512
                }
            }
        ]
    } as const;

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const coverUrl = modalInteraction.components.getTextInputValue("cover_input").trim();

        if (coverUrl && DisplayComponentUtils.isValidUrl(coverUrl)) {
            blockState.coverImage = coverUrl;
        } else {
            blockState.coverImage = undefined;
        }

        await updateEditor(editorMessage, {
            display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
            components: DisplayComponentUtils.createEditorButtons(false)
        });

        await modalInteraction.reply({
            content: coverUrl ? "✅ Imagen de portada actualizada." : "✅ Imagen de portada removida.",
            flags: MessageFlags.Ephemeral
        });
    } catch {
        // ignore
    }
}

async function handleShowVariables(interaction: ButtonInteraction): Promise<void> {
    const variables = listVariables();
    await interaction.reply({
        content: `📋 **Variables disponibles:**\n\`\`\`\n${variables}\`\`\``,
        flags: MessageFlags.Ephemeral
    });
}

async function handleShowRaw(interaction: ButtonInteraction, blockState: BlockState): Promise<void> {
    const rawData = JSON.stringify(blockState, null, 2);
    await interaction.reply({
        content: `📊 **Datos del bloque:**\n\`\`\`json\n${rawData.slice(0, 1800)}\`\`\``,
        flags: MessageFlags.Ephemeral
    });
}

async function handleSaveBlock(
    interaction: ButtonInteraction,
    client: Amayo,
    blockName: string,
    blockState: BlockState,
    guildId: string
): Promise<void> {
    try {
        await client.prisma.blockV2Config.create({
            data: {
                guildId,
                name: blockName,
                config: blockState as any
            }
        });

        await interaction.reply({
            content: `✅ **Bloque guardado exitosamente!**\n\n📄 **Nombre:** \`${blockName}\`\n🎨 **Componentes:** ${blockState.components.length}\n\n🎯 **Uso:** \`!send ${blockName}\``,
            flags: MessageFlags.Ephemeral
        });

        logger.info(`Block created: ${blockName} in guild ${guildId}`);
    } catch (error) {
        //@ts-ignore
        logger.error("Error saving block:", error);
        await interaction.reply({
            content: "❌ Error al guardar el bloque. Inténtalo de nuevo.",
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleCancelBlock(interaction: ButtonInteraction, editorMessage: Message): Promise<void> {
    await interaction.update({
        content: "❌ **Editor cancelado**\n\nLa creación del bloque ha sido cancelada.",
        components: [],
        embeds: []
    });
}

async function handleEditorTimeout(editorMessage: Message): Promise<void> {
    try {
        await editorMessage.edit({
            content: "⏰ **Editor expirado**\n\nEl editor ha expirado por inactividad. Usa el comando nuevamente para crear un bloque.",
            components: [],
            embeds: []
        });
    } catch {
        // message likely deleted
    }
}
