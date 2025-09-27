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

            console.log(`✅ Preparado para registrar (guild): ${cmd.name}`);
        }
    }

    try {
        console.log(`🧹 Limpiando comandos antiguos/residuales (guild)...`);

        // Primero eliminamos TODOS los comandos existentes
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] } // Array vacío elimina todos los comandos
        );

        console.log(`✅ Comandos antiguos de guild eliminados.`);
        // Pequeña pausa para asegurar que Discord procese la eliminación
        await new Promise(r => setTimeout(r, 1000));

        console.log(`🚀 Registrando ${commandsToRegister.length} comandos slash nuevos (guild)...`);

        // Ahora registramos los comandos actuales
        const data: any = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: commandsToRegister }
        );

        console.log(`✅ ${data.length} comandos de guild registrados.`);
    } catch (error) {
        console.error("❌ Error en el proceso de comandos de guild:", error);
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
            console.log(`🌍 Preparado para registrar global: ${cmd.name}`);
        }
    }
    try {
        console.log(`🧹 Limpiando comandos globales existentes...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: [] }
        );
        console.log(`✅ Comandos globales previos eliminados.`);
        await new Promise(r => setTimeout(r, 1500));
        console.log(`🚀 Registrando ${commandsToRegister.length} comandos globales... (propagación puede tardar hasta 1h)`);
        const data: any = await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: commandsToRegister }
        );
        console.log(`✅ ${data.length} comandos globales enviados a la API.`);
    } catch (error) {
        console.error("❌ Error registrando comandos globales:", error);
    }
}

export async function clearAllCommands(): Promise<void> {
    try {
        console.log(`🧹 Eliminando TODOS los comandos slash (guild)...`);
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] }
        );
        console.log(`✅ Todos los comandos de guild eliminados.`);
    } catch (error) {
        console.error("❌ Error eliminando comandos de guild:", error);
    }
}

export async function clearGlobalCommands(): Promise<void> {
    try {
        console.log(`🌍 Eliminando comandos globales...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: [] }
        );
        console.log(`✅ Comandos globales eliminados.`);
    } catch (error) {
        console.error("❌ Error eliminando comandos globales:", error);
    }
}
