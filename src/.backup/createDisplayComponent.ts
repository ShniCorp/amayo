import {
    ButtonInteraction,
    Message,
    MessageComponentInteraction,
    MessageFlags,
    ModalSubmitInteraction,
    TextChannel,
} from "discord.js";
import { ComponentType, TextInputStyle, ButtonStyle } from "discord-api-types/v10";
import logger from "../../../core/lib/logger";
import {CommandMessage} from "../../../core/types/commands";
import {listVariables} from "../../../core/lib/vars";
import type Amayo from "../../../core/client";
import {
    BlockState,
    DisplayComponentUtils,
    EditorActionRow,
    DESCRIPTION_PLACEHOLDER,
    syncDescriptionComponent,
    ensureDescriptionTextComponent,
    normalizeDisplayContent
} from "../../../core/types/displayComponentEditor";
import type {DisplayComponentContainer} from "../../../core/types/displayComponents";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";

interface EditorData {
    content?: string;
    flags?: MessageFlags;
    display?: DisplayComponentContainer;
    components?: EditorActionRow[];
}

// --- Helpers (yald-style minimal generators) ---------------------------------
type ModalField = {
    customId: string;
    style: number;
    placeholder?: string;
    value?: string;
    required?: boolean;
    maxLength?: number;
    label?: string;
};

function createModal(params: { title: string; customId: string; fields: ModalField[] }) {
    const components = params.fields.map(f => ({
        type: ComponentType.Label,
        label: f.label ?? "",
        component: {
            type: ComponentType.TextInput,
            customId: f.customId,
            style: f.style,
            placeholder: f.placeholder,
            value: f.value,
            required: f.required ?? false,
            maxLength: f.maxLength
        }
    }));
    return { title: params.title, customId: params.customId, components } as const;
}

function buildSelectOptionsFromComponents(components: any[]) {
    return components.map((c: any, idx: number) => ({
        label: c.type === 10 ? `Texto: ${c.content?.slice(0, 30) || '...'}` : c.type === 14 ? `Separador ${c.divider ? '(Visible)' : '(Invisible)'}` : c.type === 12 ? `Imagen: ${c.url?.slice(-30) || '...'}` : `Componente ${c.type}`,
        value: String(idx),
        description: c.type === 10 && (c.thumbnail || c.linkButton) ? (c.thumbnail ? 'Con thumbnail' : 'Con botón link') : undefined
    }));
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

    // Si usamos Components V2, debemos limpiar explícitamente el content legado en el servidor
    if (payload.flags === MessageFlags.IsComponentsV2) {
        payload.content = null;
    }

    await message.edit(payload);
}

