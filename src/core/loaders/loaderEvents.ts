import { bot } from "../../main";
import path from "node:path";
import * as fs from "node:fs";
import logger from "../lib/logger";

export function loadEvents(dir: string = path.resolve(__dirname, "../../events")) {
    // Evitar fallo si el directorio no existe
    if (!fs.existsSync(dir)) {
        logger.warn(`⚠️ Directorio de eventos no encontrado: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadEvents(fullPath); // recursión para subcarpetas
            continue;
        }

        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

        const imported = require(fullPath);
        const event = imported.default ?? imported;

        if (!event?.name || !event?.execute) continue;

        if (event.once) {
            bot.once(event.name, (...args: any[]) => event.execute(...args));
        } else {
            bot.on(event.name, (...args: any[]) => event.execute(...args));
        }

        logger.info(`Evento cargado: ${event.name}`);
    }
}
