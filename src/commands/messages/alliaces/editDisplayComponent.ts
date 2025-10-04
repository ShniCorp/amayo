import { CommandMessage } from "../../../core/types/commands";
import { MessageFlags } from "discord.js";
import { ComponentType, ButtonStyle, TextInputStyle } from "discord-api-types/v10";
import { replaceVars, isValidUrlOrVariable, listVariables } from "../../../core/lib/vars";

// Botones de edición (máx 5 por fila)
const btns = (disabled = false) => ([
    { type: 1, components: [
        { style: ButtonStyle.Secondary, type: 2, label: "📝 Título", disabled, custom_id: "edit_title" },
        { style: ButtonStyle.Secondary, type: 2, label: "📄 Descripción", disabled, custom_id: "edit_description" },
        { style: ButtonStyle.Secondary, type: 2, label: "🎨 Color", disabled, custom_id: "edit_color" },
        { style: ButtonStyle.Secondary, type: 2, label: "➕ Contenido", disabled, custom_id: "add_content" },
        { style: ButtonStyle.Secondary, type: 2, label: "➖ Separador", disabled, custom_id: "add_separator" }
    ]},
    { type: 1, components: [
        { style: ButtonStyle.Secondary, type: 2, label: "🖼️ Imagen", disabled, custom_id: "add_image" },
        { style: ButtonStyle.Secondary, type: 2, label: "🖼️ Portada", disabled, custom_id: "cover_image" },
        { style: ButtonStyle.Secondary, type: 2, label: "📎 Thumbnail", disabled, custom_id: "edit_thumbnail" },
        { style: ButtonStyle.Secondary, type: 2, label: "🔗 Crear Botón Link", disabled, custom_id: "edit_link_button" },
        { style: ButtonStyle.Primary, type: 2, label: "🔄 Mover", disabled, custom_id: "move_block" }
    ]},
    { type: 1, components: [
        { style: ButtonStyle.Secondary, type: 2, label: "🎯 Variables", disabled, custom_id: "show_variables" },
        { style: ButtonStyle.Secondary, type: 2, label: "📋 Duplicar", disabled, custom_id: "duplicate_block" },
        { style: ButtonStyle.Secondary, type: 2, label: "📊 Vista Raw", disabled, custom_id: "show_raw" },
        { style: ButtonStyle.Secondary, type: 2, label: "📥 Importar", disabled, custom_id: "import_json" },
        { style: ButtonStyle.Secondary, type: 2, label: "📤 Exportar", disabled, custom_id: "export_json" }
    ]},
    { type: 1, components: [
        { style: ButtonStyle.Success, type: 2, label: "💾 Guardar", disabled, custom_id: "save_block" },
        { style: ButtonStyle.Danger, type: 2, label: "❌ Cancelar", disabled, custom_id: "cancel_block" },
        { style: ButtonStyle.Danger, type: 2, label: "🗑️ Eliminar", disabled, custom_id: "delete_block" }
    ]}
]);

const isValidUrl = isValidUrlOrVariable;

const validateContent = (content: string | undefined | null): string => {
    if (!content || typeof content !== 'string') return "Sin contenido";
    const cleaned = content.trim();
    if (!cleaned) return "Sin contenido";
    if (cleaned.length > 4000) return cleaned.slice(0, 3997) + "...";
    return cleaned;
};

const parseEmojiInput = (input?: string): any | null => {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^<(a?):(\w+):(\d+)>$/);
    if (match) return { id: match[3], name: match[2], animated: match[1] === 'a' };
    return { name: trimmed };
};

const buildLinkAccessory = async (link: any, member: any, guild: any) => {
    if (!link || !link.url) return null;
    // @ts-ignore
    const processedUrl = await replaceVars(link.url, member, guild);
    if (!isValidUrl(processedUrl)) return null;
    const accessory: any = { type: 2, style: ButtonStyle.Link, url: processedUrl };
    if (link.label && typeof link.label === 'string' && link.label.trim()) accessory.label = link.label.trim().slice(0, 80);
    if (link.emoji && typeof link.emoji === 'string') {
        const parsed = parseEmojiInput(link.emoji);
        if (parsed) accessory.emoji = parsed;
    }
    if (!accessory.label && !accessory.emoji) return null;
    return accessory;
};

