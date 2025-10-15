import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createCipheriv, randomBytes, createDecipheriv } from "node:crypto";
import {
  gzipSync,
  brotliCompressSync,
  constants as zlibConstants,
} from "node:zlib";
import path from "node:path";
import ejs from "ejs";
import { prisma } from "../core/database/prisma";
import { randomUUID } from "node:crypto";

const publicDir = path.join(__dirname, "public");
const viewsDir = path.join(__dirname, "views");
// Compresión síncrona (rápida para tamaños pequeños de HTML/CSS/JS)

// Cargar metadatos del proyecto para usarlos como variables en las vistas
let pkg: {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
} = {};
try {
  const pkgPath = path.join(__dirname, "../../package.json");
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch {
  // Ignorar si no se puede leer; usaremos valores por defecto
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const PORT = Number(process.env.PORT) || 3000;

// Simple in-memory stores (keep small, restart clears data)
const SESSIONS = new Map<string, any>();
const STATE_STORE = new Map<string, { ts: number }>();

// Configurable limits and TTLs (tune for production)
const STATE_TTL_MS = Number(process.env.STATE_TTL_MS) || 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS =
  Number(process.env.SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS) || 2000; // cap entries to control RAM

function parseCookies(req: IncomingMessage) {
  const raw = (req.headers.cookie as string) || "";
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, cur) => {
      const idx = cur.indexOf("=");
      if (idx === -1) return acc;
      const k = cur.slice(0, idx).trim();
      const v = cur.slice(idx + 1).trim();
      acc[k] = decodeURIComponent(v);
      return acc;
    }, {});
}

// --- Session and state helpers (restored) ---
function getSessionSecret(): string {
  // Prefer explicit env var; fallback to package name + version for a deterministic but non-secret default.
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 8)
    return process.env.SESSION_SECRET;
  const name = pkg?.name || "amayo";
  const version = pkg?.version || "0";
  return createHmac("sha256", "fallback")
    .update(name + "@" + version)
    .digest("hex");
}

function unsignSid(signed: string | undefined): string | null {
  if (!signed) return null;
  const parts = String(signed).split(".");
  if (parts.length !== 2) return null;
  const sid = parts[0];
  const sig = parts[1];
  try {
    const expected = createHmac("sha256", getSessionSecret())
      .update(sid)
      .digest("base64url");
    // timing-safe compare
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return sid;
  } catch {
    return null;
  }
}

function storeState(key: string) {
  STATE_STORE.set(key, { ts: Date.now() });
}

function hasState(key: string) {
  const v = STATE_STORE.get(key);
  if (!v) return false;
  if (Date.now() - v.ts > STATE_TTL_MS) {
    STATE_STORE.delete(key);
    return false;
  }
  return true;
}