function stripLegacyDescriptionComponent(blockState: BlockState, match?: string | null): void {
    if (!Array.isArray(blockState.components) || blockState.components.length === 0) return;

    const normalize = (value: string | undefined | null) => value?.replace(/\s+/g, " ").trim() ?? "";
    const target = normalize(match ?? blockState.description ?? undefined);
    if (!target) return;

    const index = blockState.components.findIndex((component: any) => {
        if (!component || component.type !== 10) return false;
        if (component.thumbnail || component.linkButton) return false;
        return normalize(component.content) === target;
    });

    if (index >= 0) {
        blockState.components.splice(index, 1);
    }
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
        const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
        if (!allowed) {
            await message.reply("❌ No tienes permisos de ManageGuild ni rol de staff.");
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
                { type: 10, content: DESCRIPTION_PLACEHOLDER, thumbnail: null }
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

        case "edit_thumbnail": {
            ensureDescriptionTextComponent(blockState, { placeholder: DESCRIPTION_PLACEHOLDER });

            const descriptionNormalized = normalizeDisplayContent(blockState.description);
            const textDisplays = blockState.components
                .map((component: any, idx: number) => ({ component, idx }))
                .filter(({ component }) => component?.type === 10);

            if (textDisplays.length === 0) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
                await interaction.editReply({ content: '❌ No hay bloques de texto disponibles para añadir thumbnail.' }).catch(() => {});
                break;
            }

            const options = textDisplays.map(({ component, idx }) => ({
                label: descriptionNormalized && normalizeDisplayContent(component.content) === descriptionNormalized
                    ? 'Descripción principal'
                    : `Texto #${idx + 1}: ${component.content?.slice(0, 30) || '...'}`,
                value: String(idx),
                description: component.thumbnail ? 'Con thumbnail' : component.linkButton ? 'Con botón link' : 'Sin accesorio'
            }));

            try {
                await interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    content: 'Selecciona el bloque de texto al que quieres editar el thumbnail:',
                    components: [
                        {
                            type: 1,
                            components: [
                                {
                                    type: 3,
                                    custom_id: 'choose_text_for_thumbnail',
                                    placeholder: 'Selecciona un bloque de texto',
                                    options
                                }
                            ]
                        }
                    ]
                });
            } catch (error) {
                logger.error({ err: error }, 'Error enviando selector de thumbnails');
                break;
            }

            let replyMsg: Message | null = null;
            try {
                replyMsg = await interaction.fetchReply();
            } catch {}

            if (!replyMsg) break;

            const selCollector = replyMsg.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                max: 1,
                time: 60000,
                filter: (it: any) => it.user.id === originalMessage.author.id
            });

            selCollector.on('collect', async (sel: any) => {
                selCollector.stop('collected');

                const idx = parseInt(sel.values[0], 10);
                if (Number.isNaN(idx)) {
                    try {
                        if (!sel.replied && !sel.deferred) {
                            await sel.reply({ content: '❌ Selección inválida.', flags: MessageFlags.Ephemeral });
                        }
                    } catch {}
                    return;
                }

                const textComp = blockState.components[idx];
                if (!textComp || textComp.type !== 10) {
                    try {
                        if (!sel.replied && !sel.deferred) {
                            await sel.reply({ content: '❌ El bloque seleccionado ya no existe.', flags: MessageFlags.Ephemeral });
                        }
                    } catch {}
                    return;
                }

                const modal = createModal({
                    title: '📎 Editar Thumbnail',
                    customId: `edit_thumbnail_modal_${idx}`,
                    fields: [
                        {
                            customId: 'thumbnail_input',
                            style: TextInputStyle.Short,
                            placeholder: 'https://ejemplo.com/thumbnail.png (vacío para eliminar)',
                            value: textComp.thumbnail || '',
                            maxLength: 512,
                            required: false,
                            label: 'URL del Thumbnail'
                        }
                    ]
                });

                try {
                    await sel.showModal(modal);
                } catch (error) {
                    logger.error({ err: error }, 'No se pudo mostrar el modal de thumbnail');
                    return;
                }

                const modalInteraction = await awaitModalWithDeferredReply(sel);
                if (!modalInteraction) return;

                const rawInput = modalInteraction.components.getTextInputValue('thumbnail_input').trim();

                if (rawInput.length === 0) {
                    textComp.thumbnail = null;
                    await modalInteraction.editReply({ content: '✅ Thumbnail eliminado.' }).catch(() => {});
                } else if (!DisplayComponentUtils.isValidUrl(rawInput)) {
                    await modalInteraction.editReply({ content: '❌ URL de thumbnail inválida.' }).catch(() => {});
                    return;
                } else if (textComp.linkButton) {
                    await modalInteraction.editReply({ content: '❌ Este bloque tiene un botón link. Elimínalo antes de añadir un thumbnail.' }).catch(() => {});
                    return;
                } else {
                    textComp.thumbnail = rawInput;
                    await modalInteraction.editReply({ content: '✅ Thumbnail actualizado.' }).catch(() => {});
                }

                await updateEditor(editorMessage, {
                    display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                    components: DisplayComponentUtils.createEditorButtons(false)
                });
            });

            selCollector.on('end', async () => {
                try {
                    await replyMsg!.edit({ components: [] });
                } catch {}
            });

            break;
        }

        case "cover_image":
            await handleCoverImage(interaction, editorMessage, originalMessage, blockState);
            break;

        case "move_block": {
            const options = buildSelectOptionsFromComponents(blockState.components);

            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: 'Selecciona el bloque que quieres mover:',
                components: [
                    { type: 1, components: [ { type: 3, custom_id: 'move_block_select', placeholder: 'Elige un bloque', options } ] },
                ],
            });
            const replyMsg = await interaction.fetchReply();
            // @ts-ignore
            const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === originalMessage.author.id });
            selCollector.on('collect', async (sel: any) => {
                const idx = parseInt(sel.values[0]);
                await sel.update({
                    content: '¿Quieres mover este bloque?',
                    components: [
                        { type: 1, components: [
                            { type: 2, style: ButtonStyle.Secondary, label: '⬆️ Subir', custom_id: `move_up_${idx}`, disabled: idx === 0 },
                            { type: 2, style: ButtonStyle.Secondary, label: '⬇️ Bajar', custom_id: `move_down_${idx}`, disabled: idx === blockState.components.length - 1 },
                        ]},
                    ],
                });
                // @ts-ignore
                const btnCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 60000, filter: (b: any) => b.user.id === originalMessage.author.id });
                btnCollector.on('collect', async (b: any) => {
                    if (b.customId.startsWith('move_up_')) {
                        const i2 = parseInt(b.customId.replace('move_up_', ''));
                        if (i2 > 0) {
                            const item = blockState.components[i2];
                            blockState.components.splice(i2, 1);
                            blockState.components.splice(i2 - 1, 0, item);
                        }
                        await b.update({ content: '✅ Bloque movido arriba.', components: [] });
                    } else if (b.customId.startsWith('move_down_')) {
                        const i2 = parseInt(b.customId.replace('move_down_', ''));
                        if (i2 < blockState.components.length - 1) {
                            const item = blockState.components[i2];
                            blockState.components.splice(i2, 1);
                            blockState.components.splice(i2 + 1, 0, item);
                        }
                        await b.update({ content: '✅ Bloque movido abajo.', components: [] });
                    }

                    await updateEditor(editorMessage, {
                        display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                        components: DisplayComponentUtils.createEditorButtons(false),
                    });
                    btnCollector.stop();
                    selCollector.stop();
                });
            });
            break;
        }

        case "delete_block": {
            const options: any[] = [];
            if (blockState.coverImage) options.push({ label: '🖼️ Imagen de Portada', value: 'cover_image', description: 'Imagen principal del bloque' });
            options.push(...buildSelectOptionsFromComponents(blockState.components));

            if (options.length === 0) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                // @ts-ignore
                await interaction.editReply({ content: '❌ No hay elementos para eliminar.' });
                break;
            }

            await interaction.reply({
                flags: MessageFlags.Ephemeral,
                content: 'Selecciona el elemento que quieres eliminar:',
                components: [
                    { type: 1, components: [ { type: 3, custom_id: 'delete_block_select', placeholder: 'Elige un elemento', options } ] },
                ],
            });
            const replyMsg = await interaction.fetchReply();
            // @ts-ignore
            const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === originalMessage.author.id });
            selCollector.on('collect', async (sel: any) => {
                const selectedValue = sel.values[0];
                if (selectedValue === 'cover_image') {
                    // @ts-ignore
                    blockState.coverImage = null;
                    await sel.update({ content: '✅ Imagen de portada eliminada.', components: [] });
                } else {
                    const idx = parseInt(selectedValue);
                    blockState.components.splice(idx, 1);
                    await sel.update({ content: '✅ Elemento eliminado.', components: [] });
                }

                await updateEditor(editorMessage, {
                    display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                    components: DisplayComponentUtils.createEditorButtons(false),
                });
                selCollector.stop();
            });
            break;
        }

        case "show_variables":
            await handleShowVariables(interaction);
            break;

        case "show_raw":
            await handleShowRaw(interaction, blockState);
            break;

        case "save_block":
            await handleSaveBlock(interaction, editorMessage, client, blockName, blockState, originalMessage.guildId!);
            break;

        case "cancel_block":
            await handleCancelBlock(interaction, editorMessage);
            break;

        default:
            await interaction.reply({
                content: `⚠️ Funcionalidad \`${customId}\` en desarrollo.`,
                flags: MessageFlags.Ephemeral,
            });
            break;
    }
}

