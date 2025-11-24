import { Message } from "discord.js";
import { prisma } from "../../database/prisma";
import logger from "../logger";
import { replaceVars } from "../vars";
import { sendComponentsV2Message } from "../../api/discordAPI";
import { DisplayComponentV2Builder } from "../displayComponents/builders";
import { isMediaUrl } from "./utils";

/**
 * Envía el mensaje de alianza configurado.
 */
export async function sendAllianceMessage(
    message: Message,
    allianceChannel: any,
    link: string,
    inviteData: any,
    userStats: any
) {
    try {
        const blockConfigName = allianceChannel.blockConfigName;
        const guildId = message.guild!.id;

        // Obtener la configuración del bloque
        const blockConfig = await prisma.blockV2Config.findFirst({
            where: { guildId, name: blockConfigName },
        });

        if (!blockConfig) {
            logger.error(`❌ Bloque "${blockConfigName}" no encontrado para guild ${guildId}`);
            return;
        }

        // Procesar las variables en la configuración
        const processedConfig = await processConfigVariables(
            blockConfig.config,
            message.author,
            message.guild!,
            userStats,
            inviteData
        );

        // Convertir el JSON plano a la estructura de Display Components
        const displayComponent = await convertConfigToDisplayComponent(
            processedConfig,
            message.author,
            message.guild!
        );

        // Construir adjuntos desde la config si existen
        const attachments = buildAttachmentsFromConfig(processedConfig);

        // Enviar usando Display Components
        await sendComponentsV2Message(message.channel.id, {
            components: [displayComponent],
            replyToMessageId: message.id,
            attachments: attachments.length ? attachments : undefined,
        });
    } catch (error) {
        logger.error({ err: error }, "❌ Error enviando bloque de configuración V2");

        // Fallback: usar mensaje simple
        try {
            await message.reply({
                content: "✅ ¡Enlace de alianza procesado correctamente!",
            });
        } catch (fallbackError) {
            logger.error({ err: fallbackError }, "❌ Error en fallback");
        }
    }
}

// --- Helpers copiados y adaptados de alliace.ts original ---

async function processConfigVariables(
    config: any,
    user: any,
    guild: any,
    userStats?: any,
    inviteObject?: any
): Promise<any> {
    if (typeof config === "string") {
        return await replaceVars(config, user, guild, userStats, inviteObject);
    }

    if (Array.isArray(config)) {
        const processedArray: any[] = [];
        for (const item of config) {
            processedArray.push(
                await processConfigVariables(item, user, guild, userStats, inviteObject)
            );
        }
        return processedArray;
    }

    if (config && typeof config === "object") {
        const processedObject: any = {};
        for (const [key, value] of Object.entries(config)) {
            processedObject[key] = await processConfigVariables(
                value,
                user,
                guild,
                userStats,
                inviteObject
            );
        }
        return processedObject;
    }

    return config;
}

async function convertConfigToDisplayComponent(
    config: any,
    user: any,
    guild: any
): Promise<any> {
    try {
        const builder = new DisplayComponentV2Builder();
        if (config.color) {
            builder.setAccentColor(config.color);
        }

        if (config.coverImage) {
            // @ts-ignore
            const processedCoverUrl = await replaceVars(config.coverImage, user, guild);
            if (isMediaUrl(processedCoverUrl)) {
                builder.addImage(processedCoverUrl);
            }
        }

        if (config.title) {
            // @ts-ignore
            const processedTitle = await replaceVars(config.title, user, guild);
            builder.addText(processedTitle);
        }

        if (config.components && Array.isArray(config.components)) {
            for (const c of config.components) {
                if (c.type === 10) {
                    // @ts-ignore
                    const processedContent = await replaceVars(c.content || " ", user, guild);
                    // @ts-ignore
                    const processedThumbnail = c.thumbnail ? await replaceVars(c.thumbnail, user, guild) : null;

                    let accessory: any = null;
                    if (c.linkButton) {
                        accessory = await buildLinkAccessory(c.linkButton, user, guild);
                    }
                    if (!accessory && processedThumbnail && isMediaUrl(processedThumbnail)) {
                        accessory = { type: 11, media: { url: processedThumbnail } };
                    }

                    if (accessory) {
                        builder.addSection([{ type: 10, content: processedContent }], accessory);
                    } else {
                        builder.addText(processedContent);
                    }
                } else if (c.type === 14) {
                    builder.addSeparator(c.spacing ?? 1, c.divider ?? true);
                } else if (c.type === 12) {
                    // @ts-ignore
                    const processedImageUrl = await replaceVars(c.url, user, guild);
                    if (isMediaUrl(processedImageUrl)) {
                        builder.addImage(processedImageUrl);
                    }
                }
            }
        }

        return builder.toJSON();
    } catch (error) {
        logger.error({ err: error }, "Error convirtiendo configuración a Display Component");
        const errorBuilder = new DisplayComponentV2Builder();
        errorBuilder.addText("Error al procesar la configuración del bloque.");
        return errorBuilder.toJSON();
    }
}

async function buildLinkAccessory(link: any, user: any, guild: any) {
    try {
        if (!link || !link.url) return null;
        // @ts-ignore
        const processedUrl = await replaceVars(link.url, user, guild);

        // Helper local para isHttpUrl ya que no lo exportamos de utils (o deberíamos)
        // Usamos el importado de utils
        const isHttp = (url: string) => {
            try { return new URL(url).protocol.startsWith('http'); } catch { return false; }
        };

        if (!isHttp(processedUrl)) return null;

        const accessory: any = { type: 2, style: 5, url: processedUrl };
        if (link.label && typeof link.label === "string" && link.label.trim()) {
            accessory.label = link.label.trim().slice(0, 80);
        }
        if (link.emoji && typeof link.emoji === "string") {
            const parsed = parseEmojiInput(link.emoji);
            if (parsed) accessory.emoji = parsed;
        }
        if (!accessory.label && !accessory.emoji) return null;
        return accessory;
    } catch {
        return null;
    }
}

function parseEmojiInput(input?: string): any | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^<(a?):(\w+):(\d+)>$/);
    if (match) {
        return { id: match[3], name: match[2], animated: match[1] === "a" };
    }
    return { name: trimmed };
}

function buildAttachmentsFromConfig(config: any) {
    const results: { name: string; data: Buffer; description?: string; spoiler?: boolean; }[] = [];
    if (!config || typeof config !== "object") return results;

    const arr = Array.isArray(config.attachments) ? config.attachments : [];
    for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : null;
        const description = typeof item.description === "string" ? item.description : undefined;
        const spoiler = Boolean(item.spoiler);
        const raw = typeof item.dataBase64 === "string" ? item.dataBase64 : typeof item.data === "string" ? item.data : null;

        if (!name || !raw) continue;
        const buf = decodeBase64Payload(raw);
        if (!buf) continue;
        results.push({ name, data: buf, description, spoiler });
    }
    return results;
}

function decodeBase64Payload(raw: string): Buffer | null {
    try {
        let base64 = raw.trim();
        if (base64.startsWith("base64:")) {
            base64 = base64.slice("base64:".length);
        } else if (base64.startsWith("data:")) {
            const comma = base64.indexOf(",");
            if (comma !== -1) base64 = base64.slice(comma + 1);
        }
        return Buffer.from(base64, "base64");
    } catch {
        return null;
    }
}
