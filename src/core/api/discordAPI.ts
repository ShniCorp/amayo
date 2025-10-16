import logger from "../lib/logger";
import { REST } from "discord.js";
// @ts-ignore
import { Routes } from "discord-api-types/v10";
import type {
  APIMessageTopLevelComponent,
  APIMessage,
} from "discord-api-types/v10";
import { commands } from "../loaders/loader";
import type { RawFile } from "discord.js";

// Reutilizamos una instancia REST singleton
// Support both env var names: TOKEN (used in prod) or DISCORD_TOKEN (older name)
const botToken = process.env.TOKEN ?? process.env.DISCORD_TOKEN ?? "";
const rest = new REST({ version: "10" }).setToken(botToken);

// Tipado minimal para enviar mensajes con Display Components (Components v2)
export interface ComponentV2Attachment {
  name: string; // nombre de archivo, p.ej. image.png o SPOILER_image.png
  data: Buffer | Uint8Array; // contenido del archivo
  description?: string; // alt text
  spoiler?: boolean; // si true, prefija el nombre con SPOILER_
}

// Estructura de allowed_mentions según la doc oficial
// https://discord.com/developers/docs/resources/channel#allowed-mentions-object
export type AllowedMentions = {
  parse?: ("roles" | "users" | "everyone")[];
  roles?: string[];
  users?: string[];
  replied_user?: boolean;
};

export interface SendComponentsV2Options {
  components: APIMessageTopLevelComponent[]; // top-level components (Container, Section, TextDisplay, etc.)
  attachments?: ComponentV2Attachment[]; // adjuntos opcionales a referenciar con attachment://
  allowed_mentions?: AllowedMentions; // respetar estructura oficial
  nonce?: string | number;
  replyToMessageId?: string; // si se establece, emula message.reply
}

/**
 * Envía un mensaje a un canal usando Display Components (Components v2) con tipado y adjuntos opcionales.
 * Para referenciar archivos dentro de los componentes, usa urls tipo attachment://<filename>.
 *
 * Docs:
 * - Component Reference: https://discord.com/developers/docs/components/reference
 * - MessageFlags.IsComponentsV2: https://discord.com/developers/docs/resources/message#message-object-message-flags
 */
export async function sendComponentsV2Message(
  channelId: string,
  options: SendComponentsV2Options
): Promise<APIMessage> {
  const files: RawFile[] = [];
  const attachmentsMeta = [] as Array<{
    id: number;
    filename: string;
    description?: string | null;
  }>;

  if (options.attachments && options.attachments.length > 0) {
    options.attachments.forEach((att, idx) => {
      let filename = att.name?.trim() || `file-${idx}`;
      if (att.spoiler && !filename.startsWith("SPOILER_")) {
        filename = `SPOILER_${filename}`;
      }
      files.push({ name: filename, data: att.data });
      attachmentsMeta.push({
        id: idx,
        filename,
        description: att.description ?? null,
      });
    });
  }

  const body: any = {
    components: options.components,
    flags: 32768, // MessageFlags.IsComponentsV2
  };

  if (attachmentsMeta.length) body.attachments = attachmentsMeta;
  if (options.allowed_mentions)
    body.allowed_mentions = options.allowed_mentions;
  if (options.nonce !== undefined) body.nonce = options.nonce;
  if (options.replyToMessageId) {
    body.message_reference = { message_id: options.replyToMessageId };
    if (!body.allowed_mentions) body.allowed_mentions = {};
    if (body.allowed_mentions.replied_user === undefined)
      body.allowed_mentions.replied_user = false;
  }

  try {
    return (await rest.post(Routes.channelMessages(channelId), {
      body,
      files: files.length ? files : undefined,
    })) as APIMessage;
  } catch (error) {
    logger.error({ err: error }, "❌ Error enviando mensaje con Components v2");
    throw error;
  }
}

export async function registeringCommands(): Promise<void> {
  const commandsToRegister: any[] = [];

  // Recorremos la Collection que ya cargó loadCommands()
  for (const [_name, cmd] of commands) {
    if (cmd.type === "slash") {
      commandsToRegister.push({
        name: cmd.name,
        description: cmd.description ?? "Sin descripción",
        type: 1, // CHAT_INPUT
        options: cmd.options ?? [],
      });

      logger.info(`✅ Preparado para registrar (guild): ${cmd.name}`);
    }
  }

  try {
    logger.info(`🧹 Limpiando comandos antiguos/residuales (guild)...`);

    // Primero eliminamos TODOS los comandos existentes
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT!,
        process.env.guildTest!
      ),
      { body: [] } // Array vacío elimina todos los comandos
    );

    logger.info(`✅ Comandos antiguos de guild eliminados.`);
    // Pequeña pausa para asegurar que Discord procese la eliminación
    await new Promise((r) => setTimeout(r, 1000));

    logger.info(
      `🚀 Registrando ${commandsToRegister.length} comandos slash nuevos (guild)...`
    );

    // Ahora registramos los comandos actuales
    const data: any = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT!,
        process.env.guildTest!
      ),
      { body: commandsToRegister }
    );

    logger.info(`✅ ${data.length} comandos de guild registrados.`);
  } catch (error) {
    // @ts-ignore
    logger.error("❌ Error en el proceso de comandos de guild:", error);
  }
}

export async function getGuildRoles(guildId: string) {
  if (!botToken) throw new Error("Bot token not configured");
  try {
    const res = (await rest.get(Routes.guildRoles(guildId))) as any[];
    return res || [];
  } catch (err) {
    logger.warn({ err }, "Failed fetching guild roles");
    throw err;
  }
}

export async function registeringGlobalCommands(): Promise<void> {
  const commandsToRegister: any[] = [];
  for (const [_name, cmd] of commands) {
    if (cmd.type === "slash") {
      commandsToRegister.push({
        name: cmd.name,
        description: cmd.description ?? "Sin descripción",
        type: 1,
        options: cmd.options ?? [],
      });
      logger.info(`🌍 Preparado para registrar global: ${cmd.name}`);
    }
  }
  try {
    logger.info(`🧹 Limpiando comandos globales existentes...`);
    await rest.put(Routes.applicationCommands(process.env.CLIENT!), {
      body: [],
    });
    logger.info(`✅ Comandos globales previos eliminados.`);
    await new Promise((r) => setTimeout(r, 1500));
    logger.info(
      `🚀 Registrando ${commandsToRegister.length} comandos globales... (propagación puede tardar hasta 1h)`
    );
    const data: any = await rest.put(
      Routes.applicationCommands(process.env.CLIENT!),
      { body: commandsToRegister }
    );
    logger.info(`✅ ${data.length} comandos globales enviados a la API.`);
  } catch (error) {
    // @ts-ignore
    logger.error("❌ Error registrando comandos globales:", error);
  }
}

export async function clearAllCommands(): Promise<void> {
  try {
    logger.info(`🧹 Eliminando TODOS los comandos slash (guild)...`);
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT!,
        process.env.guildTest!
      ),
      { body: [] }
    );
    logger.info(`✅ Todos los comandos de guild eliminados.`);
  } catch (error) {
    // @ts-ignore
    logger.error("❌ Error eliminando comandos de guild:", error);
  }
}

export async function clearGlobalCommands(): Promise<void> {
  try {
    logger.info(`🌍 Eliminando comandos globales...`);
    await rest.put(Routes.applicationCommands(process.env.CLIENT!), {
      body: [],
    });
    logger.info(`✅ Comandos globales eliminados.`);
  } catch (error) {
    // @ts-ignore
    logger.error("❌ Error eliminando comandos globales:", error);
  }
}
