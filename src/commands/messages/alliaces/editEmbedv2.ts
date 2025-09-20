import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { ComponentType, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, Message, MessageFlags } from "discord.js";
import { replaceVars, isValidUrlOrVariable } from "../../../core/lib/vars";

/**
 * Botones de edición - VERSIÓN MEJORADA
 */
const btns = (disabled = false) => ([
    {
        type: 1,
        components: [
            { style: ButtonStyle.Secondary, type: 2, label: "📝 Título", disabled, custom_id: "edit_title" },
            { style: ButtonStyle.Secondary, type: 2, label: "📄 Descripción", disabled, custom_id: "edit_description" },
            { style: ButtonStyle.Secondary, type: 2, label: "🎨 Color", disabled, custom_id: "edit_color" },
            { style: ButtonStyle.Secondary, type: 2, label: "➕ Contenido", disabled, custom_id: "add_content" },
            { style: ButtonStyle.Secondary, type: 2, label: "➖ Separador", disabled, custom_id: "add_separator" }
        ]
    },
    {
        type: 1,
        components: [
            { style: ButtonStyle.Secondary, type: 2, label: "🖼️ Imagen", disabled, custom_id: "add_image" },
            { style: ButtonStyle.Secondary, type: 2, label: "🖼️ Portada", disabled, custom_id: "cover_image" },
            { style: ButtonStyle.Secondary, type: 2, label: "📎 Thumbnail", disabled, custom_id: "edit_thumbnail" },
            { style: ButtonStyle.Primary, type: 2, label: "🔄 Mover", disabled, custom_id: "move_block" },
            { style: ButtonStyle.Danger, type: 2, label: "🗑️ Eliminar", disabled, custom_id: "delete_block" }
        ]
    },
    {
        type: 1,
        components: [
            { style: ButtonStyle.Secondary, type: 2, label: "🎯 Variables", disabled, custom_id: "show_variables" },
            { style: ButtonStyle.Secondary, type: 2, label: "📋 Duplicar", disabled, custom_id: "duplicate_block" },
            { style: ButtonStyle.Secondary, type: 2, label: "📊 Vista Raw", disabled, custom_id: "show_raw" },
            { style: ButtonStyle.Secondary, type: 2, label: "📥 Importar", disabled, custom_id: "import_json" },
            { style: ButtonStyle.Secondary, type: 2, label: "📤 Exportar", disabled, custom_id: "export_json" }
        ]
    },
    {
        type: 1,
        components: [
            { style: ButtonStyle.Success, type: 2, label: "💾 Guardar", disabled, custom_id: "save_block" },
            { style: ButtonStyle.Danger, type: 2, label: "❌ Cancelar", disabled, custom_id: "cancel_block" }
        ]
    }
]);

/**
 * Validar si una URL es válida o es una variable del sistema
 */
const isValidUrl = isValidUrlOrVariable;

/**
 * Validar y limpiar contenido para Discord
 */
const validateContent = (content: string): string => {
    if (!content || typeof content !== 'string') {
        return "Sin contenido"; // Contenido por defecto
    }

    // Limpiar contenido y asegurar que tenga al menos 1 carácter
    const cleaned = content.trim();
    if (cleaned.length === 0) {
        return "Sin contenido";
    }

    // Truncar si excede el límite de Discord (4000 caracteres)
    if (cleaned.length > 4000) {
        return cleaned.substring(0, 3997) + "...";
    }

    return cleaned;
};

/**
 * Generar vista previa
 */
