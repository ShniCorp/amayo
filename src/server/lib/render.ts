import { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import {
  gzipSync,
  brotliCompressSync,
  constants as zlibConstants,
} from "node:zlib";
import path from "node:path";
import {
  computeEtag,
  pickEncoding,
  publicDir,
  viewsDir,
  pkg,
  ejs,
} from "./utils";
import {
  applySecurityHeadersForRequest,
  applySecurityHeaders,
} from "./security";

export const sendResponse = async (
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
  statusCode = 200
): Promise<void> => {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType =
    require("./utils").MIME_TYPES[extension] || "application/octet-stream";
  const cacheControl = extension.match(/\.(?:html)$/)
    ? "no-cache"
    : "public, max-age=86400, immutable";

  const stat = await fs.stat(filePath).catch(() => undefined);
  const data = await fs.readFile(filePath);
  const etag = computeEtag(data);

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
  const chosen = pickEncoding(req, mimeType);
  try {
    if (chosen === "br") {
      body = brotliCompressSync(data, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
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
  } catch {}

  res.writeHead(statusCode, applySecurityHeadersForRequest(req, headers));
  res.end(body);
};

export const renderTemplate = async (
  req: IncomingMessage,
  res: ServerResponse,
  template: string,
  locals: Record<string, any> = {},
  statusCode = 200
) => {
  const candidatePaths = [
    path.join(viewsDir, "pages", `${template}.ejs`),
    // fallback: lib is one level deeper, try ../views
    path.join(__dirname, "..", "views", "pages", `${template}.ejs`),
    // fallback: project src path
    path.join(
      process.cwd(),
      "src",
      "server",
      "views",
      "pages",
      `${template}.ejs`
    ),
  ];
  const pageFile = (await findFirstExisting(candidatePaths)) || "";

  const layoutCandidates = [
    path.join(viewsDir, "layouts", "layout.ejs"),
    path.join(__dirname, "..", "views", "layouts", "layout.ejs"),
    path.join(process.cwd(), "src", "server", "views", "layouts", "layout.ejs"),
  ];
  const layoutFile = (await findFirstExisting(layoutCandidates)) || "";
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

  let pageBody: string;
  if (!pageFile) {
    // no page template found -> return 404-friendly HTML
    pageBody = `<h1>404 - Página no encontrada</h1><p>Template ${template} no disponible.</p>`;
    statusCode = 404;
  } else {
    pageBody = await ejs.renderFile(pageFile, locals, { async: true });
  }
  const defaultTitle = `${
    locals.appName ?? pkg.name ?? "Amayo Bot"
  } | Guía Completa`;
  let dashboardNavHtml: string | null = null;
  try {
    if (locals.useDashboardNav) {
      const partialCandidates = [
        path.join(viewsDir, "partials", "dashboard_nav.ejs"),
        path.join(__dirname, "..", "views", "partials", "dashboard_nav.ejs"),
        path.join(
          process.cwd(),
          "src",
          "server",
          "views",
          "partials",
          "dashboard_nav.ejs"
        ),
      ];
      const partialPath = (await findFirstExisting(partialCandidates)) || null;
      if (partialPath) {
        dashboardNavHtml = await ejs.renderFile(
          partialPath,
          { ...locals },
          { async: true }
        );
      }
    }
  } catch (err) {
    console.warn("Failed rendering dashboard_nav partial:", err);
    dashboardNavHtml = null;
  }
  let navbarHtml: string | null = null;
  try {
    const shouldShowNavbar = !locals.hideNavbar && !locals.useDashboardNav;
    if (shouldShowNavbar) {
      const navCandidates = [
        path.join(viewsDir, "partials", "navbar.ejs"),
        path.join(__dirname, "..", "views", "partials", "navbar.ejs"),
        path.join(
          process.cwd(),
          "src",
          "server",
          "views",
          "partials",
          "navbar.ejs"
        ),
      ];
      const navPath = (await findFirstExisting(navCandidates)) || null;
      if (navPath) {
        navbarHtml = await ejs.renderFile(
          navPath,
          { appName: locals.appName ?? pkg.name ?? "Amayo Bot" },
          { async: true }
        );
      }
    }
  } catch (err) {
    console.warn("Failed rendering navbar partial:", err);
    navbarHtml = null;
  }

  let html: string;
  if (!layoutFile) {
    // If layout not available, use the page body directly
    console.warn(
      "Layout template not found, returning page body directly for:",
      template
    );
    html = pageBody;
  } else {
    html = await ejs.renderFile(
      layoutFile,
      {
        head: null,
        scripts: null,
        version: locals.version ?? pkg.version ?? "2.0.0",
        djsVersion:
          locals.djsVersion ??
          pkg?.dependencies?.["discord.js"] ??
          "15.0.0-dev",
        currentDateHuman:
          locals.currentDateHuman ??
          new Date().toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          }),
        hideNavbar:
          typeof locals.hideNavbar !== "undefined" ? locals.hideNavbar : false,
        useDashboardNav:
          typeof locals.useDashboardNav !== "undefined"
            ? locals.useDashboardNav
            : false,
        selectedGuild:
          typeof locals.selectedGuild !== "undefined"
            ? locals.selectedGuild
            : null,
        selectedGuildId:
          typeof locals.selectedGuildId !== "undefined"
            ? locals.selectedGuildId
            : null,
        dashboardNav: dashboardNavHtml,
        navbar: navbarHtml,
        ...locals,
        title: locals.title ?? defaultTitle,
        body: pageBody,
      },
      { async: true }
    );
  }

  const htmlBuffer = Buffer.from(html, "utf8");
  const etag = computeEtag(htmlBuffer);
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
  } catch {}

  res.writeHead(statusCode, applySecurityHeadersForRequest(req, headers));
  res.end(respBody);
};

async function findFirstExisting(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    try {
      if (!p) continue;
      const st = await fs.stat(p).catch(() => undefined);
      if (st && st.isFile()) return p;
    } catch {}
  }
  return null;
}
