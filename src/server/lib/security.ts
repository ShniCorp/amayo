import { IncomingMessage } from "node:http";

export const BLOCKED_PATTERNS: RegExp[] = [
  /\b(npci|upi|bhim|aadhaar|aadhar|cts|fastag|bbps|rgcs|nuup|apbs|hdfc|ergo|securities|banking|insurance)\b/i,
];

export const SUSP_LENGTH = 18;
export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_SUSPICIOUS = 20;

type Counter = { count: number; resetAt: number };
const suspiciousCounters = new Map<string, Counter>();

export function getClientIp(req: IncomingMessage): string {
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

export function isSingleSegment(pathname: string) {
  return /^\/[A-Za-z0-9._-]+$/.test(pathname);
}

export function isSuspiciousPath(pathname: string): boolean {
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

export function hitSuspicious(ip: string): {
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

export function buildBaseCsp(frameAncestors: string = "'self'") {
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

export function applySecurityHeaders(base: Record<string, string> = {}) {
  return {
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": buildBaseCsp("'self'"),
    ...base,
  };
}

export function applySecurityHeadersForRequest(
  req: IncomingMessage,
  base: Record<string, string> = {}
) {
  const host = ((req.headers.host as string) || "").toLowerCase();
  const isDocsHost =
    host === "docs.amayo.dev" || host.endsWith(".docs.amayo.dev");
  const csp = isDocsHost
    ? buildBaseCsp("'self' https://top.gg")
    : buildBaseCsp("'self'");
  const headers: Record<string, string> = {
    "Strict-Transport-Security": "max-age=15552000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...(isDocsHost ? {} : { "X-Frame-Options": "DENY" }),
    "Content-Security-Policy": csp,
    ...base,
  };
  return headers;
}
