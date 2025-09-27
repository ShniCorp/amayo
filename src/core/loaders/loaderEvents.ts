import { bot } from "../../main";
import path from "node:path";
import * as fs from "node:fs";

export function loadEvents(dir: string = path.join(__dirname, "../events")) {
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

        console.log(`Evento cargado: ${event.name}`);
    }
}
