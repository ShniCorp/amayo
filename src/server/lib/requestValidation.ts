import { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";

/**
 * Valida headers de seguridad requeridos en requests de API
 */
export function validateSecurityHeaders(req: IncomingMessage): {
  valid: boolean;
  reason?: string;
} {
  // Headers requeridos
  const requiredHeaders = ["x-client-token", "x-requested-with", "x-timestamp"];

  // Verificar que todos los headers existan
  for (const header of requiredHeaders) {
    if (!req.headers[header]) {
      return {
        valid: false,
        reason: `Missing required header: ${header}`,
      };
    }
  }

  // Validar timestamp (prevenir replay attacks)
  const timestamp = parseInt(req.headers["x-timestamp"] as string);
  if (isNaN(timestamp)) {
    return {
      valid: false,
      reason: "Invalid timestamp format",
    };
  }

  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutos

  if (Math.abs(now - timestamp) > maxAge) {
    return {
      valid: false,
      reason: "Request timestamp expired (max 5 minutes)",
    };
  }

  // Validar que X-Requested-With sea XMLHttpRequest (protección básica CSRF)
  const requestedWith = req.headers["x-requested-with"] as string;
  if (requestedWith !== "XMLHttpRequest") {
    return {
      valid: false,
      reason: "Invalid X-Requested-With header",
    };
  }

  return { valid: true };
}

/**
 * Genera un token de servidor para la respuesta
 */
export function generateServerToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Agrega el server token a la respuesta
 */
export function addServerToken(res: ServerResponse): void {
  res.setHeader("X-Server-Token", generateServerToken());
}

/**
 * Valida User-Agent para bloquear bots/scrapers conocidos
 */
export function validateUserAgent(req: IncomingMessage): {
  valid: boolean;
  reason?: string;
} {
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();

  // Lista de user agents sospechosos/bloqueados
  const blockedAgents = [
    "curl",
    "wget",
    "python-requests",
    "scrapy",
    "nikto",
    "nmap",
    "sqlmap",
    "masscan",
    "postman",
    "insomnia",
  ];

  for (const blocked of blockedAgents) {
    if (userAgent.includes(blocked)) {
      return {
        valid: false,
        reason: `Blocked user agent: ${blocked}`,
      };
    }
  }

  // Verificar que tenga un user agent (requests sin UA son sospechosos)
  if (!userAgent || userAgent.trim() === "") {
    return {
      valid: false,
      reason: "Missing or empty user agent",
    };
  }

  return { valid: true };
}
