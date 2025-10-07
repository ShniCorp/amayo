import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const publicDir = path.join(__dirname, "public");

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
  res: ServerResponse,
  filePath: string,
  statusCode = 200
): Promise<void> => {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";
  const cacheControl = extension.match(/\.(?:html)$/)
    ? "no-cache"
    : "public, max-age=86400, immutable";

  const data = await fs.readFile(filePath);
  res.writeHead(statusCode, {
    "Content-Type": mimeType,
    "Cache-Control": cacheControl,
  });
  res.end(data);
};

export const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
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

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const filePath = resolvePath(url.pathname);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      await sendResponse(res, filePath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        const notFoundPath = path.join(publicDir, "404.html");
        try {
          await sendResponse(res, notFoundPath, 404);
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("404 - Recurso no encontrado");
        }
      } else if (error.code === "EISDIR") {
        const indexPath = path.join(filePath, "index.html");
        await sendResponse(res, indexPath);
      } else {
        console.error("[Server] Error al servir archivo:", error);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 - Error interno del servidor");
      }
    }
  } catch (error) {
    console.error("[Server] Error inesperado:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 - Error interno");
  }
});
