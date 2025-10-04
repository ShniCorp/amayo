import {
    Message,
    ButtonInteraction,
    StringSelectMenuInteraction,
    MessageComponentInteraction,
    ComponentType,
    ButtonStyle,
    APIButtonComponent,
    APIStringSelectComponent,
    APIEmbed
} from "discord.js";
import { CommandMessage } from "../../../core/types/commands";
import type {
    BlockConfig,
    PaginationData
} from "../../../core/types/displayComponents";
import type Amayo from "../../../core/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";

interface BlockListItem {
    name: string;
    id: string;
    config: JsonValue; // Use Prisma's JsonValue type
}

interface ActionRowBuilder {
    type: ComponentType.ActionRow;
    components: (APIButtonComponent | APIStringSelectComponent)[];
}

export const command: CommandMessage = {
    name: "lista-bloques",
    type: "message",
    aliases: ["bloques", "ver-bloques", "blocks"],
    cooldown: 10,
    description: "Muestra todos los bloques DisplayComponents configurados en el servidor",
    category: "Alianzas",
    usage: "lista-bloques",
    run: async (message: Message, args: string[], client: Amayo): Promise<void> => {
        const allowed = await hasManageGuildOrStaff(message.member, message.guildId!, client.prisma);
        if (!allowed) {
            await message.reply("❌ No tienes permisos de ManageGuild ni rol de staff.");
            return;
        }

        const blocks = await fetchBlocks(client, message.guildId!);

        if (blocks.length === 0) {
            await handleEmptyBlocksList(message);
            return;
        }

        const pagination = createPagination(blocks, 0, 5);
        const panelMessage = await message.reply({
            embeds: [generateBlockListEmbed(pagination)],
            components: generateActionRows(pagination)
        });

        await handleInteractions(panelMessage, message, client, pagination);
    },
};

async function fetchBlocks(client: Amayo, guildId: string): Promise<BlockListItem[]> {
    return await client.prisma.blockV2Config.findMany({
        where: { guildId },
        select: {
            name: true,
            id: true,
            config: true
        },
        orderBy: { name: 'asc' }
    });
}

async function handleEmptyBlocksList(message: Message): Promise<void> {
    const emptyEmbed: APIEmbed = {
        color: 0x5865f2,
        title: "📚 Centro de Gestión de Bloques",
        description: "📭 **No hay bloques disponibles**\n\nEste servidor aún no tiene bloques configurados.\n\n🚀 **¿Quieres empezar?**\n• Usa `!crear-embed <nombre>` para crear tu primer bloque\n• Usa `!editar-embed <nombre>` para editar bloques existentes",
        footer: { text: "Sistema de gestión de bloques • Amayo Bot" }
    };

    const createRow: ActionRowBuilder = {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                label: "📝 Crear Primer Bloque",
                custom_id: "show_create_help"
            }
        ]
    };

    const helpMessage = await message.reply({
        embeds: [emptyEmbed],
        components: [createRow]
    });

    const helpCollector = helpMessage.createMessageComponentCollector({
        time: 60000,
        filter: (interaction: MessageComponentInteraction) => interaction.user.id === message.author.id
    });

    helpCollector.on("collect", async (interaction: MessageComponentInteraction) => {
        if (interaction.isButton() && interaction.customId === "show_create_help") {
            const helpEmbed: APIEmbed = {
                color: 0x57f287,
                title: "📖 Guía de Creación de Bloques",
                description: "🔧 **Comandos disponibles:**\n\n• `!crear-embed <nombre>` - Crear nuevo bloque\n• `!editar-embed <nombre>` - Editar bloque existente\n• `!eliminar-embed <nombre>` - Eliminar bloque\n• `!lista-embeds` - Ver todos los bloques\n\n💡 **Tip:** Los bloques permiten crear interfaces modernas e interactivas.",
                footer: { text: "Guía de comandos de creación" }
            };

            await interaction.update({
                embeds: [helpEmbed],
                components: []
            });
        }
    });
}

function createPagination(blocks: BlockListItem[], currentPage: number, itemsPerPage: number): PaginationData<BlockListItem> {
    const totalPages = Math.ceil(blocks.length / itemsPerPage);
    return {
        items: blocks,
        currentPage,
        totalPages,
        itemsPerPage
    };
}

