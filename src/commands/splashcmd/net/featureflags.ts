/**
 * Comando de administración de Feature Flags
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { featureFlagService } from "../../../core/services/FeatureFlagService";
import {
  FeatureFlagConfig,
  FeatureFlagStatus,
  FeatureFlagTarget,
  RolloutStrategy,
  RolloutConfig,
} from "../../../core/types/featureFlags";
import logger from "../../../core/lib/logger";
import { CommandSlash } from "../../../core/types/commands";
import { requireTestGuildAndAdmin } from "../../../core/lib/security";

export const command: CommandSlash = {
  name: "featureflags",
  description: "Administra los feature flags del bot",
  type: "slash",
  cooldown: 5,
  options: [
    {
      name: "list",
      description: "Lista todos los feature flags",
      type: 1,
    },
    {
      name: "info",
      description: "Muestra información detallada de un flag",
      type: 1,
      options: [
        {
          name: "flag",
          description: "Nombre del flag",
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "create",
      description: "Crea un nuevo feature flag",
      type: 1,
      options: [
        {
          name: "name",
          description: "Nombre único del flag",
          type: 3,
          required: true,
        },
        {
          name: "status",
          description: "Estado del flag",
          type: 3,
          required: true,
          choices: [
            { name: "Habilitado", value: "enabled" },
            { name: "Deshabilitado", value: "disabled" },
            { name: "Rollout", value: "rollout" },
            { name: "Mantenimiento", value: "maintenance" },
          ],
        },
        {
          name: "target",
          description: "Nivel de aplicación",
          type: 3,
          required: true,
          choices: [
            { name: "Global", value: "global" },
            { name: "Guild", value: "guild" },
            { name: "Usuario", value: "user" },
            { name: "Canal", value: "channel" },
          ],
        },
        {
          name: "description",
          description: "Descripción del flag",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "update",
      description: "Actualiza un feature flag existente",
      type: 1,
      options: [
        {
          name: "flag",
          description: "Nombre del flag",
          type: 3,
          required: true,
          autocomplete: true,
        },
        {
          name: "status",
          description: "Nuevo estado",
          type: 3,
          required: false,
          choices: [
            { name: "Habilitado", value: "enabled" },
            { name: "Deshabilitado", value: "disabled" },
            { name: "Rollout", value: "rollout" },
            { name: "Mantenimiento", value: "maintenance" },
          ],
        },
      ],
    },
    {
      name: "rollout",
      description: "Configura rollout progresivo",
      type: 1,
      options: [
        {
          name: "flag",
          description: "Nombre del flag",
          type: 3,
          required: true,
          autocomplete: true,
        },
        {
          name: "strategy",
          description: "Estrategia de rollout",
          type: 3,
          required: true,
          choices: [
            { name: "Porcentaje", value: "percentage" },
            { name: "Whitelist", value: "whitelist" },
            { name: "Blacklist", value: "blacklist" },
            { name: "Gradual", value: "gradual" },
          ],
        },
        {
          name: "percentage",
          description: "Porcentaje de usuarios (0-100) para rollout",
          type: 4,
          required: false,
          min_value: 0,
          max_value: 100,
        },
      ],
    },
    {
      name: "delete",
      description: "Elimina un feature flag",
      type: 1,
      options: [
        {
          name: "flag",
          description: "Nombre del flag",
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "stats",
      description: "Muestra estadísticas de uso de los flags",
      type: 1,
      options: [
        {
          name: "flag",
          description: "Nombre del flag (opcional)",
          type: 3,
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: "refresh",
      description: "Refresca el caché de feature flags",
      type: 1,
    },
  ],
  run: async (interaction) => {
    // 🔒 SECURITY: Solo guild de testing + admin
    if (!(await requireTestGuildAndAdmin(interaction))) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "list":
          await handleList(interaction);
          break;
        case "info":
          await handleInfo(interaction);
          break;
        case "create":
          await handleCreate(interaction);
          break;
        case "update":
          await handleUpdate(interaction);
          break;
        case "rollout":
          await handleRollout(interaction);
          break;
        case "delete":
          await handleDelete(interaction);
          break;
        case "stats":
          await handleStats(interaction);
          break;
        case "refresh":
          await handleRefresh(interaction);
          break;
        default:
          await interaction.reply({
            content: "❌ Subcomando no reconocido",
            flags: MessageFlags.Ephemeral,
          });
      }
    } catch (error: any) {
      logger.error({
        msg: "[FeatureFlagsCmd] Error ejecutando comando",
        error: {
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          name: error?.name,
        },
      });
      const errorMessage = `❌ Error: ${error?.message || "Error desconocido"}`;

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flags = featureFlagService.getFlags();

  if (flags.length === 0) {
    await interaction.editReply("📋 No hay feature flags configurados.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🎮 Feature Flags")
    .setColor(0x5865f2)
    .setDescription(`Total: ${flags.length} flags`);

  for (const flag of flags.slice(0, 25)) {
    embed.addFields({
      name: `${getStatusEmoji(flag.status)} ${flag.name}`,
      value: `**Status:** ${flag.status}\n**Target:** ${flag.target}${flag.description ? `\n${flag.description}` : ""
        }  `,
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleInfo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flagName = interaction.options.getString("flag", true);
  const flag = featureFlagService.getFlag(flagName);

  if (!flag) {
    await interaction.editReply(`❌ Flag "${flagName}" no encontrado`);
    return;
  }

  const stats = featureFlagService.getStats(flagName);
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${flag.name}`)
    .setColor(getStatusColor(flag.status))
    .addFields(
      {
        name: "Estado",
        value: `${getStatusEmoji(flag.status)} ${flag.status}`,
        inline: true,
      },
      { name: "Target", value: flag.target, inline: true },
      { name: "Estrategia", value: flag.rolloutStrategy || "N/A", inline: true }
    );

  if (flag.description) embed.setDescription(flag.description);
  if (flag.rolloutConfig) {
    let cfg = "";
    if (flag.rolloutConfig.percentage !== undefined)
      cfg += `Porcentaje: ${flag.rolloutConfig.percentage}%\n`;
    if (flag.rolloutConfig.targetIds?.length)
      cfg += `IDs: ${flag.rolloutConfig.targetIds.length} configurados\n`;
    if (cfg) embed.addFields({ name: "Configuración", value: cfg });
  }

  if (flag.startDate || flag.endDate) {
    let dates = "";
    if (flag.startDate)
      dates += `Inicio: <t:${Math.floor(flag.startDate.getTime() / 1000)}:R>\n`;
    if (flag.endDate)
      dates += `Fin: <t:${Math.floor(flag.endDate.getTime() / 1000)}:R>\n`;
    embed.addFields({ name: "Fechas", value: dates });
  }

  if (stats) {
    embed.addFields({
      name: "📊 Estadísticas",
      value: `Evaluaciones: ${stats.totalEvaluations}\nHabilitado: ${stats.enabledCount
        } (${stats.enablementRate.toFixed(1)}%)\nDeshabilitado: ${stats.disabledCount
        }`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const config: FeatureFlagConfig = {
    name: interaction.options.getString("name", true),
    status: interaction.options.getString("status", true) as FeatureFlagStatus,
    target: interaction.options.getString("target", true) as FeatureFlagTarget,
    description: interaction.options.getString("description") || undefined,
    rolloutConfig: {}, // Initialize empty config
  };

  await featureFlagService.setFlag(config);
  await interaction.editReply(
    `✅ Feature flag "${config.name}" creado exitosamente`
  );
}

async function handleUpdate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flagName = interaction.options.getString("flag", true);
  const flag = featureFlagService.getFlag(flagName);

  if (!flag) {
    await interaction.editReply(`❌ Flag "${flagName}" no encontrado`);
    return;
  }

  const newStatus = interaction.options.getString(
    "status"
  ) as FeatureFlagStatus | null;
  if (newStatus) flag.status = newStatus;

  await featureFlagService.setFlag(flag);
  await interaction.editReply(`✅ Feature flag "${flagName}" actualizado`);
}

async function handleRollout(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flagName = interaction.options.getString("flag", true);
  const flag = featureFlagService.getFlag(flagName);

  if (!flag) {
    await interaction.editReply(`❌ Flag "${flagName}" no encontrado`);
    return;
  }

  flag.status = "rollout";
  flag.rolloutStrategy = interaction.options.getString(
    "strategy",
    true
  ) as RolloutStrategy;

  // Ensure rolloutConfig exists
  if (!flag.rolloutConfig) {
    flag.rolloutConfig = {};
  }

  const percentage = interaction.options.getInteger("percentage");
  if (percentage !== null) flag.rolloutConfig.percentage = percentage;

  await featureFlagService.setFlag(flag);
  await interaction.editReply(
    `✅ Rollout configurado para "${flagName}"\nEstrategia: ${flag.rolloutStrategy
    } ${percentage !== null ? `\nPorcentaje: ${percentage}%` : ""}`
  );
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flagName = interaction.options.getString("flag", true);
  await featureFlagService.removeFlag(flagName);
  await interaction.editReply(`✅ Feature flag "\${flagName}" eliminado`);
}

async function handleStats(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const flagName = interaction.options.getString("flag");

  if (flagName) {
    const stats = featureFlagService.getStats(flagName);
    if (!stats) {
      await interaction.editReply(`❌ No hay estadísticas para "${flagName}"`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Estadísticas: ${flagName}`)
      .setColor(0x5865f2)
      .addFields(
        {
          name: "Total Evaluaciones",
          value: stats.totalEvaluations.toString(),
          inline: true,
        },
        {
          name: "Habilitado",
          value: `${stats.enabledCount} (${stats.enablementRate.toFixed(1)}%)`,
          inline: true,
        },
        {
          name: "Deshabilitado",
          value: stats.disabledCount.toString(),
          inline: true,
        }
      );

    if (stats.lastEvaluation) {
      embed.addFields({
        name: "Última Evaluación",
        value: `<t:${Math.floor(stats.lastEvaluation.getTime() / 1000)}:R>`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } else {
    const allStats = featureFlagService.getAllStats();
    if (allStats.length === 0) {
      await interaction.editReply("📊 No hay estadísticas disponibles");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📊 Estadísticas de Feature Flags")
      .setColor(0x5865f2);
    for (const stats of allStats.slice(0, 10)) {
      embed.addFields({
        name: stats.flagName,
        value: `Evaluaciones: ${stats.totalEvaluations
          }\nTasa: ${stats.enablementRate.toFixed(1)}%`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleRefresh(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await featureFlagService.refreshCache();
  featureFlagService.clearEvaluationCache();
  await interaction.editReply("✅ Caché de feature flags refrescado");
}

function getStatusEmoji(status: FeatureFlagStatus): string {
  switch (status) {
    case "enabled":
      return "✅";
    case "disabled":
      return "❌";
    case "rollout":
      return "🔄";
    case "maintenance":
      return "🔧";
    default:
      return "❓";
  }
}

function getStatusColor(status: FeatureFlagStatus): number {
  switch (status) {
    case "enabled":
      return 0x57f287;
    case "disabled":
      return 0xed4245;
    case "rollout":
      return 0xfee75c;
    case "maintenance":
      return 0xeb459e;
    default:
      return 0x5865f2;
  }
}
