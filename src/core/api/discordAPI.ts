import logger from "../lib/logger";
import { REST } from "discord.js";
// @ts-ignore
import { Routes } from "discord-api-types/v10";
import { commands } from "../loaders/loader";

// Reutilizamos una instancia REST singleton
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN ?? "");

export async function registeringCommands(): Promise<void> {
    const commandsToRegister: any[] = [];

    // Recorremos la Collection que ya cargó loadCommands()
    for (const [_name, cmd] of commands) {
        if (cmd.type === "slash") {
            commandsToRegister.push({
                name: cmd.name,
                description: cmd.description ?? "Sin descripción",
                type: 1, // CHAT_INPUT
                options: cmd.options ?? []
            });

            logger.info(`✅ Preparado para registrar (guild): ${cmd.name}`);
        }
    }

    try {
        logger.info(`🧹 Limpiando comandos antiguos/residuales (guild)...`);

        // Primero eliminamos TODOS los comandos existentes
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] } // Array vacío elimina todos los comandos
        );

        logger.info(`✅ Comandos antiguos de guild eliminados.`);
        // Pequeña pausa para asegurar que Discord procese la eliminación
        await new Promise(r => setTimeout(r, 1000));

        logger.info(`🚀 Registrando ${commandsToRegister.length} comandos slash nuevos (guild)...`);

        // Ahora registramos los comandos actuales
        const data: any = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: commandsToRegister }
        );

        logger.info(`✅ ${data.length} comandos de guild registrados.`);
    } catch (error) {
        // @ts-ignore
        logger.error("❌ Error en el proceso de comandos de guild:", error);
    }
}

export async function registeringGlobalCommands(): Promise<void> {
    const commandsToRegister: any[] = [];
    for (const [_name, cmd] of commands) {
        if (cmd.type === "slash") {
            commandsToRegister.push({
                name: cmd.name,
                description: cmd.description ?? "Sin descripción",
                type: 1,
                options: cmd.options ?? []
            });
            logger.info(`🌍 Preparado para registrar global: ${cmd.name}`);
        }
    }
    try {
        logger.info(`🧹 Limpiando comandos globales existentes...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: [] }
        );
        logger.info(`✅ Comandos globales previos eliminados.`);
        await new Promise(r => setTimeout(r, 1500));
        logger.info(`🚀 Registrando ${commandsToRegister.length} comandos globales... (propagación puede tardar hasta 1h)`);
        const data: any = await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: commandsToRegister }
        );
        logger.info(`✅ ${data.length} comandos globales enviados a la API.`);
    } catch (error) {
        // @ts-ignore
        logger.error("❌ Error registrando comandos globales:", error);
    }
}

export async function clearAllCommands(): Promise<void> {
    try {
        logger.info(`🧹 Eliminando TODOS los comandos slash (guild)...`);
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] }
        );
        logger.info(`✅ Todos los comandos de guild eliminados.`);
    } catch (error) {
        // @ts-ignore
        logger.error("❌ Error eliminando comandos de guild:", error);
    }
}

export async function clearGlobalCommands(): Promise<void> {
    try {
        logger.info(`🌍 Eliminando comandos globales...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: [] }
        );
        logger.info(`✅ Comandos globales eliminados.`);
    } catch (error) {
        // @ts-ignore
        logger.error("❌ Error eliminando comandos globales:", error);
    }
}
