/**
 * URL Validation utilities for DisplayComponents
 * Validates URLs, image URLs, and supports variable placeholders
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

const ALLOWED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
];
const MAX_URL_LENGTH = 2048;

/**
 * Check if a string is a variable placeholder (e.g., {variable_name})
 */
export function isVariable(input: string): boolean {
  return /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(input.trim());
}

/**
 * Validate a general URL
 * Accepts actual URLs or variable placeholders
 */
export function validateUrl(url: string): UrlValidationResult {
  const trimmed = url.trim();

  // Empty URLs are valid (optional fields)
  if (!trimmed) {
    return { valid: true };
  }

  // Variables are always valid
  if (isVariable(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  // Check length
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL demasiado larga (máximo ${MAX_URL_LENGTH} caracteres)`,
    };
  }

  // Must start with http:// or https://
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return {
      valid: false,
      error: "La URL debe comenzar con http:// o https://",
    };
  }

  // Try to parse as URL
  try {
    const parsed = new URL(trimmed);

    // Additional validation
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return {
        valid: false,
        error: "URL inválida: dominio no válido",
      };
    }

    return { valid: true, normalized: trimmed };
  } catch (error) {
    return {
      valid: false,
      error: "Formato de URL inválido",
    };
  }
}

/**
 * Validate an image URL
 * Checks for valid URL format and image extension
 */
export function validateImageUrl(url: string): UrlValidationResult {
  const trimmed = url.trim();

  // Empty is valid (optional)
  if (!trimmed) {
    return { valid: true };
  }

  // Variables are valid
  if (isVariable(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  // First validate as general URL
  const urlResult = validateUrl(trimmed);
  if (!urlResult.valid) {
    return urlResult;
  }

  // Check for image extension
  const lowerUrl = trimmed.toLowerCase();
  const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
    lowerUrl.includes(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `La URL debe apuntar a una imagen (${ALLOWED_IMAGE_EXTENSIONS.join(
        ", "
      )})`,
    };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Validate that URL is HTTPS (required for Discord embeds)
 */
export function validateHttpsUrl(url: string): UrlValidationResult {
  const trimmed = url.trim();

  if (!trimmed || isVariable(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  if (!trimmed.startsWith("https://")) {
    return {
      valid: false,
      error: "Discord requiere URLs HTTPS (no HTTP)",
    };
  }

  return validateUrl(trimmed);
}

/**
 * Check if URL is actually accessible (async validation)
 * Used for image URLs to ensure they load
 */
export async function checkUrlAccessible(url: string): Promise<boolean> {
  // Skip check for variables
  if (isVariable(url)) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DiscordBot/1.0)",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch {
    return false;
  }
}
