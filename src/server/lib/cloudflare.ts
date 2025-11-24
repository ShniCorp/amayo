import { IncomingMessage } from "node:http";

// Lista de rangos IP de Cloudflare (actualizar periódicamente desde https://www.cloudflare.com/ips/)
// Última actualización: 2025-11-07
export const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

export const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

/**
 * Verifica si una IP está dentro de un rango CIDR
 */
function ipInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipNum =
      ip
        .split(".")
        .reduce((num, octet) => (num << 8) + parseInt(octet, 10), 0) >>> 0;
    const rangeNum =
      range
        .split(".")
        .reduce((num, octet) => (num << 8) + parseInt(octet, 10), 0) >>> 0;

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * Verifica si una IP es de Cloudflare
 */
export function isCloudflareIP(ip: string): boolean {
  if (!ip) return false;

  // Verificar IPv4
  if (ip.includes(".")) {
    return CLOUDFLARE_IPV4_RANGES.some((range) => ipInRange(ip, range));
  }

  // Verificar IPv6 (simplificado - en producción usar una librería como ipaddr.js)
  if (ip.includes(":")) {
    return CLOUDFLARE_IPV6_RANGES.some((range) => {
      try {
        // Simplificado: solo verifica si el inicio coincide
        const [rangePrefix] = range.split("/");
        return ip
          .toLowerCase()
          .startsWith(rangePrefix.toLowerCase().split("::")[0]);
      } catch {
        return false;
      }
    });
  }

  return false;
}

/**
 * Valida que el request viene de Cloudflare
 * En producción, solo acepta requests que vienen a través de Cloudflare
 */
export function validateCloudflareRequest(req: IncomingMessage): {
  valid: boolean;
  reason?: string;
  clientIP?: string;
} {
  // En desarrollo, permitir todo
  if (process.env.NODE_ENV !== "production") {
    return { valid: true };
  }

  // Verificar header CF-Connecting-IP (IP real del cliente según Cloudflare)
  const cfConnectingIP = req.headers["cf-connecting-ip"] as string;
  if (!cfConnectingIP) {
    return {
      valid: false,
      reason: "Missing CF-Connecting-IP header - request not from Cloudflare",
    };
  }

  // Verificar que el request viene desde una IP de Cloudflare
  const forwardedFor = ((req.headers["x-forwarded-for"] as string) || "")
    .split(",")[0]
    .trim();
  const remoteAddr = (req.socket as any)?.remoteAddress || "";

  // La IP que nos conecta debe ser de Cloudflare
  const sourceIP = forwardedFor || remoteAddr;
  if (!isCloudflareIP(sourceIP)) {
    return {
      valid: false,
      reason: `Request source IP ${sourceIP} is not from Cloudflare`,
      clientIP: cfConnectingIP,
    };
  }

  return {
    valid: true,
    clientIP: cfConnectingIP,
  };
}

/**
 * Obtiene la IP real del cliente desde headers de Cloudflare
 */
export function getCloudflareClientIP(req: IncomingMessage): string {
  // CF-Connecting-IP es la IP real del cliente según Cloudflare
  const cfIP = req.headers["cf-connecting-ip"] as string;
  if (cfIP) return cfIP;

  // Fallback a X-Forwarded-For (menos confiable)
  const xff = ((req.headers["x-forwarded-for"] as string) || "")
    .split(",")[0]
    .trim();
  if (xff) return xff;

  // Último recurso: IP de la conexión directa
  return (req.socket as any)?.remoteAddress || "unknown";
}