function generateBlockListEmbed(pagination: PaginationData<BlockListItem>): APIEmbed {
    const { items, currentPage, totalPages, itemsPerPage } = pagination;
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);
    const pageBlocks = items.slice(startIndex, endIndex);

    let blockListText = `📊 **Página ${currentPage + 1} de ${totalPages}** (${items.length} total)\n\n`;

    pageBlocks.forEach((block, index) => {
        const globalIndex = startIndex + index + 1;
        const config = block.config as BlockConfig;
        const componentsCount = Array.isArray(config?.components) ? config.components.length : 0;
        const hasImage = config?.coverImage ? "🖼️" : "";

        blockListText += `**${globalIndex}.** \`${block.name}\` ${hasImage}\n`;
        blockListText += `   └ ${componentsCount} componente(s) • ID: ${block.id.slice(-8)}\n\n`;
    });

    return {
        color: 0x5865f2,
        title: "📚 Centro de Gestión de Bloques",
        description: blockListText,
        footer: { text: `Página ${currentPage + 1}/${totalPages} • ${items.length} bloques total` }
    };
}

function generateActionRows(pagination: PaginationData<BlockListItem>): ActionRowBuilder[] {
    const rows: ActionRowBuilder[] = [];
    const { items, currentPage, totalPages, itemsPerPage } = pagination;

    // Select menu for quick actions on current page blocks
    const currentPageBlocks = items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    if (currentPageBlocks.length > 0) {
        const selectOptions = currentPageBlocks.map((block) => {
            const config = block.config as BlockConfig;
            const componentsCount = Array.isArray(config?.components) ? config.components.length : 0;
            return {
                label: block.name,
                value: block.name,
                description: `${componentsCount} componente(s)`,
                emoji: { name: "⚙️" }
            };
        });

        rows.push({
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.StringSelect,
                    custom_id: "block_actions_select",
                    placeholder: "⚙️ Selecciona un bloque para gestionar...",
                    options: selectOptions
                }
            ]
        });
    }

    // Navigation buttons
    const navigationComponents: APIButtonComponent[] = [];

    if (totalPages > 1) {
        navigationComponents.push(
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "◀️ Anterior",
                custom_id: "prev_page",
                disabled: currentPage === 0
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: `${currentPage + 1}/${totalPages}`,
                custom_id: "page_info",
                disabled: true
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "▶️ Siguiente",
                custom_id: "next_page",
                disabled: currentPage === totalPages - 1
            }
        );
    }

    navigationComponents.push({
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: "🔄 Refrescar",
        custom_id: "refresh_list"
    });

    rows.push({
        type: ComponentType.ActionRow,
        components: navigationComponents
    });

    // Action buttons
    rows.push({
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                label: "📝 Crear Nuevo",
                custom_id: "show_create_commands"
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Secondary,
                label: "📋 Exportar Lista",
                custom_id: "export_block_list"
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                label: "🗑️ Eliminar",
                custom_id: "show_delete_commands"
            }
        ]
    });

    return rows;
}

async function handleInteractions(
    panelMessage: Message,
    originalMessage: Message,
    client: Amayo,
    pagination: PaginationData<BlockListItem>
): Promise<void> {
    const collector = panelMessage.createMessageComponentCollector({
        time: 600000,
        filter: (interaction: MessageComponentInteraction) => interaction.user.id === originalMessage.author.id
    });

    collector.on("collect", async (interaction: MessageComponentInteraction) => {
        try {
            if (interaction.isButton()) {
                await handleButtonInteraction(interaction, client, pagination, originalMessage.guildId!);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(interaction);
            }
        } catch (error) {
            console.error("Error handling interaction:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Ocurrió un error al procesar la interacción.",
                    flags: 64 // Use flags instead of ephemeral
                });
            }
        }
    });

    collector.on("end", async (collected, reason) => {
        if (reason === "time") {
            await handleCollectorTimeout(panelMessage);
        }
    });
}

