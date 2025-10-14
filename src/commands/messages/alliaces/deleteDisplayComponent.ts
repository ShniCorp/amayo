import {
  Message,
  ButtonInteraction,
  StringSelectMenuInteraction,
  MessageComponentInteraction,
  ComponentType,
  ButtonStyle,
  APIEmbed,
} from "discord.js";
import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";

interface BlockItem {
  name: string;
  id: string;
}

interface ActionRowBuilder {
  type: ComponentType.ActionRow;
  components: any[];
}

export const command: CommandMessage = {
  name: "eliminar-bloque",
  type: "message",
  aliases: ["bloque-eliminar", "bloque-embed", "blockdelete"],
  cooldown: 10,
  description: "Elimina bloques DisplayComponents del servidor",
  category: "Creacion",
  usage: "eliminar-bloque [nombre_bloque]",
  run: async (
    message: Message,
    args: string[],
    client: Amayo
  ): Promise<void> => {
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guildId!,
      client.prisma
    );
    if (!allowed) {
      await message.reply(
        "❌ No tienes permisos de ManageGuild ni rol de staff."
      );
      return;
    }
    await showDeletionPanel(message, client);
  },
};

async function showDeletionPanel(
  message: Message,
  client: Amayo
): Promise<void> {
  const blocks = await fetchBlocks(client, message.guildId!);

  if (blocks.length === 0) {
    await handleNoBlocks(message);
    return;
  }

  const deleteEmbed = createDeletionEmbed(blocks);
  const actionRow = createBlockSelectRow(blocks);
  const cancelRow = createCancelRow();

  const panelMessage = await message.reply({
    embeds: [deleteEmbed],
    components: [actionRow, cancelRow],
  });

  await handlePanelInteractions(panelMessage, message, client, blocks);
}

async function fetchBlocks(
  client: Amayo,
  guildId: string
): Promise<BlockItem[]> {
  return await client.prisma.blockV2Config.findMany({
    where: { guildId },
    select: { name: true, id: true },
    orderBy: { name: "asc" },
  });
}

async function handleNoBlocks(message: Message): Promise<void> {
  const noBlocksEmbed: APIEmbed = {
    color: 0xf04747,
    title: "🗂️ Panel de Eliminación de Bloques",
    description:
      "📭 **No hay bloques disponibles**\n\nNo se encontraron bloques para eliminar en este servidor.\n\nPuedes crear nuevos bloques usando `!crear-embed`.",
    footer: { text: "Sistema de gestión de bloques • Amayo Bot" },
  };

  await message.reply({
    embeds: [noBlocksEmbed],
  });
}

function createDeletionEmbed(blocks: BlockItem[]): APIEmbed {
  return {
    color: 0xff6b35,
    title: "🗑️ Panel de Eliminación de Bloques",
    description: `📊 **${blocks.length} bloque(s) encontrado(s)**\n\n⚠️ **ADVERTENCIA:** La eliminación es permanente e irreversible.\n\nSelecciona el bloque que deseas eliminar del menú de abajo:`,
    footer: { text: "Selecciona un bloque para eliminar • Timeout: 5 minutos" },
  };
}

function createBlockSelectRow(blocks: BlockItem[]): ActionRowBuilder {
  const selectOptions = blocks.slice(0, 25).map((block, index) => ({
    label: block.name,
    value: block.id, // Use ID instead of name for better uniqueness
    description: `ID: ${block.id.slice(-8)}`,
    emoji: index < 10 ? { name: `${index + 1}️⃣` } : { name: "📄" },
  }));

  return {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.StringSelect,
        custom_id: "delete_block_select",
        placeholder: "🗑️ Selecciona uno o varios bloques para eliminar...",
        min_values: 1,
        // Allow multi-select up to how many options we provided (max 25)
        max_values: Math.min(25, blocks.length),
        options: selectOptions,
      },
    ],
  };
}

function createCancelRow(): ActionRowBuilder {
  return {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        label: "❌ Cancelar",
        custom_id: "cancel_delete",
      },
    ],
  };
}

async function handlePanelInteractions(
  panelMessage: Message,
  originalMessage: Message,
  client: Amayo,
  blocks: BlockItem[]
): Promise<void> {
  const collector = panelMessage.createMessageComponentCollector({
    time: 300000, // 5 minutes
    filter: (interaction: MessageComponentInteraction) =>
      interaction.user.id === originalMessage.author.id,
  });

  collector.on("collect", async (interaction: MessageComponentInteraction) => {
    try {
      if (interaction.isButton() && interaction.customId === "cancel_delete") {
        await handleCancellation(interaction);
        collector.stop();
      } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "delete_block_select"
      ) {
        const selectedIds = interaction.values;
        const selectedBlocks = blocks.filter((b) => selectedIds.includes(b.id));

        if (selectedBlocks.length === 1) {
          await handleBlockSelection(interaction, client, selectedBlocks[0]);
          collector.stop();
        } else if (selectedBlocks.length > 1) {
          // Confirm batch deletion
          await handleMultipleBlockSelection(
            interaction,
            client,
            selectedBlocks
          );
          collector.stop();
        }
      }
    } catch (error) {
      console.error("Error handling deletion interaction:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocurrió un error al procesar la interacción.",
          flags: 64, // Use flags instead of ephemeral
        });
      }
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      await handlePanelTimeout(panelMessage);
    }
  });
}

