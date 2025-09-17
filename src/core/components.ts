import * as fs from "node:fs";
import * as path from "node:path";
import { Collection } from "discord.js";

export const buttons: Collection<string, any> = new Collection<string, any>();
export const modals = new Collection<string, any>();
export const selectmenus = new Collection<string, any>();
export const contextmenus = new Collection<string, any>();

export function loadComponents(dir: string = path.join(__dirname, "..", "components")) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadComponents(fullPath); // recursivo
            continue;
        }

        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

        const imported = require(fullPath);
        const component = imported.default ?? imported;

        if (!component?.customId) {
            console.warn(`⚠️ Archivo ignorado: ${file} (no tiene "customId")`);
            continue;
        }

        // Detectamos el tipo según la carpeta en la que está
        if (fullPath.includes("buttons")) {
            buttons.set(component.customId, component);
            console.log(`🔘 Botón cargado: ${component.customId}`);
        } else if (fullPath.includes("modals")) {
            modals.set(component.customId, component);
            console.log(`📄 Modal cargado: ${component.customId}`);
        } else if (fullPath.includes("selectmenus")) {
            selectmenus.set(component.customId, component);
            console.log(`📜 SelectMenu cargado: ${component.customId}`);
        } else if (fullPath.includes("contextmenu")) {
            contextmenus.set(component.customId, component);
            console.log(`📑 ContextMenu cargado: ${component.customId}`);
        } else {
            console.log(`⚠️ Componente desconocido: ${component.customId}`);
        }
    }
}
