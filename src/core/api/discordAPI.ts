import { REST } from "discord.js";
// @ts-ignore
import { Routes } from "discord-api-types/v10";
import { commands } from "../loader";

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

    const rest = new REST().setToken(process.env.TOKEN ?? "");

    try {
        console.log(`🚀 Registrando ${commandsToRegister.length} comandos slash...`);

        const data: any = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT!,
                process.env.guildTest!
            ),
            { body: commandsToRegister }
        );

        console.log(`✅ ${data.length} comandos registrados correctamente.`);
    } catch (error) {
        console.error("❌ Error registrando comandos:", error);
    }
}

