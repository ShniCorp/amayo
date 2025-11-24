import { IncomingMessage } from "node:http";

/**
 * Rate Limiter genérico con soporte para múltiples buckets
 */
export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private maxRequests: number, private windowMs: number) {}

  /**
   * Verifica si se puede hacer un request
   * Retorna { allowed: true/false, resetIn: ms, remaining: count }
   */
  check(key: string): {
    allowed: boolean;
    resetIn: number;
    remaining: number;
  } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Crear o resetear bucket
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    // Incrementar contador
    bucket.count++;

    const allowed = bucket.count <= this.maxRequests;
    const resetIn = Math.max(0, bucket.resetAt - now);
    const remaining = Math.max(0, this.maxRequests - bucket.count);

    return { allowed, resetIn, remaining };
  }

  /**
   * Limpia buckets expirados (para evitar memory leaks)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}

// Rate limiters para diferentes endpoints
export const rateLimiters = {
  // API general: 30 req/min
  api: new RateLimiter(30, 60_000),

  // Auth (login): 3 intentos/min
  auth: new RateLimiter(3, 60_000),

  // Default: 10 req/min
  default: new RateLimiter(10, 60_000),

  // Bot stats: 60 req/min (más permisivo para dashboard)
  stats: new RateLimiter(60, 60_000),
};

// Cleanup periódico cada 5 minutos
setInterval(() => {
  Object.values(rateLimiters).forEach((limiter) => limiter.cleanup());
}, 5 * 60_000);

/**
 * Aplica rate limiting a un request
 */
export function checkRateLimit(
  req: IncomingMessage,
  type: keyof typeof rateLimiters = "default"
): {
  allowed: boolean;
  resetIn: number;
  remaining: number;
  headers: Record<string, string>;
} {
  const ip = getClientIP(req);
  const limiter = rateLimiters[type];
  const result = limiter.check(ip);

  return {
    ...result,
    headers: {
      "X-RateLimit-Limit": String(limiter["maxRequests"]),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(
        Math.ceil(Date.now() / 1000 + result.resetIn / 1000)
      ),
      ...(result.allowed
        ? {}
        : { "Retry-After": String(Math.ceil(result.resetIn / 1000)) }),
    },
  };
}

/**
 * Obtiene la IP del cliente (compatible con Cloudflare)
 */
function getClientIP(req: IncomingMessage): string {
  const cfIP = req.headers["cf-connecting-ip"] as string;
  if (cfIP) return cfIP;

  const xff = ((req.headers["x-forwarded-for"] as string) || "")
    .split(",")[0]
    .trim();
  if (xff) return xff;

  return (req.socket as any)?.remoteAddress || "unknown";
}
