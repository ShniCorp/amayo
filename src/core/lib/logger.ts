import pino from "pino";

// Detecta si el proceso está compilado (pkg o Bun)
const isCompiled =
  // @ts-expect-error pkg no existe en los tipos de Node, pero puede estar en runtime
  !!process.pkg ||
  !!process.env.BUN_COMPILED ||
  process.execPath.includes("bun");

// Solo usa pino-pretty en desarrollo y cuando no está compilado
const usePretty = process.env.NODE_ENV !== "production" && !isCompiled;

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: usePretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
