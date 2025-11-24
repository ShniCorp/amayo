import logger from "../lib/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdk: any = require('node-appwrite');
import { getDatabases, isAIConversationsConfigured, APPWRITE_COLLECTION_AI_CONVERSATIONS_ID, APPWRITE_DATABASE_ID } from './appwrite';

let schemaEnsured = false;

export async function ensureAIConversationsSchema() {
  if (schemaEnsured) return;
  if (!isAIConversationsConfigured()) return;
  const db = getDatabases();
  if (!db) return;

  const databaseId = APPWRITE_DATABASE_ID;
  const collectionId = APPWRITE_COLLECTION_AI_CONVERSATIONS_ID;

  // 1) Asegurar colección
  try {
    await db.getCollection(databaseId, collectionId);
  } catch {
    try {
      await db.createCollection(
        databaseId,
        collectionId,
        collectionId,
        undefined, // permissions (opcional)
        undefined, // documentSecurity (opcional)
        false      // enabled (opcional)
      );
    } catch (e) {
      // @ts-ignore
      logger.warn('No se pudo crear la colección de AI conversations (puede existir ya):', e);
    }
  }

  // 2) Atributos requeridos
  const createIfMissing = async (fn: () => Promise<any>) => {
    try { await fn(); } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/already exists|attribute_already_exists/i.test(msg)) {
        // @ts-ignore
        logger.warn('No se pudo crear atributo de AI conversations:', msg);
      }
    }
  };

  // Claves y metadatos
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'userId', 64, true));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'guildId', 64, false));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'channelId', 64, false));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'conversationId', 64, true));
  await createIfMissing(() => db.createDatetimeAttribute(databaseId, collectionId, 'lastActivity', true));
  await createIfMissing(() => db.createDatetimeAttribute(databaseId, collectionId, 'createdAt', true));

  // Historial de mensajes serializado como JSON (string grande)
  // Nota: El límite exacto soportado puede variar por versión; 32768 suele ser seguro.
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'messagesJson', 32768, false));

  // 3) Índices útiles
  try {
    // Índice compuesto para búsquedas por usuario/guild/canal
    // En Appwrite, los índices de tipo 'key' aceptan múltiples atributos y órdenes paralelos
    // @ts-ignore
    await db.createIndex(databaseId, collectionId, 'idx_user_guild_channel', 'key', ['userId','guildId','channelId'], ['asc','asc','asc']);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/already exists|index_already_exists/i.test(msg)) {
      // @ts-ignore
      logger.warn('No se pudo crear índice user/guild/channel:', msg);
    }
  }

  try {
    // Índice por lastActivity descendente para obtener la más reciente
    // @ts-ignore
    await db.createIndex(databaseId, collectionId, 'idx_lastActivity_desc', 'key', ['lastActivity'], ['desc']);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/already exists|index_already_exists/i.test(msg)) {
      // @ts-ignore
      logger.warn('No se pudo crear índice lastActivity:', msg);
    }
  }

  schemaEnsured = true;
}
