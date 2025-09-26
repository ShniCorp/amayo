import * as fs from "node:fs";
import * as path from "node:path";
import { Collection } from "discord.js";
import type { Button, Modal, SelectMenu, ContextMenu } from "./types/components";

export const buttons: Collection<string, Button> = new Collection<string, Button>();
export const modals: Collection<string, Modal> = new Collection<string, Modal>();
export const selectmenus: Collection<string, SelectMenu> = new Collection<string, SelectMenu>();
export const contextmenus: Collection<string, ContextMenu> = new Collection<string, ContextMenu>();

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

        try {
            const imported = require(fullPath);
            const component = imported.default ?? imported;

            if (!component?.customId) {
                console.warn(`⚠️ Archivo ignorado: ${file} (no tiene "customId")`);
                continue;
            }

            // Detectamos el tipo según la carpeta en la que está
            if (fullPath.includes("buttons")) {
                buttons.set(component.customId, component as Button);
                console.log(`🔘 Botón cargado: ${component.customId}`);
            } else if (fullPath.includes("modals")) {
                modals.set(component.customId, component as Modal);
                console.log(`📄 Modal cargado: ${component.customId}`);
            } else if (fullPath.includes("selectmenus")) {
                selectmenus.set(component.customId, component as SelectMenu);
                console.log(`📜 SelectMenu cargado: ${component.customId}`);
            } else if (fullPath.includes("contextmenu")) {
                contextmenus.set(component.customId, component as ContextMenu);
                console.log(`📑 ContextMenu cargado: ${component.customId}`);
            } else {
                console.log(`⚠️ Componente desconocido: ${component.customId}`);
            }
        } catch (error) {
            console.error(`❌ Error cargando componente ${file}:`, error);
        }
    }
}
