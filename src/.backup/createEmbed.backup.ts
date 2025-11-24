import {CommandMessage} from "../core/types/commands";

import {
    ActionRowBuilder,
    ButtonBuilder,
    //@ts-ignore
    ButtonStyle,
    //@ts-ignore
    ChannelType,
    //@ts-ignore
    ComponentType,
    EmbedBuilder,
    TextChannel
} from "discord.js";
import {replaceVars} from "../core/lib/vars";



/**
 *  VARIABLES COMPONENTS V2
 */

    const variables_text = {
    "flags": 32768,
    "components": [
        {
            "type": 17,
            "components": [
                {
                    "type": 10,
                    "content": "﹒⌒　　　　Variables Text　　　　╰୧﹒"
                },
                {
                    "type": 14,
                    "spacing": 1,
                    "divider": false
                },
                {
                    "type": 10,
                    "content": "**✿　૮ ․ ․ ྀིა      User Var**"
                },
                {
                    "type": 10,
                    "content": "\n(user.id) **-** 𝑀𝑢𝑒𝑠𝑡𝑟𝑎 𝑒𝑙 𝑖𝑑𝑒𝑛𝑡𝑖𝑓𝑖𝑐𝑎𝑑𝑜𝑟 𝑑𝑒 𝑢𝑛 𝑢𝑠𝑢𝑎𝑟𝑖𝑜.\n(user.name) **-** 𝑀𝑢𝑒𝑠𝑡𝑟𝑎 𝑒𝑙 𝑛𝑜𝑚𝑏𝑟𝑒 𝑑𝑒 𝑢𝑛 𝑢𝑠𝑢𝑎𝑟𝑖𝑜\n(user.avatar) **-** 𝑀𝑢𝑒𝑠𝑡𝑟𝑎 𝑙𝑎 𝑢𝑟𝑙 𝑑𝑒𝑙 𝑎𝑣𝑎𝑡𝑎𝑟 𝑑𝑒𝑙 𝑢𝑠𝑢𝑎𝑟𝑖𝑜.\n(user.mention) **-** 𝑀𝑒𝑛𝑐𝑖𝑜𝑛𝑎 𝑎 𝑢𝑛 𝑢𝑠𝑢𝑎𝑟𝑖𝑜 𝑐𝑜𝑛 𝑠𝑢 @"
                },
                {
                    "type": 10,
                    "content": "**✿　૮ ․ ․ ྀིა      Guild Var**"
                },
                {
                    "type": 10,
                    "content": "(guild.icon) **-** 𝑀𝑢𝑒𝑠𝑡𝑟𝑎 𝑒𝑙 𝑖𝑐𝑜𝑛𝑜 𝑑𝑒𝑙 𝑠𝑒𝑟𝑣𝑖𝑑𝑜𝑟.\n(guild.name) **-** 𝑀𝑢𝑒𝑠𝑡𝑟𝑎 𝑒𝑙 𝑛𝑜𝑚𝑏𝑟𝑒 𝑑𝑒𝑙 𝑠𝑒𝑟𝑣𝑖𝑑𝑜𝑟.\n"
                }
            ],
            "accent_color": null,
            "spoiler": true
        }
    ]
}

/**
 *  COMMAND EXECUTE
 */

