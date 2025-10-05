import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";
import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import { aiService } from "../../../core/services/AIService";

function toStringArray(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return (input as unknown[]).filter((v): v is string => typeof v === 'string');
}

export const command: CommandMessage = {
    name: 'configuracion',
    type: "message",
    aliases: ['config', 'ajustes', 'settings'],
    cooldown: 5,
    description: 'Abre el panel de configuración del servidor (prefix, staff y más).',
    category: 'Configuración',
    usage: 'configuracion',
    run: async (message, args, client) => {
        const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
        if (!allowed) {
            await message.reply("❌ No tienes permisos de ManageGuild ni rol de staff.");
            return;
        }

        const server = await client.prisma.guild.findFirst({
            where: { id: message.guild!.id }
        });

        const currentPrefix = server?.prefix || "!";
        const staffRoles: string[] = toStringArray(server?.staff);
        const staffDisplay = staffRoles.length
            ? staffRoles.map((id) => `<@&${id}>`).join(', ')
            : 'Sin staff configurado';
        const aiRolePrompt = server?.aiRolePrompt ?? null;
        const aiPreview = aiRolePrompt ? (aiRolePrompt.length > 80 ? aiRolePrompt.slice(0, 77) + '…' : aiRolePrompt) : 'No configurado';

        // Panel de configuración usando DisplayComponents
        const settingsPanel = {
            type: 17,
            accent_color: 6178018, // Color del ejemplo
            components: [
                { type: 10, content: "### <:invisible:1418684224441028608> 梅，panel admin，📢\n" },
                { type: 14, spacing: 1, divider: false },
                { type: 10, content: "Configuracion del Servidor:" },
                {
                    type: 9,
                    components: [ { type: 10, content: `**Prefix:**<:invisible:1418684224441028608>\`${currentPrefix}\`` } ],
                    accessory: {
                        type: 2,
                        style: 2,
                        emoji: { name: "⚙️" },
                        custom_id: "open_prefix_modal",
                        label: "Cambiar"
                    }
                },
                { type: 14, divider: false },
                {
                    type: 9,
                    components: [ { type: 10, content: `**Staff (roles):** ${staffDisplay}` } ],
                    accessory: {
                        type: 2,
                        style: 2, // Secondary
                        emoji: { name: "🛡️" },
                        custom_id: "open_staff_modal",
                        label: "Configurar"
                    }
                },
                { type: 14, divider: false },
                {
                    type: 9,
                    components: [ { type: 10, content: `**AI Role Prompt:** ${aiPreview}` } ],
                    accessory: {
                        type: 2,
                        style: 2,
                        emoji: { name: "🧠" },
                        custom_id: "open_ai_role_modal",
                        label: "Configurar"
                    }
                },
                { type: 14, divider: false }
            ]
        };

        const panelMessage = await message.reply({
            flags: 32768, // Components v2
            components: [settingsPanel]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 300000, // 5 minutos
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            if (interaction.customId === "open_prefix_modal") {
                // Crear y mostrar modal para cambiar prefix (formato consistente con otros modales)
                const prefixModal = {
                    title: "⚙️ Configurar Prefix del Servidor",
                    customId: "prefix_settings_modal",
                    components: [
                        {
                            type: ComponentType.Label,
                            label: "Nuevo Prefix",
                            component: {
                                type: ComponentType.TextInput,
                                customId: "new_prefix_input",
                                style: TextInputStyle.Short,
                                placeholder: `Prefix actual: ${currentPrefix}`,
                                required: true,
                                maxLength: 10,
                                minLength: 1,
                                value: currentPrefix
                            }
                        },
                        {
                            type: ComponentType.Label,
                            label: "Motivo (opcional)",
                            component: {
                                type: ComponentType.TextInput,
                                customId: "prefix_description",
                                style: TextInputStyle.Paragraph,
                                placeholder: "Ej: evitar conflictos con otros bots...",
                                required: false,
                                maxLength: 200
                            }
                        }
                    ]
                } as const;

                try {
                    await interaction.showModal(prefixModal);
                } catch (err) {
                    try { await interaction.reply({ content: '❌ No se pudo abrir el modal de prefix.', flags: 64 }); } catch {}
                    return;
                }

                try {
                    const modalInteraction = await interaction.awaitModalSubmit({
                        time: 300000,
                        filter: (modalInt: any) => modalInt.customId === "prefix_settings_modal" && modalInt.user.id === message.author.id
                    });

                    const newPrefix = modalInteraction.components.getTextInputValue("new_prefix_input");
                    const description = modalInteraction.components.getTextInputValue("prefix_description") || "Sin descripción";

                    if (!newPrefix || newPrefix.length > 10) {
                        await modalInteraction.reply({ content: "❌ **Error:** El prefix debe tener entre 1 y 10 caracteres.", flags: 64 });
                        return;
                    }

                    try {
                        await client.prisma.guild.upsert({
                            where: { id: message.guild!.id },
                            create: { id: message.guild!.id, name: message.guild!.name, prefix: newPrefix },
                            update: { prefix: newPrefix, name: message.guild!.name }
                        });

                        const successPanel = {
                            type: 17,
                            accent_color: 3066993,
                            components: [
                                { type: 10, content: "### ✅ **Prefix Actualizado Exitosamente**" },
                                { type: 14, spacing: 2, divider: true },
                                { type: 9, components: [ { type: 10, content: `**Prefix anterior:** \`${currentPrefix}\`\n**Prefix nuevo:** \`${newPrefix}\`\n\n**Motivo:** ${description}` } ], accessory: { type: 2, style: 3, label: "✓ Listo", custom_id: "prefix_confirmed", emoji: { name: "✅" } } },
                                { type: 14, spacing: 1, divider: false },
                                { type: 10, content: "🚀 **¡Listo!** Ahora puedes usar los comandos con el nuevo prefix.\n\n💡 **Ejemplo:** `" + newPrefix + "help`, `" + newPrefix + "embedlist`" }
                            ]
                        };

                        const backToSettingsRow = { type: 1, components: [ { type: 2, style: 2, label: "↩️ Volver a Configuración", custom_id: "back_to_settings" } ] };

                        await modalInteraction.update({ components: [successPanel, backToSettingsRow] });

                    } catch (error) {
                        const errorPanel = {
                            type: 17,
                            accent_color: 15548997,
                            components: [
                                { type: 10, content: "### ❌ **Error al Actualizar Prefix**" },
                                { type: 14, spacing: 2, divider: true },
                                { type: 10, content: `**Error:** No se pudo actualizar el prefix a \`${newPrefix}\`\n\n**Posibles causas:**\n• Error de conexión con la base de datos\n• Prefix contiene caracteres no válidos\n• Permisos insuficientes\n\n🔄 **Solución:** Intenta nuevamente con un prefix diferente.` }
                            ]
                        };

                        const retryRow = { type: 1, components: [ { type: 2, style: 2, label: "🔄 Reintentar", custom_id: "open_prefix_modal" }, { type: 2, style: 4, label: "❌ Cancelar", custom_id: "cancel_prefix_change" } ] };

                        await modalInteraction.update({ components: [errorPanel, retryRow] });
                    }
                } catch (error: any) {
                    logger.info("Modal timeout o error:", error?.message || String(error));
                }
            }

            if (interaction.customId === "open_staff_modal") {
                // Modal para seleccionar hasta 3 roles de staff
                const staffModal = {
                    title: "🛡️ Configurar Roles de Staff",
                    customId: "staff_roles_modal",
                    components: [
                        { type: ComponentType.Label, label: "Selecciona hasta 3 roles de staff", component: { type: ComponentType.RoleSelect, customId: "staff_roles", required: false, minValues: 0, maxValues: 3, placeholder: "Roles de staff..." } }
                    ]
                } as const;

                await interaction.showModal(staffModal);

                try {
                    const modalInteraction = await interaction.awaitModalSubmit({ time: 300000 });
                    const selected = modalInteraction.components.getSelectedRoles('staff_roles');
                    //@ts-ignore
                    const roleIds: string[] = selected ? Array.from(selected.keys()).slice(0, 3) : [];

                    await client.prisma.guild.upsert({
                        where: { id: message.guild!.id },
                        create: { id: message.guild!.id, name: message.guild!.name, staff: roleIds },
                        update: { staff: roleIds, name: message.guild!.name }
                    });

                    const updatedDisplay = roleIds.length ? roleIds.map((id) => `<@&${id}>`).join(', ') : 'Sin staff configurado';

                    const successPanel = {
                        type: 17,
                        accent_color: 3066993,
                        components: [
                            { type: 10, content: "### ✅ **Staff Actualizado**" },
                            { type: 14, spacing: 2, divider: true },
                            { type: 10, content: `**Nuevos roles de staff:** ${updatedDisplay}` }
                        ]
                    };

                    const backRow = { type: 1, components: [ { type: 2, style: 2, label: '↩️ Volver a Configuración', custom_id: 'back_to_settings' } ] };
                    await modalInteraction.update({ components: [successPanel, backRow] });
                } catch (error) {
                    // timeout o error
                }
            }

            if (interaction.customId === "open_ai_role_modal") {
                const currentServer = await client.prisma.guild.findFirst({ where: { id: message.guild!.id } });
                const currentAiPrompt = currentServer?.aiRolePrompt ?? '';
                const aiModal = {
                    title: "🧠 Configurar AI Role Prompt",
                    customId: "ai_role_prompt_modal",
                    components: [
                        {
                            type: ComponentType.Label,
                            label: "Prompt de rol (opcional)",
                            component: {
                                type: ComponentType.TextInput,
                                customId: "ai_role_prompt_input",
                                style: TextInputStyle.Paragraph,
                                required: false,
                                placeholder: "Ej: Eres un asistente amistoso del servidor, responde en español, evita spoilers...",
                                maxLength: 1500,
                                value: currentAiPrompt.slice(0, 1500)
                            }
                        }
                    ]
                } as const;

                try {
                    await interaction.showModal(aiModal);
                } catch (err) {
                    try { await interaction.reply({ content: '❌ No se pudo abrir el modal de AI.', flags: 64 }); } catch {}
                    return;
                }

                try {
                    const modalInteraction = await interaction.awaitModalSubmit({
                        time: 300000,
                        filter: (m: any) => m.customId === 'ai_role_prompt_modal' && m.user.id === message.author.id
                    });

                    const newPromptRaw = modalInteraction.components.getTextInputValue('ai_role_prompt_input') ?? '';
                    const newPrompt = newPromptRaw.trim();
                    const toSave: string | null = newPrompt.length > 0 ? newPrompt : null;

                    await client.prisma.guild.upsert({
                        where: { id: message.guild!.id },
                        create: { id: message.guild!.id, name: message.guild!.name, aiRolePrompt: toSave },
                        update: { aiRolePrompt: toSave, name: message.guild!.name }
                    });

                    // Invalida el cache del servicio para reflejar cambios al instante
                    aiService.invalidateGuildConfig(message.guild!.id);

                    const preview = toSave ? (toSave.length > 200 ? toSave.slice(0, 197) + '…' : toSave) : 'Prompt eliminado (sin configuración)';

                    const successPanel = {
                        type: 17,
                        accent_color: 3066993,
                        components: [
                            { type: 10, content: "### ✅ **AI Role Prompt Actualizado**" },
                            { type: 14, spacing: 2, divider: true },
                            { type: 10, content: `**Nuevo valor:**\n${preview}` }
                        ]
                    };
                    const backRow = { type: 1, components: [ { type: 2, style: 2, label: '↩️ Volver a Configuración', custom_id: 'back_to_settings' } ] };

                    await modalInteraction.update({ components: [successPanel, backRow] });
                } catch (e) {
                    // timeout o cancelado
                }
            }

            // Manejar botones adicionales
            if (interaction.customId === "back_to_settings") {
                const updatedServer = await client.prisma.guild.findFirst({ where: { id: message.guild!.id } });
                const newCurrentPrefix = updatedServer?.prefix || "!";
                const staffRoles2: string[] = toStringArray(updatedServer?.staff);
                const staffDisplay2 = staffRoles2.length ? staffRoles2.map((id) => `<@&${id}>`).join(', ') : 'Sin staff configurado';
                const aiRolePrompt2 = updatedServer?.aiRolePrompt ?? null;
                const aiPreview2 = aiRolePrompt2 ? (aiRolePrompt2.length > 80 ? aiRolePrompt2.slice(0, 77) + '…' : aiRolePrompt2) : 'No configurado';

                const updatedSettingsPanel = {
                    type: 17,
                    accent_color: 6178018,
                    components: [
                        { type: 10, content: "### <:invisible:1418684224441028608> 梅，panel admin，📢\n" },
                        { type: 14, spacing: 1, divider: false },
                        { type: 10, content: "Configuracion del Servidor:" },
                        { type: 9, components: [ { type: 10, content: `**Prefix:** \`${newCurrentPrefix}\`` } ], accessory: { type: 2, style: 2, emoji: { name: "⚙️" }, custom_id: "open_prefix_modal", label: "Cambiar" } },
                        { type: 14, divider: false },
                        { type: 9, components: [ { type: 10, content: `**Staff (roles):** ${staffDisplay2}` } ], accessory: { type: 2, style: 2, emoji: { name: "🛡️" }, custom_id: "open_staff_modal", label: "Configurar" } },
                        { type: 14, divider: false },
                        { type: 9, components: [ { type: 10, content: `**AI Role Prompt:** ${aiPreview2}` } ], accessory: { type: 2, style: 2, emoji: { name: "🧠" }, custom_id: "open_ai_role_modal", label: "Configurar" } },
                        { type: 14, divider: false }
                    ]
                };

                await interaction.update({ components: [updatedSettingsPanel] });
            }

            if (interaction.customId === "cancel_prefix_change") {
                // Volver al panel original
                const updatedServer = await client.prisma.guild.findFirst({ where: { id: message.guild!.id } });
                const staffRoles3: string[] = toStringArray(updatedServer?.staff);
                const staffDisplay3 = staffRoles3.length ? staffRoles3.map((id) => `<@&${id}>`).join(', ') : 'Sin staff configurado';
                const aiRolePrompt3 = updatedServer?.aiRolePrompt ?? null;
                const aiPreview3 = aiRolePrompt3 ? (aiRolePrompt3.length > 80 ? aiRolePrompt3.slice(0, 77) + '…' : aiRolePrompt3) : 'No configurado';

                const originalPanel = {
                    type: 17,
                    accent_color: 6178018,
                    components: [
                        { type: 10, content: "### <:invisible:1418684224441028608> 梅，panel admin，📢\n" },
                        { type: 14, spacing: 1, divider: false },
                        { type: 10, content: "Configuracion del Servidor:" },
                        { type: 9, components: [ { type: 10, content: `**Prefix:** \`${currentPrefix}\`` } ], accessory: { type: 2, style: 2, emoji: { name: "⚙️" }, custom_id: "open_prefix_modal", label: "Cambiar" } },
                        { type: 14, divider: false },
                        { type: 9, components: [ { type: 10, content: `**Staff (roles):** ${staffDisplay3}` } ], accessory: { type: 2, style: 2, emoji: { name: "🛡️" }, custom_id: "open_staff_modal", label: "Configurar" } },
                        { type: 14, divider: false },
                        { type: 9, components: [ { type: 10, content: `**AI Role Prompt:** ${aiPreview3}` } ], accessory: { type: 2, style: 2, emoji: { name: "🧠" }, custom_id: "open_ai_role_modal", label: "Configurar" } },
                        { type: 14, divider: false }
                    ]
                };

                await interaction.update({ components: [originalPanel] });
            }
        });

        collector.on("end", async (_: any, reason: string) => {
            if (reason === "time") {
                const timeoutPanel = {
                    type: 17,
                    accent_color: 6178018,
                    components: [
                        { type: 10, content: "### ⏰ **Panel Expirado**" },
                        { type: 14, spacing: 1, divider: true },
                        { type: 10, content: "El panel de configuración ha expirado por inactividad.\n\nUsa `!settings` para abrir un nuevo panel." }
                    ]
                };

                try {
                    await panelMessage.edit({ components: [timeoutPanel] });
                } catch (error) {
                    // Mensaje eliminado o error de edición
                }
            }
        });
    }
};
