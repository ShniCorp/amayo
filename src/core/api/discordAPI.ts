import { REST } from "discord.js";
// @ts-ignore
import { Routes } from "discord-api-types/v10";
import { commands } from "../loader";

// Reutilizamos una instancia REST singleton
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN ?? "");

export async function registeringCommands(): Promise<void> {
    const commandsToRegister: any[] = [];

    // Recorremos la Collection que ya cargó loadCommands()
    for (const [name, cmd] of commands) {
        if (cmd.type === "slash") {
            commandsToRegister.push({
                name: cmd.name,
                description: cmd.description ?? "Sin descripción",
                type: 1, // CHAT_INPUT
                options: cmd.options ?? []
            });

            console.log(`✅ Preparado para registrar: ${cmd.name}`);
        }
    }

    try {
        console.log(`🧹 Limpiando comandos antiguos/residuales...`);

        // Primero eliminamos TODOS los comandos existentes
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] } // Array vacío elimina todos los comandos
        );

        console.log(`✅ Comandos antiguos eliminados correctamente.`);

        // Pequeña pausa para asegurar que Discord procese la eliminación
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`🚀 Registrando ${commandsToRegister.length} comandos slash nuevos...`);

        // Ahora registramos los comandos actuales
        const data: any = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: commandsToRegister }
        );

        console.log(`✅ ${data.length} comandos registrados correctamente.`);
        console.log(`🎉 Proceso completado: comandos antiguos limpiados y nuevos registrados.`);
    } catch (error) {
        console.error("❌ Error en el proceso de comandos:", error);
    }
}

/**
 * Función específica para eliminar TODOS los comandos slash (útil para limpieza)
 */
export async function clearAllCommands(): Promise<void> {
    try {
        console.log(`🧹 Eliminando TODOS los comandos slash...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: [] }
        );

        console.log(`✅ Todos los comandos han sido eliminados correctamente.`);
    } catch (error) {
        console.error("❌ Error eliminando comandos:", error);
    }
}

/**
 * Función para limpiar comandos globales (si los hay)
 */
export async function clearGlobalCommands(): Promise<void> {
    try {
        console.log(`🌍 Eliminando comandos globales...`);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT!),
            { body: [] }
        );

        console.log(`✅ Comandos globales eliminados correctamente.`);
    } catch (error) {
        console.error("❌ Error eliminando comandos globales:", error);
    }
}

