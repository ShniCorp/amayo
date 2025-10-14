import { Message } from "discord.js";
// Reemplaza instancia local -> usa singleton
import { prisma } from "../../core/database/prisma";
import { replaceVars } from "../../core/lib/vars";
import logger from "../../core/lib/logger";
import { sendComponentsV2Message } from "../../core/api/discordAPI";

// Regex para detectar URLs válidas (corregido)
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

// (kept for reference) dominios de Discord válidos para invitaciones
const DISCORD_DOMAINS = [
  "discord.gg",
  "discord.com/invite",
  "discordapp.com/invite",
];

export async function alliance(message: Message) {
  try {
    // Verificar que el mensaje tenga contenido
    if (!message.content || message.content.trim() === "") {
      return;
    }

    // Buscar enlaces en el mensaje
    const links = extractValidLinks(message.content);

    if (links.length === 0) {
      return; // No hay enlaces válidos
    }

    // Verificar si el canal está configurado para alianzas
    const allianceChannel = await prisma.allianceChannel.findFirst({
      where: {
        guildId: message.guild!.id,
        channelId: message.channel.id,
        isActive: true,
      },
    });

    if (!allianceChannel) {
      return; // Canal no configurado para alianzas
    }

    // Verificar permisos del usuario (corregido para evitar errores con tipos de canal)
    const member = await message.guild!.members.fetch(message.author.id);

    // Verificar que es un canal de texto antes de verificar permisos
    if (!message.channel.isTextBased()) {
      return; // No es un canal de texto
    }
    //@ts-ignore
    const permissions = message.channel.permissionsFor(member);
    if (!permissions?.has("SendMessages")) {
      return; // Usuario sin permisos
    }

    // Validar que los enlaces sean de Discord (invitaciones)
    // Usar extracción de código de invitación para validar (maneja query params como ?event=...)
    const validDiscordLinks = validateDiscordLinks(links);

    if (validDiscordLinks.length === 0) {
      return; // No hay enlaces válidos de Discord
    }

    // Procesar cada enlace válido
    for (const link of validDiscordLinks) {
      await processValidLink(message, allianceChannel, link);
    }
  } catch (error) {
    logger.error({ err: error }, "Error en función alliance");
  }
}

function extractValidLinks(content: string): string[] {
  const matches = content.match(URL_REGEX);
  return matches || [];
}

function validateDiscordLinks(links: string[]): string[] {
  // Priorizar la extracción del código de invitación: si podemos extraerlo, lo consideramos válido.
  const results: string[] = [];
  for (const link of links) {
    try {
      const code = extractInviteCode(link);
      if (code) {
        results.push(link);
        continue;
      }
      // Fallback rápido: comprobar dominios conocidos (por compatibilidad)
      if (DISCORD_DOMAINS.some((d) => link.includes(d))) {
        results.push(link);
      }
    } catch {
      // ignorar enlaces que causen excepciones
    }
  }
  return results;
}

async function processValidLink(
  message: Message,
  allianceChannel: any,
  link: string
) {
  try {
    // Verificar si el enlace de Discord es válido (opcional: hacer fetch)
    const inviteData = await validateDiscordInvite(link);

    if (!inviteData) {
      return; // Enlace inválido o expirado
    }

    // Asegurar que el usuario existe en la base de datos
    await prisma.user.upsert({
      where: { id: message.author.id },
      update: {},
      create: { id: message.author.id },
    });

    // Asegurar que el guild existe en la base de datos
    await prisma.guild.upsert({
      where: { id: message.guild!.id },
      update: {},
      create: {
        id: message.guild!.id,
        name: message.guild!.name,
      },
    });

    // Registrar el punto en el historial
    await prisma.pointHistory.create({
      data: {
        userId: message.author.id,
        guildId: message.guild!.id,
        channelId: allianceChannel.id,
        messageId: message.id,
        points: 1,
      },
    });

    // Actualizar estadísticas del usuario
    await updateUserStats(message.author.id, message.guild!.id);

    // Obtener estadísticas para reemplazar variables
    const userStats = await getUserAllianceStats(
      message.author.id,
      message.guild!.id
    );

    // Enviar el bloque configurado usando Display Components
    await sendBlockConfigV2(
      message,
      allianceChannel.blockConfigName,
      message.guild!.id,
      link,
      userStats,
      inviteData
    );

    logger.info(
      `✅ Punto otorgado a ${message.author.tag} por enlace válido: ${link}`
    );
  } catch (error) {
    logger.error({ err: error }, "Error procesando enlace válido");
  }
}