async function awaitModalWithDeferredReply(
    interaction: ButtonInteraction | MessageComponentInteraction,
    options: Parameters<ButtonInteraction['awaitModalSubmit']>[0] = { time: 300000 }
): Promise<ModalSubmitInteraction | null> {
    try {
        const modalInteraction = await interaction.awaitModalSubmit(options);
        if (!modalInteraction.deferred && !modalInteraction.replied) {
            await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        return modalInteraction;
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Collector received no interactions')) {
            logger.error({ err: error }, "Error esperando envío de modal en editor");
        }
        return null;
    }
}

async function handleEditTitle(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = createModal({
        title: "Editar Título del Bloque",
        customId: "edit_title_modal",
        fields: [
            {
                customId: "title_input",
                style: TextInputStyle.Short,
                required: true,
                placeholder: "Escribe el título del bloque...",
                value: blockState.title || "",
                maxLength: 256,
                label: 'Título'
            }
        ]
    });

    await interaction.showModal(modal as any);

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

        const newTitle = modalInteraction.components.getTextInputValue("title_input").trim();

        if (newTitle) {
            blockState.title = newTitle;
            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });
        }

        await modalInteraction.editReply({
            content: "✅ Título actualizado correctamente."
        });
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo actualizar el título. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de título");
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

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

        const rawDescription = modalInteraction.components.getTextInputValue("description_input");
        const previousDescription = typeof blockState.description === "string" ? blockState.description : null;
        syncDescriptionComponent(blockState, rawDescription, {
            previousDescription,
            placeholder: DESCRIPTION_PLACEHOLDER
        });

        await updateEditor(editorMessage, {
            display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
            components: DisplayComponentUtils.createEditorButtons(false)
        });

        await modalInteraction.editReply({
            content: "✅ Descripción actualizada correctamente."
        });
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo actualizar la descripción. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de descripción");
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

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

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

                await modalInteraction.editReply({
                    content: "✅ Color actualizado correctamente."
                });
            } else {
                await modalInteraction.editReply({
                    content: "❌ Color inválido. Usa formato HEX como #FF5733"
                });
            }
        } else {
            blockState.color = undefined;
            await updateEditor(editorMessage, {
                display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
                components: DisplayComponentUtils.createEditorButtons(false)
            });

            await modalInteraction.editReply({
                content: "✅ Color removido."
            });
        }
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo actualizar el color. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de color");
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

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

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

            await modalInteraction.editReply({
                content: "✅ Contenido añadido correctamente."
            });
        }
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo añadir el contenido. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de contenido");
    }
}

