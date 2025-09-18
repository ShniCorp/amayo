import { CommandMessage } from "../../../core/types/commands";
// @ts-ignore
import { ComponentType, ButtonStyle } from "discord.js";
import { replaceVars } from "../../../core/lib/vars";

/**
 * Botones de edición
 */
const btns = (disabled = false) => ([
    {
        type: 1,
        components: [
            { style: ButtonStyle.Secondary, type: 2, label: "Editar Título", disabled, custom_id: "edit_title" },
            { style: ButtonStyle.Secondary, type: 2, label: "Editar Descripción", disabled, custom_id: "edit_description" },
            { style: ButtonStyle.Secondary, type: 2, label: "Editar Color", disabled, custom_id: "edit_color" },
            { style: ButtonStyle.Secondary, type: 2, label: "Añadir Contenido", disabled, custom_id: "add_content" },
            { style: ButtonStyle.Secondary, type: 2, label: "Añadir Separador", disabled, custom_id: "add_separator" }
        ]
    },
    {
        type: 1,
        components: [
            { style: ButtonStyle.Secondary, type: 2, label: "Añadir Imagen", disabled, custom_id: "add_image" },
            { style: ButtonStyle.Secondary, type: 2, label: "Imagen Portada", disabled, custom_id: "cover_image" },
            { style: ButtonStyle.Primary, type: 2, label: "Mover Bloque", disabled, custom_id: "move_block" },
            { style: ButtonStyle.Danger, type: 2, label: "Eliminar Bloque", disabled, custom_id: "delete_block" },
            { style: ButtonStyle.Secondary, type: 2, label: "Editar Thumbnail", disabled, custom_id: "edit_thumbnail" }
        ]
    },
    {
        type: 1,
        components: [
            { style: ButtonStyle.Success, type: 2, label: "Guardar", disabled, custom_id: "save_block" },
            { style: ButtonStyle.Danger, type: 2, label: "Cancelar", disabled, custom_id: "cancel_block" }
        ]
    }
]);

/**
 * Validar si una URL es válida
 */
const isValidUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
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

    // Añadir título después de la portada
    previewComponents.push({
        type: 10,
        //@ts-ignore
        content: await replaceVars(blockState.title ?? "Sin título", member, guild)
    });

    // Procesar componentes en orden
    for (const c of blockState.components) {
        if (c.type === 10) {
            // Componente de texto con thumbnail opcional
            //@ts-ignore
            const processedThumbnail = c.thumbnail ? await replaceVars(c.thumbnail, member, guild) : null;

            if (processedThumbnail && isValidUrl(processedThumbnail)) {
                // Si tiene thumbnail válido, usar contenedor tipo 9 con accessory
                previewComponents.push({
                    type: 9,
                    components: [
                        {
                            type: 10,
                            //@ts-ignore
                            content: await replaceVars(c.content || " ", member, guild)
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
                    //@ts-ignore
                    content: await replaceVars(c.content || " ", member, guild)
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
    name: "blockcreatev2",
    type: "message",
    cooldown: 20,
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const blockName: string | null = args[0] ?? null;
        if (!blockName) {
            return message.reply("Debes proporcionar un nombre. Uso: `!blockcreatev2 <nombre>`");
        }

        const nameIsValid = await client.prisma.blockV2Config.findFirst({
            where: { guildId: message.guild!.id, name: blockName }
        });
        if (nameIsValid) return message.reply("❌ Nombre ya usado!");

        // Estado inicial
        let blockState: any = {
            title: `Editor de Block: ${blockName}`,
            color: null,
            coverImage: null, // Nueva propiedad para imagen de portada
            components: [
                { type: 14, divider: false },
                { type: 10, content: "Usa los botones para configurar.", thumbnail: null }
            ]
        };

        //@ts-ignore
        const editorMessage = await message.channel.send({
            flags: 32768,
            components: [
                await renderPreview(blockState, message.member, message.guild),
                ...btns(false)
            ]
        });

        const collector = editorMessage.createMessageComponentCollector({
            time: 300000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id) {
                await i.reply({ content: "No puedes usar este menú.", ephemeral: true });
                return;
            }

            // --- BOTONES ---
            if (i.isButton()) {
                await editorMessage.edit({
                    components: [await renderPreview(blockState, message.member, message.guild), ...btns(true)]
                });
                await i.deferUpdate();

                switch (i.customId) {
                    case "save_block": {
                        await client.prisma.blockV2Config.upsert({
                            where: { guildId_name: { guildId: message.guildId!, name: blockName } },
                            update: { config: blockState },
                            create: {
                                name: blockName,
                                config: blockState,
                                guild: {
                                    connectOrCreate: {
                                        where: { id: message.guildId! },
                                        create: { id: message.guildId!, name: message.guild!.name }
                                    }
                                }
                            }
                        });
                        await editorMessage.edit({
                            components: [
                                {
                                    type: 17,
                                    accent_color: blockState.color ?? null,
                                    components: [
                                        { type: 10, content: `✅ Guardado: ${blockName}` },
                                        { type: 10, content: "Configuración guardada en la base de datos (JSON)." }
                                    ]
                                }
                            ]
                        });
                        collector.stop();
                        return;
                    }
                    case "cancel_block": {
                        await editorMessage.delete();
                        collector.stop();
                        return;
                    }
                    case "edit_title": {
                        const prompt = await message.channel.send("Escribe el nuevo **título**.");
                        const mc = message.channel.createMessageCollector({
                            filter: (m) => m.author.id === message.author.id,
                            max: 1,
                            time: 60000
                        });
                        mc.on("collect", async (collected) => {
                            blockState.title = collected.content;
                            await collected.delete();
                            await prompt.delete();
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "cover_image": {
                        if (blockState.coverImage) {
                            // Si ya tiene portada, preguntar si editar o eliminar
                            //@ts-ignore
                            const reply = await i.followUp({
                                ephemeral: true,
                                content: "Ya tienes una imagen de portada. ¿Qué quieres hacer?",
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            { type: 2, style: ButtonStyle.Primary, label: "✏️ Editar", custom_id: "edit_cover" },
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
                                if (b.customId === "edit_cover") {
                                    await b.update({ content: "Escribe la nueva **URL de la imagen de portada**:", components: [] });

                                    const prompt = await message.channel.send("Nueva URL de portada:");
                                    const mc = message.channel.createMessageCollector({
                                        filter: (m) => m.author.id === message.author.id,
                                        max: 1,
                                        time: 60000
                                    });

                                    mc.on("collect", async (collected) => {
                                        blockState.coverImage = collected.content;
                                        await collected.delete();
                                        await prompt.delete();
                                        await editorMessage.edit({
                                            components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                        });
                                    });
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
                            // No tiene portada, añadir nueva
                            const prompt = await message.channel.send("Escribe la **URL de la imagen de portada**.");
                            const mc = message.channel.createMessageCollector({
                                filter: (m) => m.author.id === message.author.id,
                                max: 1,
                                time: 60000
                            });
                            mc.on("collect", async (collected) => {
                                blockState.coverImage = collected.content;
                                await collected.delete();
                                await prompt.delete();
                                await editorMessage.edit({
                                    components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                });
                            });
                        }
                        break;
                    }
                    case "edit_description": {
                        const prompt = await message.channel.send("Escribe la nueva **descripción**.");
                        const mc = message.channel.createMessageCollector({
                            filter: (m) => m.author.id === message.author.id,
                            max: 1,
                            time: 60000
                        });
                        mc.on("collect", async (collected) => {
                            const descComp = blockState.components.find((c: any) => c.type === 10);
                            if (descComp) descComp.content = collected.content;
                            await collected.delete();
                            await prompt.delete();
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "edit_color": {
                        const prompt = await message.channel.send("Escribe el nuevo **color** en HEX (#RRGGBB).");
                        const mc = message.channel.createMessageCollector({
                            filter: (m) => m.author.id === message.author.id,
                            max: 1,
                            time: 60000
                        });
                        mc.on("collect", async (collected) => {
                            const newValue = collected.content;
                            let parsed: number | null = null;
                            if (/^#?[0-9A-Fa-f]{6}$/.test(newValue)) {
                                parsed = parseInt(newValue.replace("#", ""), 16);
                            }
                            blockState.color = parsed;
                            await collected.delete();
                            await prompt.delete();
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "add_content": {
                        const prompt = await message.channel.send("Escribe el nuevo **contenido**.");
                        const mc = message.channel.createMessageCollector({
                            filter: (m) => m.author.id === message.author.id,
                            max: 1,
                            time: 60000
                        });
                        mc.on("collect", async (collected) => {
                            blockState.components.push({ type: 10, content: collected.content, thumbnail: null });
                            await collected.delete();
                            await prompt.delete();
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "add_separator": {
                        //@ts-ignore
                        const reply = await i.followUp({
                            ephemeral: true,
                            content: "¿El separador debe ser visible?",
                            components: [
                                {
                                    type: 1,
                                    components: [
                                        { type: 2, style: ButtonStyle.Success, label: "✅ Visible", custom_id: "separator_visible" },
                                        { type: 2, style: ButtonStyle.Secondary, label: "❌ Invisible", custom_id: "separator_invisible" }
                                    ]
                                }
                            ],
                            fetchReply: true
                        });

                        //@ts-ignore
                        const sepCollector = reply.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            max: 1,
                            time: 60000,
                            filter: (b: any) => b.user.id === message.author.id
                        });

                        sepCollector.on("collect", async (b: any) => {
                            const isVisible = b.customId === "separator_visible";
                            blockState.components.push({ type: 14, divider: isVisible, spacing: 1 });

                            await b.update({
                                content: `✅ Separador ${isVisible ? 'visible' : 'invisible'} añadido.`,
                                components: []
                            });

                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });

                            sepCollector.stop();
                        });
                        break;
                    }
                    case "add_image": {
                        const prompt = await message.channel.send("Escribe la **URL de la imagen**.");
                        const mc = message.channel.createMessageCollector({
                            filter: (m) => m.author.id === message.author.id,
                            max: 1,
                            time: 60000
                        });
                        mc.on("collect", async (collected) => {
                            blockState.components.push({ type: 12, url: collected.content });
                            await collected.delete();
                            await prompt.delete();
                            await editorMessage.edit({
                                components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                            });
                        });
                        break;
                    }
                    case "edit_thumbnail": {
                        // Buscar componentes de texto para seleccionar cuál editar
                        const textComponents = blockState.components
                            .map((c: any, idx: number) => ({ component: c, index: idx }))
                            .filter(({ component }) => component.type === 10);

                        if (textComponents.length === 0) {
                            //@ts-ignore
                            await i.followUp({
                                content: "❌ No hay componentes de texto para añadir thumbnail.",
                                ephemeral: true
                            });
                            break;
                        }

                        if (textComponents.length === 1) {
                            // Solo un componente de texto, editarlo directamente
                            const prompt = await message.channel.send("Escribe la **URL del thumbnail**.");
                            const mc = message.channel.createMessageCollector({
                                filter: (m) => m.author.id === message.author.id,
                                max: 1,
                                time: 60000
                            });
                            mc.on("collect", async (collected) => {
                                textComponents[0].component.thumbnail = collected.content;
                                await collected.delete();
                                await prompt.delete();
                                await editorMessage.edit({
                                    components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                });
                            });
                        } else {
                            // Múltiples componentes de texto, mostrar selector
                            const options = textComponents.map(({ component, index }) => ({
                                label: `Texto: ${component.content?.slice(0, 30) || "..."}`,
                                value: index.toString(),
                                description: component.thumbnail ? "Ya tiene thumbnail" : "Sin thumbnail"
                            }));

                            //@ts-ignore
                            const reply = await i.followUp({
                                ephemeral: true,
                                content: "Selecciona el texto al que quieres añadir/editar thumbnail:",
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            {
                                                type: 3,
                                                custom_id: "select_text_for_thumbnail",
                                                placeholder: "Elige un texto",
                                                options
                                            }
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
                                filter: (sel: any) => sel.user.id === message.author.id
                            });

                            selCollector.on("collect", async (sel: any) => {
                                const selectedIndex = parseInt(sel.values[0]);

                                await sel.update({
                                    content: "Escribe la **URL del thumbnail**:",
                                    components: []
                                });

                                const prompt = await message.channel.send("URL del thumbnail:");
                                const mc = message.channel.createMessageCollector({
                                    filter: (m) => m.author.id === message.author.id,
                                    max: 1,
                                    time: 60000
                                });

                                mc.on("collect", async (collected) => {
                                    blockState.components[selectedIndex].thumbnail = collected.content;
                                    await collected.delete();
                                    await prompt.delete();
                                    await editorMessage.edit({
                                        components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                                    });
                                });
                            });
                        }
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
                        const reply = await i.followUp({
                            ephemeral: true,
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
                            //@ts-ignore
                            await i.followUp({
                                content: "❌ No hay elementos para eliminar.",
                                ephemeral: true
                            });
                            break;
                        }

                        //@ts-ignore
                        const reply = await i.followUp({
                            ephemeral: true,
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
                    default:
                        break;
                }

                await editorMessage.edit({
                    components: [await renderPreview(blockState, message.member, message.guild), ...btns(false)]
                });
            }
        });

        //@ts-ignore
        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                await editorMessage.edit({
                    components: [
                        { type: 17, components: [{ type: 10, content: "⏰ Editor finalizado por inactividad." }] }
                    ]
                });
            }
        });
    }
};