async function handleButtonInteraction(
    interaction: ButtonInteraction,
    client: Amayo,
    pagination: PaginationData<BlockListItem>,
    guildId: string
): Promise<void> {
    switch (interaction.customId) {
        case "prev_page":
            if (pagination.currentPage > 0) {
                pagination.currentPage--;
                await interaction.update({
                    embeds: [generateBlockListEmbed(pagination)],
                    components: generateActionRows(pagination)
                });
            }
            break;

        case "next_page":
            if (pagination.currentPage < pagination.totalPages - 1) {
                pagination.currentPage++;
                await interaction.update({
                    embeds: [generateBlockListEmbed(pagination)],
                    components: generateActionRows(pagination)
                });
            }
            break;

        case "refresh_list":
            const refreshedBlocks = await fetchBlocks(client, guildId);
            pagination.items = refreshedBlocks;
            pagination.totalPages = Math.ceil(refreshedBlocks.length / pagination.itemsPerPage);

            if (pagination.currentPage >= pagination.totalPages) {
                pagination.currentPage = Math.max(0, pagination.totalPages - 1);
            }

            await interaction.update({
                embeds: [generateBlockListEmbed(pagination)],
                components: generateActionRows(pagination)
            });
            break;

        case "show_create_commands":
            await interaction.reply({
                content: `🔧 **Crear nuevos bloques:**\n\n• \`!crear-embed <nombre>\` - Crear bloque básico\n• \`!editar-embed <nombre>\` - Editor avanzado\n\n💡 **Ejemplo:** \`!crear-embed bienvenida\`\n\n📖 **Guía completa:** Los bloques usan DisplayComponents para crear interfaces modernas e interactivas.`,
                flags: 64
            });
            break;

        case "show_delete_commands":
            await interaction.reply({
                content: `⚠️ **Eliminar bloques:**\n\n• \`!eliminar-embed\` - Panel interactivo de eliminación\n• \`!eliminar-embed <nombre>\` - Eliminación directa\n\n❗ **Advertencia:** La eliminación es irreversible.`,
                flags: 64
            });
            break;

        case "export_block_list":
            const exportText = pagination.items.map((block, index) => {
                const config = block.config as BlockConfig;
                const componentsCount = Array.isArray(config?.components) ? config.components.length : 0;
                return `${index + 1}. ${block.name} (${componentsCount} componentes) - ID: ${block.id}`;
            }).join('\n');

            await interaction.reply({
                content: `📋 **Lista Exportada:**\n\`\`\`\n${exportText}\`\`\``,
                flags: 64
            });
            break;

        case "back_to_list":
            await interaction.update({
                embeds: [generateBlockListEmbed(pagination)],
                components: generateActionRows(pagination)
            });
            break;

        default:
            await handleSpecificBlockActions(interaction);
            break;
    }
}

async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
    if (interaction.customId === "block_actions_select") {
        const selectedBlock = interaction.values[0];

        const blockActionEmbed: APIEmbed = {
            color: 0xff9500,
            title: `⚙️ Gestión de Bloque: \`${selectedBlock}\``,
            description: "Selecciona la acción que deseas realizar con este bloque:",
            footer: { text: "Acciones disponibles para el bloque seleccionado" }
        };

        const blockActionsRow: ActionRowBuilder = {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Primary,
                    label: "✏️ Editar",
                    custom_id: `edit_block_${selectedBlock}`
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: "👁️ Vista Previa",
                    custom_id: `preview_block_${selectedBlock}`
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: "📋 Duplicar",
                    custom_id: `duplicate_block_${selectedBlock}`
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Danger,
                    label: "🗑️ Eliminar",
                    custom_id: `delete_block_${selectedBlock}`
                }
            ]
        };

        const backRow: ActionRowBuilder = {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Secondary,
                    label: "↩️ Volver a la Lista",
                    custom_id: "back_to_list"
                }
            ]
        };

        await interaction.update({
            embeds: [blockActionEmbed],
            components: [blockActionsRow, backRow]
        });
    }
}

async function handleSpecificBlockActions(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction;

    if (customId.startsWith("edit_block_")) {
        const blockName = customId.replace("edit_block_", "");
        await interaction.reply({
            content: `Usa: \`!editar-embed ${blockName}\``,
            flags: 64
        });
    } else if (customId.startsWith("delete_block_")) {
        const blockName = customId.replace("delete_block_", "");
        await interaction.reply({
            content: `Usa: \`!eliminar-embed ${blockName}\` para eliminar este bloque de forma segura.`,
            flags: 64
        });
    } else if (customId.startsWith("preview_block_")) {
        const blockName = customId.replace("preview_block_", "");
        await interaction.reply({
            content: `Vista previa de \`${blockName}\` - Funcionalidad en desarrollo`,
            flags: 64
        });
    } else if (customId.startsWith("duplicate_block_")) {
        const blockName = customId.replace("duplicate_block_", "");
        await interaction.reply({
            content: `Funcionalidad de duplicación de \`${blockName}\` en desarrollo`,
            flags: 64
        });
    }
}

async function handleCollectorTimeout(panelMessage: Message): Promise<void> {
    const timeoutEmbed: APIEmbed = {
        color: 0x36393f,
        title: "⏰ Panel Expirado",
        description: "El panel de gestión ha expirado por inactividad.\n\nUsa `!lista-embeds` para abrir un nuevo panel de gestión.",
        footer: { text: "Panel expirado por inactividad" }
    };

    try {
        await panelMessage.edit({
            embeds: [timeoutEmbed],
            components: []
        });
    } catch (error) {
        // Message was deleted or other edit error - ignore
        console.log("Could not edit message on timeout, likely deleted");
    }
}
