// Simple Appwrite client wrapper
// @ts-ignore
import { Client, Databases, Storage } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "";
export const APPWRITE_COLLECTION_REMINDERS_ID =
  process.env.APPWRITE_COLLECTION_REMINDERS_ID || "";
export const APPWRITE_COLLECTION_AI_CONVERSATIONS_ID =
  process.env.APPWRITE_COLLECTION_AI_CONVERSATIONS_ID || "";
export const APPWRITE_COLLECTION_GUILD_CACHE_ID =
  process.env.APPWRITE_COLLECTION_GUILD_CACHE_ID || "";

// Optional: collections for game realtime mirrors
export const APPWRITE_COLLECTION_QUESTS_ID =
  process.env.APPWRITE_COLLECTION_QUESTS_ID || "";
export const APPWRITE_COLLECTION_QUEST_PROGRESS_ID =
  process.env.APPWRITE_COLLECTION_QUEST_PROGRESS_ID || "";
export const APPWRITE_COLLECTION_SCHEDULED_ATTACKS_ID =
  process.env.APPWRITE_COLLECTION_SCHEDULED_ATTACKS_ID || "";

// Optional: bucket for images (areas/levels)
export const APPWRITE_BUCKET_IMAGES_ID =
  process.env.APPWRITE_BUCKET_IMAGES_ID || "";

let client: Client | null = null;
let databases: Databases | null = null;
let storage: Storage | null = null;

function ensureClient() {
  if (!endpoint || !projectId || !apiKey) return null;
  if (client) return client;
  client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  databases = new Databases(client);
  storage = new Storage(client);
  return client;
}

export function getDatabases(): Databases | null {
  return ensureClient() ? (databases as Databases) : null;
}

export function getStorage(): Storage | null {
  return ensureClient() ? (storage as Storage) : null;
}

export function isAppwriteConfigured(): boolean {
  return Boolean(
    endpoint &&
      projectId &&
      apiKey &&
      APPWRITE_DATABASE_ID &&
      APPWRITE_COLLECTION_REMINDERS_ID
  );
}

export function isAIConversationsConfigured(): boolean {
  return Boolean(
    endpoint &&
      projectId &&
      apiKey &&
      APPWRITE_DATABASE_ID &&
      APPWRITE_COLLECTION_AI_CONVERSATIONS_ID
  );
}

export function isGuildCacheConfigured(): boolean {
  return Boolean(
    endpoint &&
      projectId &&
      apiKey &&
      APPWRITE_DATABASE_ID &&
      APPWRITE_COLLECTION_GUILD_CACHE_ID
  );
}

export function isAppwriteStorageConfigured(): boolean {
  return Boolean(endpoint && projectId && apiKey && APPWRITE_BUCKET_IMAGES_ID);
}

export function isGameRealtimeConfigured(): boolean {
  // minimal check for quests/progress and scheduled attacks mirrors
  return Boolean(
    endpoint &&
      projectId &&
      apiKey &&
      APPWRITE_DATABASE_ID &&
      (APPWRITE_COLLECTION_QUESTS_ID ||
        APPWRITE_COLLECTION_QUEST_PROGRESS_ID ||
        APPWRITE_COLLECTION_SCHEDULED_ATTACKS_ID)
  );
}
