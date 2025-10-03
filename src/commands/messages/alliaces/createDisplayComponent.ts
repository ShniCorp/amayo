import {
    ActionRowBuilder,
    ButtonInteraction,
    Message,
    MessageComponentInteraction,
    MessageFlags,
    ModalBuilder, TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
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

    collector.on("collect", async (interaction: ButtonInteraction) => {
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
    const modal = new ModalBuilder()
        .setCustomId("edit_title_modal")
        .setTitle("Editar Título del Bloque");

    const titleInput = new TextInputBuilder()
        .setCustomId("title_input")
        .setLabel("Título")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Escribe el título del bloque...")
        .setValue(blockState.title || "")
        .setRequired(true)
        .setMaxLength(256);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const newTitle = modalInteraction.fields.getTextInputValue("title_input").trim();

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
        // no-op
    }
}

async function handleEditDescription(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId("edit_description_modal")
        .setTitle("Editar Descripción del Bloque");

    const descriptionInput = new TextInputBuilder()
        .setCustomId("description_input")
        .setLabel("Descripción")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Escribe la descripción del bloque...")
        .setValue(blockState.description || "")
        .setRequired(false)
        .setMaxLength(4000);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const newDescription = modalInteraction.fields.getTextInputValue("description_input").trim();

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
    const modal = new ModalBuilder()
        .setCustomId("edit_color_modal")
        .setTitle("Editar Color del Bloque");

    const colorInput = new TextInputBuilder()
        .setCustomId("color_input")
        .setLabel("Color (formato HEX)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("#FF5733 o FF5733")
        .setValue(blockState.color ? `#${blockState.color.toString(16).padStart(6, '0')}` : "")
        .setRequired(false)
        .setMaxLength(7);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const colorValue = modalInteraction.fields.getTextInputValue("color_input").trim();

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
    const modal = new ModalBuilder()
        .setCustomId("add_content_modal")
        .setTitle("Añadir Contenido de Texto");

    const contentInput = new TextInputBuilder()
        .setCustomId("content_input")
        .setLabel("Contenido")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Escribe el contenido de texto...")
        .setRequired(true)
        .setMaxLength(4000);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const content = modalInteraction.fields.getTextInputValue("content_input").trim();

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
    const modal = new ModalBuilder()
        .setCustomId("add_image_modal")
        .setTitle("Añadir Imagen");

    const imageInput = new TextInputBuilder()
        .setCustomId("image_input")
        .setLabel("URL de la Imagen")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("https://ejemplo.com/imagen.png")
        .setRequired(true)
        .setMaxLength(512);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const imageUrl = modalInteraction.fields.getTextInputValue("image_input").trim();

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
                ephemeral: true
            });
        } else {
            await modalInteraction.reply({
                content: "❌ URL de imagen inválida.",
                ephemeral: true
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
    const modal = new ModalBuilder()
        .setCustomId("cover_image_modal")
        .setTitle("Imagen de Portada");

    const coverInput = new TextInputBuilder()
        .setCustomId("cover_input")
        .setLabel("URL de la Imagen de Portada")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("https://ejemplo.com/portada.png")
        .setValue(blockState.coverImage || "")
        .setRequired(false)
        .setMaxLength(512);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(coverInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    try {
        const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
        const coverUrl = modalInteraction.fields.getTextInputValue("cover_input").trim();

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
            ephemeral: true
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