async function handleCancellation(
  interaction: ButtonInteraction
): Promise<void> {
  const canceledEmbed: APIEmbed = {
    color: 0x36393f,
    title: "❌ Operación Cancelada",
    description:
      "La eliminación de bloques ha sido cancelada.\nNingún bloque fue eliminado.",
    footer: { text: "Operación cancelada por el usuario" },
  };

  await interaction.update({
    embeds: [canceledEmbed],
    components: [],
  });
}

async function handleBlockSelection(
  interaction: StringSelectMenuInteraction,
  client: Amayo,
  selectedBlock: BlockItem
): Promise<void> {
  const confirmEmbed: APIEmbed = {
    color: 0xff4444,
    title: "⚠️ Confirmar Eliminación",
    description: `¿Estás seguro de que quieres **eliminar permanentemente** el bloque?\n\n📄 **Nombre:** \`${selectedBlock.name}\`\n🔑 **ID:** \`${selectedBlock.id}\`\n\n❗ **Esta acción NO se puede deshacer.**`,
    footer: { text: "Confirma tu decisión usando los botones" },
  };

  const confirmRow: ActionRowBuilder = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        label: "🗑️ SÍ, ELIMINAR",
        custom_id: `confirm_delete_${selectedBlock.id}`,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: "❌ Cancelar",
        custom_id: "cancel_delete_final",
      },
    ],
  };

  await interaction.update({
    embeds: [confirmEmbed],
    components: [confirmRow],
  });

  // Handle final confirmation
  const finalCollector = interaction.message.createMessageComponentCollector({
    time: 60000, // 1 minute for final confirmation
    filter: (i: MessageComponentInteraction) =>
      i.user.id === interaction.user.id,
  });

  finalCollector.on(
    "collect",
    async (finalInteraction: MessageComponentInteraction) => {
      try {
        if (finalInteraction.isButton()) {
          if (finalInteraction.customId === "cancel_delete_final") {
            await handleCancellation(finalInteraction);
          } else if (
            finalInteraction.customId === `confirm_delete_${selectedBlock.id}`
          ) {
            await executeBlockDeletion(finalInteraction, client, selectedBlock);
          }
        }
        finalCollector.stop();
      } catch (error) {
        console.error("Error in final confirmation:", error);
      }
    }
  );

  finalCollector.on("end", async (collected, reason) => {
    if (reason === "time") {
      await handleConfirmationTimeout(interaction.message);
    }
  });
}

async function handleMultipleBlockSelection(
  interaction: StringSelectMenuInteraction,
  client: Amayo,
  selectedBlocks: BlockItem[]
): Promise<void> {
  const namesList = selectedBlocks
    .map(
      (b) => `• ${b.name} (
ID: ${b.id.slice(-8)})`
    )
    .join("\n");

  const confirmEmbed: APIEmbed = {
    color: 0xff4444,
    title: `⚠️ Confirmar Eliminación de ${selectedBlocks.length} bloques`,
    description: `¿Estás seguro de que quieres **eliminar permanentemente** los siguientes bloques?\n\n${namesList}\n\n❗ **Esta acción NO se puede deshacer.**`,
    footer: { text: "Confirma la eliminación usando los botones" },
  };

  const confirmRow: ActionRowBuilder = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        label: `🗑️ ELIMINAR ${selectedBlocks.length}`,
        custom_id: `confirm_batch_delete_${selectedBlocks
          .map((b) => b.id)
          .join("_")}`,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: "❌ Cancelar",
        custom_id: "cancel_delete_final",
      },
    ],
  };

  await interaction.update({
    embeds: [confirmEmbed],
    components: [confirmRow],
  });

  const finalCollector = interaction.message.createMessageComponentCollector({
    time: 60000,
    filter: (i: MessageComponentInteraction) =>
      i.user.id === interaction.user.id,
  });

  finalCollector.on(
    "collect",
    async (finalInteraction: MessageComponentInteraction) => {
      try {
        if (!finalInteraction.isButton()) return;
        if (finalInteraction.customId === "cancel_delete_final") {
          await handleCancellation(finalInteraction);
        } else if (
          finalInteraction.customId.startsWith("confirm_batch_delete_")
        ) {
          await executeBlocksDeletion(finalInteraction, client, selectedBlocks);
        }
        finalCollector.stop();
      } catch (err) {
        console.error("Error in batch final confirmation:", err);
      }
    }
  );

  finalCollector.on("end", async (_collected, reason) => {
    if (reason === "time") {
      await handleConfirmationTimeout(interaction.message);
    }
  });
}