const renderPreview = async (blockState: any, member: any, guild: any) => {
    const previewComponents = [];

    // Añadir imagen de portada primero si existe
    if (blockState.coverImage && isValidUrl(blockState.coverImage)) {
        //@ts-ignore
        const processedCoverUrl = await replaceVars(blockState.coverImage, member, guild);
        if (isValidUrl(processedCoverUrl)) {
            previewComponents.push({
                type: 12,
                items: [{ media: { url: processedCoverUrl } }]
            });
        }
    }

    // Añadir título después de la portada - VALIDAR CONTENIDO
    //@ts-ignore
    const processedTitle = await replaceVars(blockState.title ?? "Sin título", member, guild);
    previewComponents.push({
        type: 10,
        content: validateContent(processedTitle)
    });

    // Procesar componentes en orden
    for (const c of blockState.components) {
        if (c.type === 10) {
            // Componente de texto con thumbnail opcional
            //@ts-ignore
            const processedThumbnail = c.thumbnail ? await replaceVars(c.thumbnail, member, guild) : null;
            //@ts-ignore
            const processedContent = await replaceVars(c.content || "Sin contenido", member, guild);
            const validatedContent = validateContent(processedContent);

            if (processedThumbnail && isValidUrl(processedThumbnail)) {
                // Si tiene thumbnail válido, usar contenedor tipo 9 con accessory
                previewComponents.push({
                    type: 9,
                    components: [
                        {
                            type: 10,
                            content: validatedContent
                        }
                    ],
                    accessory: {
                        type: 11,
                        media: { url: processedThumbnail }
                    }
                });
            } else {
                // Sin thumbnail o thumbnail inválido, componente normal
                previewComponents.push({
                    type: 10,
                    content: validatedContent
                });
            }
        } else if (c.type === 14) {
            // Separador
            previewComponents.push({
                type: 14,
                divider: c.divider ?? true,
                spacing: c.spacing ?? 1
            });
        } else if (c.type === 12) {
            // Imagen - validar URL también
            //@ts-ignore
            const processedImageUrl = await replaceVars(c.url, member, guild);

            if (isValidUrl(processedImageUrl)) {
                previewComponents.push({
                    type: 12,
                    items: [{ media: { url: processedImageUrl } }]
                });
            }
        }
    }

    return {
        type: 17,
        accent_color: blockState.color ?? null,
        components: previewComponents
    };
};