async function validateDiscordInvite(link: string): Promise<any> {
  try {
    // Extraer el código de invitación del enlace
    const inviteCode = extractInviteCode(link);
    if (!inviteCode) return null;

    // Hacer una solicitud a la API de Discord para validar la invitación
    const response = await fetch(
      `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
        },
      }
    );

    if (response.status === 200) {
      const inviteData = await response.json();
      // Verificar que la invitación tenga un servidor válido
      if (inviteData.guild && inviteData.guild.id) {
        return inviteData; // Retornar datos completos de la invitación
      }
    }

    return null;
  } catch (error) {
    logger.error({ err: error }, "Error validando invitación de Discord");
    return null; // En caso de error, considerar como inválido
  }
}

function extractInviteCode(link: string): string | null {
  // Patrones para extraer códigos de invitación
  const patterns = [
    /discord\.gg\/([a-zA-Z0-9]+)/,
    /discord\.com\/invite\/([a-zA-Z0-9]+)/,
    /discordapp\.com\/invite\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

async function updateUserStats(userId: string, guildId: string) {
  const now = new Date();

  // Obtener o crear las estadísticas del usuario
  let userStats = await prisma.partnershipStats.findFirst({
    where: {
      userId: userId,
      guildId: guildId,
    },
  });

  if (!userStats) {
    await prisma.partnershipStats.create({
      data: {
        userId: userId,
        guildId: guildId,
        totalPoints: 1,
        weeklyPoints: 1,
        monthlyPoints: 1,
        lastWeeklyReset: now,
        lastMonthlyReset: now,
      },
    });
    return;
  }

  // Verificar si necesita reset semanal (7 días)
  const weeksPassed = Math.floor(
    (now.getTime() - userStats.lastWeeklyReset.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const needsWeeklyReset = weeksPassed >= 1;

  // Verificar si necesita reset mensual (30 días)
  const daysPassed = Math.floor(
    (now.getTime() - userStats.lastMonthlyReset.getTime()) /
      (24 * 60 * 60 * 1000)
  );
  const needsMonthlyReset = daysPassed >= 30;

  // Actualizar estadísticas
  await prisma.partnershipStats.update({
    where: {
      userId_guildId: {
        userId: userId,
        guildId: guildId,
      },
    },
    data: {
      totalPoints: { increment: 1 },
      weeklyPoints: needsWeeklyReset ? 1 : { increment: 1 },
      monthlyPoints: needsMonthlyReset ? 1 : { increment: 1 },
      lastWeeklyReset: needsWeeklyReset ? now : userStats.lastWeeklyReset,
      lastMonthlyReset: needsMonthlyReset ? now : userStats.lastMonthlyReset,
    },
  });
}

async function sendBlockConfigV2(
  message: Message,
  blockConfigName: string,
  guildId: string,
  validLink: string,
  userStats?: any,
  inviteObject?: any
) {
  try {
    // Obtener la configuración del bloque
    const blockConfig = await prisma.blockV2Config.findFirst({
      where: {
        guildId: guildId,
        name: blockConfigName,
      },
    });

    if (!blockConfig) {
      logger.error(
        `❌ Bloque "${blockConfigName}" no encontrado para guild ${guildId}`
      );
      return;
    }

    // Procesar las variables en la configuración usando la función unificada
    const processedConfig = await processConfigVariables(
      blockConfig.config,
      message.author,
      message.guild!,
      userStats,
      inviteObject
    );

    // Convertir el JSON plano a la estructura de Display Components correcta
    const displayComponent = await convertConfigToDisplayComponent(
      processedConfig,
      message.author,
      message.guild!
    );

    // Construir adjuntos desde la config si existen
    const attachments = buildAttachmentsFromConfig(processedConfig);

    // Enviar usando Display Components con la flag correcta a través del cliente REST tipado
    await sendComponentsV2Message(message.channel.id, {
      components: [displayComponent],
      replyToMessageId: message.id,
      attachments: attachments.length ? attachments : undefined,
    });
  } catch (error) {
    logger.error(
      { err: error },
      "❌ Error enviando bloque de configuración V2"
    );

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

// Extrae adjuntos desde la config (base64) para usar attachment://<filename>
function buildAttachmentsFromConfig(config: any) {
  const results: {
    name: string;
    data: Buffer;
    description?: string;
    spoiler?: boolean;
  }[] = [];
  if (!config || typeof config !== "object") return results;

  const arr = Array.isArray(config.attachments) ? config.attachments : [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : null;
    const description =
      typeof item.description === "string" ? item.description : undefined;
    const spoiler = Boolean(item.spoiler);
    const raw =
      typeof item.dataBase64 === "string"
        ? item.dataBase64
        : typeof item.data === "string"
        ? item.data
        : null;
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
    // Soportar formatos: "base64:..." o data URLs "data:mime/type;base64,...."
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

// Helper: URLs http/https únicamente
function isHttpUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Helper: permitir http/https y attachment:// para medios (thumbnail/media/file)
function isMediaUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url) return false;
  if (isHttpUrl(url)) return true;
  const s = url as string;
  return s.startsWith("attachment://");
}

// Helper: construir accessory de Link Button para Display Components
async function buildLinkAccessory(link: any, user: any, guild: any) {
  try {
    if (!link || !link.url) return null;
    // @ts-ignore
    const processedUrl = await replaceVars(link.url, user, guild);
    // En botones de enlace solo se permite http/https
    if (!isHttpUrl(processedUrl)) return null;
    const accessory: any = { type: 2, style: 5, url: processedUrl };
    if (link.label && typeof link.label === "string" && link.label.trim()) {
      accessory.label = link.label.trim().slice(0, 80);
    }
    if (link.emoji && typeof link.emoji === "string") {
      const parsed = parseEmojiInput(link.emoji);
      if (parsed) accessory.emoji = parsed;
    }
    // Debe tener al menos label o emoji
    if (!accessory.label && !accessory.emoji) return null;
    return accessory;
  } catch {
    return null;
  }
}

async function convertConfigToDisplayComponent(
  config: any,
  user: any,
  guild: any
): Promise<any> {
  try {
    const previewComponents: any[] = [];

    // Añadir imagen de portada primero si existe
    if (config.coverImage) {
      // @ts-ignore
      const processedCoverUrl = await replaceVars(
        config.coverImage,
        user,
        guild
      );
      if (isMediaUrl(processedCoverUrl)) {
        previewComponents.push({
          type: 12,
          items: [{ media: { url: processedCoverUrl } }],
        });
      }
    }

    // Añadir título después de la portada
    if (config.title) {
      previewComponents.push({
        type: 10,
        // @ts-ignore
        content: await replaceVars(config.title, user, guild),
      });
    }

    // Procesar componentes en orden (igual que el editor)
    if (config.components && Array.isArray(config.components)) {
      for (const c of config.components) {
        if (c.type === 10) {
          // Texto con accessory opcional: priorizar linkButton > thumbnail
          // @ts-ignore
          const processedContent = await replaceVars(
            c.content || " ",
            user,
            guild
          );
          // @ts-ignore
          const processedThumbnail = c.thumbnail
            ? await replaceVars(c.thumbnail, user, guild)
            : null;

          let accessory: any = null;
          if (c.linkButton) {
            accessory = await buildLinkAccessory(c.linkButton, user, guild);
          }
          if (
            !accessory &&
            processedThumbnail &&
            isMediaUrl(processedThumbnail)
          ) {
            accessory = { type: 11, media: { url: processedThumbnail } };
          }

          if (accessory) {
            previewComponents.push({
              type: 9,
              components: [{ type: 10, content: processedContent }],
              accessory,
            });
          } else {
            previewComponents.push({ type: 10, content: processedContent });
          }
        } else if (c.type === 14) {
          previewComponents.push({
            type: 14,
            divider: c.divider ?? true,
            spacing: c.spacing ?? 1,
          });
        } else if (c.type === 12) {
          // Imagen - validar http/https o attachment://
          // @ts-ignore
          const processedImageUrl = await replaceVars(c.url, user, guild);
          if (isMediaUrl(processedImageUrl)) {
            previewComponents.push({
              type: 12,
              items: [{ media: { url: processedImageUrl } }],
            });
          }
        }
      }
    }

    // Retornar la estructura exacta que usa el editor
    return {
      type: 17,
      accent_color: config.color ?? null,
      components: previewComponents,
    };
  } catch (error) {
    logger.error(
      { err: error },
      "Error convirtiendo configuración a Display Component"
    );
    return {
      type: 17,
      accent_color: null,
      components: [
        { type: 10, content: "Error al procesar la configuración del bloque." },
      ],
    };
  }
}

// Helper: parsear emojis (unicode o personalizados <:name:id> / <a:name:id>)
function parseEmojiInput(input?: string): any | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^<(a?):(\w+):(\d+)>$/);
  if (match) {
    const animated = match[1] === "a";
    const name = match[2];
    const id = match[3];
    return { id, name, animated };
  }
  // Asumimos unicode si no es formato de emoji personalizado
  return { name: trimmed };
}

// Función helper para validar URLs (http/https y attachment:// para medios)

async function processConfigVariables(
  config: any,
  user: any,
  guild: any,
  userStats?: any,
  inviteObject?: any
): Promise<any> {
  if (typeof config === "string") {
    // Usar la función unificada replaceVars con todos los parámetros
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

// Función auxiliar para obtener estadísticas
export async function getUserAllianceStats(userId: string, guildId: string) {
  return prisma.partnershipStats.findFirst({
    where: {
      userId: userId,
      guildId: guildId,
    },
  });
}