const renderPreview = async (blockState: any, member: any, guild: any) => {
    const previewComponents: any[] = [];

    if (blockState.coverImage && isValidUrl(blockState.coverImage)) {
        // @ts-ignore
        const processedCoverUrl = await replaceVars(blockState.coverImage, member, guild);
        if (isValidUrl(processedCoverUrl)) previewComponents.push({ type: 12, items: [{ media: { url: processedCoverUrl } }] });
    }

    // @ts-ignore
    const processedTitle = await replaceVars(blockState.title ?? "Sin título", member, guild);
    previewComponents.push({ type: 10, content: validateContent(processedTitle) });

    for (const c of blockState.components) {
        if (c.type === 10) {
            // @ts-ignore
            const processedThumbnail = c.thumbnail ? await replaceVars(c.thumbnail, member, guild) : null;
            // @ts-ignore
            const processedContent = await replaceVars(c.content || "Sin contenido", member, guild);
            const validatedContent = validateContent(processedContent);
            let accessory: any = null;
            if (c.linkButton) accessory = await buildLinkAccessory(c.linkButton, member, guild);
            if (!accessory && processedThumbnail && isValidUrl(processedThumbnail)) accessory = { type: 11, media: { url: processedThumbnail } };
            if (accessory) previewComponents.push({ type: 9, components: [{ type: 10, content: validatedContent }], accessory });
            else previewComponents.push({ type: 10, content: validatedContent });
        } else if (c.type === 14) {
            previewComponents.push({ type: 14, divider: c.divider ?? true, spacing: c.spacing ?? 1 });
        } else if (c.type === 12) {
            // @ts-ignore
            const processedImageUrl = await replaceVars(c.url, member, guild);
            if (isValidUrl(processedImageUrl)) previewComponents.push({ type: 12, items: [{ media: { url: processedImageUrl } }] });
        }
    }

    return { type: 17, accent_color: blockState.color ?? null, components: previewComponents };
};

// Helper para actualizar el editor combinando Display Container dentro de components
const updateEditor = async (msg: any, data: any) => {
    const container = data?.display;
    const rows = Array.isArray(data?.components) ? data.components : [];
    const components = container ? [container, ...rows] : rows;
    const payload: any = { ...data };
    delete payload.display;
    payload.components = components;

    if (payload.flags === undefined) {
        payload.flags = MessageFlags.IsComponentsV2;
    }

    // Si usamos Components V2, debemos limpiar explícitamente el content legado
    if (payload.flags === MessageFlags.IsComponentsV2) {
        payload.content = null;
    }

    await msg.edit(payload);
};

