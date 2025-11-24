import { CommandMessage } from "../../../core/types/commands";
import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { DisplayComponentV2Builder } from "../../../core/lib/displayComponents/builders";

function codeBlock(lines: string[]): string {
  return ["```", ...lines, "```"].join("\n");
}

async function buildChannelListPanel(message: Message) {
  const guild = message.guild!;
  const guildId = guild.id;
  const client = message.client as any;

  // Obtener canales configurados existentes con estadísticas
  const existingChannels = await client.prisma.allianceChannel.findMany({
    where: { guildId },
    include: {
      _count: {
        select: {
          pointsHistory: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Obtener estadísticas generales
  const totalPointsHistory = await client.prisma.pointHistory.count({
    where: { guildId },
  });

  const availableBlocks = await client.prisma.blockV2Config.count({
    where: { guildId },
  });

  if (existingChannels.length === 0) {
    // Panel cuando no hay canales configurados
    const builder = new DisplayComponentV2Builder()
      .setAccentColor(0x36393f)
      .addText("## 📋 Canales de Alianza Configurados")
      .addText("-# Lista de canales configurados para alianzas.")
      .addSeparator(1, true)
      .addText("### 🗂️ Lista vacía")
      .addText(
        "📭 **No hay canales configurados** para alianzas en este servidor."
      )
      .addSeparator(1, false)
      .addText("### 🚀 ¿Quieres empezar?")
      .addText("• Usa `!setchannel-alliance` para configurar tu primer canal")
      .addText("• Crea bloques con `!blockcreate <nombre>`")
      .addSeparator(1, true)
      .addText("### 📊 Estadísticas Generales")
      .addText(`🧩 **Bloques disponibles:** ${availableBlocks}`)
      .addText(`📈 **Puntos totales otorgados:** ${totalPointsHistory}`)
      .addSeparator(1, false)
      .addText(
        `📅 ${new Date().toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`
      )
      .addSeparator(1, false);

    const panel = builder.toJSON();

    const rows = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Configurar Canal",
            custom_id: "setup_first_channel",
            emoji: { name: "🔧" },
          },
          {
            type: 2,
            style: 2,
            label: "Ayuda",
            custom_id: "show_setup_help",
            emoji: { name: "📖" },
          },
        ],
      },
    ];

    return { panel, rows, channelDetails: null, totalPointsHistory };
  }

  // Crear descripción detallada de canales
  const channelDetails = await Promise.all(
    existingChannels.map(async (config: any, index: number) => {
      const channel = guild.channels.cache.get(config.channelId);
      const channelName = channel ? `#${channel.name}` : "❌ *Canal Eliminado*";
      const status = config.isActive ? "🟢 **Activo**" : "🔴 **Inactivo**";
      const pointsCount = config._count.pointsHistory;

      // Obtener información del bloque
      const blockInfo = await client.prisma.blockV2Config.findFirst({
        where: {
          guildId,
          name: config.blockConfigName,
        },
        select: { name: true, id: true },
      });

      const blockStatus = blockInfo ? "✅ Válido" : "⚠️ Bloque Eliminado";

      const createdDate = new Date(config.createdAt).toLocaleDateString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

      return {
        index: index + 1,
        channelName,
        status,
        pointsCount,
        blockName: config.blockConfigName,
        blockStatus,
        createdDate,
        isValid: !!channel && !!blockInfo,
      };
    })
  );

  // Agrupar por estado
  const activeChannels = channelDetails.filter((c) =>
    c.status.includes("Activo")
  );
  const inactiveChannels = channelDetails.filter((c) =>
    c.status.includes("Inactivo")
  );

  // Construir lista de canales activos
  const activeList =
    activeChannels.length > 0
      ? activeChannels
          .slice(0, 10)
          .map(
            (c) =>
              `${c.index}. ${c.channelName} - ${c.blockName} (${c.pointsCount} pts)`
          )
      : ["Ninguno"];

  // Construir lista de canales inactivos
  const inactiveList =
    inactiveChannels.length > 0
      ? inactiveChannels
          .slice(0, 5)
          .map((c) => `${c.index}. ${c.channelName} - ${c.blockName}`)
      : [];

  // Obtener canales más activos para estadísticas
  const topChannels =
    channelDetails
      .sort((a, b) => b.pointsCount - a.pointsCount)
      .slice(0, 3)
      .map((c, i) => `${i + 1}. ${c.channelName.replace(/[#❌*]/g, "").trim()}`)
      .join(", ") || "N/A";

  const now = new Date();
  const ts = now.toLocaleDateString("es-ES");

  // Crear el panel con components V2
  const builder = new DisplayComponentV2Builder()
    .setAccentColor(0x5865f2)
    .addText("## 📋 Canales de Alianza Configurados")
    .addText(
      `-# ${existingChannels.length} canal(es) configurado(s) • 🟢 Activos: ${activeChannels.length} • 🔴 Inactivos: ${inactiveChannels.length}`
    )
    .addSeparator(1, true);

  // Añadir canales activos
  if (activeChannels.length > 0) {
    builder.addText(`### 🟢 Canales Activos (${activeChannels.length})`);
    builder.addText(codeBlock(activeList));
  }

  // Añadir canales inactivos si los hay
  if (inactiveChannels.length > 0) {
    builder.addSeparator(1, false);
    builder.addText(`### 🔴 Canales Inactivos (${inactiveChannels.length})`);
    builder.addText(codeBlock(inactiveList));
  }

  // Añadir estadísticas
  builder
    .addSeparator(1, true)
    .addText("### 📊 Estadísticas del Servidor")
    .addText(`🧩 **Bloques disponibles:** ${availableBlocks}`)
    .addText(`📈 **Total puntos otorgados:** ${totalPointsHistory}`)
    .addText(`⚡ **Canales más activos:** ${topChannels}`)
    .addSeparator(1, false)
    .addText(`📅 Actualizado: ${ts}`);

  const panel = builder.toJSON();

  // Botones (ActionRows)
  const rows = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Añadir Canal",
          custom_id: "add_channel",
          emoji: { name: "➕" },
        },
        {
          type: 2,
          style: 4,
          label: "Eliminar Canal",
          custom_id: "remove_channel",
          emoji: { name: "🗑️" },
        },
        {
          type: 2,
          style: 1,
          label: "Actualizar",
          custom_id: "refresh_list",
          emoji: { name: "🔄" },
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "Estadísticas",
          custom_id: "show_stats",
          emoji: { name: "📊" },
        },
        {
          type: 2,
          style: 2,
          label: "Ver Bloques",
          custom_id: "show_blocks",
          emoji: { name: "🧩" },
        },
        {
          type: 2,
          style: 2,
          label: "Ayuda",
          custom_id: "show_help",
          emoji: { name: "❓" },
        },
      ],
    },
  ];

  return { panel, rows, channelDetails, totalPointsHistory };
}