function setSessionCookie(res: ServerResponse, sid: string) {
  // Sign the SID to prevent tampering
  const secret = getSessionSecret();
  const sig = createHmac("sha256", secret).update(sid).digest("base64url");
  const token = `${sid}.${sig}`;
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const sameSite = isProd ? "Lax" : "Lax"; // Lax works for OAuth redirects in most cases
  const secure = isProd ? "; Secure" : "";
  const cookie = `amayo_sid=${encodeURIComponent(
    token
  )}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
  res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res: ServerResponse) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `amayo_sid=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`
  );
}

function createSession(data: any) {
  // Evict oldest if over cap
  if (SESSIONS.size >= MAX_SESSIONS) {
    // delete ~10% oldest entries
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

function touchSession(sid: string) {
  const s = SESSIONS.get(sid);
  if (!s) return;
  s.lastSeen = Date.now();
}

async function refreshAccessTokenIfNeeded(session: any) {
  // session expected to have refresh_token and expires_at (ms)
  if (!session) return session;
  const now = Date.now();
  if (!session.refresh_token) return session;
  // If token expires in next 60s, refresh
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

// Periodic cleanup for memory-sensitive stores
setInterval(() => {
  const now = Date.now();
  // Cleanup state store
  for (const [k, v] of STATE_STORE.entries()) {
    if (now - v.ts > STATE_TTL_MS) STATE_STORE.delete(k);
  }
  // Cleanup sessions older than TTL
  for (const [k, s] of SESSIONS.entries()) {
    if (now - (s.lastSeen || s.created || 0) > SESSION_TTL_MS)
      SESSIONS.delete(k);
  }
}, Math.max(30_000, Math.min(5 * 60_000, STATE_TTL_MS)));

// --- Input sanitization helpers ---
function stripControlChars(s: string) {
  return s.replace(/\x00|[\x00-\x1F\x7F]+/g, "");
}

function sanitizeString(v: unknown, opts?: { max?: number }) {
  if (v == null) return "";
  let s = String(v);
  s = stripControlChars(s);
  // Remove script tags and angle-bracket injections
  s = s.replace(/<\/?\s*script[^>]*>/gi, "");
  s = s.replace(/[<>]/g, "");
  const max = opts?.max ?? 200;
  if (s.length > max) s = s.slice(0, max);
  return s.trim();
}

// --- Optional item encryption utilities (AES-256-GCM)
function getItemEncryptionKey(): Buffer | null {
  const k = process.env.ITEM_ENCRYPTION_KEY || "";
  if (!k) return null;
  // derive 32-byte key from provided secret
  return createHash("sha256").update(k).digest();
}

function encryptJsonForDb(obj: any): any {
  const key = getItemEncryptionKey();
  if (!key) return obj;
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plain = JSON.stringify(obj ?? {});
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, enc]).toString("base64");
    return { __enc: true, v: payload };
  } catch (e) {
    return null;
  }
}

function decryptJsonFromDb(maybe: any): any {
  const key = getItemEncryptionKey();
  if (!key) return maybe;
  if (!maybe || typeof maybe !== "object") return maybe;
  if (!maybe.__enc || typeof maybe.v !== "string") return maybe;
  try {
    const buf = Buffer.from(maybe.v, "base64");
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const enc = buf.slice(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    return JSON.parse(dec);
  } catch (e) {
    return null;
  }
}

function validateDiscordId(id: unknown) {
  if (!id) return false;
  const s = String(id);
  return /^\d{17,20}$/.test(s);
}

function formatHumanDate(d: unknown): string | null {
  if (!d) return null;
  try {
    const dt = new Date(d as any);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

async function safeUpsertGuild(g: any) {
  if (!g) return;
  if (!validateDiscordId(g.id)) {
    console.warn("Skipping upsert: invalid guild id", g && g.id);
    return;
  }
  const gid = String(g.id);
  const name = sanitizeString(g.name ?? gid, { max: 100 });
  try {
    await prisma.guild.upsert({
      where: { id: gid },
      update: { name },
      create: { id: gid, name, prefix: "!" },
    });
  } catch (err) {
    console.warn("safeUpsertGuild failed for", gid, err);
  }
}

// --- Basic hardening: blocklist patterns and lightweight rate limiting for suspicious paths ---
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(npci|upi|bhim|aadhaar|aadhar|cts|fastag|bbps|rgcs|nuup|apbs|hdfc|ergo|securities|banking|insurance)\b/i,
];

const SUSP_LENGTH = 18; // long single-segment slugs tend to be bot probes
const RATE_WINDOW_MS = 60_000; // 1 minute window
const RATE_MAX_SUSPICIOUS = 20; // allow up to 20 suspicious hits per minute per IP

type Counter = { count: number; resetAt: number };
const suspiciousCounters = new Map<string, Counter>();

function getClientIp(req: IncomingMessage): string {
  const cf = (req.headers["cf-connecting-ip"] as string) || "";
  const xff = (req.headers["x-forwarded-for"] as string) || "";
  const chain = (cf || xff)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    chain[0] || (req.socket && (req.socket as any).remoteAddress) || "unknown"
  );
}

function isSingleSegment(pathname: string) {
  // e.g. /foo-bar, no additional slashes
  return /^\/[A-Za-z0-9._-]+$/.test(pathname);
}

function isSuspiciousPath(pathname: string): boolean {
  if (
    !pathname ||
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/index.html"
  )
    return false;
  if (BLOCKED_PATTERNS.some((re) => re.test(pathname))) return true;
  if (isSingleSegment(pathname) && pathname.length > SUSP_LENGTH) return true;
  return false;
}

function hitSuspicious(ip: string): {
  allowed: boolean;
  resetIn: number;
  remaining: number;
} {
  const now = Date.now();
  let bucket = suspiciousCounters.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
  }
  bucket.count += 1;
  suspiciousCounters.set(ip, bucket);
  const allowed = bucket.count <= RATE_MAX_SUSPICIOUS;
  return {
    allowed,
    resetIn: Math.max(0, bucket.resetAt - now),
    remaining: Math.max(0, RATE_MAX_SUSPICIOUS - bucket.count),
  };
}

function applySecurityHeaders(base: Record<string, string> = {}) {
  return {
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    // Mild CSP to avoid breaking inline styles/scripts already present; adjust as needed
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; frame-src 'self' https://ko-fi.com https://*.ko-fi.com; child-src 'self' https://ko-fi.com https://*.ko-fi.com",
    ...base,
  };
}
function buildBaseCsp(frameAncestors: string = "'self'") {
  // Use a mild CSP; add frame-ancestors dynamically per request.
  return (
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "script-src 'self' 'unsafe-inline' https:; " +
    "font-src 'self' https: data:; " +
    "frame-src 'self' https://ko-fi.com https://*.ko-fi.com; " +
    "child-src 'self' https://ko-fi.com https://*.ko-fi.com; " +
    `frame-ancestors ${frameAncestors}`
  );
}

function applySecurityHeadersForRequest(
  req: IncomingMessage,
  base: Record<string, string> = {}
) {
  const host = ((req.headers.host as string) || "").toLowerCase();
  const isDocsHost =
    host === "docs.amayo.dev" || host.endsWith(".docs.amayo.dev");

  // Allow embedding only from https://top.gg for docs.amayo.dev; otherwise, self only and keep XFO deny.
  const csp = isDocsHost
    ? buildBaseCsp("'self' https://top.gg")
    : buildBaseCsp("'self'");

  const headers: Record<string, string> = {
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    // X-Frame-Options is omitted for docs.amayo.dev to rely on CSP frame-ancestors allowing only top.gg
    ...(isDocsHost ? {} : { "X-Frame-Options": "DENY" }),
    "Content-Security-Policy": csp,
    ...base,
  };

  return headers;
}

function computeEtag(buf: Buffer): string {
  // Weak ETag derived from content sha1 and length
  const hash = createHash("sha1").update(buf).digest("base64");
  return `W/"${buf.length.toString(16)}-${hash}"`;
}

function acceptsEncoding(req: IncomingMessage, enc: string): boolean {
  const ae = (req.headers["accept-encoding"] as string) || "";
  return ae
    .split(",")
    .map((s) => s.trim())
    .includes(enc);
}

// Parse Accept-Encoding with q-values and return a map of encoding -> q
function parseAcceptEncoding(req: IncomingMessage): Map<string, number> {
  const header = (req.headers["accept-encoding"] as string) || "";
  const map = new Map<string, number>();
  if (!header) {
    // If header missing, identity is acceptable
    map.set("identity", 1);
    return map;
  }
  const parts = header.split(",");
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const [name, ...params] = part.split(";");
    let q = 1;
    for (const p of params) {
      const [k, v] = p.split("=").map((s) => s.trim());
      if (k === "q" && v) {
        const n = Number(v);
        if (!Number.isNaN(n)) q = n;
      }
    }
    map.set(name.toLowerCase(), q);
  }
  // Ensure identity exists unless explicitly disabled (q=0)
  if (!map.has("identity")) map.set("identity", 1);
  return map;
}

// Choose the best compression given the request and mime type.
function pickEncoding(
  req: IncomingMessage,
  mime: string
): "br" | "gzip" | "identity" {
  if (!shouldCompress(mime)) return "identity";
  const encs = parseAcceptEncoding(req);
  const qBr = encs.get("br") ?? 0;
  const qGzip = encs.get("gzip") ?? 0;
  if (qBr > 0) return "br";
  if (qGzip > 0) return "gzip";
  return "identity";
}

function shouldCompress(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("svg")
  );
}

const resolvePath = (pathname: string): string => {
  const decoded = decodeURIComponent(pathname);
  let target = decoded;

  if (target.endsWith("/")) {
    target = `${target}index.html`;
  }

  if (!path.extname(target)) {
    target = `${target}.html`;
  }

  return path.join(publicDir, target);
};

const sendResponse = async (
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  statusCode = 200
): Promise<void> => {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";
  const cacheControl = extension.match(/\.(?:html)$/)
    ? "no-cache"
    : "public, max-age=86400, immutable";

  const stat = await fs.stat(filePath).catch(() => undefined);
  const data = await fs.readFile(filePath);
  const etag = computeEtag(data);

  // Conditional requests
  const inm = (req.headers["if-none-match"] as string) || "";
  if (inm && inm === etag) {
    res.writeHead(
      304,
      applySecurityHeadersForRequest(req, {
        ETag: etag,
        "Cache-Control": cacheControl,
        ...(stat ? { "Last-Modified": stat.mtime.toUTCString() } : {}),
      })
    );
    res.end();
    return;
  }

  let body: any = data;
  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Cache-Control": cacheControl,
    ETag: etag,
    ...(stat ? { "Last-Modified": stat.mtime.toUTCString() } : {}),
  };

  // Prefer Brotli over Gzip when supported
  const chosen = pickEncoding(req, mimeType);
  try {
    if (chosen === "br") {
      body = brotliCompressSync(data, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4, // fast, good ratio for text
          [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        },
      });
      headers["Content-Encoding"] = "br";
      headers["Vary"] = "Accept-Encoding";
    } else if (chosen === "gzip") {
      body = gzipSync(data);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    }
  } catch {
    // Si falla compresión, enviar sin comprimir
  }

  res.writeHead(statusCode, applySecurityHeadersForRequest(req, headers));
  res.end(body);
};

const renderTemplate = async (
  req: IncomingMessage,
  res: ServerResponse,
  template: string,
  locals: Record<string, any> = {},
  statusCode = 200
) => {
  const pageFile = path.join(viewsDir, "pages", `${template}.ejs`);
  const layoutFile = path.join(viewsDir, "layouts", "layout.ejs");
  // Ensure common defaults exist on locals so page templates can reference them safely
  locals.hideNavbar =
    typeof locals.hideNavbar !== "undefined" ? locals.hideNavbar : false;
  locals.useDashboardNav =
    typeof locals.useDashboardNav !== "undefined"
      ? locals.useDashboardNav
      : false;
  locals.selectedGuild =
    typeof locals.selectedGuild !== "undefined" ? locals.selectedGuild : null;
  locals.selectedGuildId =
    typeof locals.selectedGuildId !== "undefined"
      ? locals.selectedGuildId
      : null;

  const pageBody = await ejs.renderFile(pageFile, locals, { async: true });
  const defaultTitle = `${
    locals.appName ?? pkg.name ?? "Amayo Bot"
  } | Guía Completa`;
  // If the caller requested the dashboard nav, render it here and pass the
  // resulting HTML string to the layout to avoid printing unresolved Promises
  // in the template (EJS include/await differences across environments).
  let dashboardNavHtml: string | null = null;
  try {
    if (locals.useDashboardNav) {
      const partialPath = path.join(viewsDir, "partials", "dashboard_nav.ejs");
      // Render partial with same locals (async)
      dashboardNavHtml = await ejs.renderFile(
        partialPath,
        { ...locals },
        { async: true }
      );
    }
  } catch (err) {
    // If rendering the partial fails, log and continue — layout will handle missing nav.
    console.warn("Failed rendering dashboard_nav partial:", err);
    dashboardNavHtml = null;
  }

  // Pre-render the main navbar when layout expects it (and dashboard nav isn't used)
  let navbarHtml: string | null = null;
  try {
    const shouldShowNavbar = !locals.hideNavbar && !locals.useDashboardNav;
    if (shouldShowNavbar) {
      const navPath = path.join(viewsDir, "partials", "navbar.ejs");
      navbarHtml = await ejs.renderFile(
        navPath,
        { appName: locals.appName ?? pkg.name ?? "Amayo Bot" },
        { async: true }
      );
    }
  } catch (err) {
    console.warn("Failed rendering navbar partial:", err);
    navbarHtml = null;
  }

  const html = await ejs.renderFile(
    layoutFile,
    {
      head: null,
      scripts: null,
      // supply defaults to templates if not provided by caller
      version: locals.version ?? pkg.version ?? "2.0.0",
      djsVersion:
        locals.djsVersion ?? pkg?.dependencies?.["discord.js"] ?? "15.0.0-dev",
      currentDateHuman:
        locals.currentDateHuman ??
        new Date().toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        }),
      // ensure nav flags exist to avoid ReferenceError inside templates
      hideNavbar:
        typeof locals.hideNavbar !== "undefined" ? locals.hideNavbar : false,
      useDashboardNav:
        typeof locals.useDashboardNav !== "undefined"
          ? locals.useDashboardNav
          : false,
      // ensure selected guild defaults exist so templates can safely check
      selectedGuild:
        typeof locals.selectedGuild !== "undefined"
          ? locals.selectedGuild
          : null,
      selectedGuildId:
        typeof locals.selectedGuildId !== "undefined"
          ? locals.selectedGuildId
          : null,
      // Pre-rendered partial HTML (if produced above)
      dashboardNav: dashboardNavHtml,
      navbar: navbarHtml,
      ...locals,
      title: locals.title ?? defaultTitle,
      body: pageBody,
    },
    { async: true }
  );
  const htmlBuffer = Buffer.from(html, "utf8");
  const etag = computeEtag(htmlBuffer);

  // Conditional ETag for dynamic page (fresh each deploy change)
  const inm = (req.headers["if-none-match"] as string) || "";
  if (inm && inm === etag) {
    res.writeHead(
      304,
      applySecurityHeadersForRequest(req, {
        ETag: etag,
        "Cache-Control": "no-cache",
      })
    );
    res.end();
    return;
  }

  let respBody: any = htmlBuffer;
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
    ETag: etag,
  };

  const chosenDyn = pickEncoding(req, "text/html; charset=utf-8");
  try {
    if (chosenDyn === "br") {
      respBody = brotliCompressSync(htmlBuffer, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
          [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        },
      });
      headers["Content-Encoding"] = "br";
      headers["Vary"] = "Accept-Encoding";
    } else if (chosenDyn === "gzip") {
      respBody = gzipSync(htmlBuffer);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    }
  } catch {
    // continuar sin comprimir
  }

  res.writeHead(statusCode, applySecurityHeadersForRequest(req, headers));
  res.end(respBody);
};

export const server = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // 🔒 Forzar HTTPS en producción (Heroku)
      if (process.env.NODE_ENV === "production") {
        const proto = req.headers["x-forwarded-proto"];
        if (proto && proto !== "https") {
          res.writeHead(301, {
            Location: `https://${req.headers.host}${req.url}`,
          });
          return res.end();
        }
      }

      const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`
      );

      // Basic hardening: respond to robots.txt quickly (optional: disallow all or keep current)
      if (url.pathname === "/robots.txt") {
        const robots = "User-agent: *\nAllow: /\n"; // change to Disallow: / if you want to discourage polite crawlers
        res.writeHead(
          200,
          applySecurityHeadersForRequest(req, {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          })
        );
        return res.end(robots);
      }

      const clientIp = getClientIp(req);
      if (isSuspiciousPath(url.pathname)) {
        // Hard block known-bad keyword probes
        if (BLOCKED_PATTERNS.some((re) => re.test(url.pathname))) {
          const headers = applySecurityHeadersForRequest(req, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          res.writeHead(403, headers);
          return res.end("Forbidden");
        }
        // Rate limit repetitive suspicious hits per IP
        const rate = hitSuspicious(clientIp);
        if (!rate.allowed) {
          const headers = applySecurityHeadersForRequest(req, {
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": String(Math.ceil(rate.resetIn / 1000)),
            "X-RateLimit-Limit": String(RATE_MAX_SUSPICIOUS),
            "X-RateLimit-Remaining": String(rate.remaining),
          });
          res.writeHead(429, headers);
          return res.end("Too Many Requests");
        }
      }

      // Ruta dinámica: renderizar index con EJS
      if (
        url.pathname === "/" ||
        url.pathname === "/index" ||
        url.pathname === "/index.html"
      ) {
        const now = new Date();
        const currentDateHuman = now.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        });
        const djsVersion = pkg?.dependencies?.["discord.js"] ?? "15.0.0-dev";
        await renderTemplate(req, res, "index", {
          appName: pkg.name ?? "Amayo Bot",
          version: pkg.version ?? "2.0.0",
          djsVersion,
          currentDateHuman,
        });
        return;
      }

      // Explicit login route to render login page (avoid 404 when user visits /login)
      if (url.pathname === "/login") {
        await renderTemplate(req, res, "login", {
          appName: pkg.name ?? "Amayo Bot",
        });
        return;
      }

      // --- Auth routes (Discord OAuth minimal flow) ---
      if (url.pathname === "/auth/discord") {
        // Redirect to Discord OAuth2 authorize
        const clientId = process.env.DISCORD_CLIENT_ID || "";
        if (!clientId) {
          res.writeHead(500, applySecurityHeadersForRequest(req));
          res.end("DISCORD_CLIENT_ID not configured");
          return;
        }
        const redirectUri =
          process.env.DISCORD_REDIRECT_URI ||
          `https://${req.headers.host}/auth/callback`;
        const state = randomUUID();
        // Store state in a temp session map
        storeState(state);
        const scopes = encodeURIComponent("identify guilds");
        const urlAuth = `https://discord.com/api/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(
          clientId
        )}&scope=${scopes}&state=${state}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}`;
        res.writeHead(
          302,
          applySecurityHeadersForRequest(req, { Location: urlAuth })
        );
        return res.end();
      }

      if (url.pathname === "/auth/callback") {
        const qs = Object.fromEntries(url.searchParams.entries());
        const { code, state } = qs as any;
        // Validate state
        if (!state) {
          res.writeHead(400, applySecurityHeadersForRequest(req));
          return res.end("Missing OAuth state parameter");
        }
        if (!hasState(state)) {
          console.warn("OAuth callback with invalid/expired state", {
            state,
            ip: clientIp,
          });
          res.writeHead(400, applySecurityHeadersForRequest(req));
          return res.end(
            "Invalid or expired OAuth state. Please try logging in again."
          );
        }
        const clientId = process.env.DISCORD_CLIENT_ID || "";
        const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
        if (!clientId || !clientSecret) {
          res.writeHead(500, applySecurityHeadersForRequest(req));
          return res.end("DISCORD client credentials not configured");
        }
        const redirectUri =
          process.env.DISCORD_REDIRECT_URI ||
          `https://${req.headers.host}/auth/callback`;

        if (!code) {
          res.writeHead(400, applySecurityHeadersForRequest(req));
          return res.end("Missing code");
        }

        try {
          // Exchange code for token
          const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
            } as any).toString(),
          });
          if (!tokenRes.ok) {
            const text = await tokenRes.text().catch(() => "<no-body>");
            throw new Error(
              `Token exchange failed: ${tokenRes.status} ${tokenRes.statusText} ${text}`
            );
          }
          const tokenJson = await tokenRes.json();
          const accessToken = tokenJson.access_token;

          // Fetch user
          const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!userRes.ok) {
            const text = await userRes.text().catch(() => "<no-body>");
            throw new Error(
              `Failed fetching user: ${userRes.status} ${userRes.statusText} ${text}`
            );
          }
          const userJson = await userRes.json();

          // Fetch guilds
          const guildsRes = await fetch(
            "https://discord.com/api/users/@me/guilds",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (!guildsRes.ok) {
            const text = await guildsRes.text().catch(() => "<no-body>");
            console.warn(
              "Failed fetching guilds for user; continuing with empty list",
              {
                status: guildsRes.status,
                statusText: guildsRes.statusText,
                body: text,
              }
            );
          }
          const guildsJson = guildsRes.ok ? await guildsRes.json() : [];

          // Filter guilds where user is owner or has ADMINISTRATOR bit
          const ADMIN_BIT = 0x8;
          const adminGuilds = (
            Array.isArray(guildsJson) ? guildsJson : []
          ).filter((g: any) => {
            try {
              const perms = Number(g.permissions || 0);
              return g.owner || (perms & ADMIN_BIT) === ADMIN_BIT;
            } catch {
              return false;
            }
          });

          // Upsert guilds to DB safely
          for (const g of adminGuilds) {
            await safeUpsertGuild({ id: g.id, name: g.name });
          }

          // Sanitize user and guilds before storing in session
          const uid = validateDiscordId(userJson?.id)
            ? String(userJson.id)
            : null;
          const uname = sanitizeString(userJson?.username ?? "DiscordUser", {
            max: 100,
          });
          const uavatar = sanitizeString(userJson?.avatar ?? "", { max: 200 });
          const safeGuilds = (adminGuilds || []).map((g: any) => ({
            id: String(g.id),
            name: sanitizeString(g.name ?? g.id, { max: 100 }),
            icon: sanitizeString(g.icon ?? "", { max: 100 }),
            // Some sources may include a joinedAt/addedAt field; keep raw value for formatting later
            addedAt: g.addedAt || g.joinedAt || null,
          }));

          // create session with tokens to allow refresh
          const now = Date.now();
          const sid = createSession({
            user: {
              id: uid,
              username: uname,
              avatar: uavatar,
            },
            guilds: safeGuilds,
            access_token: tokenJson.access_token,
            refresh_token: tokenJson.refresh_token,
            expires_at: now + Number(tokenJson.expires_in || 3600) * 1000,
          });
          setSessionCookie(res, sid);
          // consume the state so it cannot be replayed
          try {
            STATE_STORE.delete(state);
          } catch {}
          res.writeHead(
            302,
            applySecurityHeadersForRequest(req, { Location: "/dashboard" })
          );
          return res.end();
        } catch (err: any) {
          console.error("OAuth callback error:", err);
          res.writeHead(500, applySecurityHeadersForRequest(req));
          return res.end("OAuth error");
        }
      }

      if (url.pathname === "/auth/logout") {
        const cookies = parseCookies(req);
        const signed = cookies["amayo_sid"];
        const sid = unsignSid(signed);
        if (sid) SESSIONS.delete(sid);
        clearSessionCookie(res);
        res.writeHead(
          302,
          applySecurityHeadersForRequest(req, { Location: "/" })
        );
        return res.end();
      }

      // API: update guild settings (used by dashboard settings panel)
      if (req.method === "POST" && url.pathname.startsWith("/api/dashboard/")) {
        const partsApi = url.pathname.split("/").filter(Boolean);
        // expected /api/dashboard/:guildId/settings
        if (
          partsApi[0] === "api" &&
          partsApi[1] === "dashboard" &&
          partsApi.length >= 4
        ) {
          const guildId = partsApi[2];
          const action = partsApi[3];
          if (action === "settings") {
            const cookiesApi = parseCookies(req);
            const signedApi = cookiesApi["amayo_sid"];
            const sidApi = unsignSid(signedApi);
            const sessionApi = sidApi ? SESSIONS.get(sidApi) : null;
            if (!sessionApi) {
              res.writeHead(
                401,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ error: "not_authenticated" }));
              return;
            }
            // ensure user has this guild in their session guilds (basic guard)
            const userGuildsApi = sessionApi?.guilds || [];
            if (
              !userGuildsApi.find((g: any) => String(g.id) === String(guildId))
            ) {
              res.writeHead(
                403,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ error: "forbidden" }));
              return;
            }

            // collect body
            const raw = await new Promise<string>((resolve, reject) => {
              let data = "";
              req.on("data", (c: any) => (data += String(c)));
              req.on("end", () => resolve(data));
              req.on("error", (e: any) => reject(e));
            }).catch(() => "");

            let payload: any = {};
            try {
              payload = raw ? JSON.parse(raw) : {};
            } catch {
              payload = {};
            }

            const newPrefix = sanitizeString(payload.prefix ?? "");
            const newAi =
              payload.aiRolePrompt == null
                ? null
                : String(payload.aiRolePrompt).slice(0, 1500);
            let staff: string[] | null = null;
            if (Array.isArray(payload.staff)) {
              staff = payload.staff
                .map(String)
                .filter((s) => validateDiscordId(s));
            } else if (typeof payload.staff === "string") {
              const arr = payload.staff
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              staff = arr.filter((s) => validateDiscordId(s));
            }

            try {
              const updateData: any = {};
              if (newPrefix) updateData.prefix = newPrefix;
              // allow explicitly setting null to remove ai prompt
              updateData.aiRolePrompt = newAi;
              if (staff !== null) updateData.staff = staff;

              const createData: any = {
                id: String(guildId),
                name: String(guildId),
                prefix: newPrefix || "!",
                aiRolePrompt: newAi,
                staff: staff || [],
              };

              await prisma.guild.upsert({
                where: { id: String(guildId) },
                update: updateData,
                create: createData,
              });
            } catch (err) {
              console.warn("Failed saving guild settings", err);
            }

            res.writeHead(
              200,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }
      }

      // Dashboard routes
      // Runtime API to fetch roles for a guild (used by client-side fallback)
      // GET /api/dashboard/:guildId/roles
      if (
        url.pathname.startsWith("/api/dashboard/") &&
        url.pathname.endsWith("/roles") &&
        req.method === "GET"
      ) {
        // path like /api/dashboard/<guildId>/roles
        const parts = url.pathname.split("/").filter(Boolean);
        // parts[0] === 'api', parts[1] === 'dashboard', parts[2] === '<guildId>', parts[3] === 'roles'
        if (parts.length >= 4) {
          const gid = parts[2];
          const botToken = process.env.DISCORD_BOT_TOKEN ?? process.env.TOKEN;
          if (!botToken) {
            res.writeHead(
              403,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(
              JSON.stringify({ ok: false, error: "no bot token configured" })
            );
            return;
          }
          try {
            const rolesRes = await fetch(
              `https://discord.com/api/guilds/${encodeURIComponent(
                String(gid)
              )}/roles`,
              { headers: { Authorization: `Bot ${botToken}` } }
            );
            if (!rolesRes.ok) {
              res.writeHead(
                rolesRes.status,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(
                JSON.stringify({
                  ok: false,
                  status: rolesRes.status,
                  statusText: rolesRes.statusText,
                })
              );
              return;
            }
            const rolesJson = await rolesRes.json();
            const mapped = Array.isArray(rolesJson)
              ? rolesJson.map((r: any) => ({
                  id: String(r.id),
                  name: String(r.name || r.id),
                  color:
                    typeof r.color !== "undefined" && r.color !== null
                      ? "#" + ("000000" + r.color.toString(16)).slice(-6)
                      : r.colorHex || r.hex
                      ? "#" + String(r.colorHex || r.hex).replace(/^#?/, "")
                      : "#8b95a0",
                }))
              : [];
            res.writeHead(
              200,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(
              JSON.stringify({ ok: true, count: mapped.length, roles: mapped })
            );
            return;
          } catch (err) {
            res.writeHead(
              500,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(JSON.stringify({ ok: false, error: String(err) }));
            return;
          }
        }
      }
      // API: CRUD for EconomyItem within dashboard
      // GET  /api/dashboard/:guildId/items          -> list items (guild + global)
      // POST /api/dashboard/:guildId/items          -> create item
      // PUT  /api/dashboard/:guildId/items/:id      -> update item
      // DELETE /api/dashboard/:guildId/items/:id    -> delete item
      if (
        url.pathname.startsWith("/api/dashboard/") &&
        url.pathname.includes("/items")
      ) {
        const parts = url.pathname.split("/").filter(Boolean);
        // parts: ['api','dashboard', guildId, 'items', [id]]
        if (
          parts.length >= 4 &&
          parts[0] === "api" &&
          parts[1] === "dashboard" &&
          parts[3] === "items"
        ) {
          const guildId = parts[2];
          const itemId = parts[4] || null;

          // session guard (same as settings)
          const cookiesApi = parseCookies(req);
          const signedApi = cookiesApi["amayo_sid"];
          const sidApi = unsignSid(signedApi);
          const sessionApi = sidApi ? SESSIONS.get(sidApi) : null;
          if (!sessionApi) {
            res.writeHead(
              401,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(JSON.stringify({ error: "not_authenticated" }));
            return;
          }
          const userGuildsApi = sessionApi?.guilds || [];
          if (
            !userGuildsApi.find((g: any) => String(g.id) === String(guildId))
          ) {
            res.writeHead(
              403,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(JSON.stringify({ error: "forbidden" }));
            return;
          }

          // GET list
          if (req.method === "GET" && !itemId) {
            try {
              const items = await prisma.economyItem.findMany({
                where: {
                  OR: [{ guildId: String(guildId) }, { guildId: null }],
                },
                orderBy: { createdAt: "desc" },
              });
              // Hide potentially sensitive JSON fields from API responses
              const safe = items.map((it: any) => ({
                id: it.id,
                key: it.key,
                name: it.name,
                description: it.description,
                category: it.category,
                icon: it.icon,
                stackable: it.stackable,
                maxPerInventory: it.maxPerInventory,
                tags: it.tags || [],
                guildId: it.guildId || null,
                createdAt: it.createdAt,
                updatedAt: it.updatedAt,
              }));
              res.writeHead(
                200,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: true, items: safe }));
              return;
            } catch (err) {
              res.writeHead(
                500,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: false, error: String(err) }));
              return;
            }
          }

          // GET single item raw (admin) -> /api/dashboard/:guildId/items/:id?raw=1
          if (req.method === "GET" && itemId) {
            const wantRaw = url.searchParams.get('raw') === '1';
            if (wantRaw) {
              if (process.env.ALLOW_ITEM_RAW !== '1') {
                res.writeHead(403, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                res.end(JSON.stringify({ ok:false, error: 'raw_disabled' }));
                return;
              }
              try {
                const it = await prisma.economyItem.findUnique({ where: { id: String(itemId) } });
                if (!it) {
                  res.writeHead(404, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                  res.end(JSON.stringify({ ok:false, error:'not_found' }));
                  return;
                }
                const props = decryptJsonFromDb(it.props);
                const metadata = decryptJsonFromDb(it.metadata);
                res.writeHead(200, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                res.end(JSON.stringify({ ok:true, item: { id: it.id, key: it.key, name: it.name, props, metadata } }));
                return;
              } catch (err) {
                res.writeHead(500, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                res.end(JSON.stringify({ ok:false, error: String(err) }));
                return;
              }
            }
            // otherwise fall through to allow POST/PUT/DELETE handling below
          }

          // Read body helper
          const raw = await new Promise<string>((resolve) => {
            let data = "";
            req.on("data", (c: any) => (data += String(c)));
            req.on("end", () => resolve(data));
            req.on("error", () => resolve(""));
          }).catch(() => "");
          let payload: any = {};
          try {
            payload = raw ? JSON.parse(raw) : {};
          } catch {
            payload = {};
          }

          // POST create
          if (req.method === "POST" && !itemId) {
            const key = sanitizeString(payload.key || "", { max: 200 });
            const name = sanitizeString(payload.name || "", { max: 200 });
            if (!key || !name) {
              res.writeHead(
                400,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(
                JSON.stringify({ ok: false, error: "missing_key_or_name" })
              );
              return;
            }
            const createData: any = {
              key,
              name,
              description:
                sanitizeString(payload.description || "", { max: 1000 }) ||
                null,
              category:
                sanitizeString(payload.category || "", { max: 200 }) || null,
              icon: sanitizeString(payload.icon || "", { max: 200 }) || null,
              stackable: payload.stackable === false ? false : true,
              maxPerInventory:
                typeof payload.maxPerInventory === "number"
                  ? payload.maxPerInventory
                  : null,
              guildId: String(guildId),
              tags: Array.isArray(payload.tags)
                ? payload.tags.map(String)
                : typeof payload.tags === "string"
                ? payload.tags
                    .split(",")
                    .map((s: any) => String(s).trim())
                    .filter(Boolean)
                : [],
            };
            // parse JSON fields if provided as string and encrypt if key present
            try {
              const rawProps = payload.props ? (typeof payload.props === 'string' ? JSON.parse(payload.props) : payload.props) : null;
              const rawMeta = payload.metadata ? (typeof payload.metadata === 'string' ? JSON.parse(payload.metadata) : payload.metadata) : null;
              createData.props = getItemEncryptionKey() ? encryptJsonForDb(rawProps) : rawProps;
              createData.metadata = getItemEncryptionKey() ? encryptJsonForDb(rawMeta) : rawMeta;
            } catch {
              createData.props = null;
              createData.metadata = null;
            }

            try {
              const created = await prisma.economyItem.create({ data: createData });
              // Return safe summary only (do not include props/metadata)
              const safeCreated = {
                id: created.id,
                key: created.key,
                name: created.name,
                description: created.description,
                category: created.category,
                icon: created.icon,
                stackable: created.stackable,
                maxPerInventory: created.maxPerInventory,
                tags: created.tags || [],
                guildId: created.guildId || null,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
              };
              res.writeHead(
                200,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: true, item: safeCreated }));
              return;
            } catch (err: any) {
              // Prisma unique constraint error code P2002 -> duplicate key
              if (err && err.code === 'P2002') {
                res.writeHead(400, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                res.end(JSON.stringify({ ok:false, error:'duplicate_key' }));
                return;
              }
              const errMsg = String(err || 'unknown');
              res.writeHead(500, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
              res.end(JSON.stringify({ ok:false, error: errMsg }));
              return;
            }
          }

          // PUT update
          if (req.method === "PUT" && itemId) {
            try {
              const id = String(itemId);
              const updateData: any = {};
              if (payload.key)
                updateData.key = sanitizeString(payload.key, { max: 200 });
              if (payload.name)
                updateData.name = sanitizeString(payload.name, { max: 200 });
              if (typeof payload.description !== "undefined")
                updateData.description =
                  sanitizeString(payload.description || "", { max: 1000 }) ||
                  null;
              if (typeof payload.category !== "undefined")
                updateData.category =
                  sanitizeString(payload.category || "", { max: 200 }) || null;
              if (typeof payload.icon !== "undefined")
                updateData.icon =
                  sanitizeString(payload.icon || "", { max: 200 }) || null;
              if (typeof payload.stackable !== "undefined")
                updateData.stackable =
                  payload.stackable === false ? false : true;
              updateData.maxPerInventory =
                typeof payload.maxPerInventory === "number"
                  ? payload.maxPerInventory
                  : null;
              if (typeof payload.tags !== "undefined")
                updateData.tags = Array.isArray(payload.tags)
                  ? payload.tags.map(String)
                  : typeof payload.tags === "string"
                  ? payload.tags
                      .split(",")
                      .map((s: any) => String(s).trim())
                      .filter(Boolean)
                  : [];
              try {
                const rawProps = typeof payload.props === 'string' ? JSON.parse(payload.props) : payload.props;
                const rawMeta = typeof payload.metadata === 'string' ? JSON.parse(payload.metadata) : payload.metadata;
                updateData.props = getItemEncryptionKey() ? encryptJsonForDb(rawProps) : rawProps;
                updateData.metadata = getItemEncryptionKey() ? encryptJsonForDb(rawMeta) : rawMeta;
              } catch {
                updateData.props = null;
                updateData.metadata = null;
              }

              try {
                const updated = await prisma.economyItem.update({ where: { id }, data: updateData });
                // Return safe summary only (do not include props/metadata)
                const safeUpdated = {
                  id: updated.id,
                  key: updated.key,
                  name: updated.name,
                  description: updated.description,
                  category: updated.category,
                  icon: updated.icon,
                  stackable: updated.stackable,
                  maxPerInventory: updated.maxPerInventory,
                  tags: updated.tags || [],
                  guildId: updated.guildId || null,
                  createdAt: updated.createdAt,
                  updatedAt: updated.updatedAt,
                };
                res.writeHead(200, applySecurityHeadersForRequest(req, { 'Content-Type': 'application/json' }));
                res.end(JSON.stringify({ ok: true, item: safeUpdated }));
                return;
              } catch (err: any) {
                if (err && err.code === 'P2002') {
                  res.writeHead(400, applySecurityHeadersForRequest(req, { 'Content-Type':'application/json' }));
                  res.end(JSON.stringify({ ok:false, error:'duplicate_key' }));
                  return;
                }
                res.writeHead(500, applySecurityHeadersForRequest(req, { 'Content-Type': 'application/json' }));
                res.end(JSON.stringify({ ok: false, error: String(err) }));
                return;
              }
            } catch (err) {
              res.writeHead(
                500,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: false, error: String(err) }));
              return;
            }
          }

          // DELETE
          if (req.method === "DELETE" && itemId) {
            try {
              const id = String(itemId);
              await prisma.economyItem.delete({ where: { id } });
              res.writeHead(
                200,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: true }));
              return;
            } catch (err) {
              res.writeHead(
                500,
                applySecurityHeadersForRequest(req, {
                  "Content-Type": "application/json",
                })
              );
              res.end(JSON.stringify({ ok: false, error: String(err) }));
              return;
            }
          }
        }
      }
      // Dev-only helper: fetch roles for a guild (requires COLLAB_TEST=1 and DISCORD_BOT_TOKEN)
      if (url.pathname.startsWith("/__dev/fetch-roles")) {
        if (process.env.COLLAB_TEST !== "1") {
          res.writeHead(
            403,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "application/json",
            })
          );
          res.end(JSON.stringify({ ok: false, error: "disabled" }));
          return;
        }
        const gid = url.searchParams.get("guild");
        if (!gid) {
          res.writeHead(
            400,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "application/json",
            })
          );
          res.end(JSON.stringify({ ok: false, error: "missing guild param" }));
          return;
        }
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
          res.writeHead(
            500,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "application/json",
            })
          );
          res.end(
            JSON.stringify({ ok: false, error: "no bot token configured" })
          );
          return;
        }
        try {
          const rolesRes = await fetch(
            `https://discord.com/api/guilds/${encodeURIComponent(
              String(gid)
            )}/roles`,
            { headers: { Authorization: `Bot ${botToken}` } }
          );
          if (!rolesRes.ok) {
            res.writeHead(
              rolesRes.status,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "application/json",
              })
            );
            res.end(
              JSON.stringify({
                ok: false,
                status: rolesRes.status,
                statusText: rolesRes.statusText,
              })
            );
            console.warn(
              `__dev fetch-roles: got ${rolesRes.status} ${rolesRes.statusText} for guild ${gid}`
            );
            return;
          }
          const rolesJson = await rolesRes.json();
          res.writeHead(
            200,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "application/json",
            })
          );
          res.end(
            JSON.stringify({
              ok: true,
              count: Array.isArray(rolesJson) ? rolesJson.length : 0,
              roles: rolesJson,
            })
          );
          console.info(
            `__dev fetch-roles: fetched ${
              Array.isArray(rolesJson) ? rolesJson.length : 0
            } roles for guild ${gid}`
          );
        } catch (err) {
          res.writeHead(
            500,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "application/json",
            })
          );
          res.end(JSON.stringify({ ok: false, error: String(err) }));
          console.warn("__dev fetch-roles error", err);
        }
        return;
      }

      if (
        url.pathname === "/dashboard" ||
        url.pathname.startsWith("/dashboard")
      ) {
        const cookies = parseCookies(req);
        const signed = cookies["amayo_sid"];
        const sid = unsignSid(signed);
        const session = sid ? SESSIONS.get(sid) : null;
        const user = session?.user ?? null;

        // If not authenticated, redirect to login page
        if (!user) {
          await renderTemplate(req, res, "login", {
            appName: pkg.name ?? "Amayo Bot",
          });
          return;
        }

        // Touch and refresh session tokens as user is active
        try {
          await refreshAccessTokenIfNeeded(session);
        } catch (err) {
          console.warn("refreshAccessTokenIfNeeded failed", err);
        }
        touchSession(sid!);

        // Guild list: prefer session-stored guilds from OAuth (accurate), otherwise fallback to DB
        const sessionGuilds: Array<{
          id: string;
          name?: string;
          icon?: string;
          addedAt?: string | null;
        }> = session?.guilds || [];
        let guilds: Array<{ id: string; name: string }> = [];
        if (sessionGuilds && sessionGuilds.length) {
          guilds = sessionGuilds.map(
            (g: any) =>
              ({
                id: String(g.id),
                name: String(g.name || g.id),
                icon: g.icon || null,
                addedAt: g.addedAt || null,
                addedAtHuman: formatHumanDate(g.addedAt || g.joinedAt || null),
              } as any)
          );
        } else {
          try {
            const rows = await prisma.guild.findMany({ take: 50 });
            guilds = rows.map(
              (r) =>
                ({
                  id: r.id,
                  name: r.name,
                  icon: null,
                  addedAt: null,
                  addedAtHuman: null,
                } as any)
            );
          } catch {
            guilds = [];
          }
        }

        // /dashboard -> main dashboard
        if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") {
          // determine whether bot is in each guild (if we have a bot token)
          try {
            const botToken = process.env.DISCORD_BOT_TOKEN ?? process.env.TOKEN; // prefer DISCORD_BOT_TOKEN, fallback to TOKEN
            if (botToken && Array.isArray(guilds) && guilds.length) {
              await Promise.all(
                guilds.map(async (g: any) => {
                  try {
                    const check = await fetch(
                      `https://discord.com/api/guilds/${encodeURIComponent(
                        String(g.id)
                      )}`,
                      { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    g.botInGuild = check.ok;
                  } catch (e) {
                    // network or other error while checking; leave undefined so UI doesn't assume absence
                    g.botInGuild = undefined;
                  }
                })
              );
            } else {
              // No bot token available: do not assume the bot is absent in all guilds.
              // Leave `botInGuild` undefined so templates treat this as unknown state.
            }
          } catch (err) {
            // ignore
          }
          await renderTemplate(req, res, "dashboard", {
            appName: pkg.name ?? "Amayo Bot",
            user,
            guilds,
            hideNavbar: true,
            selectedGuildId: null,
          });
          return;
        }

        // Keep /dashboard/select-guild for compatibility: redirect to /dashboard
        if (url.pathname === "/dashboard/select-guild") {
          res.writeHead(302, { Location: "/dashboard" });
          res.end();
          return;
        }

        // Dashboard subpaths (e.g. /dashboard/:guildId/overview)
        const parts = url.pathname.split("/").filter(Boolean);
        // parts[0] === 'dashboard'
        if (parts.length >= 2) {
          const guildId = parts[1];
          const page = parts[2] || "overview";
          const fragment =
            url.searchParams.get("fragment") || url.searchParams.get("ajax");
          // find a nicer display name for selected guild
          const found = guilds.find((g) => String(g.id) === String(guildId));
          const selectedGuildName = found ? found.name : guildId;
          // Load guild config from DB to allow editing settings
          let guildConfig: any = null;
          try {
            guildConfig = await prisma.guild.findFirst({
              where: { id: String(guildId) },
            });
          } catch {
            guildConfig = null;
          }
          // Attempt to fetch guild roles via Discord Bot API if token available
          let guildRoles: Array<{ id: string; name: string }> = [];
          try {
            const botToken = process.env.DISCORD_BOT_TOKEN ?? process.env.TOKEN; // prefer DISCORD_BOT_TOKEN, fallback to TOKEN
            if (botToken) {
              const rolesRes = await fetch(
                `https://discord.com/api/guilds/${encodeURIComponent(
                  String(guildId)
                )}/roles`,
                { headers: { Authorization: `Bot ${botToken}` } }
              );
              if (rolesRes.ok) {
                const rolesJson = await rolesRes.json();
                if (Array.isArray(rolesJson)) {
                  guildRoles = rolesJson.map((r: any) => ({
                    id: String(r.id),
                    name: String(r.name || r.id),
                    color:
                      typeof r.color !== "undefined" && r.color !== null
                        ? "#" + ("000000" + r.color.toString(16)).slice(-6)
                        : r.colorHex || r.hex
                        ? "#" + String(r.colorHex || r.hex).replace(/^#?/, "")
                        : "#8b95a0",
                  }));
                  // Debug: log number of roles fetched for observability in dev
                  try {
                    console.info(
                      `dashboard: fetched ${guildRoles.length} roles for guild ${guildId}`
                    );
                  } catch (e) {
                    /* ignore logging errors */
                  }
                }
              } else {
                console.warn(
                  `dashboard: roles fetch returned ${rolesRes.status} ${rolesRes.statusText} for guild ${guildId}`
                );
              }
            }
          } catch (err) {
            // ignore; fallback to no roles
          }
          // Render dashboard with selected guild context; show dashboard nav
          // Ensure we know whether the bot is in each guild (so small selectors/nav show correct state)
          try {
            const botToken = process.env.DISCORD_BOT_TOKEN ?? process.env.TOKEN;
            if (botToken && Array.isArray(guilds) && guilds.length) {
              await Promise.all(
                guilds.map(async (g: any) => {
                  try {
                    const check = await fetch(
                      `https://discord.com/api/guilds/${encodeURIComponent(
                        String(g.id)
                      )}`,
                      { headers: { Authorization: `Bot ${botToken}` } }
                    );
                    g.botInGuild = check.ok;
                  } catch (e) {
                    g.botInGuild = undefined;
                  }
                })
              );
            }
          } catch (err) {
            // ignore
          }
          // If caller requested a fragment, render only the page template (no layout)
          if (fragment) {
            // Render the dashboard page and extract the inner #dashContent fragment
            const dashPage = path.join(viewsDir, "pages", `dashboard.ejs`);
            const pageLocals = {
              appName: pkg.name ?? "Amayo Bot",
              user,
              guilds,
              selectedGuild: guildId,
              selectedGuildId: guildId,
              selectedGuildName,
              guildConfig,
              guildRoles,
              page,
              hideNavbar: false,
              useDashboardNav: true,
            };
            try {
              const fullPageHtml = await ejs.renderFile(dashPage, pageLocals, {
                async: true,
              });
              // extract content inside the first <div id="dashContent"> ... </div>
              const match =
                /<div\s+id=["']dashContent["']\b[^>]*>([\s\S]*?)<\/div>/.exec(
                  fullPageHtml
                );
              if (match && match[1] != null) {
                const fragmentHtml = match[1];
                res.writeHead(
                  200,
                  applySecurityHeadersForRequest(req, {
                    "Content-Type": "text/html; charset=utf-8",
                  })
                );
                res.end(fragmentHtml);
                return;
              }
              // if extraction failed, fall through to full render
            } catch (err) {
              console.warn("Failed rendering dashboard fragment:", err);
            }
          }
          await renderTemplate(req, res, "dashboard", {
            appName: pkg.name ?? "Amayo Bot",
            user,
            guilds,
            selectedGuild: guildId,
            selectedGuildId: guildId,
            selectedGuildName,
            guildConfig,
            guildRoles,
            page,
            hideNavbar: false,
            useDashboardNav: true,
          });
          return;
        }
      }

      const filePath = resolvePath(url.pathname);

      if (!filePath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      try {
        await sendResponse(req, res, filePath);
      } catch (error: any) {
        if (error.code === "ENOENT") {
          const notFoundPath = path.join(publicDir, "404.html");
          try {
            await sendResponse(req, res, notFoundPath, 404);
          } catch {
            res.writeHead(
              404,
              applySecurityHeadersForRequest(req, {
                "Content-Type": "text/plain; charset=utf-8",
              })
            );
            res.end("404 - Recurso no encontrado");
          }
        } else if (error.code === "EISDIR") {
          const indexPath = path.join(filePath, "index.html");
          await sendResponse(req, res, indexPath);
        } else {
          console.error("[Server] Error al servir archivo:", error);
          res.writeHead(
            500,
            applySecurityHeadersForRequest(req, {
              "Content-Type": "text/plain; charset=utf-8",
            })
          );
          res.end("500 - Error interno del servidor");
        }
      }
    } catch (error) {
      console.error("[Server] Error inesperado:", error);
      res.writeHead(
        500,
        applySecurityHeadersForRequest(req, {
          "Content-Type": "text/plain; charset=utf-8",
        })
      );
      res.end("500 - Error interno");
    }
  }
);
