import * as fs from "node:fs";
import path from "node:path";
import { Collection } from "discord.js";

export const commands = new Collection<string, any>();

export function loadCommands(dir: string = path.resolve(__dirname, "../../commands")) {
    // Evitar fallo si el directorio no existe en el entorno
    if (!fs.existsSync(dir)) {
        console.warn(`⚠️ Directorio de comandos no encontrado: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadCommands(fullPath); // recursivo
            continue;
        }

        if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
        if (file.endsWith('.d.ts')) continue;

        const imported = require(fullPath);
        const command = imported.command ?? imported.default ?? imported;

        if (!command?.data?.name && !command?.name) {
            console.warn(`⚠️ Archivo ignorado: ${file} (no es un comando válido)`);
            continue;
        }

        const name = command.data?.name ?? command.name;
        console.log(`📦 Loading command: ${name}`);

        // @ts-ignore
        commands.set(name, command);

        if (command.aliases?.length) {
            for (const alias of command.aliases) {
                commands.set(alias, command);
            }
        }

        console.log(`✅ Cargado comando: ${name}`);
    }
}
