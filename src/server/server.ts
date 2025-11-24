import { createServer } from "node:http";
import { handler } from "./handler";

// Servidor API para api.amayo.dev
// Este servidor se inicia desde main.ts con el bot
// En producción debe correr en el puerto configurado (default 3000)
const PORT = parseInt(process.env.API_PORT || process.env.PORT || "3000", 10);
const HOST = process.env.API_HOST || "0.0.0.0";

export const server = createServer((req, res) => handler(req, res));

// Iniciar servidor solo si este archivo se ejecuta directamente (modo standalone)
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`🚀 API Server running on http://${HOST}:${PORT}`);
    console.log(`🌐 Production URL: https://api.amayo.dev`);
    console.log(`📝 Frontend URL: https://docs.amayo.dev`);
  });
}
