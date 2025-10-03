import logger from "./logger";
import * as fs from "node:fs";
import * as path from "node:path";
import { Collection } from "discord.js";
import type { Button, Modal, SelectMenu, ContextMenu } from "../types/components";

export const buttons: Collection<string, Button> = new Collection<string, Button>();
export const modals: Collection<string, Modal> = new Collection<string, Modal>();
export const selectmenus: Collection<string, SelectMenu> = new Collection<string, SelectMenu>();
export const contextmenus: Collection<string, ContextMenu> = new Collection<string, ContextMenu>();

export function loadComponents(dir: string = path.resolve(__dirname, "../../components")) {
    // Evitar fallo si el directorio no existe en el entorno
    if (!fs.existsSync(dir)) {
        logger.warn(`⚠️ Directorio de componentes no encontrado: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadComponents(fullPath); // recursivo
            continue;
        }

        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        if (file.endsWith('.d.ts')) continue;

        try {
            const imported = require(fullPath);
            const component = imported.default ?? imported;

            if (!component?.customId) {
                logger.warn(`⚠️ Archivo ignorado: ${file} (no tiene "customId")`);
                continue;
            }

            // Detectamos el tipo según la carpeta en la que está
            if (fullPath.includes("buttons")) {
                buttons.set(component.customId, component as Button);
                logger.info(`🔘 Botón cargado: ${component.customId}`);
            } else if (fullPath.includes("modals")) {
                modals.set(component.customId, component as Modal);
                logger.info(`📄 Modal cargado: ${component.customId}`);
            } else if (fullPath.includes("selectmenus")) {
                selectmenus.set(component.customId, component as SelectMenu);
                logger.info(`📜 SelectMenu cargado: ${component.customId}`);
            } else if (fullPath.includes("contextmenu")) {
                contextmenus.set(component.customId, component as ContextMenu);
                logger.info(`📑 ContextMenu cargado: ${component.customId}`);
            } else {
                logger.info(`⚠️ Componente desconocido: ${component.customId}`);
            }
        } catch (error) {
            // @ts-ignore
            logger.error(`❌ Error cargando componente ${file}:`, error);
        }
    }
}
