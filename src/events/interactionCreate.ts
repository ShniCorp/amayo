import { bot } from "../main";
import type { BaseInteraction } from "discord.js";
import { Events } from "discord.js";
import { redis } from "../core/database/redis";
import { commands } from "../core/loaders/loader";
import { buttons, modals, selectmenus } from "../core/lib/components";
import logger from "../core/lib/logger";

bot.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
    try {
        // 🔹 Slash commands
        if (interaction.isChatInputCommand()) {
            const cmd = commands.get(interaction.commandName);
            if (!cmd) return;

            const cooldown = Math.floor(Number(cmd.cooldown) || 0);

            if (cooldown > 0) {
                const key = `cooldown:${cmd.name}:${interaction.user.id}`;
                const ttl = await redis.ttl(key);
                if (ttl > 0) {
                    return interaction.reply(`⏳ Espera ${ttl}s antes de volver a usar **${cmd.name}**.`);
                }
                await redis.set(key, "1", { EX: cooldown });
            }

            await cmd.run(interaction, bot);
        }

        // 🔹 Botones
        if (interaction.isButton()) {
            //@ts-ignore
            const btn = buttons.get(interaction.customId);
            if (btn) await btn.run(interaction, bot);
        }

        // 🔹 Select menus
        if (interaction.isStringSelectMenu()) {
            const menu = selectmenus.get(interaction.customId);
            if (menu) await menu.run(interaction, bot);
        }

        // 🔹 Modales
        if (interaction.isModalSubmit()) {
            // Primero intentar búsqueda exacta
            let modal = modals.get(interaction.customId);

            // Si no se encuentra, intentar búsqueda por prefijo (para modales dinámicos)
            if (!modal) {
                const prefix = interaction.customId.split(':')[0];
                modal = modals.get(prefix);
            }

            if (modal) await modal.run(interaction, bot);
        }
    } catch (error) {
        logger.error({ err: error }, "Error ejecutando interacción");
        if (interaction.isRepliable()) {
            // @ts-ignore
            await interaction.reply({ content: "❌ Hubo un error ejecutando la interacción.", ephemeral: true });
        }
    }
});
