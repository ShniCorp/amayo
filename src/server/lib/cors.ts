import { IncomingMessage } from "node:http";

/**
 * Configuración de CORS estricta
 */
const ALLOWED_ORIGINS = [
  "https://docs.amayo.dev",
  "https://amayo.dev",
  "https://www.amayo.dev",
];

// En desarrollo, permitir localhost
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.push(
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173"
  );
}

/**
 * Valida el origin del request
 */
export function validateOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Genera headers CORS apropiados
 */
export function getCORSHeaders(
  origin: string | undefined
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Si el origin es válido, permitirlo
  if (origin && validateOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = [
      "Content-Type",
      "Authorization",
      "X-Client-Token",
      "X-Requested-With",
      "X-Timestamp",
    ].join(", ");
    headers["Access-Control-Expose-Headers"] =
      "X-Server-Token, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset";
    headers["Access-Control-Max-Age"] = "86400"; // 24 horas
  }

  return headers;
}

/**
 * Maneja preflight OPTIONS requests
 */
export function handlePreflight(
  req: IncomingMessage,
  origin: string | undefined
): { headers: Record<string, string>; statusCode: number } {
  const headers = getCORSHeaders(origin);

  if (Object.keys(headers).length === 0) {
    // Origin no permitido
    return {
      headers: { "Content-Type": "text/plain" },
      statusCode: 403,
    };
  }

  return {
    headers: {
      ...headers,
      "Content-Type": "text/plain",
      "Content-Length": "0",
    },
    statusCode: 204,
  };
}