export const command: CommandMessage = {
    name: "editar-embed",
    type: "message",
    aliases: ["embed-editar", "modificar-embed", "blockeditv2"],
    cooldown: 20,
    description: "Edita un bloque/embed existente con herramientas interactivas.",
    category: "Alianzas",
    usage: "editar-embed <nombre>",
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

        const existingBlock = await client.prisma.blockV2Config.findFirst({
            where: { guildId: message.guild!.id, name: blockName }
        });
        if (!existingBlock) {
            await message.reply("❌ Block no encontrado. Usa `!blockcreatev2 <nombre>` para crear uno nuevo.");
            return;
        }

        let blockState: any = {
            //@ts-ignore
            title: existingBlock.config?.title ?? `## Block: ${blockName}`,
            //@ts-ignore
            color: existingBlock.config?.color ?? 0x427AE3,
            //@ts-ignore
            coverImage: existingBlock.config?.coverImage ?? null,
            //@ts-ignore
            components: Array.isArray(existingBlock.config?.components) ? existingBlock.config.components : []
        };

        // @ts-ignore
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

        await new Promise(r => setTimeout(r, 3000));

        // @ts-ignore
        await updateEditor(editorMessage, {
            content: null,
            flags: MessageFlags.IsComponentsV2,
            display: await renderPreview(blockState, message.member, message.guild),
            components: btns(false)
        });

        const collector = editorMessage.createMessageComponentCollector({ time: 3600000 });
        collector.on("collect", async (i: any) => {
            if (i.user.id !== message.author.id) {
                await i.reply({ content: "No puedes usar este menú.", flags: MessageFlags.Ephemeral });
                return;
            }

            if (i.isButton()) {
                switch (i.customId) {
                    case "save_block": {
                        try { await i.deferUpdate(); } catch {}
                        try {
                            await client.prisma.blockV2Config.update({
                                where: { guildId_name: { guildId: message.guildId!, name: blockName } },
                                //@ts-ignore
                                data: { config: blockState }
                            });
                            try {
                                // @ts-ignore
                                await i.followUp({ flags: MessageFlags.Ephemeral, content: `✅ Cambios de "${blockName}" guardados.` });
                            } catch {}
                            // Intentar borrar el editor; si falla, deshabilitar componentes como fallback
                            try { await editorMessage.delete(); }
                            catch {
                                try {
                                    await updateEditor(editorMessage, {
                                        display: { type: 17, components: [ { type: 10, content: '✅ Guardado. Puedes cerrar este mensaje.' } ] },
                                        components: []
                                    });
                                } catch {}
                            }
                            collector.stop('saved');
                        } catch (err) {
                            try {
                                // @ts-ignore
                                await i.followUp({ flags: MessageFlags.Ephemeral, content: '❌ Error al guardar el bloque. Inténtalo de nuevo.' });
                            } catch {}
                        }
                        return;
                    }
                    case "cancel_block": {
                        try { await i.deferUpdate(); } catch {}
                        try { await editorMessage.delete(); } catch {}
                        collector.stop('cancelled');
                        return;
                    }
                    case "edit_title": {
                        const modal = {
                            title: '📝 Editar Título del Block',
                            customId: 'edit_title_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'Nuevo Título',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'title_input',
                                    style: TextInputStyle.Short,
                                    required: true,
                                    placeholder: 'Escribe el nuevo título aquí...',
                                    value: blockState.title || '',
                                    maxLength: 256
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_description": {
                        const descComp = blockState.components.find((c: any) => c.type === 10);
                        const currentDesc = descComp ? descComp.content : '';
                        const modal = {
                            title: '📄 Editar Descripción',
                            customId: 'edit_description_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'Nueva Descripción',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'description_input',
                                    style: TextInputStyle.Paragraph,
                                    required: true,
                                    placeholder: 'Escribe la nueva descripción aquí...',
                                    value: currentDesc || '',
                                    maxLength: 2000
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_color": {
                        const currentColor = blockState.color ? `#${blockState.color.toString(16).padStart(6, '0')}` : '';
                        const modal = {
                            title: '🎨 Editar Color del Block',
                            customId: 'edit_color_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'Color en formato HEX',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'color_input',
                                    style: TextInputStyle.Short,
                                    required: false,
                                    placeholder: '#FF5733 o FF5733',
                                    value: currentColor,
                                    maxLength: 7
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "add_content": {
                        const modal = {
                            title: '➕ Agregar Nuevo Contenido',
                            customId: 'add_content_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'Contenido del Texto',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'content_input',
                                    style: TextInputStyle.Paragraph,
                                    required: true,
                                    placeholder: 'Escribe el contenido aquí...',
                                    maxLength: 2000
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "add_image": {
                        const modal = {
                            title: '🖼️ Agregar Nueva Imagen',
                            customId: 'add_image_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'URL de la Imagen',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'image_url_input',
                                    style: TextInputStyle.Short,
                                    required: true,
                                    placeholder: 'https://ejemplo.com/imagen.png',
                                    maxLength: 2000
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "cover_image": {
                        if (blockState.coverImage) {
                            await i.reply({ flags: 64, content: "Ya tienes una imagen de portada. ¿Qué quieres hacer?", components: [{ type: 1, components: [
                                { type: 2, style: ButtonStyle.Primary, label: "✏️ Editar", custom_id: "edit_cover_modal" },
                                { type: 2, style: ButtonStyle.Danger, label: "🗑️ Eliminar", custom_id: "delete_cover" }
                            ] }] });
                            const replyMsg = await i.fetchReply();
                            const coverCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 60000, filter: (b: any) => b.user.id === message.author.id });
                            coverCollector.on('collect', async (b: any) => {
                                if (b.customId === 'edit_cover_modal') {
                                    const modal = {
                                        title: '🖼️ Editar Imagen de Portada',
                                        customId: 'edit_cover_modal',
                                        components: [{
                                            type: ComponentType.Label,
                                            label: 'URL de la Imagen de Portada',
                                            component: {
                                                type: ComponentType.TextInput,
                                                customId: 'cover_input',
                                                style: TextInputStyle.Short,
                                                required: true,
                                                placeholder: 'https://ejemplo.com/portada.png',
                                                value: blockState.coverImage || '',
                                                maxLength: 2000
                                            }
                                        }]
                                    } as const;
                                    await b.showModal(modal);
                                } else if (b.customId === 'delete_cover') {
                                    blockState.coverImage = null;
                                    await b.update({ content: '✅ Imagen de portada eliminada.', components: [] });
                                    await updateEditor(editorMessage, {
                                        display: await renderPreview(blockState, message.member, message.guild),
                                        components: btns(false)
                                    });
                                }
                                coverCollector.stop();
                            });
                        } else {
                            const modal = {
                                title: '🖼️ Agregar Imagen de Portada',
                                customId: 'add_cover_modal',
                                components: [{
                                    type: ComponentType.Label,
                                    label: 'URL de la Imagen de Portada',
                                    component: {
                                        type: ComponentType.TextInput,
                                        customId: 'cover_input',
                                        style: TextInputStyle.Short,
                                        required: true,
                                        placeholder: 'https://ejemplo.com/portada.png',
                                        maxLength: 2000
                                    }
                                }]
                            } as const;
                            await i.showModal(modal);
                        }
                        break;
                    }
                    case "move_block": {
                        //@ts-ignore
                        const options = blockState.components.map((c: any, idx: number) => ({
                            label: c.type === 10 ? `Texto: ${c.content?.slice(0, 30) || '...'}` : c.type === 14 ? 'Separador' : c.type === 12 ? `Imagen: ${c.url?.slice(-30) || '...'}` : `Componente ${c.type}`,
                            value: String(idx),
                            description: c.type === 10 && (c.thumbnail || c.linkButton) ? (c.thumbnail ? 'Con thumbnail' : 'Con botón link') : undefined
                        }));
                        // @ts-ignore
                        await i.reply({ flags: 64, content: 'Selecciona el bloque que quieres mover:', components: [{ type: 1, components: [ { type: 3, custom_id: 'move_block_select', placeholder: 'Elige un bloque', options } ] }] });
                        // @ts-ignore
                        const replyMsg = await i.fetchReply();
                        // @ts-ignore
                        const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === message.author.id });
                        selCollector.on('collect', async (sel: any) => {
                            const idx = parseInt(sel.values[0]);
                            await sel.update({ content: '¿Quieres mover este bloque?', components: [{ type: 1, components: [
                                { type: 2, style: ButtonStyle.Secondary, label: '⬆️ Subir', custom_id: `move_up_${idx}`, disabled: idx === 0 },
                                { type: 2, style: ButtonStyle.Secondary, label: '⬇️ Bajar', custom_id: `move_down_${idx}`, disabled: idx === blockState.components.length - 1 }
                            ] }] });
                            // @ts-ignore
                            const btnCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 60000, filter: (b: any) => b.user.id === message.author.id });
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
                                await updateEditor(editorMessage, { // @ts-ignore
                                    display: await renderPreview(blockState, message.member, message.guild),
                                    components: btns(false)
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
                        blockState.components.forEach((c: any, idx: number) => options.push({
                            label: c.type === 10 ? `Texto: ${c.content?.slice(0, 30) || '...'}` : c.type === 14 ? `Separador ${c.divider ? '(Visible)' : '(Invisible)'}` : c.type === 12 ? `Imagen: ${c.url?.slice(-30) || '...'}` : `Componente ${c.type}`,
                            value: String(idx),
                            description: c.type === 10 && (c.thumbnail || c.linkButton) ? (c.thumbnail ? 'Con thumbnail' : 'Con botón link') : undefined
                        }));
                        if (options.length === 0) {
                            await i.deferReply({ flags: 64 });
                            // @ts-ignore
                            await i.editReply({ content: '❌ No hay elementos para eliminar.' });
                            break;
                        }
                        // @ts-ignore
                        const reply = await i.reply({ flags: 64, content: 'Selecciona el elemento que quieres eliminar:', components: [{ type: 1, components: [ { type: 3, custom_id: 'delete_block_select', placeholder: 'Elige un elemento', options } ] }] });
                        // @ts-ignore
                        const replyMsg = await i.fetchReply();
                        // @ts-ignore
                        const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === message.author.id });
                        selCollector.on('collect', async (sel: any) => {
                            const selectedValue = sel.values[0];
                            if (selectedValue === 'cover_image') {
                                //@ts-ignore
                                blockState.coverImage = null;
                                await sel.update({ content: '✅ Imagen de portada eliminada.', components: [] });
                            } else {
                                const idx = parseInt(selectedValue);
                                //@ts-ignore
                                blockState.components.splice(idx, 1);
                                await sel.update({ content: '✅ Elemento eliminado.', components: [] });
                            }
                            await updateEditor(editorMessage, { // @ts-ignore
                                display: await renderPreview(blockState, message.member, message.guild),
                                components: btns(false)
                            });
                            selCollector.stop();
                        });
                        break;
                    }
                    case "show_variables": {
                        const vars = listVariables();
                        const chunked: string[] = [];
                        let current = "";
                        for (const v of vars) {
                            const line = `• ${v}\n`;
                            if ((current + line).length > 1800) { chunked.push(current); current = line; }
                            else current += line;
                        }
                        if (current) chunked.push(current);
                        if (chunked.length === 0) {
                            await i.deferReply({ flags: 64 });
                            // @ts-ignore
                            await i.editReply({ content: 'No hay variables registradas.' });
                        } else {
                            // @ts-ignore
                            await i.reply({ flags: 64, content: `📋 **Variables Disponibles:**\n\n${chunked[0]}` });
                            for (let idx = 1; idx < chunked.length; idx++) {
                                // @ts-ignore
                                await i.followUp({ flags: 64, content: chunked[idx] });
                            }
                        }
                        break;
                    }
                    case "duplicate_block": {
                        const options = blockState.components.map((c: any, idx: number) => ({
                            label: c.type === 10 ? `Texto: ${c.content?.slice(0, 30) || '...'}` : c.type === 14 ? 'Separador' : c.type === 12 ? `Imagen: ${c.url?.slice(-30) || '...'}` : `Componente ${c.type}`,
                            value: String(idx),
                            description: c.type === 10 && (c.thumbnail || c.linkButton) ? (c.thumbnail ? 'Con thumbnail' : 'Con botón link') : undefined
                        }));
                        if (options.length === 0) {
                            await i.deferReply({ flags: 64 });
                            // @ts-ignore
                            await i.editReply({ content: '❌ No hay elementos para duplicar.' });
                            break;
                        }
                        // @ts-ignore
                        await i.reply({ flags: 64, content: 'Selecciona el elemento que quieres duplicar:', components: [{ type: 1, components: [{ type: 3, custom_id: 'duplicate_select', placeholder: 'Elige un elemento', options }] }] });
                        // @ts-ignore
                        const replyMsg = await i.fetchReply();
                        // @ts-ignore
                        const selCollector2 = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (sel: any) => sel.user.id === message.author.id });
                        selCollector2.on('collect', async (sel: any) => {
                            const idx = parseInt(sel.values[0]);
                            const originalComponent = blockState.components[idx];
                            const duplicatedComponent = JSON.parse(JSON.stringify(originalComponent));
                            blockState.components.splice(idx + 1, 0, duplicatedComponent);
                            await sel.update({ content: '✅ Elemento duplicado.', components: [] });
                            await updateEditor(editorMessage, { // @ts-ignore
                                display: await renderPreview(blockState, message.member, message.guild),
                                components: btns(false)
                            });
                        });
                        break;
                    }
                    case "show_raw": {
                        const rawJson = JSON.stringify(blockState, null, 2);
                        const truncated = rawJson.length > 1900 ? rawJson.slice(0, 1900) + "..." : rawJson;
                        // @ts-ignore
                        await i.reply({ flags: 64, content: `\`\`\`json\n${truncated}\n\`\`\`` });
                        break;
                    }
                    case "import_json": {
                        const modal = {
                            title: '📥 Importar JSON',
                            customId: 'import_json_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: 'Pega tu configuración JSON aquí',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'json_input',
                                    style: TextInputStyle.Paragraph,
                                    required: true,
                                    placeholder: '{"title": "...", "components": [...]}',
                                    maxLength: 4000
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "export_json": {
                        const exportJson = JSON.stringify(blockState, null, 2);
                        const truncatedJson = exportJson.length > 1800 ? exportJson.slice(0, 1800) + "\n..." : exportJson;
                        // @ts-ignore
                        await i.reply({ flags: 64, content: `📤 **JSON Exportado:**\n\`\`\`json\n${truncatedJson}\n\`\`\`\n\n💡 **Tip:** Copia el JSON de arriba manualmente y pégalo donde necesites.` });
                        break;
                    }
                    case "add_separator": {
                        const modal = {
                            title: '➖ Agregar Separador',
                            customId: 'add_separator_modal',
                            components: [{
                                type: ComponentType.Label,
                                label: '¿Separador visible? (true/false)',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'separator_visible',
                                    style: TextInputStyle.Short,
                                    placeholder: 'true o false',
                                    value: 'true',
                                    maxLength: 5,
                                    required: true
                                }
                            }, {
                                type: ComponentType.Label,
                                label: 'Espaciado (1-3)',
                                component: {
                                    type: ComponentType.TextInput,
                                    customId: 'separator_spacing',
                                    style: TextInputStyle.Short,
                                    placeholder: '1, 2 o 3',
                                    value: '1',
                                    maxLength: 1,
                                    required: false
                                }
                            }]
                        } as const;
                        await i.showModal(modal);
                        break;
                    }
                    case "edit_thumbnail": {
                        const textDisplays = blockState.components.map((c: any, idx: number) => ({ c, idx })).filter(({ c }: any) => c.type === 10);
                        if (textDisplays.length === 0) {
                            await i.deferReply({ flags: 64 });
                            // @ts-ignore
                            await i.editReply({ content: '❌ No hay bloques de texto para editar thumbnail.' });
                            break;
                        }
                        const options = textDisplays.map(({ c, idx }: any) => ({ label: `Texto #${idx + 1}: ${c.content?.slice(0, 30) || '...'}`, value: String(idx), description: c.thumbnail ? 'Con thumbnail' : c.linkButton ? 'Con botón link' : 'Sin accesorio' }));
                        // @ts-ignore
                        const reply = await i.reply({ flags: 64, content: 'Elige el TextDisplay a editar su thumbnail:', components: [{ type: 1, components: [ { type: 3, custom_id: 'choose_text_for_thumbnail', placeholder: 'Selecciona un bloque de texto', options } ] }] });
                        // @ts-ignore
                        const replyMsg = await i.fetchReply();
                        // @ts-ignore
                        const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === message.author.id });
                        selCollector.on('collect', async (sel: any) => {
                            const idx = parseInt(sel.values[0]);
                            const textComp = blockState.components[idx];
                            const modal = {
                                title: '📎 Editar Thumbnail',
                                customId: `edit_thumbnail_modal_${idx}`,
                                components: [{
                                    type: ComponentType.Label,
                                    label: 'URL del Thumbnail',
                                    component: {
                                        type: ComponentType.TextInput,
                                        customId: 'thumbnail_input',
                                        style: TextInputStyle.Short,
                                        placeholder: 'https://ejemplo.com/thumbnail.png o dejar vacío para eliminar',
                                        value: textComp?.thumbnail || '',
                                        maxLength: 2000,
                                        required: false
                                    }
                                }]
                            } as const;
                            await sel.showModal(modal);
                        });
                        break;
                    }
                    case "edit_link_button": {
                        //@ts-ignore
                        const textDisplays = blockState.components.map((c: any, idx: number) => ({ c, idx })).filter(({ c }: any) => c.type === 10);
                        if (textDisplays.length === 0) {
                            await i.deferReply({ flags: 64 });
                            // @ts-ignore
                            await i.editReply({ content: '❌ Necesitas al menos un componente de texto para añadir un botón link.' });
                            break;
                        }
                        const options = textDisplays.map(({ c, idx }: any) => ({ label: `Texto #${idx + 1}: ${c.content?.slice(0, 30) || '...'}`, value: String(idx), description: c.linkButton ? 'Con botón link' : c.thumbnail ? 'Con thumbnail' : 'Sin accesorio' }));
                        // @ts-ignore
                        const reply = await i.reply({ flags: 64, content: 'Elige el TextDisplay donde agregar/editar el botón link:', components: [{ type: 1, components: [ { type: 3, custom_id: 'choose_text_for_linkbtn', placeholder: 'Selecciona un bloque de texto', options } ] }] });
                        // @ts-ignore
                        const replyMsg = await i.fetchReply();
                        // @ts-ignore
                        const selCollector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1, time: 60000, filter: (it: any) => it.user.id === message.author.id });
                        selCollector.on('collect', async (sel: any) => {
                            const idx = parseInt(sel.values[0]);
                            const textComp = blockState.components[idx];
                            if (textComp.thumbnail) {
                                await sel.update({ content: '❌ Este bloque ya tiene un thumbnail. Elimínalo antes de añadir un botón link.', components: [] });
                                return;
                            }
                            if (textComp.linkButton) {
                                // @ts-ignore
                                const sub = await i.followUp({ flags: 64, content: `Texto #${idx + 1}: ya tiene botón link. ¿Qué deseas hacer?`, components: [{ type: 1, components: [
                                    { type: 2, style: ButtonStyle.Primary, label: '✏️ Editar', custom_id: `edit_link_button_modal_${idx}` },
                                    { type: 2, style: ButtonStyle.Danger, label: '🗑️ Eliminar', custom_id: `delete_link_button_${idx}` }
                                ] }] });
                                // @ts-ignore
                                const btnCollector = sub.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 60000, filter: (b: any) => b.user.id === message.author.id });
                                btnCollector.on('collect', async (b: any) => {
                                    if (b.customId.startsWith('edit_link_button_modal_')) {
                                        const modal = {
                                            title: '🔗 Editar Botón Link',
                                            customId: `edit_link_button_modal_${idx}`,
                                            components: [{
                                                type: ComponentType.Label,
                                                label: 'URL del botón (obligatoria)',
                                                component: {
                                                    type: ComponentType.TextInput,
                                                    customId: 'link_url_input',
                                                    style: TextInputStyle.Short,
                                                    placeholder: 'https://ejemplo.com',
                                                    value: textComp.linkButton?.url || '',
                                                    maxLength: 2000,
                                                    required: true
                                                }
                                            }, {
                                                type: ComponentType.Label,
                                                label: 'Etiqueta (opcional)',
                                                component: {
                                                    type: ComponentType.TextInput,
                                                    customId: 'link_label_input',
                                                    style: TextInputStyle.Short,
                                                    placeholder: 'Texto del botón o vacío para usar solo emoji',
                                                    value: textComp.linkButton?.label || '',
                                                    maxLength: 80,
                                                    required: false
                                                }
                                            }, {
                                                type: ComponentType.Label,
                                                label: 'Emoji (opcional)',
                                                component: {
                                                    type: ComponentType.TextInput,
                                                    customId: 'link_emoji_input',
                                                    style: TextInputStyle.Short,
                                                    placeholder: 'Ej: 🔗 o <:name:id>',
                                                    value: textComp.linkButton?.emoji || '',
                                                    maxLength: 64,
                                                    required: false
                                                }
                                            }]
                                        } as const;
                                        await b.showModal(modal);
                                    } else if (b.customId.startsWith('delete_link_button_')) {
                                        delete textComp.linkButton;
                                        await b.update({ content: '✅ Botón link eliminado.', components: [] });
                                        await updateEditor(editorMessage, { // @ts-ignore
                                            display: await renderPreview(blockState, message.member, message.guild),
                                            components: btns(false)
                                        });
                                    }
                                });
                            } else {
                                const modal = {
                                    title: '🔗 Crear Botón Link',
                                    customId: `create_link_button_modal_${idx}`,
                                    components: [{
                                        type: ComponentType.Label,
                                        label: 'URL del botón (obligatoria)',
                                        component: {
                                            type: ComponentType.TextInput,
                                            customId: 'link_url_input',
                                            style: TextInputStyle.Short,
                                            placeholder: 'https://ejemplo.com',
                                            maxLength: 2000,
                                            required: true
                                        }
                                    }, {
                                        type: ComponentType.Label,
                                        label: 'Etiqueta (opcional)',
                                        component: {
                                            type: ComponentType.TextInput,
                                            customId: 'link_label_input',
                                            style: TextInputStyle.Short,
                                            placeholder: 'Texto del botón o vacío para usar solo emoji',
                                            maxLength: 80,
                                            required: false
                                        }
                                    }, {
                                        type: ComponentType.Label,
                                        label: 'Emoji (opcional)',
                                        component: {
                                            type: ComponentType.TextInput,
                                            customId: 'link_emoji_input',
                                            style: TextInputStyle.Short,
                                            placeholder: 'Ej: 🔗 o <:name:id>',
                                            maxLength: 64,
                                            required: false
                                        }
                                    }]
                                } as const;
                                await sel.showModal(modal);
                            }
                        });
                        break;
                    }
                }

                await updateEditor(editorMessage, { // @ts-ignore
                    display: await renderPreview(blockState, message.member, message.guild),
                    components: btns(false)
                });
            }
        });

        // Manejo de modales
        let modalHandlerActive = true;
        const modalHandler = async (interaction: any) => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.user.id !== message.author.id) return;
            if (!modalHandlerActive) return;
            try {
                const id = interaction.customId as string;
                if (id === 'edit_title_modal') {
                    blockState.title = interaction.fields.getTextInputValue('title_input');
                    await interaction.reply({ content: '✅ Título actualizado.', flags: 64 });
                } else if (id === 'edit_description_modal') {
                    const newDescription = interaction.fields.getTextInputValue('description_input');
                    const firstText = blockState.components.find((c: any) => c.type === 10);
                    if (firstText) firstText.content = newDescription; else blockState.components.push({ type: 10, content: newDescription, thumbnail: null });
                    await interaction.reply({ content: '✅ Descripción actualizada.', flags: 64 });
                } else if (id === 'edit_color_modal') {
                    const colorInput = interaction.fields.getTextInputValue('color_input');
                    if (colorInput.trim() === '') blockState.color = null; else {
                        const hexColor = colorInput.replace('#', '');
                        if (/^[0-9A-F]{6}$/i.test(hexColor)) blockState.color = parseInt(hexColor, 16); else {
                            await interaction.reply({ content: '❌ Color inválido. Usa formato HEX (#FF5733)', flags: 64 });
                            return;
                        }
                    }
                    await interaction.reply({ content: '✅ Color actualizado.', flags: 64 });
                } else if (id === 'add_content_modal') {
                    const newContent = interaction.fields.getTextInputValue('content_input');
                    blockState.components.push({ type: 10, content: newContent, thumbnail: null });
                    await interaction.reply({ content: '✅ Contenido añadido.', flags: 64 });
                } else if (id === 'add_image_modal') {
                    const imageUrl = interaction.fields.getTextInputValue('image_url_input');
                    if (isValidUrl(imageUrl)) { blockState.components.push({ type: 12, url: imageUrl }); await interaction.reply({ content: '✅ Imagen añadida.', flags: 64 }); }
                    else { await interaction.reply({ content: '❌ URL de imagen inválida.', flags: 64 }); return; }
                } else if (id === 'add_cover_modal' || id === 'edit_cover_modal') {
                    const coverUrl = interaction.fields.getTextInputValue('cover_input');
                    if (isValidUrl(coverUrl)) { blockState.coverImage = coverUrl; await interaction.reply({ content: '✅ Imagen de portada actualizada.', flags: 64 }); }
                    else { await interaction.reply({ content: '❌ URL de portada inválida.', flags: 64 }); return; }
                } else if (id === 'add_separator_modal') {
                    const visibleStr = interaction.fields.getTextInputValue('separator_visible').toLowerCase();
                    const spacingStr = interaction.fields.getTextInputValue('separator_spacing') || '1';
                    const divider = visibleStr === 'true' || visibleStr === '1' || visibleStr === 'si' || visibleStr === 'sí';
                    const spacing = Math.min(3, Math.max(1, parseInt(spacingStr) || 1));
                    blockState.components.push({ type: 14, divider, spacing });
                    await interaction.reply({ content: '✅ Separador añadido.', flags: 64 });
                } else if (id.startsWith('edit_thumbnail_modal_')) {
                    const idx = parseInt(id.replace('edit_thumbnail_modal_', ''));
                    const textComp = blockState.components[idx];
                    if (!textComp || textComp.type !== 10) return;
                    const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail_input');
                    if (thumbnailUrl.trim() === '') { textComp.thumbnail = null; await interaction.reply({ content: '✅ Thumbnail eliminado.', flags: 64 }); }
                    else if (!isValidUrl(thumbnailUrl)) { await interaction.reply({ content: '❌ URL de thumbnail inválida.', flags: 64 }); return; }
                    else {
                        if (textComp.linkButton) { await interaction.reply({ content: '❌ Este bloque ya tiene un botón link. Elimina el botón antes de añadir thumbnail.', flags: 64 }); return; }
                        textComp.thumbnail = thumbnailUrl; await interaction.reply({ content: '✅ Thumbnail actualizado.', flags: 64 });
                    }
                } else if (id.startsWith('create_link_button_modal_') || id.startsWith('edit_link_button_modal_')) {
                    const idx = parseInt(id.replace('create_link_button_modal_', '').replace('edit_link_button_modal_', ''));
                    const textComp = blockState.components[idx];
                    if (!textComp || textComp.type !== 10) return;
                    const url = interaction.fields.getTextInputValue('link_url_input');
                    const label = (interaction.fields.getTextInputValue('link_label_input') || '').trim();
                    const emojiStr = (interaction.fields.getTextInputValue('link_emoji_input') || '').trim();
                    if (!isValidUrl(url)) { await interaction.reply({ content: '❌ URL inválida para el botón.', flags: 64 }); return; }
                    const parsedEmoji = parseEmojiInput(emojiStr || undefined);
                    if (!label && !parsedEmoji) { await interaction.reply({ content: '❌ Debes proporcionar al menos una etiqueta o un emoji.', flags: 64 }); return; }
                    if (textComp.thumbnail) { await interaction.reply({ content: '❌ Este bloque tiene thumbnail. Elimínalo antes de añadir un botón link.', flags: 64 }); return; }
                    textComp.linkButton = { url, label: label || undefined, emoji: emojiStr || undefined };
                    await interaction.reply({ content: '✅ Botón link actualizado.', flags: 64 });
                } else { return; }

                setTimeout(async () => {
                    if (!modalHandlerActive) return;
                    try {
                        const exists = await editorMessage.fetch().catch(() => null);
                        if (!exists) return;
                        await updateEditor(editorMessage, { // @ts-ignore
                            display: await renderPreview(blockState, message.member, message.guild),
                            components: btns(false)
                        });
                    } catch {}
                }, 400);
            } catch {}
        };

        client.on('interactionCreate', modalHandler);
        collector.on('end', async (_: any, reason: string) => {
            modalHandlerActive = false;
            client.off('interactionCreate', modalHandler);
            if (reason === 'time') {
                try {
                    const exists = await editorMessage.fetch().catch(() => null);
                    if (exists) {
                        await updateEditor(editorMessage, { // @ts-ignore
                            display: { type: 17, components: [{ type: 10, content: '⏰ Editor finalizado por inactividad.' }] },
                            components: []
                        });
                    }
                } catch {}
            }
        });
    }
};