export const command: CommandMessage = {
    name: "editar-embed",
    type: "message",
    aliases: ["embed-editar", "modificar-embed", "blockeditv2"],
    cooldown: 20,
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ No tienes permisos de Administrador.");
            return;
        }

        const blockName: string | null = args[0] ?? null;
        if (!blockName) {
            await message.reply("Debes proporcionar un nombre. Uso: `!blockeditv2 <nombre>`");
            return;
        }

        // Buscar el bloque existente
        const existingBlock = await client.prisma.blockV2Config.findFirst({
            where: { guildId: message.guild!.id, name: blockName }
        });

        if (!existingBlock) {
            await message.reply("❌ Block no encontrado. Usa `!blockcreatev2 <nombre>` para crear uno nuevo.");
            return;
        }

        // Estado inicial basado en el bloque existente
        let blockState: any = {
            title: existingBlock.config.title || `Block: ${blockName}`,
            color: existingBlock.config.color || null,
            coverImage: existingBlock.config.coverImage || null,
            components: existingBlock.config.components || []
        };

        //@ts-ignore
        const editorMessage = await message.channel.send({
            content: "⚠️ **EDITANDO BLOCK EXISTENTE**\n\n" +
                     "Este editor usa **modales interactivos** y no podrás ver el chat mientras los usas.\n\n" +
                     "📝 **Recomendaciones:**\n" +
                     "• Ten preparados tus títulos y descripciones\n" +
                     "• Ten las URLs de imágenes listas para copiar\n" +
                     "• Los colores en formato HEX (#FF5733)\n" +
                     "• Las variables de usuario/servidor que necesites\n\n" +
                     "*Iniciando editor en 3 segundos...*"
        });

        // Esperar 3 segundos para que lean el mensaje
        await new Promise(resolve => setTimeout(resolve, 3000));

        //@ts-ignore
        await editorMessage.edit({
            content: null,
            flags: 32768,
            components: [
                await renderPreview(blockState, message.member, message.guild),
                ...btns(false)
            ]
        });

        const collector = editorMessage.createMessageComponentCollector({
            time: 3600000 // 1 hora
        });

        collector.on("collect", async (i: any) => {
            if (i.user.id !== message.author.id) {
                await i.reply({ content: "No puedes usar este menú.", flags: MessageFlags.Ephemeral });
                return;
            }

            // --- BOTONES ---
            if (i.isButton()) {
                switch (i.customId) {
                    case "save_block": {
                        await i.deferUpdate();
                        await client.prisma.blockV2Config.update({
                            where: { guildId_name: { guildId: message.guildId!, name: blockName } },
                            data: { config: blockState }
                        });
                        await editorMessage.edit({
                            components: [
                                {
                                    type: 17,
                                    accent_color: blockState.color ?? null,
                                    components: [
                                        { type: 10, content: `✅ Actualizado: ${blockName}` },
                                        { type: 10, content: "Cambios guardados en la base de datos." }
                                    ]
                                }
                            ]
                        });
                        collector.stop();
                        return;
                    }
                    case "cancel_block": {
                        await i.deferUpdate();
                        await editorMessage.delete();
                        collector.stop();
                        return;
                    }
                    case "edit_title": {
                        // Crear modal para editar título
                        const modal = new ModalBuilder()
                            .setCustomId('edit_title_modal')
                            .setTitle('📝 Editar Título del Block');

                        const titleInput = new TextInputBuilder()
                            .setCustomId('title_input')
                            .setLabel('Nuevo Título')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('Escribe el nuevo título aquí...')
                            .setValue(blockState.title || '')
                            .setMaxLength(256)
                            .setRequired(true);

                        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
                        modal.addComponents(firstActionRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_description": {
                        const modal = new ModalBuilder()
                            .setCustomId('edit_description_modal')
                            .setTitle('📄 Editar Descripción');

                        const descComp = blockState.components.find((c: any) => c.type === 10);
                        const currentDesc = descComp ? descComp.content : '';

                        const descInput = new TextInputBuilder()
                            .setCustomId('description_input')
                            .setLabel('Nueva Descripción')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Escribe la nueva descripción aquí...')
                            .setValue(currentDesc || '')
                            .setMaxLength(2000)
                            .setRequired(true);

                        const firstActionRow = new ActionRowBuilder().addComponents(descInput);
                        modal.addComponents(firstActionRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_color": {
                        const modal = new ModalBuilder()
                            .setCustomId('edit_color_modal')
                            .setTitle('🎨 Editar Color del Block');

                        const currentColor = blockState.color ? `#${blockState.color.toString(16).padStart(6, '0')}` : '';

                        const colorInput = new TextInputBuilder()
                            .setCustomId('color_input')
                            .setLabel('Color en formato HEX')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('#FF5733 o FF5733')
                            .setValue(currentColor)
                            .setMaxLength(7)
                            .setRequired(false);

                        const firstActionRow = new ActionRowBuilder().addComponents(colorInput);
                        modal.addComponents(firstActionRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "add_content": {
                        const modal = new ModalBuilder()
                            .setCustomId('add_content_modal')
                            .setTitle('➕ Agregar Nuevo Contenido');

                        const contentInput = new TextInputBuilder()
                            .setCustomId('content_input')
                            .setLabel('Contenido del Texto')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Escribe el contenido aquí...')
                            .setMaxLength(2000)
                            .setRequired(true);

                        const firstActionRow = new ActionRowBuilder().addComponents(contentInput);
                        modal.addComponents(firstActionRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "add_image": {
                        const modal = new ModalBuilder()
                            .setCustomId('add_image_modal')
                            .setTitle('🖼️ Agregar Nueva Imagen');

                        const imageUrlInput = new TextInputBuilder()
                            .setCustomId('image_url_input')
                            .setLabel('URL de la Imagen')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://ejemplo.com/imagen.png')
                            .setMaxLength(2000)
                            .setRequired(true);

                        const firstActionRow = new ActionRowBuilder().addComponents(imageUrlInput);
                        modal.addComponents(firstActionRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "cover_image": {
                        if (blockState.coverImage) {
                            // Si ya tiene portada, preguntar si editar o eliminar
                            //@ts-ignore
                            const reply = await i.reply({
                                flags: MessageFlags.Ephemeral,
                                content: "Ya tienes una imagen de portada. ¿Qué quieres hacer?",
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            { type: 2, style: ButtonStyle.Primary, label: "✏️ Editar", custom_id: "edit_cover_modal" },
                                            { type: 2, style: ButtonStyle.Danger, label: "🗑️ Eliminar", custom_id: "delete_cover" }
                                        ]
                                    }
                                ],
                                fetchReply: true
                            });

                            //@ts-ignore
                            const coverCollector = reply.createMessageComponentCollector({
                                componentType: ComponentType.Button,
                                max: 1,
                                time: 60000,
                                filter: (b: any) => b.user.id === message.author.id
                            });

                            coverCollector.on("collect", async (b: any) => {
                                if (b.customId === "edit_cover_modal") {
                                    // Crear modal para editar portada
                                    const modal = new ModalBuilder()
                                        .setCustomId('edit_cover_modal')
                                        .setTitle('🖼️ Editar Imagen de Portada');

                                    const coverInput = new TextInputBuilder()
                                        .setCustomId('cover_input')
                                        .setLabel('URL de la Imagen de Portada')
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder('https://ejemplo.com/portada.png')
                                        .setValue(blockState.coverImage || '')
                                        .setMaxLength(2000)
                                        .setRequired(true);

                                    const firstActionRow = new ActionRowBuilder().addComponents(coverInput);
                                    modal.addComponents(firstActionRow);

                                    //@ts-ignore
                                    await b.showModal(modal);
                                } else if (b.customId === "delete_cover") {
                                    blockState.coverImage = null;
                                    await b.update({ content: "✅ Imagen de portada eliminada.", components: [] });
                                    await editorMessage.edit({
                                        components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                    });
                                }
                                coverCollector.stop();
                            });
                        } else {
                            // No tiene portada, crear modal para añadir nueva
                            const modal = new ModalBuilder()
                                .setCustomId('add_cover_modal')
                                .setTitle('🖼️ Agregar Imagen de Portada');

                            const coverInput = new TextInputBuilder()
                                .setCustomId('cover_input')
                                .setLabel('URL de la Imagen de Portada')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://ejemplo.com/portada.png')
                                .setMaxLength(2000)
                                .setRequired(true);

                            const firstActionRow = new ActionRowBuilder().addComponents(coverInput);
                            modal.addComponents(firstActionRow);

                            //@ts-ignore
                            await i.showModal(modal);
                        }
                        break;
                    }
                    case "add_separator": {
                        const modal = new ModalBuilder()
                            .setCustomId('add_separator_modal')
                            .setTitle('➖ Agregar Separador');

                        const visibleInput = new TextInputBuilder()
                            .setCustomId('separator_visible')
                            .setLabel('¿Separador visible? (true/false)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('true o false')
                            .setValue('true')
                            .setMaxLength(5)
                            .setRequired(true);

                        const spacingInput = new TextInputBuilder()
                            .setCustomId('separator_spacing')
                            .setLabel('Espaciado (1-3)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('1, 2 o 3')
                            .setValue('1')
                            .setMaxLength(1)
                            .setRequired(false);

                        const firstRow = new ActionRowBuilder().addComponents(visibleInput);
                        const secondRow = new ActionRowBuilder().addComponents(spacingInput);
                        modal.addComponents(firstRow, secondRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_thumbnail": {
                        // Buscar el primer componente de texto para añadir/editar thumbnail
                        const textComp = blockState.components.find((c: any) => c.type === 10);

                        if (!textComp) {
                            await i.deferReply({ flags: MessageFlags.Ephemeral });
                            //@ts-ignore
                            await i.editReply({
                                content: "❌ Necesitas al menos un componente de texto para añadir thumbnail."
                            });
                            break;
                        }

                        const modal = new ModalBuilder()
                            .setCustomId('edit_thumbnail_modal')
                            .setTitle('📎 Editar Thumbnail');

                        const thumbnailInput = new TextInputBuilder()
                            .setCustomId('thumbnail_input')
                            .setLabel('URL del Thumbnail')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('https://ejemplo.com/thumbnail.png o dejar vacío para eliminar')
                            .setValue(textComp.thumbnail || '')
                            .setMaxLength(2000)
                            .setRequired(false);

                        const firstRow = new ActionRowBuilder().addComponents(thumbnailInput);
                        modal.addComponents(firstRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "move_block": {
                        const options = blockState.components.map((c: any, idx: number) => ({
                            label:
                                c.type === 10
                                    ? `Texto: ${c.content?.slice(0, 30) || "..."}`
                                    : c.type === 14
                                        ? "Separador"
                                        : c.type === 12
                                            ? `Imagen: ${c.url?.slice(-30) || "..."}`
                                            : `Componente ${c.type}`,
                            value: idx.toString(),
                            description:
                                c.type === 10 && c.thumbnail
                                    ? "Con thumbnail"
                                    : undefined
                        }));

                        //@ts-ignore
                        const reply = await i.reply({
                            flags: MessageFlags.Ephemeral,
                            content: "Selecciona el bloque que quieres mover:",
                            components: [
                                {
                                    type: 1,
                                    components: [
                                        { type: 3, custom_id: "move_block_select", placeholder: "Elige un bloque", options }
                                    ]
                                }
                            ],
                            fetchReply: true
                        });

                        //@ts-ignore
                        const selCollector = reply.createMessageComponentCollector({
                            componentType: ComponentType.StringSelect,
                            max: 1,
                            time: 60000,
                            filter: (it: any) => it.user.id === message.author.id
                        });

                        selCollector.on("collect", async (sel: any) => {
                            const idx = parseInt(sel.values[0]);

                            await sel.update({
                                content: "¿Quieres mover este bloque?",
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            { type: 2, style: ButtonStyle.Secondary, label: "⬆️ Subir", custom_id: `move_up_${idx}`, disabled: idx === 0 },
                                            { type: 2, style: ButtonStyle.Secondary, label: "⬇️ Bajar", custom_id: `move_down_${idx}`, disabled: idx === blockState.components.length - 1 }
                                        ]
                                    }
                                ]
                            });

                            //@ts-ignore
                            const btnCollector = reply.createMessageComponentCollector({
                                componentType: ComponentType.Button,
                                max: 1,
                                time: 60000,
                                filter: (b: any) => b.user.id === message.author.id
                            });

                            btnCollector.on("collect", async (b: any) => {
                                if (b.customId.startsWith("move_up_")) {
                                    const i2 = parseInt(b.customId.replace("move_up_", ""));
                                    if (i2 > 0) {
                                        const item = blockState.components[i2];
                                        blockState.components.splice(i2, 1);
                                        blockState.components.splice(i2 - 1, 0, item);
                                    }
                                    await b.update({ content: "✅ Bloque movido arriba.", components: [] });
                                } else if (b.customId.startsWith("move_down_")) {
                                    const i2 = parseInt(b.customId.replace("move_down_", ""));
                                    if (i2 < blockState.components.length - 1) {
                                        const item = blockState.components[i2];
                                        blockState.components.splice(i2, 1);
                                        blockState.components.splice(i2 + 1, 0, item);
                                    }
                                    await b.update({ content: "✅ Bloque movido abajo.", components: [] });
                                }

                                await editorMessage.edit({
                                    components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                });

                                btnCollector.stop();
                                selCollector.stop();
                            });
                        });

                        break;
                    }
                    case "delete_block": {
                        // Incluir portada en las opciones si existe
                        const options = [];

                        // Añadir portada como opción si existe
                        if (blockState.coverImage) {
                            options.push({
                                label: "🖼️ Imagen de Portada",
                                value: "cover_image",
                                description: "Imagen principal del bloque"
                            });
                        }

                        // Añadir componentes regulares
                        blockState.components.forEach((c: any, idx: number) => {
                            options.push({
                                label:
                                    c.type === 10
                                        ? `Texto: ${c.content?.slice(0, 30) || "..."}`
                                        : c.type === 14
                                            ? `Separador ${c.divider ? '(Visible)' : '(Invisible)'}`
                                            : c.type === 12
                                                ? `Imagen: ${c.url?.slice(-30) || "..."}`
                                                : `Componente ${c.type}`,
                                value: idx.toString(),
                                description:
                                    c.type === 10 && c.thumbnail
                                        ? "Con thumbnail"
                                        : undefined
                            });
                        });

                        if (options.length === 0) {
                            await i.deferReply({ flags: MessageFlags.Ephemeral });
                            //@ts-ignore
                            await i.editReply({
                                content: "❌ No hay elementos para eliminar."
                            });
                            break;
                        }

                        //@ts-ignore
                        const reply = await i.reply({
                            flags: MessageFlags.Ephemeral,
                            content: "Selecciona el elemento que quieres eliminar:",
                            components: [
                                {
                                    type: 1,
                                    components: [
                                        { type: 3, custom_id: "delete_block_select", placeholder: "Elige un elemento", options }
                                    ]
                                }
                            ],
                            fetchReply: true
                        });

                        //@ts-ignore
                        const selCollector = reply.createMessageComponentCollector({
                            componentType: ComponentType.StringSelect,
                            max: 1,
                            time: 60000,
                            filter: (it: any) => it.user.id === message.author.id
                        });

                        selCollector.on("collect", async (sel: any) => {
                            const selectedValue = sel.values[0];

                            if (selectedValue === "cover_image") {
                                blockState.coverImage = null;
                                await sel.update({ content: "✅ Imagen de portada eliminada.", components: [] });
                            } else {
                                const idx = parseInt(selectedValue);
                                blockState.components.splice(idx, 1);
                                await sel.update({ content: "✅ Elemento eliminado.", components: [] });
                            }

                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });

                            selCollector.stop();
                        });

                        break;
                    }
                    case "show_variables": {
                        await i.deferReply({ flags: MessageFlags.Ephemeral });
                        //@ts-ignore
                        await i.editReply({
                            content: "📋 **Variables Disponibles:**\n\n" +
                                "**👤 Usuario:**\n" +
                                "`user.name` - Nombre del usuario\n" +
                                "`user.id` - ID del usuario\n" +
                                "`user.mention` - Mención del usuario\n" +
                                "`user.avatar` - Avatar del usuario\n\n" +
                                "**📊 Estadísticas:**\n" +
                                "`user.pointsAll` - Puntos totales\n" +
                                "`user.pointsWeekly` - Puntos semanales\n" +
                                "`user.pointsMonthly` - Puntos mensuales\n\n" +
                                "**🏠 Servidor:**\n" +
                                "`guild.name` - Nombre del servidor\n" +
                                "`guild.icon` - Ícono del servidor\n\n" +
                                "**🔗 Invitación:**\n" +
                                "`invite.name` - Nombre del servidor invitado\n" +
                                "`invite.icon` - Ícono del servidor invitado\n\n" +
                                "💡 **Nota:** Las variables se usan SIN llaves `{}` en los campos de URL/imagen."
                        });
                        break;
                    }
                    case "duplicate_block": {
                        const options = blockState.components.map((c: any, idx: number) => ({
                            label: c.type === 10 ? `Texto: ${c.content?.slice(0, 30) || "..."}`
                                 : c.type === 14 ? "Separador"
                                 : c.type === 12 ? `Imagen: ${c.url?.slice(-30) || "..."}`
                                 : `Componente ${c.type}`,
                            value: idx.toString(),
                            description: c.type === 10 && c.thumbnail ? "Con thumbnail" : undefined
                        }));

                        if (options.length === 0) {
                            await i.deferReply({ flags: MessageFlags.Ephemeral });
                            //@ts-ignore
                            await i.editReply({ content: "❌ No hay elementos para duplicar." });
                            break;
                        }

                        //@ts-ignore
                        const reply = await i.reply({
                            flags: MessageFlags.Ephemeral,
                            content: "Selecciona el elemento que quieres duplicar:",
                            components: [{
                                type: 1,
                                components: [{
                                    type: 3,
                                    custom_id: "duplicate_select",
                                    placeholder: "Elige un elemento",
                                    options
                                }]
                            }],
                            fetchReply: true
                        });

                        //@ts-ignore
                        const selCollector = reply.createMessageComponentCollector({
                            componentType: ComponentType.StringSelect,
                            max: 1,
                            time: 60000,
                            filter: (sel: any) => sel.user.id === message.author.id
                        });

                        selCollector.on("collect", async (sel: any) => {
                            const idx = parseInt(sel.values[0]);
                            const originalComponent = blockState.components[idx];
                            const duplicatedComponent = JSON.parse(JSON.stringify(originalComponent));

                            blockState.components.splice(idx + 1, 0, duplicatedComponent);

                            await sel.update({ content: "✅ Elemento duplicado.", components: [] });
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "show_raw": {
                        const rawJson = JSON.stringify(blockState, null, 2);
                        const truncated = rawJson.length > 1900 ? rawJson.slice(0, 1900) + "..." : rawJson;

                        //@ts-ignore
                        await i.reply({
                            flags: MessageFlags.Ephemeral,
                            content: `\`\`\`json\n${truncated}\`\`\``
                        });
                        break;
                    }
                    case "import_json": {
                        const modal = new ModalBuilder()
                            .setCustomId('import_json_modal')
                            .setTitle('📥 Importar JSON');

                        const jsonInput = new TextInputBuilder()
                            .setCustomId('json_input')
                            .setLabel('Pega tu configuración JSON aquí')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('{"title": "...", "components": [...]}')
                            .setMaxLength(4000)
                            .setRequired(true);

                        const firstRow = new ActionRowBuilder().addComponents(jsonInput);
                        modal.addComponents(firstRow);

                        //@ts-ignore
                        await i.showModal(modal);
                        break;
                    }
                    case "export_json": {
                        const exportJson = JSON.stringify(blockState, null, 2);

                        // Truncar si es muy largo para evitar problemas con Discord
                        const truncatedJson = exportJson.length > 1800 ? exportJson.slice(0, 1800) + "\n..." : exportJson;

                        //@ts-ignore
                        await i.reply({
                            flags: MessageFlags.Ephemeral,
                            content: `📤 **JSON Exportado:**\n\`\`\`json\n${truncatedJson}\`\`\`\n\n💡 **Tip:** Copia el JSON de arriba manualmente y pégalo donde necesites.`
                        });
                        break;
                    }
                }

                // Actualizar vista previa después de cada acción
                try {
                    await editorMessage.edit({
                        components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                    });
                } catch (updateError: any) {
                    if (updateError.code === 10008) {
                        console.log('Mensaje del editor eliminado');
                    } else {
                        console.error('Error actualizando vista previa:', updateError);
                    }
                }
            }
        });

        // Manejo de modales mejorado con mejor gestión de errores
        let modalHandlerActive = true;

        const modalHandler = async (interaction: any) => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.user.id !== message.author.id) return;
            if (!interaction.customId.endsWith('_modal')) return;
            if (!modalHandlerActive) return;

            try {
                switch (interaction.customId) {
                    case 'edit_title_modal': {
                        blockState.title = interaction.fields.getTextInputValue('title_input');
                        await interaction.reply({ content: '✅ Título actualizado.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                    case 'edit_description_modal': {
                        const newDescription = interaction.fields.getTextInputValue('description_input');
                        const descComp = blockState.components.find((c: any) => c.type === 10);
                        if (descComp) {
                            descComp.content = newDescription;
                        } else {
                            blockState.components.push({ type: 10, content: newDescription, thumbnail: null });
                        }
                        await interaction.reply({ content: '✅ Descripción actualizada.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                    case 'edit_color_modal': {
                        const colorInput = interaction.fields.getTextInputValue('color_input');
                        if (colorInput.trim() === '') {
                            blockState.color = null;
                        } else {
                            let hexColor = colorInput.replace('#', '');
                            if (/^[0-9A-F]{6}$/i.test(hexColor)) {
                                blockState.color = parseInt(hexColor, 16);
                            } else {
                                await interaction.reply({ content: '❌ Color inválido. Usa formato HEX (#FF5733)', flags: MessageFlags.Ephemeral });
                                return;
                            }
                        }
                        await interaction.reply({ content: '✅ Color actualizado.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                    case 'add_content_modal': {
                        const newContent = interaction.fields.getTextInputValue('content_input');
                        blockState.components.push({ type: 10, content: newContent, thumbnail: null });
                        await interaction.reply({ content: '✅ Contenido añadido.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                    case 'add_image_modal': {
                        const imageUrl = interaction.fields.getTextInputValue('image_url_input');
                        if (isValidUrl(imageUrl)) {
                            blockState.components.push({ type: 12, url: imageUrl });
                            await interaction.reply({ content: '✅ Imagen añadida.', flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.reply({ content: '❌ URL de imagen inválida.', flags: MessageFlags.Ephemeral });
                            return;
                        }
                        break;
                    }
                    case 'add_cover_modal':
                    case 'edit_cover_modal': {
                        const coverUrl = interaction.fields.getTextInputValue('cover_input');
                        if (isValidUrl(coverUrl)) {
                            blockState.coverImage = coverUrl;
                            await interaction.reply({ content: '✅ Imagen de portada actualizada.', flags: MessageFlags.Ephemeral });
                        } else {
                            await interaction.reply({ content: '❌ URL de portada inválida.', flags: MessageFlags.Ephemeral });
                            return;
                        }
                        break;
                    }
                    case 'add_separator_modal': {
                        const visibleStr = interaction.fields.getTextInputValue('separator_visible').toLowerCase();
                        const spacingStr = interaction.fields.getTextInputValue('separator_spacing') || '1';

                        const divider = visibleStr === 'true' || visibleStr === '1' || visibleStr === 'si' || visibleStr === 'sí';
                        const spacing = Math.min(3, Math.max(1, parseInt(spacingStr) || 1));

                        blockState.components.push({ type: 14, divider, spacing });
                        await interaction.reply({ content: '✅ Separador añadido.', flags: MessageFlags.Ephemeral });
                        break;
                    }
                    case 'edit_thumbnail_modal': {
                        const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail_input');
                        const textComp = blockState.components.find((c: any) => c.type === 10);

                        if (textComp) {
                            if (thumbnailUrl.trim() === '') {
                                // Si está vacío, eliminar thumbnail
                                textComp.thumbnail = null;
                                await interaction.reply({ content: '✅ Thumbnail eliminado.', flags: MessageFlags.Ephemeral });
                            } else if (!isValidUrl(thumbnailUrl)) {
                                // Si no es una URL válida, mostrar error
                                await interaction.reply({ content: '❌ URL de thumbnail inválida.', flags: MessageFlags.Ephemeral });
                                return;
                            } else {
                                // Si es una URL válida, añadir thumbnail
                                textComp.thumbnail = thumbnailUrl;
                                await interaction.reply({ content: '✅ Thumbnail actualizado.', flags: MessageFlags.Ephemeral });
                            }
                        }
                        break;
                    }
                    case 'import_json_modal': {
                        try {
                            const jsonString = interaction.fields.getTextInputValue('json_input');
                            const importedData = JSON.parse(jsonString);

                            if (importedData && typeof importedData === 'object') {
                                blockState = {
                                    title: importedData.title || blockState.title,
                                    color: importedData.color || blockState.color,
                                    coverImage: importedData.coverImage || blockState.coverImage,
                                    components: Array.isArray(importedData.components) ? importedData.components : blockState.components
                                };

                                await interaction.reply({ content: '✅ JSON importado correctamente.', flags: MessageFlags.Ephemeral });
                            } else {
                                await interaction.reply({ content: '❌ Estructura JSON inválida.', flags: MessageFlags.Ephemeral });
                                return;
                            }
                        } catch (error) {
                            await interaction.reply({ content: '❌ JSON inválido. Verifica el formato.', flags: MessageFlags.Ephemeral });
                            return;
                        }
                        break;
                    }
                    default:
                        return;
                }

                // Actualizar la vista previa después de cada cambio en el modal
                setTimeout(async () => {
                    if (!modalHandlerActive) return;

                    try {
                        const messageExists = await editorMessage.fetch().catch(() => null);
                        if (!messageExists) return;

                        await editorMessage.edit({
                            components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                        });
                    } catch (error: any) {
                        if (error.code === 10008) {
                            console.log('Mensaje del editor eliminado');
                        } else if (error.code === 10062) {
                            console.log('Interacción expirada');
                        } else {
                            console.error('Error actualizando preview:', error.message || error);
                        }
                    }
                }, 1000);

            } catch (error: any) {
                console.error('Error en modal:', error);
                try {
                    if (error.code !== 10062 && !interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: '❌ Error procesando el modal.', flags: MessageFlags.Ephemeral });
                    }
                } catch (replyError) {
                    console.log('No se pudo responder a la interacción (probablemente expirada)');
                }
            }
        };

        // Registrar el manejador de modales
        client.on('interactionCreate', modalHandler);

        //@ts-ignore
        collector.on("end", async (_, reason) => {
            modalHandlerActive = false;
            client.off('interactionCreate', modalHandler);

            if (reason === "time") {
                try {
                    const messageExists = await editorMessage.fetch().catch(() => null);
                    if (messageExists) {
                        await editorMessage.edit({
                            components: [
                                { type: 17, components: [{ type: 10, content: "⏰ Editor finalizado por inactividad." }] }
                            ]
                        });
                    }
                } catch (error) {
                    console.log('No se pudo actualizar el mensaje final');
                }
            }
        });
    }
};
