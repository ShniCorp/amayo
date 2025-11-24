import { Message } from "discord.js";
import { prisma } from "../../core/database/prisma";
import logger from "../../core/lib/logger";
import {
  extractValidLinks,
  validateDiscordLinks,
  validateDiscordInvite,
  bufferAlliancePoint,
  getUserAllianceStats,
  getBufferedPoints,
  sendAllianceMessage,
  flushAlliancePoints
} from "../../core/lib/alliance";

// Intervalo de flush en ms (ej: 60 segundos)
const FLUSH_INTERVAL = 60 * 1000;
let flushTimer: NodeJS.Timeout | null = null;

export async function alliance(message: Message) {
  try {
    // Iniciar el timer de flush si no está corriendo
    if (!flushTimer) {
      flushTimer = setInterval(() => flushAlliancePoints(), FLUSH_INTERVAL);
    }

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

    // Verificar permisos del usuario
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

async function processValidLink(
  message: Message,
  allianceChannel: any,
  link: string
) {
  try {
    // Verificar si el enlace de Discord es válido
    const inviteData = await validateDiscordInvite(link);

    if (!inviteData) {
      return; // Enlace inválido o expirado
    }

    const guildId = message.guild!.id;
    const userId = message.author.id;
    const channelId = allianceChannel.id;

    // Buferizar punto en Redis
    await bufferAlliancePoint(guildId, userId, channelId, message.id);

    // Obtener estadísticas para mostrar (DB + Redis)
    const dbStats = await getUserAllianceStats(userId, guildId);
    const bufferedPoints = await getBufferedPoints(guildId, userId);

    // Simular stats combinadas para la respuesta visual
    const combinedStats = dbStats
      ? {
        ...dbStats,
        totalPoints: dbStats.totalPoints + bufferedPoints,
        weeklyPoints: dbStats.weeklyPoints + bufferedPoints,
        monthlyPoints: dbStats.monthlyPoints + bufferedPoints,
      }
      : {
        totalPoints: bufferedPoints,
        weeklyPoints: bufferedPoints,
        monthlyPoints: bufferedPoints,
      };

    // Enviar mensaje de alianza
    await sendAllianceMessage(
      message,
      allianceChannel,
      link,
      inviteData,
      combinedStats
    );

    logger.info(`✅ Punto buferizado para ${message.author.tag} (Redis)`);
  } catch (error) {
    logger.error({ err: error }, "Error procesando enlace válido");
  }
}
