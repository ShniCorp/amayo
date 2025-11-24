import { CommandMessage } from "../core/types/commands";
// @ts-ignore
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, TextChannel, ChannelType } from "discord.js";
//@ts-ignore
import { ButtonStyle, ComponentType } from "discord.js";
import { replaceVars } from "../core/lib/vars";

export const command: CommandMessage = {
    name: "editembed",
    type: "message",
    aliases: ["modembed", "updateembed"],
    cooldown: 20,
    // @ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const embedName: string | null = args[0] ?? null;
        if (!embedName) {
            return message.reply(
                "Debes proporcionar un nombre para el embed. Uso: `!editembed <nombre>`"
            );
        }

        // 📌 Buscar en la base de datos
        const existing = await client.prisma.embedConfig.findUnique({
            where: {
                guildId_name: {
                    guildId: message.guildId!,
                    name: embedName,
                },
            },
        });

        if (!existing) {
            return message.reply("❌ No encontré un embed con ese nombre.");
        }

        // 📌 Estado inicial desde DB
        let embedState: {
            title?: string;
            description?: string;
            color?: number;
            footer?: string;
        } = {
            title: existing.title ?? undefined,
            description: existing.description ?? undefined,
            color: existing.color ? parseInt(existing.color.replace("#", ""), 16) : 0x5865f2,
            footer: existing.footerText ?? undefined,
        };

        // 📌 Función para renderizar preview
        const renderPreview = async () => {
            const preview = new EmbedBuilder().setColor(embedState.color ?? 0x5865f2);

            if (embedState.title)
                //@ts-ignore
                preview.setTitle(await replaceVars(embedState.title, message.member));
            if (embedState.description)
                //@ts-ignore
                preview.setDescription(await replaceVars(embedState.description, message.member));
            if (embedState.footer)
                preview.setFooter({
                    //@ts-ignore
                    text: await replaceVars(embedState.footer, message.member),
                });

            return preview;
        };

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
                    .setLabel("Guardar cambios")
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

        if (message.channel.type === ChannelType.GuildText) {
            const channel = message.channel as TextChannel;

            const editorMessage = await channel.send({
                embeds: [await renderPreview()],
                components: generateButtonRows(),
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

                // Guardar cambios
                if (i.customId === "save_embed") {
                    try {
                        const dataForDb = {
                            title: embedState.title,
                            description: embedState.description,
                            color: embedState.color ? `#${embedState.color.toString(16).padStart(6, '0')}` : null,
                            footerText: embedState.footer,
                        };

                        await client.prisma.embedConfig.update({
                            where: {
                                guildId_name: {
                                    guildId: message.guildId!,
                                    name: embedName,
                                },
                            },
                            data: dataForDb,
                        });

                        const saved = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle(`✅ Actualizado: ${embedName}`)
                            .setDescription("Los cambios fueron guardados en la base de datos.");

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
                        console.error("Error de Prisma al actualizar el embed:", e);
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
                let fieldToEdit: "title" | "description" | "color" | "footer" | null =
                    null;

                switch (i.customId) {
                    case "edit_title":
                        promptContent = "Escribe el nuevo **título** (puedes usar variables).";
                        fieldToEdit = "title";
                        break;
                    case "edit_description":
                        promptContent = "Escribe la nueva **descripción**.";
                        fieldToEdit = "description";
                        break;
                    case "edit_color":
                        promptContent = "Escribe el nuevo **color** en formato hexadecimal (ej: `#FF0000`).";
                        fieldToEdit = "color";
                        break;
                    case "edit_footer":
                        promptContent = "Escribe el nuevo **texto del footer**.";
                        fieldToEdit = "footer";
                        break;
                }

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

                    await editorMessage.edit({
                        embeds: [await renderPreview()],
                        components: generateButtonRows(false),
                    });
                });

                //@ts-ignore
                messageCollector.on("end", async (collected) => {
                    if (collected.size === 0) {
                        await promptMessage.delete();
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
