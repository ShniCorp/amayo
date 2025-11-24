/**
 * Text validation utilities for DisplayComponents
 * Handles length validation, content sanitization, and format checking
 */

export interface TextValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
  length?: number;
}

/**
 * Validate text length is within bounds
 */
export function validateTextLength(
  text: string,
  min: number = 0,
  max: number = Infinity
): TextValidationResult {
  const trimmed = text.trim();
  const length = trimmed.length;

  if (length < min) {
    return {
      valid: false,
      error: `El texto debe tener al menos ${min} caracteres`,
      length,
    };
  }

  if (length > max) {
    return {
      valid: false,
      error: `El texto no puede exceder ${max} caracteres (actualmente: ${length})`,
      length,
    };
  }

  return {
    valid: true,
    sanitized: trimmed,
    length,
  };
}

/**
 * Discord embed limits (for reference and validation)
 */
export const DISCORD_LIMITS = {
  EMBED_TITLE: 256,
  EMBED_DESCRIPTION: 4096,
  EMBED_FIELD_NAME: 256,
  EMBED_FIELD_VALUE: 1024,
  EMBED_FOOTER: 2048,
  EMBED_AUTHOR: 256,
  EMBED_FIELDS_TOTAL: 25,
  EMBED_TOTAL: 6000, // Total characters across all fields

  // Modal limits
  MODAL_TITLE: 45,
  TEXT_INPUT_LABEL: 45,
  TEXT_INPUT_PLACEHOLDER: 100,
  TEXT_INPUT_SHORT: 4000,
  TEXT_INPUT_PARAGRAPH: 4000,

  // Button limits
  BUTTON_LABEL: 80,
  BUTTON_CUSTOM_ID: 100,
};

/**
 * Validate text for embed title
 */
export function validateEmbedTitle(text: string): TextValidationResult {
  return validateTextLength(text, 1, DISCORD_LIMITS.EMBED_TITLE);
}

/**
 * Validate text for embed description
 */
export function validateEmbedDescription(text: string): TextValidationResult {
  return validateTextLength(text, 0, DISCORD_LIMITS.EMBED_DESCRIPTION);
}

/**
 * Validate text for embed field
 */
export function validateEmbedField(
  name: string,
  value: string
): { name: TextValidationResult; value: TextValidationResult } {
  return {
    name: validateTextLength(name, 1, DISCORD_LIMITS.EMBED_FIELD_NAME),
    value: validateTextLength(value, 1, DISCORD_LIMITS.EMBED_FIELD_VALUE),
  };
}

/**
 * Validate text for button label
 */
export function validateButtonLabel(text: string): TextValidationResult {
  return validateTextLength(text, 1, DISCORD_LIMITS.BUTTON_LABEL);
}

/**
 * Sanitize text by removing excessive whitespace
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Check if text contains forbidden characters or patterns
 */
export function containsForbiddenContent(text: string): boolean {
  // Check for zero-width characters that could be used for abuse
  const zeroWidthChars = /[\u200B-\u200D\uFEFF]/;

  // Check for excessive special characters
  const excessiveSpecialChars = /[^\w\s]{10,}/;

  return zeroWidthChars.test(text) || excessiveSpecialChars.test(text);
}

/**
 * Validate and sanitize general text input
 */
export function validateText(
  text: string,
  options: {
    min?: number;
    max?: number;
    allowEmpty?: boolean;
    sanitize?: boolean;
  } = {}
): TextValidationResult {
  const {
    min = 0,
    max = Infinity,
    allowEmpty = false,
    sanitize: shouldSanitize = true,
  } = options;

  let processed = text;

  if (shouldSanitize) {
    processed = sanitizeText(text);
  }

  if (!allowEmpty && !processed) {
    return {
      valid: false,
      error: "El texto no puede estar vacío",
    };
  }

  if (containsForbiddenContent(processed)) {
    return {
      valid: false,
      error: "El texto contiene caracteres no permitidos",
    };
  }

  return validateTextLength(processed, min, max);
}
