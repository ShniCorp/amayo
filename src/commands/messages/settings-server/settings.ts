import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";
import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import { aiService } from "../../../core/services/AIService";
import { invalidateGuildCache } from "../../../core/database/guildCache";
import { DisplayComponentV2Builder } from "../../../core/lib/displayComponents/builders";

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[]).filter((v): v is string => typeof v === "string");
}

export const command: CommandMessage = {
  name: "configuracion",
  type: "message",
  aliases: ["config", "ajustes", "settings"],
  cooldown: 5,
  description:
    "Abre el panel de configuración del servidor (prefix, staff y más).",
  category: "Configuración",
  usage: "configuracion",
  run: async (message, args, client) => {
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      client.prisma
    );
    if (!allowed) {
      await message.reply(
        "❌ No tienes permisos de ManageGuild ni rol de staff."
      );
      return;
    }

    const server = await client.prisma.guild.findFirst({
      where: { id: message.guild!.id },
    });

    const currentPrefix = server?.prefix || "!";
    const staffRoles: string[] = toStringArray(server?.staff);
    const staffDisplay = staffRoles.length
      ? staffRoles.map((id) => `<@&${id}>`).join(", ")
      : "Sin staff configurado";
    const aiRolePrompt = server?.aiRolePrompt ?? null;
    const aiPreview = aiRolePrompt
      ? aiRolePrompt.length > 80
        ? aiRolePrompt.slice(0, 77) + "…"
        : aiRolePrompt
      : "No configurado";

    // Panel de configuración usando DisplayComponents
    const settingsPanel = new DisplayComponentV2Builder()
      .setAccentColor(6178018)
      .addText("### <:invisible:1418684224441028608> 梅，panel admin，📢\n")
      .addSeparator(1, false)
      .addText("Configuracion del Servidor:")
      .addSection(
        [
          {
            type: 10,
            content: `**Prefix:**<:invisible:1418684224441028608>\`${currentPrefix}\``,
          },
        ],
        {
          type: 2,
          style: 2,
          emoji: { name: "⚙️" },
          custom_id: "open_prefix_modal",
          label: "Cambiar",
        }
      )
      .addSeparator(1, false)
      .addSection(
        [{ type: 10, content: `**Staff (roles):** ${staffDisplay}` }],
        {
          type: 2,
          style: 2, // Secondary
          emoji: { name: "🛡️" },
          custom_id: "open_staff_modal",
          label: "Configurar",
        }
      )
      .addSeparator(1, false)
      .addSection([{ type: 10, content: `**AI Role Prompt:** ${aiPreview}` }], {
        type: 2,
        style: 2,
        emoji: { name: "🧠" },
        custom_id: "open_ai_role_modal",
        label: "Configurar",
      })
      .addSeparator(1, false)
      .toJSON();

    const panelMessage = await message.reply({
      flags: 32768, // Components v2
      components: [settingsPanel],
    });

    const collector = panelMessage.createMessageComponentCollector({
      time: 300000, // 5 minutos
      filter: (i: any) => i.user.id === message.author.id,
    });

    collector.on("collect", async (interaction: any) => {
      if (interaction.customId === "open_prefix_modal") {
        // v14 Modal API - Using ModalBuilder with TextInputBuilder
        const {
          ModalBuilder,
          TextInputBuilder,
          ActionRowBuilder,
          TextInputStyle: V14TextInputStyle,
        } = await import("discord.js");

        const prefixInput = new TextInputBuilder()
          .setCustomId("new_prefix_input")
          .setLabel("Nuevo Prefix")
          .setStyle(V14TextInputStyle.Short)
          .setPlaceholder(`Prefix actual: ${currentPrefix}`)
          .setRequired(true)
          .setMaxLength(10)
          .setMinLength(1)
          .setValue(currentPrefix);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("prefix_description")
          .setLabel("Motivo (opcional)")
          .setStyle(V14TextInputStyle.Paragraph)
          .setPlaceholder("Ej: evitar conflictos con otros bots...")
          .setRequired(false)
          .setMaxLength(200);

        const prefixModal = new ModalBuilder()
          .setCustomId("prefix_settings_modal")
          .setTitle("⚙️ Configurar Prefix del Servidor")
          .addComponents(
            //@ts-ignore
            new ActionRowBuilder().addComponents(prefixInput),
            //@ts-ignore
            new ActionRowBuilder().addComponents(descriptionInput)
          );

        try {
          await interaction.showModal(prefixModal);
        } catch (err) {
          try {
            await interaction.reply({
              content: "❌ No se pudo abrir el modal de prefix.",
              flags: 64,
            });
          } catch {}
          return;
        }

        try {
          const modalInteraction = await interaction.awaitModalSubmit({
            time: 300000,
            filter: (modalInt: any) =>
              modalInt.customId === "prefix_settings_modal" &&
              modalInt.user.id === message.author.id,
          });

          const newPrefix =
            modalInteraction.fields.getTextInputValue("new_prefix_input");
          const description =
            modalInteraction.fields.getTextInputValue("prefix_description") ||
            "Sin descripción";

          if (!newPrefix || newPrefix.length > 10) {
            await modalInteraction.reply({
              content:
                "❌ **Error:** El prefix debe tener entre 1 y 10 caracteres.",
              flags: 64,
            });
            return;
          }

          try {
            await client.prisma.guild.upsert({
              where: { id: message.guild!.id },
              create: {
                id: message.guild!.id,
                name: message.guild!.name,
                prefix: newPrefix,
              },
              update: { prefix: newPrefix, name: message.guild!.name },
            });

            // Invalidar el caché del guild para reflejar el cambio
            await invalidateGuildCache(message.guild!.id);

            const successPanel = new DisplayComponentV2Builder()
              .setAccentColor(3066993)
              .addText("### ✅ **Prefix Actualizado Exitosamente**")
              .addSeparator(2, true)
              .addSection(
                [
                  {
                    type: 10,
                    content: `**Prefix anterior:** \`${currentPrefix}\`\n**Prefix nuevo:** \`${newPrefix}\`\n\n**Motivo:** ${description}`,
                  },
                ],
                {
                  type: 2,
                  style: 3,
                  label: "✓ Listo",
                  custom_id: "prefix_confirmed",
                  emoji: { name: "✅" },
                }
              )
              .addSeparator(1, false)
              .addText(
                "🚀 **¡Listo!** Ahora puedes usar los comandos con el nuevo prefix.\n\n💡 **Ejemplo:** `" +
                  newPrefix +
                  "help`, `" +
                  newPrefix +
                  "embedlist`"
              )
              .toJSON();

            const backToSettingsRow = {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2,
                  label: "↩️ Volver a Configuración",
                  custom_id: "back_to_settings",
                },
              ],
            };

            await modalInteraction.update({
              components: [successPanel, backToSettingsRow],
            });
          } catch (error) {
            const errorPanel = new DisplayComponentV2Builder()
              .setAccentColor(15548997)
              .addText("### ❌ **Error al Actualizar Prefix**")
              .addSeparator(2, true)
              .addText(
                `**Error:** No se pudo actualizar el prefix a \`${newPrefix}\`\n\n**Posibles causas:**\n• Error de conexión con la base de datos\n• Prefix contiene caracteres no válidos\n• Permisos insuficientes\n\n🔄 **Solución:** Intenta nuevamente con un prefix diferente.`
              )
              .toJSON();

            const retryRow = {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2,
                  label: "🔄 Reintentar",
                  custom_id: "open_prefix_modal",
                },
                {
                  type: 2,
                  style: 4,
                  label: "❌ Cancelar",
                  custom_id: "cancel_prefix_change",
                },
              ],
            };

            await modalInteraction.update({
              components: [errorPanel, retryRow],
            });
          }
        } catch (error: any) {
          logger.info(
            "Modal timeout o error:",
            error?.message || String(error)
          );
        }
      }

      if (interaction.customId === "open_staff_modal") {
        // v14 Modal API - Modals can only contain TextInput, not RoleSelect
        // Using text input for role IDs (comma-separated)
        const {
          ModalBuilder,
          TextInputBuilder,
          ActionRowBuilder,
          TextInputStyle: V14TextInputStyle,
        } = await import("discord.js");

        const currentStaffIds = staffRoles.join(", ");
        const rolesInput = new TextInputBuilder()
          .setCustomId("staff_roles_input")
          .setLabel("IDs de Roles (separados por comas)")
          .setStyle(V14TextInputStyle.Paragraph)
          .setPlaceholder("Ej: 123456789012345678, 987654321098765432")
          .setRequired(false)
          .setMaxLength(200)
          .setValue(currentStaffIds);

        const staffModal = new ModalBuilder()
          .setCustomId("staff_roles_modal")
          .setTitle("🛡️ Configurar Roles de Staff (hasta 3)")
          .addComponents(
            //@ts-ignore
            new ActionRowBuilder().addComponents(rolesInput)
          );

        await interaction.showModal(staffModal);

        try {
          const modalInteraction = await interaction.awaitModalSubmit({
            time: 300000,
            filter: (m: any) =>
              m.customId === "staff_roles_modal" &&
              m.user.id === message.author.id,
          });

          // Parse role IDs from comma-separated text input
          const rolesInput = modalInteraction.fields
            .getTextInputValue("staff_roles_input")
            .trim();
          const roleIds: string[] = rolesInput
            ? rolesInput
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id.length > 0)
                .slice(0, 3)
            : [];

          await client.prisma.guild.upsert({
            where: { id: message.guild!.id },
            create: {
              id: message.guild!.id,
              name: message.guild!.name,
              staff: roleIds,
            },
            update: { staff: roleIds, name: message.guild!.name },
          });

          // Invalidar el caché del guild para reflejar el cambio
          await invalidateGuildCache(message.guild!.id);

          const updatedDisplay = roleIds.length
            ? roleIds.map((id) => `<@&${id}>`).join(", ")
            : "Sin staff configurado";

          const successPanel = new DisplayComponentV2Builder()
            .setAccentColor(3066993)
            .addText("### ✅ **Staff Actualizado**")
            .addSeparator(2, true)
            .addText(`**Nuevos roles de staff:** ${updatedDisplay}`)
            .toJSON();

          const backRow = {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: "↩️ Volver a Configuración",
                custom_id: "back_to_settings",
              },
            ],
          };
          await modalInteraction.update({
            components: [successPanel, backRow],
          });
        } catch (error) {
          // timeout o error
        }
      }

      if (interaction.customId === "open_ai_role_modal") {
        const currentServer = await client.prisma.guild.findFirst({
          where: { id: message.guild!.id },
        });
        const currentAiPrompt = currentServer?.aiRolePrompt ?? "";
        // v14 Modal API - Using ModalBuilder with TextInputBuilder
        const {
          ModalBuilder,
          TextInputBuilder,
          ActionRowBuilder,
          TextInputStyle: V14TextInputStyle,
        } = await import("discord.js");

        const aiPromptInput = new TextInputBuilder()
          .setCustomId("ai_role_prompt_input")
          .setLabel("Prompt de rol (opcional)")
          .setStyle(V14TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder(
            "Ej: Eres un asistente amistoso del servidor, responde en español, evita spoilers..."
          )
          .setMaxLength(1500)
          .setValue(currentAiPrompt.slice(0, 1500));

        const aiModal = new ModalBuilder()
          .setCustomId("ai_role_prompt_modal")
          .setTitle("🧠 Configurar AI Role Prompt")
          .addComponents(
            //@ts-ignore
            new ActionRowBuilder().addComponents(aiPromptInput)
          );

        try {
          await interaction.showModal(aiModal);
        } catch (err) {
          try {
            await interaction.reply({
              content: "❌ No se pudo abrir el modal de AI.",
              flags: 64,
            });
          } catch {}
          return;
        }

        try {
          const modalInteraction = await interaction.awaitModalSubmit({
            time: 300000,
            filter: (m: any) =>
              m.customId === "ai_role_prompt_modal" &&
              m.user.id === message.author.id,
          });

          const newPromptRaw =
            modalInteraction.fields.getTextInputValue("ai_role_prompt_input") ??
            "";
          const newPrompt = newPromptRaw.trim();
          const toSave: string | null = newPrompt.length > 0 ? newPrompt : null;

          await client.prisma.guild.upsert({
            where: { id: message.guild!.id },
            create: {
              id: message.guild!.id,
              name: message.guild!.name,
              aiRolePrompt: toSave,
            },
            update: { aiRolePrompt: toSave, name: message.guild!.name },
          });

          // Invalida el cache del servicio para reflejar cambios al instante
          aiService.invalidateGuildConfig(message.guild!.id);

          // Invalidar el caché del guild también
          await invalidateGuildCache(message.guild!.id);

          const preview = toSave
            ? toSave.length > 200
              ? toSave.slice(0, 197) + "…"
              : toSave
            : "Prompt eliminado (sin configuración)";

          const successPanel = new DisplayComponentV2Builder()
            .setAccentColor(3066993)
            .addText("### ✅ **AI Role Prompt Actualizado**")
            .addSeparator(2, true)
            .addText(`**Nuevo valor:**\n${preview}`)
            .toJSON();
          const backRow = {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: "↩️ Volver a Configuración",
                custom_id: "back_to_settings",
              },
            ],
          };

          await modalInteraction.update({
            components: [successPanel, backRow],
          });
        } catch (e) {
          // timeout o cancelado
        }
      }

      // Manejar botones adicionales
      if (interaction.customId === "back_to_settings") {
        const updatedServer = await client.prisma.guild.findFirst({
          where: { id: message.guild!.id },
        });
        const newCurrentPrefix = updatedServer?.prefix || "!";
        const staffRoles2: string[] = toStringArray(updatedServer?.staff);
        const staffDisplay2 = staffRoles2.length
          ? staffRoles2.map((id) => `<@&${id}>`).join(", ")
          : "Sin staff configurado";
        const aiRolePrompt2 = updatedServer?.aiRolePrompt ?? null;
        const aiPreview2 = aiRolePrompt2
          ? aiRolePrompt2.length > 80
            ? aiRolePrompt2.slice(0, 77) + "…"
            : aiRolePrompt2
          : "No configurado";

        const updatedSettingsPanel = new DisplayComponentV2Builder()
          .setAccentColor(6178018)
          .addText("### <:invisible:1418684224441028608> 梅，panel admin，📢\n")
          .addSeparator(1, false)
          .addText("Configuracion del Servidor:")
          .addSection(
            [{ type: 10, content: `**Prefix:** \`${newCurrentPrefix}\`` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "⚙️" },
              custom_id: "open_prefix_modal",
              label: "Cambiar",
            }
          )
          .addSeparator(1, false)
          .addSection(
            [{ type: 10, content: `**Staff (roles):** ${staffDisplay2}` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "🛡️" },
              custom_id: "open_staff_modal",
              label: "Configurar",
            }
          )
          .addSeparator(1, false)
          .addSection(
            [{ type: 10, content: `**AI Role Prompt:** ${aiPreview2}` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "🧠" },
              custom_id: "open_ai_role_modal",
              label: "Configurar",
            }
          )
          .addSeparator(1, false)
          .toJSON();

        await interaction.update({ components: [updatedSettingsPanel] });
      }

      if (interaction.customId === "cancel_prefix_change") {
        // Volver al panel original
        const updatedServer = await client.prisma.guild.findFirst({
          where: { id: message.guild!.id },
        });
        const staffRoles3: string[] = toStringArray(updatedServer?.staff);
        const staffDisplay3 = staffRoles3.length
          ? staffRoles3.map((id) => `<@&${id}>`).join(", ")
          : "Sin staff configurado";
        const aiRolePrompt3 = updatedServer?.aiRolePrompt ?? null;
        const aiPreview3 = aiRolePrompt3
          ? aiRolePrompt3.length > 80
            ? aiRolePrompt3.slice(0, 77) + "…"
            : aiRolePrompt3
          : "No configurado";

        const originalPanel = new DisplayComponentV2Builder()
          .setAccentColor(6178018)
          .addText("### <:invisible:1418684224441028608> 梅，panel admin，📢\n")
          .addSeparator(1, false)
          .addText("Configuracion del Servidor:")
          .addSection(
            [{ type: 10, content: `**Prefix:** \`${currentPrefix}\`` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "⚙️" },
              custom_id: "open_prefix_modal",
              label: "Cambiar",
            }
          )
          .addSeparator(1, false)
          .addSection(
            [{ type: 10, content: `**Staff (roles):** ${staffDisplay3}` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "🛡️" },
              custom_id: "open_staff_modal",
              label: "Configurar",
            }
          )
          .addSeparator(1, false)
          .addSection(
            [{ type: 10, content: `**AI Role Prompt:** ${aiPreview3}` }],
            {
              type: 2,
              style: 2,
              emoji: { name: "🧠" },
              custom_id: "open_ai_role_modal",
              label: "Configurar",
            }
          )
          .addSeparator(1, false)
          .toJSON();

        await interaction.update({ components: [originalPanel] });
      }
    });

    collector.on("end", async (_: any, reason: string) => {
      if (reason === "time") {
        const timeoutPanel = new DisplayComponentV2Builder()
          .setAccentColor(6178018)
          .addText("### ⏰ **Panel Expirado**")
          .addSeparator(1, true)
          .addText(
            "El panel de configuración ha expirado por inactividad.\n\nUsa `!settings` para abrir un nuevo panel."
          )
          .toJSON();

        try {
          await panelMessage.edit({ components: [timeoutPanel] });
        } catch (error) {
          // Mensaje eliminado o error de edición
        }
      }
    });
  },
};
