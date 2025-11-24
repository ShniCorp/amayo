import { bot } from "../main";
import { Events } from "discord.js";
import { redis } from "../core/database/redis";
import { commands } from "../core/loaders/loader";
import { alliance } from "./extras/alliace";
import logger from "../core/lib/logger";
import { aiService } from "../core/services/AIService";
import { getGuildConfig } from "../core/database/guildCache";

// Función para manejar respuestas automáticas a la AI
async function handleAIReply(message: any) {
  // Verificar si es una respuesta a un mensaje del bot
  if (!message.reference?.messageId || message.author.bot) return;

  try {
    const referencedMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );

    // Verificar si el mensaje referenciado es del bot
    if (referencedMessage.author.id !== message.client.user?.id) return;

    // Verificar que el contenido no sea un comando (para evitar loops)
    const guildConfig = await getGuildConfig(
      message.guildId || message.guild!.id,
      message.guild!.name,
      bot.prisma
    );
    const PREFIX = guildConfig.prefix || "!";

    if (message.content.startsWith(PREFIX)) return;

    // Verificar que el mensaje tenga contenido válido
    if (!message.content || message.content.trim().length === 0) return;

    // Limitar longitud del mensaje
    if (message.content.length > 4000) {
      await message.reply(
        "❌ **Error:** Tu mensaje es demasiado largo (máximo 4000 caracteres)."
      );
      return;
    }

    logger.info(
      `Respuesta automática a AI detectada - Usuario: ${message.author.id}, Guild: ${message.guildId}`
    );

    // Indicador de que está escribiendo
    const typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => { });
    }, 5000);

    try {
      // Obtener emojis personalizados del servidor
      const emojiResult = {
        names: [] as string[],
        map: {} as Record<string, string>,
      };
      try {
        const guild = message.guild;
        if (guild) {
          const emojis = await guild.emojis.fetch();
          const list = Array.from(emojis.values());
          for (const e of list) {
            // @ts-ignore
            const name = e.name;
            // @ts-ignore
            const id = e.id;
            if (!name || !id) continue;
            // @ts-ignore
            const tag = e.animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
            if (!(name in emojiResult.map)) {
              emojiResult.map[name] = tag;
              emojiResult.names.push(name);
            }
          }
          emojiResult.names = emojiResult.names.slice(0, 25);
        }
      } catch {
        // Ignorar errores de emojis
      }

      // Construir metadatos del mensaje
      const buildMessageMeta = (msg: any, emojiNames?: string[]): string => {
        try {
          const parts: string[] = [];

          if (msg.channel?.name) {
            parts.push(`Canal: #${msg.channel.name}`);
          }

          const userMentions = msg.mentions?.users
            ? Array.from(msg.mentions.users.values())
            : [];
          const roleMentions = msg.mentions?.roles
            ? Array.from(msg.mentions.roles.values())
            : [];

          if (userMentions.length) {
            parts.push(
              `Menciones usuario: ${userMentions
                .slice(0, 5)
                .map((u: any) => u.username ?? u.tag ?? u.id)
                .join(", ")}`
            );
          }
          if (roleMentions.length) {
            parts.push(
              `Menciones rol: ${roleMentions
                .slice(0, 5)
                .map((r: any) => r.name ?? r.id)
                .join(", ")}`
            );
          }

          if (msg.reference?.messageId) {
            parts.push("Es una respuesta a mensaje de AI");
          }

          if (emojiNames && emojiNames.length) {
            parts.push(
              `Emojis personalizados disponibles (usa :nombre:): ${emojiNames.join(
                ", "
              )}`
            );
          }

          const metaRaw = parts.join(" | ");
          return metaRaw.length > 800 ? metaRaw.slice(0, 800) : metaRaw;
        } catch {
          return "";
        }
      };

      const messageMeta = buildMessageMeta(message, emojiResult.names);

      // Verificar si hay imágenes adjuntas
      const attachments = Array.from(message.attachments.values());
      const hasImages =
        attachments.length > 0 && aiService.hasImageAttachments(attachments);

      // Procesar con el servicio de AI usando memoria persistente y soporte para imágenes
      const aiResponse = await aiService.processAIRequestWithMemory(
        message.author.id,
        message.content,
        message.guildId,
        message.channel.id,
        message.id,
        message.reference.messageId,
        message.client,
        "normal",
        {
          meta:
            messageMeta +
            (hasImages
              ? ` | Tiene ${attachments.length} imagen(es) adjunta(s)`
              : ""),
          attachments: hasImages ? attachments : undefined,
        }
      );

      // Reemplazar emojis personalizados
      let finalResponse = aiResponse;
      if (emojiResult.names.length > 0) {
        finalResponse = finalResponse.replace(
          /:([a-zA-Z0-9_]{2,32}):/g,
          (match, p1: string) => {
            const found = emojiResult.map[p1];
            return found ? found : match;
          }
        );
      }

      // Enviar respuesta (dividir si es muy larga)
      const MAX_CONTENT = 2000;
      if (finalResponse.length > MAX_CONTENT) {
        const chunks: string[] = [];
        let currentChunk = "";
        const lines = finalResponse.split("\n");

        for (const line of lines) {
          if (currentChunk.length + line.length + 1 > MAX_CONTENT) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = "";
            }
          }
          currentChunk += (currentChunk ? "\n" : "") + line;
        }

        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        for (let i = 0; i < chunks.length && i < 3; i++) {
          if (i === 0) {
            await message.reply({ content: chunks[i] });
          } else {
            if ("send" in message.channel) {
              await message.channel.send({ content: chunks[i] });
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (chunks.length > 3) {
          if ("send" in message.channel) {
            await message.channel.send({
              content: "⚠️ Respuesta truncada por longitud.",
            });
          }
        }
      } else {
        await message.reply({ content: finalResponse });
      }
    } catch (error: any) {
      logger.error(`Error en respuesta automática AI:`, error);
      await message.reply({
        content: `❌ **Error:** ${error.message || "No pude procesar tu respuesta. Intenta de nuevo."
          }`,
      });
    } finally {
      clearInterval(typingInterval);
    }
  } catch (error) {
    // Mensaje referenciado no encontrado o error, ignorar silenciosamente
    logger.debug(`Error obteniendo mensaje referenciado: ${error}`);
  }
}

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Manejar respuestas automáticas a la AI
  await handleAIReply(message);

  await alliance(message);

  // Usar caché para obtener la configuración del guild
  const guildConfig = await getGuildConfig(
    message.guildId || message.guild!.id,
    message.guild!.name,
    bot.prisma
  );

  const PREFIX = guildConfig.prefix || "!";
  if (!message.content.startsWith(PREFIX)) return;

  const [cmdName, ...args] = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);
  const command = commands.get(cmdName);
  if (!command) return;

  const cooldown = Math.floor(Number(command.cooldown) || 0);

  if (cooldown > 0) {
    const key = `cooldown:${command.name}:${message.author.id}`;
    const ttl = await redis.ttl(key);
    logger.debug(`Key: ${key}, TTL: ${ttl}`);

    if (ttl > 0) {
      return message.reply(
        `⏳ Espera ${ttl}s antes de volver a usar **${command.name}**.`
      );
    }

    // SET con expiración correcta para redis v4+
    await redis.set(key, "1", { EX: cooldown });
  }

  try {
    // 🔹 Feature Flag Check
    if (command.featureFlag) {
      const { isFeatureEnabledForInteraction } = await import(
        "../core/lib/featureFlagHelpers"
      );
      const enabled = await isFeatureEnabledForInteraction(
        command.featureFlag,
        message
      );

      if (!enabled) {
        return message.reply(
          "⚠️ Esta funcionalidad no está disponible en este momento."
        );
      }
    }

    await command.run(message, args, message.client);
  } catch (error) {
    logger.error({ err: error }, "Error ejecutando comando");
    await message.reply("❌ Hubo un error ejecutando el comando.");
  }
});