export const command: CommandMessage = {
    name: "embedcreate",
    type: "message",
    aliases: ["crearembed", "newembed"],
    cooldown: 20,
    // @ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const embedName: string | null = args[0] ?? null;
        if (!embedName) {
            return message.reply(
                "Debes proporcionar un nombre para el embed. Uso: `!embedcreate <nombre>`"
            );
        }

        const nameIsValid = await client.prisma.embedConfig.findFirst({ where: {
            //@ts-ignore
                guildId: message.guild.id,
                name: embedName
        }})
        if(nameIsValid) return message.reply("❌ Nombre del embed ya fue tomado!")

        // 📌 Estado independiente
        let embedState: {
            title?: string;
            description?: string;
            color?: number;
            imageUrl?: string;
            thumbnail?: string;
            footer?: string;
        } = {
            title: `Editor de Embed: ${embedName}`,
            description:
                "Usa los botones de abajo para configurar este embed.\n\n_Ejemplo de variable: `{user.name}`_",
            color: 0x5865f2,
            footer: "Haz clic en Guardar cuando termines.",
            thumbnail: `${message.guild!.iconURL()}`,
            imageUrl: `https://i.pinimg.com/originals/d2/c3/79/d2c3798684709cef3ed532b59c59bad4.gif`
        };

        // 📌 Función para construir un embed a partir del estado
        const renderPreview = async () => {
            const preview = new EmbedBuilder()
                .setColor(embedState.color ?? 0x5865f2);

            if (embedState.title)
                preview.setTitle(
                    //@ts-ignore
                    await replaceVars(embedState.title, message.member, message.guild)
                );
            if (embedState.description)
                preview.setDescription(
                    //@ts-ignore
                    await replaceVars(embedState.description, message.member, message.guild)
                );
            if (embedState.footer)
                preview.setFooter({
                    //@ts-ignore
                    text: await replaceVars(embedState.footer, message.member, message.guild),
                });
            if (embedState.imageUrl)
                preview.setImage(
                    //@ts-ignore
                    await replaceVars(embedState.imageUrl, message.member, message.guild)
                );
            if (embedState.thumbnail)
                preview.setThumbnail(
                    //@ts-ignore
                    await replaceVars(embedState.thumbnail, message.member, message.guild)
                )

            return preview;
        };

        // 📌 Botones
        const generateButtonRows = (disabled = false) => {
            const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("edit_title")
                    .setLabel("Título")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("edit_description")
                    .setLabel("Descripción")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("edit_color")
                    .setLabel("Color")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('edit_imageurl')
                    .setLabel('Image')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('edit_thumbnail')
                    .setLabel('Thumbnail')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );

            const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("edit_footer")
                    .setLabel("Footer")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );

            const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("save_embed")
                    .setLabel("Guardar")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("cancel_embed")
                    .setLabel("Cancelar")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled)
            );

            return [primaryRow, secondaryRow, controlRow];
        };

        /**
         *  Botones Custom
         */

        const btns = (disabled = false) => ({
            flags: 32768,
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: "﹒⌒　　　　Options　　　　╰୧﹒"
                        },
                        {
                            type: 14,
                            divider: true
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Titulo",
                                    disabled: disabled, // 👈 aquí ya funciona
                                    custom_id: "edit_title"
                                },
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Descripción",
                                    disabled: disabled,
                                    custom_id: "edit_description"
                                },
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Color",
                                    disabled: disabled,
                                    custom_id: "edit_color"
                                },
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Imagen",
                                    disabled: disabled,
                                    custom_id: 'edit_imageurl'
                                },
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Thumbnail",
                                    disabled: disabled,
                                    custom_id: 'edit_thumbnail'
                                }
                            ]
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    style: 2,
                                    type: 2,
                                    label: "Footer",
                                    disabled: disabled,
                                    custom_id: "edit_footer"
                                }
                            ]
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    style: 3,
                                    type: 2,
                                    label: "Guardar",
                                    disabled: disabled,
                                    custom_id: "save_embed"
                                },
                                {
                                    style: 4,
                                    type: 2,
                                    label: "Eliminar",
                                    disabled: disabled,
                                    custom_id: "cancel_embed"
                                }
                            ]
                        }
                    ],
                    accent_color: null
                }
            ]
        });



        if (message.channel.type === ChannelType.GuildText) {
            const channel = message.channel as TextChannel;

            const editorMessage = await channel.send({
                embeds: [await renderPreview()],
                //components: generateButtonRows(),
            });

            const collector = editorMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000,
            });

            collector.on("collect", async (i) => {
                if (i.user.id !== message.author.id) {
                    await i.reply({
                        content: "No puedes usar este menú.",
                        ephemeral: true,
                    });
                    return;
                }
                await i.deferUpdate();
                await editorMessage.edit({ components: generateButtonRows(true) });

                // Guardar
                if (i.customId === "save_embed") {
                    try {
                        const dataForDb = {
                            title: embedState.title,
                            description: embedState.description,
                            color: embedState.color ? `#${embedState.color.toString(16).padStart(6, '0')}` : null,
                            footerText: embedState.footer,
                        };

                        await client.prisma.embedConfig.upsert({
                            where: {
                                guildId_name: {
                                    guildId: message.guildId!,
                                    name: embedName,
                                },
                            },
                            update: dataForDb,
                            create: {
                                name: embedName,
                                ...dataForDb,
                                // ✅ ESTA ES LA SOLUCIÓN:
                                // Le decimos a Prisma que se conecte al Guild o lo cree si no existe.
                                guild: {
                                    connectOrCreate: {
                                        where: { id: message.guildId! },
                                        create: {
                                            id: message.guildId!,
                                            name: message.guild!.name, // Asegura que el nombre del servidor se guarde
                                        },
                                    },
                                },
                            },
                        });

                        const saved = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle(`✅ Guardado: ${embedName}`)
                            .setDescription("La configuración se guardó en la base de datos.");

                        await editorMessage.edit({
                            embeds: [saved],
                            components: [],
                        });
                    } catch (e) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle("❌ Error al Guardar")
                            .setDescription("No se pudo guardar en la base de datos. Revisa la consola.");
                        await editorMessage.edit({
                            embeds: [errorEmbed],
                            components: [],
                        });
                        console.error("Error de Prisma al guardar el embed:", e);
                    }
                    collector.stop();
                    return;
                }
                // Cancelar
                if (i.customId === "cancel_embed") {
                    await editorMessage.delete();
                    collector.stop();
                    return;
                }

                // Edición
                let promptContent = "";
                let variableContent;
                let fieldToEdit: "title" | "description" | "color" | "footer" | "image" | "thumbnail" | null =
                    null;

                switch (i.customId) {
                    case "edit_title":
                        promptContent =
                            "Escribe el nuevo **título** (puedes usar variables como `(guild.name)`).";
                        variableContent = variables_text
                        fieldToEdit = "title";
                        break;
                    case "edit_description":
                        promptContent =
                            "Escribe la nueva **descripción** (puedes usar variables).";
                        variableContent = variables_text
                        fieldToEdit = "description";
                        break;
                    case "edit_color":
                        promptContent =
                            "Escribe el nuevo **color** en formato hexadecimal (ej: `#FF0000`).";
                        variableContent = variables_text
                        fieldToEdit = "color";
                        break;
                    case "edit_footer":
                        promptContent =
                            "Escribe el nuevo **texto del footer** (puedes usar variables).";
                        variableContent = variables_text
                        fieldToEdit = "footer";
                        break;
                    case "edit_imageurl":
                        promptContent =
                            "Pega el url **de la imagen** (puedes usar variables).";
                        variableContent = variables_text
                        fieldToEdit = "image";
                        break;
                    case "edit_thumbnail":
                        promptContent =
                            "Pega el url **del thumbnail** (puedes usar variables).";
                        variableContent = variables_text
                        fieldToEdit = "thumbnail";
                        break;
                }

                //@ts-ignore
                const variableMessage = await i.channel.send(variableContent)
                //@ts-ignore
                const promptMessage = await i.channel.send(promptContent);

                //@ts-ignore
                const messageCollector = i.channel!.createMessageCollector({
                    //@ts-ignore
                    filter: (m: Message) => m.author.id === i.user.id,
                    max: 1,
                    time: 60000,
                });
                //@ts-ignore
                messageCollector.on("collect", async (collectedMessage) => {
                    const newValue = collectedMessage.content;

                    if (fieldToEdit === "title") embedState.title = newValue;
                    if (fieldToEdit === "description") embedState.description = newValue;
                    if (fieldToEdit === "footer") embedState.footer = newValue;
                    // added   v0.0.1.1
                    if (fieldToEdit === "image") embedState.imageUrl = newValue;
                    if (fieldToEdit === "thumbnail") embedState.thumbnail = newValue;

                    if (fieldToEdit === "color") {
                        try {
                            const hex = newValue.replace("#", "");
                            embedState.color = parseInt(hex, 16);
                        } catch {
                            embedState.color = 0x5865f2;
                        }
                    }

                    await collectedMessage.delete();
                    await promptMessage.delete();
                    await variableMessage.delete();

                    await editorMessage.edit({
                        embeds: [await renderPreview()],
                        components: generateButtonRows(false),
                    });
                });
                //@ts-ignore
                messageCollector.on("end", async (collected) => {
                    if (collected.size === 0) {
                        await promptMessage.delete();
                        await variableMessage.delete();
                        await editorMessage.edit({
                            components: generateButtonRows(false),
                        });
                    }
                });
            });

            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle("Editor finalizado por inactividad.");

                    await editorMessage.edit({
                        embeds: [timeoutEmbed],
                        components: [],
                    });
                }
            });
        }
    },
};
