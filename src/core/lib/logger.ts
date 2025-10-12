import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pino from "pino";

// 🩹 Extender el tipo global de process para evitar error de TS
declare global {
  namespace NodeJS {
    interface Process {
      pkg?: any;
      BUN_COMPILED?: boolean;
    }
  }
}

// 🔹 Cargar .env manualmente si existe
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ .env cargado desde", envPath);
} else {
  console.warn("⚠️ No se encontró archivo .env, usando variables del entorno");
}

// 🔹 Detectar si está compilado con Bun o pkg
const isCompiled = !!process.pkg || !!process.env.BUN_COMPILED;

// 🔹 Configurar transporte solo si NO estamos en producción y NO es compilado
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
    level: (label) => ({ level: label }),
  },
});

export default logger;
