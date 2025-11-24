import logger from "../lib/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdk: any = require('node-appwrite');
import { getDatabases, isAppwriteConfigured, APPWRITE_COLLECTION_REMINDERS_ID, APPWRITE_DATABASE_ID } from './appwrite';

export async function ensureRemindersSchema() {
  if (!isAppwriteConfigured()) return;
  const db = getDatabases();
  if (!db) return;

  const databaseId = APPWRITE_DATABASE_ID;
  const collectionId = APPWRITE_COLLECTION_REMINDERS_ID;

  // 1) Asegurar colección
  try {
    await db.getCollection(databaseId, collectionId);
  } catch {
    try {
      // Sintaxis actualizada para createCollection (versión actual de Appwrite SDK)
      await db.createCollection(
        databaseId,
        collectionId,
        collectionId,
        undefined, // permissions (opcional)
        undefined, // documentSecurity (opcional)
        false      // enabled (opcional)
      );
      // Nota: No añadimos permisos de lectura pública para evitar fuga de datos
    } catch (e) {
      // @ts-ignore
        logger.warn('No se pudo crear la colección de recordatorios (puede existir ya):', e);
    }
  }

  // 2) Asegurar atributos requeridos
  const createIfMissing = async (fn: () => Promise<any>) => {
    try { await fn(); } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/already exists|attribute_already_exists/i.test(msg)) {
        // Otros errores se muestran
        // @ts-ignore
          logger.warn('No se pudo crear atributo:', msg);
      }
    }
  };

  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'userId', 64, true));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'guildId', 64, false));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'channelId', 64, false));
  await createIfMissing(() => db.createStringAttribute(databaseId, collectionId, 'message', 2048, true));
  await createIfMissing(() => db.createDatetimeAttribute(databaseId, collectionId, 'executeAt', true));
  await createIfMissing(() => db.createDatetimeAttribute(databaseId, collectionId, 'createdAt', true));

  // 3) Índice por executeAt para consultas por vencimiento
  try {
    // Sintaxis actualizada para createIndex - 'ASC' ahora debe ser 'asc' (lowercase)
    // @ts-ignore
      await db.createIndex(databaseId, collectionId, 'idx_executeAt_asc', 'key', ['executeAt'], ['asc']);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/already exists|index_already_exists/i.test(msg)) {
      // @ts-ignore
        logger.warn('No se pudo crear índice executeAt:', msg);
    }
  }
}
