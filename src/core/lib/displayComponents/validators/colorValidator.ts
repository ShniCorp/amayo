/**
 * Color validation and parsing utilities for DisplayComponents
 * Supports hex colors, named colors, and RGB values
 */

export interface ColorValidationResult {
  valid: boolean;
  error?: string;
  hex?: string;
  decimal?: number;
}

// Common named colors with their hex values
const NAMED_COLORS: Record<string, string> = {
  // Discord branding
  blurple: "#5865F2",
  green: "#57F287",
  yellow: "#FEE75C",
  fuchsia: "#EB459E",
  red: "#ED4245",

  // Basic colors
  white: "#FFFFFF",
  black: "#000000",
  gray: "#99AAB5",
  grey: "#99AAB5",

  // Extended palette
  blue: "#3498DB",
  orange: "#E67E22",
  purple: "#9B59B6",
  pink: "#E91E63",
  cyan: "#1ABC9C",
  lime: "#8BC34A",
  amber: "#FFC107",
  brown: "#795548",
};

/**
 * Parse hex color to decimal (for Discord embed colors)
 */
export function hexToDecimal(hex: string): number {
  const cleaned = hex.replace("#", "");
  return parseInt(cleaned, 16);
}

/**
 * Convert decimal to hex string
 */
export function decimalToHex(decimal: number): string {
  return "#" + decimal.toString(16).toUpperCase().padStart(6, "0");
}

/**
 * Validate and normalize a color input
 * Accepts: hex (#FF5733), named colors (red, blurple), or decimal (16733299)
 */
export function validateColor(input: string): ColorValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: true }; // Empty is valid (use default)
  }

  // Check if it's a named color
  const lowerInput = trimmed.toLowerCase();
  if (NAMED_COLORS[lowerInput]) {
    const hex = NAMED_COLORS[lowerInput];
    return {
      valid: true,
      hex,
      decimal: hexToDecimal(hex),
    };
  }

  // Check if it's a decimal number
  if (/^\d+$/.test(trimmed)) {
    const decimal = parseInt(trimmed, 10);

    // Discord color range: 0 to 16777215 (0xFFFFFF)
    if (decimal < 0 || decimal > 16777215) {
      return {
        valid: false,
        error: "Color decimal debe estar entre 0 y 16777215",
      };
    }

    return {
      valid: true,
      hex: decimalToHex(decimal),
      decimal,
    };
  }

  // Check if it's a hex color
  const hexMatch = trimmed.match(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  if (hexMatch) {
    let hex = hexMatch[1];

    // Expand 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }

    const fullHex = "#" + hex.toUpperCase();

    return {
      valid: true,
      hex: fullHex,
      decimal: hexToDecimal(fullHex),
    };
  }

  // Check if it's RGB format: rgb(255, 87, 51)
  const rgbMatch = trimmed.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const rNum = parseInt(r, 10);
    const gNum = parseInt(g, 10);
    const bNum = parseInt(b, 10);

    // Validate RGB ranges
    if (rNum > 255 || gNum > 255 || bNum > 255) {
      return {
        valid: false,
        error: "Los valores RGB deben estar entre 0 y 255",
      };
    }

    const hex =
      "#" +
      rNum.toString(16).padStart(2, "0") +
      gNum.toString(16).padStart(2, "0") +
      bNum.toString(16).padStart(2, "0");

    return {
      valid: true,
      hex: hex.toUpperCase(),
      decimal: hexToDecimal(hex),
    };
  }

  return {
    valid: false,
    error: `Color inválido. Usa hex (#FF5733), nombre (red, blurple), decimal (16733299), o RGB (rgb(255,87,51))`,
  };
}

/**
 * Get a list of all available named colors (for help messages)
 */
export function getNamedColorList(): string[] {
  return Object.keys(NAMED_COLORS);
}

/**
 * Generate a random color (for fun features)
 */
export function getRandomColor(): ColorValidationResult {
  const decimal = Math.floor(Math.random() * 16777216);
  return {
    valid: true,
    hex: decimalToHex(decimal),
    decimal,
  };
}
