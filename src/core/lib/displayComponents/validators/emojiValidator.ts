/**
 * Emoji validation and parsing utilities for DisplayComponents
 * Handles Unicode emojis, custom Discord emojis, and emoji IDs
 */

export interface ParsedEmoji {
  type: "unicode" | "custom";
  id?: string;
  name?: string;
  animated?: boolean;
  raw?: string;
}

export interface EmojiValidationResult {
  valid: boolean;
  error?: string;
  emoji?: ParsedEmoji;
}

/**
 * Parse a Discord custom emoji string
 * Format: <:name:id> or <a:name:id> for animated
 */
export function parseCustomEmoji(input: string): ParsedEmoji | null {
  const match = input.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);

  if (!match) {
    return null;
  }

  const [, animated, name, id] = match;

  return {
    type: "custom",
    id,
    name,
    animated: !!animated,
    raw: input,
  };
}

/**
 * Check if string is a Unicode emoji
 * Uses a simple regex check for common emoji ranges
 */
export function isUnicodeEmoji(input: string): boolean {
  // Unicode emoji ranges (simplified)
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u;

  return emojiRegex.test(input);
}

/**
 * Parse any emoji input (custom or Unicode)
 */
export function parseEmoji(input: string): ParsedEmoji | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Try to parse as custom emoji first
  const customEmoji = parseCustomEmoji(trimmed);
  if (customEmoji) {
    return customEmoji;
  }

  // Check if it's a Unicode emoji
  if (isUnicodeEmoji(trimmed)) {
    return {
      type: "unicode",
      raw: trimmed,
      name: trimmed,
    };
  }

  return null;
}

/**
 * Validate emoji input
 */
export function validateEmoji(input: string): EmojiValidationResult {
  const trimmed = input.trim();

  // Empty is valid (optional)
  if (!trimmed) {
    return { valid: true };
  }

  const parsed = parseEmoji(trimmed);

  if (!parsed) {
    return {
      valid: false,
      error:
        "Emoji inválido. Usa un emoji Unicode (😀) o un emoji de Discord (<:name:id>)",
    };
  }

  return {
    valid: true,
    emoji: parsed,
  };
}

/**
 * Extract emoji ID from custom emoji (for API calls)
 */
export function extractEmojiId(input: string): string | null {
  const parsed = parseCustomEmoji(input);
  return parsed?.id || null;
}

/**
 * Format emoji for Discord API
 * Returns the proper format for reactions/buttons
 */
export function formatEmojiForApi(emoji: ParsedEmoji): any {
  if (emoji.type === "unicode") {
    return {
      name: emoji.raw,
    };
  }

  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
  };
}

/**
 * Create a custom emoji string from parts
 */
export function createCustomEmojiString(params: {
  name: string;
  id: string;
  animated?: boolean;
}): string {
  const prefix = params.animated ? "<a:" : "<:";
  return `${prefix}${params.name}:${params.id}>`;
}
