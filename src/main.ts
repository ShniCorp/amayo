import Amayo from "./core/client";
import { loadCommands } from "./core/loader";
import { loadEvents } from "./core/loaderEvents";
import { redisConnect } from "./core/redis";
import { registeringCommands } from "./core/api/discordAPI";
import {loadComponents} from "./core/components";

export const bot = new Amayo();

async function bootstrap() {
    console.log("🚀 Iniciando bot...");

    loadCommands(); // 1️⃣ Cargar comandos en la Collection
    loadComponents()
    loadEvents();   // 2️⃣ Cargar eventos

    await registeringCommands(); // 3️⃣ Registrar los slash en Discord

    await redisConnect(); // 4️⃣ Conectar Redis

    await bot.play();
    console.log("✅ Bot conectado a Discord");
}

bootstrap().catch((err) => {
    console.error("❌ Error en el arranque:", err);
    process.exit(1);
});
