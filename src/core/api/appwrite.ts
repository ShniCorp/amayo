// Simple Appwrite client wrapper
// @ts-ignore
import { Client, Databases } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || '';
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
export const APPWRITE_COLLECTION_REMINDERS_ID = process.env.APPWRITE_COLLECTION_REMINDERS_ID || '';

let client: Client | null = null;
let databases: Databases | null = null;

function ensureClient() {
  if (!endpoint || !projectId || !apiKey) return null;
  if (client) return client;
  client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  databases = new Databases(client);
  return client;
}

export function getDatabases(): Databases | null {
  return ensureClient() ? (databases as Databases) : null;
}

export function isAppwriteConfigured(): boolean {
  return Boolean(endpoint && projectId && apiKey && APPWRITE_DATABASE_ID && APPWRITE_COLLECTION_REMINDERS_ID);
}
