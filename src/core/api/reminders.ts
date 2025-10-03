import logger from "../lib/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdk: any = require('node-appwrite');
import type Amayo from '../client';
import { getDatabases, isAppwriteConfigured, APPWRITE_COLLECTION_REMINDERS_ID, APPWRITE_DATABASE_ID } from './appwrite';
import { ensureRemindersSchema } from './remindersSchema';

export type ReminderDoc = {
  $id?: string;
  userId: string;
  guildId?: string | null;
  channelId?: string | null;
  message: string;
  executeAt: string; // ISO string
  createdAt?: string;
};

// Row type returned by Appwrite for our reminders
export type ReminderRow = ReminderDoc & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $collectionId?: string;
  $databaseId?: string;
};

let schemaEnsured = false;
async function ensureSchemaOnce() {
  if (schemaEnsured) return;
  try {
    await ensureRemindersSchema();
  } finally {
    schemaEnsured = true;
  }
}

export async function scheduleReminder(doc: ReminderDoc): Promise<string> {
  const db = getDatabases();
  if (!db || !isAppwriteConfigured()) throw new Error('Appwrite no está configurado');
  await ensureSchemaOnce();
  const data = {
    userId: doc.userId,
    guildId: doc.guildId ?? null,
    channelId: doc.channelId ?? null,
    message: doc.message,
    executeAt: doc.executeAt,
    createdAt: doc.createdAt ?? new Date().toISOString()
  } as Record<string, any>;
  const res = await db.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_REMINDERS_ID, sdk.ID.unique(), data) as unknown as { $id: string };
  return res.$id;
}

async function fetchDueReminders(limit = 25): Promise<ReminderRow[]> {
  const db = getDatabases();
  if (!db || !isAppwriteConfigured()) return [];
  try { await ensureSchemaOnce(); } catch {}
  const nowIso = new Date().toISOString();
  try {
    const list = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_REMINDERS_ID, [
      sdk.Query.lessThanEqual('executeAt', nowIso),
      sdk.Query.limit(limit)
    ]) as unknown as { documents?: ReminderRow[] };
    return (list.documents || []) as ReminderRow[];
  } catch (e) {
    // @ts-ignore
      logger.error('Error listando recordatorios vencidos:', e);
    return [];
  }
}

async function deliverReminder(bot: Amayo, doc: ReminderRow) {
  const userId: string = doc.userId;
  const channelId: string | null = (doc.channelId as string | null) || null;
  const message: string = doc.message || '';

  let delivered = false;
  // 1) Intentar en el canal original si existe y es de texto
  if (channelId) {
    try {
      const ch: any = await bot.channels.fetch(channelId).catch(() => null);
      if (ch && typeof ch.send === 'function') {
        await ch.send({ content: `⏰ <@${userId}> Recordatorio: ${message}` });
        delivered = true;
      }
    } catch (e) {
      // @ts-ignore
        logger.warn('No se pudo enviar al canal original:', e);
    }
  }
  // 2) Fallback: DM al usuario
  if (!delivered) {
    try {
      const user = await bot.users.fetch(userId);
      await user.send({ content: `⏰ Recordatorio: ${message}` });
      delivered = true;
    } catch (e) {
      // @ts-ignore
        logger.warn('No se pudo enviar DM al usuario:', e);
    }
  }

  return delivered;
}

export function startReminderPoller(bot: Amayo) {
  if (!isAppwriteConfigured()) {
    logger.warn('Appwrite no configurado: el poller de recordatorios no se iniciará.');
    return null;
  }

  const intervalSec = parseInt(process.env.REMINDERS_POLL_INTERVAL_SECONDS || '30', 10);
  logger.info(`⏱️ Iniciando poller de recordatorios cada ${intervalSec}s`);

  const timer = setInterval(async () => {
    try {
      const due = await fetchDueReminders(50);
      if (!due.length) return;
      for (const d of due) {
        const ok = await deliverReminder(bot, d);
        if (!ok) continue; // Dejar para reintento futuro
        try {
          const db = getDatabases();
          if (db) await db.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_REMINDERS_ID, d.$id);
        } catch (e) {
          // @ts-ignore
            logger.warn('No se pudo eliminar recordatorio entregado:', e);
        }
      }
    } catch (e) {
      // @ts-ignore
        logger.error('Error en ciclo de recordatorios:', e);
    }
  }, Math.max(10, intervalSec) * 1000);

  // Node no debería impedir salida por timers; por si acaso, unref
  // @ts-ignore
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
