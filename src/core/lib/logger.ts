import pino from "pino";

// Detecta si el proceso está compilado (pkg o Bun)
const isCompiled =
  // @ts-expect-error
  !!process.pkg ||
  !!process.env.BUN_COMPILED ||
  process.execPath.includes("bun");

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: undefined, // ❌ Sin pino-pretty, logs planos JSON
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
