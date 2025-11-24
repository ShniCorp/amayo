/**
 * DisplayComponents Library - Main Index
 * Central export point for all DisplayComponents utilities
 */

// Export validators
export * from "./validators";

// Export builders
export * from "./builders";

// Constants
export const DISPLAY_COMPONENT_CONSTANTS = {
  // Discord limits
  MAX_COMPONENTS: 10,
  MAX_EMBED_TITLE: 256,
  MAX_EMBED_DESCRIPTION: 4096,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_TOTAL: 6000,

  // Custom constants
  DEFAULT_COLOR: 0x5865f2, // Discord blurple
  TIMEOUT_EDITOR: 3600000, // 1 hour
  TIMEOUT_SHORT: 60000, // 1 minute
  TIMEOUT_MODAL: 300000, // 5 minutes
} as const;
