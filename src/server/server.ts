import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync, brotliCompressSync } from "node:zlib";
import path from "node:path";
import ejs from "ejs";

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

  if (shouldCompress(mimeType) && acceptsEncoding(req, "gzip")) {
    try {
      body = gzipSync(data);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    } catch {
      // Si falla compresión, enviar sin comprimir
    }
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
  const pageBody = await ejs.renderFile(pageFile, locals, { async: true });
  const defaultTitle = `${
    locals.appName ?? pkg.name ?? "Amayo Bot"
  } | Guía Completa`;
  const html = await ejs.renderFile(
    layoutFile,
    {
      head: null,
      scripts: null,
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

  if (acceptsEncoding(req, "gzip")) {
    try {
      respBody = gzipSync(htmlBuffer);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    } catch {
      // continuar sin comprimir
    }
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
