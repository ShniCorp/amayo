import { IncomingMessage, ServerResponse } from "node:http";
import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import {
  gzipSync,
  brotliCompressSync,
  constants as zlibConstants,
} from "node:zlib";
import path from "node:path";
import ejs from "ejs";
import { promises as fs, readFileSync, existsSync } from "node:fs";
import { prisma } from "../../core/database/prisma";

// Prefer project src paths (in case process.cwd differs between environments)
const projectPublic = path.join(process.cwd(), "src", "server", "public");
const projectViews = path.join(process.cwd(), "src", "server", "views");
const publicDir = existsSync(projectPublic)
  ? projectPublic
  : path.join(__dirname, "..", "public");
const viewsDir = existsSync(projectViews)
  ? projectViews
  : path.join(__dirname, "..", "views");

export const MIME_TYPES: Record<string, string> = {
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

let pkg: any = {};
try {
  const pkgPath = path.join(__dirname, "../../package.json");
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch {}

export function parseCookies(req: IncomingMessage) {
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

export function stripControlChars(s: string) {
  return s.replace(/\x00|[\x00-\x1F\x7F]+/g, "");
}

export function sanitizeString(v: unknown, opts?: { max?: number }) {
  if (v == null) return "";
  let s = String(v);
  s = stripControlChars(s);
  s = s.replace(/<\/?\s*script[^>]*>/gi, "");
  s = s.replace(/[<>]/g, "");
  const max = opts?.max ?? 200;
  if (s.length > max) s = s.slice(0, max);
  return s.trim();
}

export function validateDiscordId(id: unknown) {
  if (!id) return false;
  const s = String(id);
  return /^\d{17,20}$/.test(s);
}

export function formatHumanDate(d: unknown): string | null {
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

export function computeEtag(buf: Buffer): string {
  const hash = createHash("sha1").update(buf).digest("base64");
  return `W/"${buf.length.toString(16)}-${hash}"`;
}

export function getItemEncryptionKey(): Buffer | null {
  const k = process.env.ITEM_ENCRYPTION_KEY || "";
  if (!k) return null;
  return createHash("sha256").update(k).digest();
}

export function encryptJsonForDb(obj: any): any {
  const key = getItemEncryptionKey();
  if (!key) return obj;
  try {
    const iv = randomBytes(12);
    const cipher = require("node:crypto").createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );
    const plain = JSON.stringify(obj ?? {});
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, enc]).toString("base64");
    return { __enc: true, v: payload };
  } catch (e) {
    return null;
  }
}

export function decryptJsonFromDb(maybe: any): any {
  const key = getItemEncryptionKey();
  if (!key) return maybe;
  if (!maybe || typeof maybe !== "object") return maybe;
  if (!maybe.__enc || typeof maybe.v !== "string") return maybe;
  try {
    const buf = Buffer.from(maybe.v, "base64");
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const enc = buf.slice(28);
    const decipher = require("node:crypto").createDecipheriv(
      "aes-256-gcm",
      key,
      iv
    );
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([
      decipher.update(enc),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(dec);
  } catch (e) {
    return null;
  }
}

export function acceptsEncoding(req: IncomingMessage, enc: string): boolean {
  const ae = (req.headers["accept-encoding"] as string) || "";
  return ae
    .split(",")
    .map((s) => s.trim())
    .includes(enc);
}

export function parseAcceptEncoding(req: IncomingMessage): Map<string, number> {
  const header = (req.headers["accept-encoding"] as string) || "";
  const map = new Map<string, number>();
  if (!header) {
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
  if (!map.has("identity")) map.set("identity", 1);
  return map;
}

export function pickEncoding(
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

export function shouldCompress(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("svg")
  );
}

export const resolvePath =
  (publicRoot: string) =>
  (pathname: string): string => {
    const decoded = decodeURIComponent(pathname);
    let target = decoded;
    if (target.endsWith("/")) target = `${target}index.html`;
    if (!path.extname(target)) target = `${target}.html`;
    return path.join(publicRoot, target);
  };

export async function safeUpsertGuild(g: any) {
  if (!g) return;
  if (!validateDiscordId(g.id)) return;
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

export {
  publicDir,
  viewsDir,
  pkg,
  ejs,
  gzipSync,
  brotliCompressSync,
  zlibConstants,
};