export const command: CommandMessage = {
  name: "lista-canales",
  type: "message",
  aliases: ["lca", "channelist", "alliacechannels"],
  cooldown: 5,
  description:
    "Lista todos los canales configurados para alianzas (versión V2 con components)",
  category: "Alianzas",
  usage: "lista-canales",
  run: async (message) => {
    if (!message.guild) {
      await message.reply({
        content: "❌ Este comando solo puede usarse en servidores.",
      });
      return;
    }

    const client = message.client as any;
    const guildId = message.guild.id;

    try {
      const result = await buildChannelListPanel(message);

      const response = await message.reply({
        // @ts-ignore Flag de componentes V2
        flags: 32768,
        components: [result.panel, ...(result.rows || [])],
      });

      // Solo crear collector si hay canales o para el caso vacío
      const collector = response.createMessageComponentCollector({
        time: 600000, // 10 minutos
        filter: (i) => i.user.id === message.author.id,
      });

      collector.on("collect", async (interaction) => {
        try {
          switch (interaction.customId) {
            case "setup_first_channel":
            case "add_channel":
              await interaction.reply({
                content:
                  "➕ **Añadir Canal**\n\nUsa el comando: `!setchannel-alliance`\n\nEste comando te guiará para configurar un nuevo canal de alianzas.",
                // @ts-ignore Flag efímero
                flags: 64,
              });
              break;

            case "remove_channel":
              await interaction.reply({
                content:
                  "🗑️ **Eliminar Canal**\n\nUsa el comando: `!removechannel-alliance`\n\nEste comando te permitirá eliminar canales de la configuración de alianzas.",
                // @ts-ignore Flag efímero
                flags: 64,
              });
              break;

            case "refresh_list":
              await interaction.reply({
                content:
                  "🔄 **Lista Actualizada**\n\nUsa el comando nuevamente: `!listchannels-alliance-v2`\n\nEsto mostrará la información más reciente.",
                // @ts-ignore Flag efímero
                flags: 64,
              });
              break;

            case "show_stats":
              if (result.channelDetails) {
                const detailedStats = result.channelDetails
                  .map(
                    (c: any) =>
                      `• ${c.channelName}: **${c.pointsCount}** puntos`
                  )
                  .join("\n");

                await interaction.reply({
                  content: `📊 **Estadísticas Detalladas**\n\n**Puntos por Canal:**\n${detailedStats}\n\n**Total del Servidor:** ${result.totalPointsHistory} puntos`,
                  // @ts-ignore Flag efímero
                  flags: 64,
                });
              } else {
                await interaction.reply({
                  content:
                    "📊 **Estadísticas**\n\nNo hay canales configurados aún para mostrar estadísticas.",
                  // @ts-ignore Flag efímero
                  flags: 64,
                });
              }
              break;

            case "show_blocks":
              const blocksList = await client.prisma.blockV2Config.findMany({
                where: { guildId },
                select: { name: true, id: true },
              });

              const blocksText =
                blocksList.length > 0
                  ? blocksList
                      .map(
                        (block: any, i: number) => `${i + 1}. \`${block.name}\``
                      )
                      .join("\n")
                  : "No hay bloques configurados";

              await interaction.reply({
                content: `🧩 **Bloques Disponibles (${blocksList.length})**\n\n${blocksText}\n\n💡 Crea bloques con: \`!blockcreate <nombre>\``,
                // @ts-ignore Flag efímero
                flags: 64,
              });
              break;

            case "show_setup_help":
            case "show_help":
              await interaction.reply({
                content: `📖 **Ayuda - Sistema de Alianzas**\n\n**Comandos principales:**\n• \`!setchannel-alliance\` - Configurar canal\n• \`!removechannel-alliance\` - Eliminar canal\n• \`!listchannels-alliance-v2\` - Ver configurados\n\n**Comandos de bloques:**\n• \`!blockcreate <nombre>\` - Crear bloque\n• \`!blockeditv2 <nombre>\` - Editar bloque\n• \`!embedlist\` - Ver todos los bloques`,
                // @ts-ignore Flag efímero
                flags: 64,
              });
              break;
          }
        } catch (error) {
          console.error("Error en collector:", error);
        }
      });

      collector.on("end", async () => {
        try {
          // Los components V2 no necesitan ser editados al expirar
          // ya que Discord los maneja automáticamente
        } catch (error) {
          // Ignorar errores
        }
      });
    } catch (error) {
      console.error("Error en listChannelsV2:", error);
      await message.reply({
        content:
          "❌ **Error**\n\nHubo un problema al cargar la lista de canales. Inténtalo de nuevo.",
      });
    }
  },
};