async function executeBlocksDeletion(
  interaction: ButtonInteraction,
  client: Amayo,
  blocks: BlockItem[]
): Promise<void> {
  try {
    // Delete many by IDs inside a transaction
    const ids = blocks.map((b) => b.id);
    await client.prisma.blockV2Config.deleteMany({
      where: { id: { in: ids } },
    });

    const successEmbed: APIEmbed = {
      color: 0x57f287,
      title: "✅ Bloques Eliminados",
      description: `Se eliminaron ${blocks.length} bloque(s) correctamente.`,
      footer: { text: "Operación completada" },
    };

    await interaction.update({ embeds: [successEmbed], components: [] });
  } catch (error) {
    console.error("Error deleting blocks batch:", error);
    const errorEmbed: APIEmbed = {
      color: 0xf04747,
      title: "❌ Error al eliminar bloques",
      description:
        "Ocurrió un error al eliminar los bloques seleccionados. Intenta de nuevo más tarde.",
      footer: { text: "Error en la eliminación" },
    };
    try {
      await interaction.update({ embeds: [errorEmbed], components: [] });
    } catch {}
  }
}

async function handleConfirmationInteraction(
  confirmMessage: Message,
  originalMessage: Message,
  client: Amayo,
  block: any
): Promise<void> {
  const collector = confirmMessage.createMessageComponentCollector({
    time: 60000, // 1 minute
    filter: (interaction: MessageComponentInteraction) =>
      interaction.user.id === originalMessage.author.id,
  });

  collector.on("collect", async (interaction: MessageComponentInteraction) => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === "cancel_delete") {
          await handleCancellation(interaction);
        } else if (interaction.customId === `confirm_delete_${block.id}`) {
          await executeBlockDeletion(interaction, client, {
            name: block.name,
            id: block.id,
          });
        }
      }
      collector.stop();
    } catch (error) {
      console.error("Error in confirmation interaction:", error);
    }
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      await handleConfirmationTimeout(confirmMessage);
    }
  });
}

async function executeBlockDeletion(
  interaction: ButtonInteraction,
  client: Amayo,
  block: BlockItem
): Promise<void> {
  try {
    // Delete the block from database
    await client.prisma.blockV2Config.delete({
      where: { id: block.id },
    });

    const successEmbed: APIEmbed = {
      color: 0x57f287,
      title: "✅ Bloque Eliminado",
      description: `El bloque \`${block.name}\` ha sido eliminado exitosamente.\n\n🗑️ **Operación completada**\n📄 **Bloque:** \`${block.name}\`\n🔑 **ID:** \`${block.id}\``,
      footer: { text: "Bloque eliminado permanentemente" },
    };

    await interaction.update({
      embeds: [successEmbed],
      components: [],
    });
  } catch (error) {
    console.error("Error deleting block:", error);

    const errorEmbed: APIEmbed = {
      color: 0xf04747,
      title: "❌ Error al Eliminar",
      description: `No se pudo eliminar el bloque \`${block.name}\`.\n\nPor favor, inténtalo de nuevo más tarde.`,
      footer: { text: "Error en la eliminación" },
    };

    await interaction.update({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

async function handlePanelTimeout(panelMessage: Message): Promise<void> {
  const timeoutEmbed: APIEmbed = {
    color: 0x36393f,
    title: "⏰ Panel Expirado",
    description:
      "El panel de eliminación ha expirado por inactividad.\n\nUsa `!eliminar-embed` para abrir un nuevo panel.",
    footer: { text: "Panel expirado por inactividad" },
  };

  try {
    await panelMessage.edit({
      embeds: [timeoutEmbed],
      components: [],
    });
  } catch (error) {
    console.log("Could not edit message on timeout, likely deleted");
  }
}

async function handleConfirmationTimeout(
  confirmMessage: Message
): Promise<void> {
  const timeoutEmbed: APIEmbed = {
    color: 0x36393f,
    title: "⏰ Confirmación Expirada",
    description:
      "La confirmación ha expirado por inactividad.\nLa eliminación ha sido cancelada.",
    footer: { text: "Confirmación expirada" },
  };

  try {
    await confirmMessage.edit({
      embeds: [timeoutEmbed],
      components: [],
    });
  } catch (error) {
    console.log("Could not edit confirmation message on timeout");
  }
}
