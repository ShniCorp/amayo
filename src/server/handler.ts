import { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { prisma } from "../core/database/prisma";
import {
  parseCookies,
  sanitizeString,
  validateDiscordId,
  formatHumanDate,
  publicDir,
  viewsDir,
  ejs,
  pkg,
  gzipSync,
  brotliCompressSync,
  zlibConstants,
  computeEtag,
} from "./lib/utils";
import {
  storeState,
  hasState,
  createSession,
  unsignSid,
  setSessionCookie,
  clearSessionCookie,
  touchSession,
  refreshAccessTokenIfNeeded,
  SESSIONS,
} from "./lib/session";
import { sendResponse, renderTemplate } from "./lib/render";
import {
  getClientIp,
  isSuspiciousPath,
  hitSuspicious,
  BLOCKED_PATTERNS,
  applySecurityHeadersForRequest,
  applySecurityHeaders,
} from "./lib/security";

export const handler = async (req: IncomingMessage, res: ServerResponse) => {
  try {
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

    if (url.pathname === "/robots.txt") {
      const robots = "User-agent: *\nAllow: /\n";
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
      if (BLOCKED_PATTERNS.some((re) => re.test(url.pathname))) {
        const headers = applySecurityHeadersForRequest(req, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        res.writeHead(403, headers);
        return res.end("Forbidden");
      }
      const rate = hitSuspicious(clientIp);
      if (!rate.allowed) {
        const headers = applySecurityHeadersForRequest(req, {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(Math.ceil(rate.resetIn / 1000)),
          "X-RateLimit-Limit": String(20),
          "X-RateLimit-Remaining": String(rate.remaining),
        });
        res.writeHead(429, headers);
        return res.end("Too Many Requests");
      }
    }

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

    if (url.pathname === "/login") {
      await renderTemplate(req, res, "login", {
        appName: pkg.name ?? "Amayo Bot",
      });
      return;
    }

    // --- Auth routes ---
    if (url.pathname === "/auth/discord") {
      const clientId = process.env.DISCORD_CLIENT_ID || "";
      if (!clientId) {
        res.writeHead(500, applySecurityHeadersForRequest(req));
        res.end("DISCORD_CLIENT_ID not configured");
        return;
      }
      const redirectUri =
        process.env.DISCORD_REDIRECT_URI ||
        `https://${req.headers.host}/auth/callback`;
      const state = require("node:crypto").randomUUID();
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
        const guildsRes = await fetch(
          "https://discord.com/api/users/@me/guilds",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const guildsJson = guildsRes.ok ? await guildsRes.json() : [];
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
        for (const g of adminGuilds) {
          await require("./lib/utils").safeUpsertGuild({
            id: g.id,
            name: g.name,
          });
        }

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
          addedAt: g.addedAt || g.joinedAt || null,
        }));

        const now = Date.now();
        const sid = createSession({
          user: { id: uid, username: uname, avatar: uavatar },
          guilds: safeGuilds,
          access_token: tokenJson.access_token,
          refresh_token: tokenJson.refresh_token,
          expires_at: now + Number(tokenJson.expires_in || 3600) * 1000,
        });
        setSessionCookie(res, sid);
        try {
          require("./lib/session").STATE_STORE &&
            require("./lib/session").STATE_STORE.delete(state);
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

    // Dashboard routes (require session)
    if (
      url.pathname === "/dashboard" ||
      url.pathname.startsWith("/dashboard/")
    ) {
      const cookies = parseCookies(req);
      const signed = cookies["amayo_sid"];
      const sid = unsignSid(signed);
      const session = sid ? SESSIONS.get(sid) : null;
      if (!session) {
        // not authenticated -> redirect to login
        res.writeHead(
          302,
          applySecurityHeadersForRequest(req, { Location: "/login" })
        );
        return res.end();
      }
      // refresh token if needed and mark session active
      await refreshAccessTokenIfNeeded(session).catch(() => {});
      if (sid) touchSession(sid);
      await renderTemplate(req, res, "dashboard", {
        appName: pkg.name ?? "Amayo Bot",
        version: pkg.version ?? "2.0.0",
        djsVersion: pkg?.dependencies?.["discord.js"] ?? "15.0.0-dev",
        useDashboardNav: true,
        selectedGuild: session?.guilds?.[0] ?? null,
        selectedGuildId: session?.guilds?.[0]?.id ?? null,
        session,
        user: session?.user ?? null,
        guilds: session?.guilds || [],
        selectedGuildName: session?.guilds?.[0]?.name ?? null,
      });
      return;
    }

    if (url.pathname === "/select_guild") {
      const cookies = parseCookies(req);
      const signed = cookies["amayo_sid"];
      const sid = unsignSid(signed);
      const session = sid ? SESSIONS.get(sid) : null;
      if (!session) {
        res.writeHead(
          302,
          applySecurityHeadersForRequest(req, { Location: "/login" })
        );
        return res.end();
      }
      await refreshAccessTokenIfNeeded(session).catch(() => {});
      if (sid) touchSession(sid);
      await renderTemplate(req, res, "select_guild", {
        appName: pkg.name ?? "Amayo Bot",
        session,
        user: session?.user ?? null,
        guilds: session.guilds || [],
      });
      return;
    }

    if (url.pathname === "/favicon.ico") {
      // redirect favicon requests to a known image in public assets
      res.writeHead(
        302,
        applySecurityHeadersForRequest(req, {
          Location: "/assets/images/logo-amayo.svg",
        })
      );
      return res.end();
    }

    // NOTE: For brevity not all routes ported here; remaining dashboard/api routes will be handled by the original server when present in public directory

    const filePath = path.join(
      publicDir,
      url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname
    );
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
};
