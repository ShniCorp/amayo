import { IncomingMessage, ServerResponse } from "node:http";
import {
  createHmac,
  timingSafeEqual,
  randomUUID,
  createHash,
} from "node:crypto";
import { pkg } from "./utils";

const SESSIONS = new Map<string, any>();
const STATE_STORE = new Map<string, { ts: number }>();

const STATE_TTL_MS = Number(process.env.STATE_TTL_MS) || 5 * 60 * 1000;
const SESSION_TTL_MS =
  Number(process.env.SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS) || 2000;

export function storeState(key: string) {
  STATE_STORE.set(key, { ts: Date.now() });
}

export function hasState(key: string) {
  const v = STATE_STORE.get(key);
  if (!v) return false;
  if (Date.now() - v.ts > STATE_TTL_MS) {
    STATE_STORE.delete(key);
    return false;
  }
  return true;
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 8)
    return process.env.SESSION_SECRET;
  const name = pkg?.name || "amayo";
  const version = pkg?.version || "0";
  return createHmac("sha256", "fallback")
    .update(name + "@" + version)
    .digest("hex");
}

export function unsignSid(signed: string | undefined): string | null {
  if (!signed) return null;
  const parts = String(signed).split(".");
  if (parts.length !== 2) return null;
  const sid = parts[0];
  const sig = parts[1];
  try {
    const expected = createHmac("sha256", getSessionSecret())
      .update(sid)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return sid;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: ServerResponse, sid: string) {
  const secret = getSessionSecret();
  const sig = createHmac("sha256", secret).update(sid).digest("base64url");
  const token = `${sid}.${sig}`;
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 7;
  const sameSite = isProd ? "Lax" : "Lax";
  const secure = isProd ? "; Secure" : "";
  const cookie = `amayo_sid=${encodeURIComponent(
    token
  )}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: ServerResponse) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `amayo_sid=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`
  );
}

export function createSession(data: any) {
  if (SESSIONS.size >= MAX_SESSIONS) {
    const toRemove = Math.max(1, Math.floor(MAX_SESSIONS * 0.1));
    const it = SESSIONS.keys();
    for (let i = 0; i < toRemove; i++) {
      const k = it.next().value;
      if (!k) break;
      SESSIONS.delete(k);
    }
  }
  const sid = randomUUID();
  SESSIONS.set(sid, { ...data, created: Date.now(), lastSeen: Date.now() });
  return sid;
}

export function touchSession(sid: string) {
  const s = SESSIONS.get(sid);
  if (!s) return;
  s.lastSeen = Date.now();
}

export async function refreshAccessTokenIfNeeded(session: any) {
  if (!session) return session;
  const now = Date.now();
  if (!session.refresh_token) return session;
  if (!session.expires_at || session.expires_at - now <= 60 * 1000) {
    try {
      const clientId = process.env.DISCORD_CLIENT_ID || "";
      const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: session.refresh_token,
        } as any).toString(),
      });
      if (!tokenRes.ok) throw new Error("Refresh failed");
      const tokenJson = await tokenRes.json();
      session.access_token = tokenJson.access_token;
      session.refresh_token = tokenJson.refresh_token || session.refresh_token;
      session.expires_at =
        Date.now() + Number(tokenJson.expires_in || 3600) * 1000;
    } catch (err) {
      console.warn("Token refresh error", err);
    }
  }
  return session;
}

// periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of STATE_STORE.entries()) {
    if (now - v.ts > STATE_TTL_MS) STATE_STORE.delete(k);
  }
  for (const [k, s] of SESSIONS.entries()) {
    if (now - (s.lastSeen || s.created || 0) > SESSION_TTL_MS)
      SESSIONS.delete(k);
  }
}, Math.max(30_000, Math.min(5 * 60_000, STATE_TTL_MS)));

export { SESSIONS };