async function handleAddSeparator(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const wasAcknowledged = interaction.deferred || interaction.replied;
    if (!wasAcknowledged) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.warn({ err: error }, "No se pudo diferir respuesta al añadir separador");
        }
    }

    blockState.components.push({
        type: 14,
        divider: true,
        spacing: 1
    });

    await updateEditor(editorMessage, {
        display: await DisplayComponentUtils.renderPreview(blockState, originalMessage.member!, originalMessage.guild!),
        components: DisplayComponentUtils.createEditorButtons(false)
    });

    const payload = { content: "✅ Separador añadido correctamente.", flags: MessageFlags.Ephemeral } as const;

    if (interaction.deferred) {
        await interaction.editReply({ content: payload.content }).catch(() => {});
    } else if (interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
    } else {
        await interaction.reply(payload).catch(() => {});
    }
}

async function handleAddImage(
    interaction: ButtonInteraction,
    editorMessage: Message,
    originalMessage: Message,
    blockState: BlockState
): Promise<void> {
    const modal = createModal({
        title: "Añadir Imagen",
        customId: "add_image_modal",
        fields: [
            {
                customId: "image_input",
                style: TextInputStyle.Short,
                required: true,
                placeholder: "https://ejemplo.com/imagen.png",
                maxLength: 512,
                label: 'URL de la Imagen'
            }
        ]
    });

    await interaction.showModal(modal as any);

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

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

            await modalInteraction.editReply({
                content: "✅ Imagen añadida correctamente."
            });
        } else {
            await modalInteraction.editReply({
                content: "❌ URL de imagen inválida."
            });
        }
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo añadir la imagen. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de imagen");
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

    let modalInteraction: ModalSubmitInteraction | null = null;
    try {
        modalInteraction = await awaitModalWithDeferredReply(interaction);
        if (!modalInteraction) return;

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

        await modalInteraction.editReply({
            content: coverUrl ? "✅ Imagen de portada actualizada." : "✅ Imagen de portada removida."
        });
    } catch (error) {
        if (modalInteraction?.deferred && !modalInteraction.replied) {
            await modalInteraction.editReply({
                content: "❌ No se pudo actualizar la imagen de portada. Inténtalo de nuevo."
            }).catch(() => {});
        }
        if (error instanceof Error && error.message.includes('Collector received no interactions')) {
            return;
        }
        logger.error({ err: error }, "Error procesando modal de portada");
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
    editorMessage: Message,
    client: Amayo,
    blockName: string,
    blockState: BlockState,
    guildId: string
): Promise<void> {
    try {
        stripLegacyDescriptionComponent(blockState);
        await client.prisma.blockV2Config.create({
            data: {
                guildId,
                name: blockName,
                config: blockState as any
            }
        });

        await interaction.reply({
            content: `✅ **Bloque guardado exitosamente!**\n\n📄 **Nombre:** \`${blockName}\`\n🎨 **Componentes:** ${blockState.components.length}\n\n🎯 **Uso:** \`!send-embed ${blockName}\``,
            flags: MessageFlags.Ephemeral
        });

        // Cerrar el editor eliminando el mensaje del editor
        try { await editorMessage.delete(); } catch {}
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
    try {
        await interaction.deferUpdate();
    } catch {}
    await updateEditor(editorMessage, {
        display: {
            type: 17,
            components: [
                { type: 10, content: "❌ **Editor cancelado**" },
                { type: 10, content: "La creación del bloque ha sido cancelada." }
            ]
        } as any,
        components: []
    });
}

async function handleEditorTimeout(editorMessage: Message): Promise<void> {
    try {
        await updateEditor(editorMessage, {
            display: {
                type: 17,
                components: [
                    { type: 10, content: "⏰ **Editor expirado**" },
                    { type: 10, content: "El editor ha expirado por inactividad. Usa el comando nuevamente para crear un bloque." }
                ]
            } as any,
            components: []
        });
    } catch {
        // message likely deleted
    }
}
