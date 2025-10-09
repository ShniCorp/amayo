import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import {
  Message,
  ButtonInteraction,
  MessageComponentInteraction,
  ComponentType,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuInteraction,
} from "discord.js";
import { prisma } from "../../../core/database/prisma";
import { getOrCreateWallet, buyFromOffer } from "../../../game/economy/service";
import type { DisplayComponentContainer } from "../../../core/types/displayComponents";
import type { ItemProps } from "../../../game/economy/types";
import { formatItemLabel, resolveItemIcon } from "./_helpers";

const ITEMS_PER_PAGE = 5;

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== "object") return {};
  return json as ItemProps;
}

function formatPrice(price: any): string {
  const parts: string[] = [];
  if (price.coins) parts.push(`💰 ${price.coins}`);
  if (price.items && price.items.length > 0) {
    for (const item of price.items) {
      parts.push(`📦 ${item.itemKey} x${item.qty}`);
    }
  }
  return parts.join(" + ") || "¿Gratis?";
}

function getItemIcon(props: ItemProps, category?: string): string {
  if (props.tool) {
    const t = props.tool.type;
    if (t === "pickaxe") return "⛏️";
    if (t === "rod") return "🎣";
    if (t === "sword") return "🗡️";
    if (t === "bow") return "🏹";
    if (t === "halberd") return "⚔️";
    if (t === "net") return "🕸️";
    return "🔧";
  }
  if (props.damage && props.damage > 0) return "⚔️";
  if (props.defense && props.defense > 0) return "🛡️";
  if (props.food) return "🍖";
  if (props.chest) return "📦";
  if (category === "consumables") return "🧪";
  if (category === "materials") return "🔨";
  return "📦";
}

export const command: CommandMessage = {
  name: "tienda",
  type: "message",
  aliases: ["shop", "store"],
  cooldown: 5,
  description:
    "Abre la tienda y navega por las ofertas disponibles con un panel interactivo.",
  usage: "tienda [categoria]",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;

    // Obtener wallet del usuario
    const wallet = await getOrCreateWallet(userId, guildId);

    // Obtener todas las ofertas activas
    const now = new Date();
    const offers = await prisma.shopOffer.findMany({
      where: {
        guildId,
        enabled: true,
        OR: [
          { startAt: null, endAt: null },
          { startAt: { lte: now }, endAt: { gte: now } },
          { startAt: { lte: now }, endAt: null },
          { startAt: null, endAt: { gte: now } },
        ],
      },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });

    if (offers.length === 0) {
      await message.reply(
        "<a:seven:1425666197466255481> La tienda está vacía. ¡Vuelve más tarde!"
      );
      return;
    }

    // Filtrar por categoría si se proporciona
    const categoryFilter = args[0]?.trim().toLowerCase();
    const filteredOffers = categoryFilter
      ? offers.filter((o) =>
          o.item.category?.toLowerCase().includes(categoryFilter)
        )
      : offers;

    if (filteredOffers.length === 0) {
      await message.reply(
        `<a:seven:1425666197466255481> No hay ofertas en la categoría "${categoryFilter}".`
      );
      return;
    }

    // Estado inicial
    const sessionState = {
      currentPage: 1,
      selectedOfferId: null as string | null,
    };

    const shopMessage = await message.reply({
      flags: MessageFlags.SuppressEmbeds | 32768,
      components: await buildShopPanel(
        filteredOffers,
        sessionState.currentPage,
        wallet.coins,
        sessionState.selectedOfferId
      ),
    });

    // Collector para interacciones
    const collector = shopMessage.createMessageComponentCollector({
      time: 300000, // 5 minutos
      filter: (i: MessageComponentInteraction) =>
        i.user.id === message.author.id,
    });

    collector.on(
      "collect",
      async (interaction: MessageComponentInteraction) => {
        try {
          if (interaction.isButton()) {
            await handleButtonInteraction(
              interaction as ButtonInteraction,
              filteredOffers,
              sessionState,
              userId,
              guildId,
              shopMessage,
              collector
            );
          } else if (interaction.isStringSelectMenu()) {
            await handleSelectInteraction(
              interaction as StringSelectMenuInteraction,
              filteredOffers,
              sessionState.currentPage,
              userId,
              guildId,
              shopMessage
            );
          }
        } catch (error: any) {
          console.error("Error handling shop interaction:", error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `❌ Error: ${error?.message ?? error}`,
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    );

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        try {
          await shopMessage.edit({
            components: await buildExpiredPanel(),
          });
        } catch {}
      }
    });
  },
};

async function buildShopPanel(
  offers: any[],
  page: number,
  userCoins: number,
  selectedOfferId: string | null
): Promise<any[]> {
  const totalPages = Math.ceil(offers.length / ITEMS_PER_PAGE);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const pageOffers = offers.slice(start, start + ITEMS_PER_PAGE);

  // Encontrar la oferta seleccionada
  const selectedOffer = selectedOfferId
    ? offers.find((o) => o.id === selectedOfferId)
    : null;

  // Container principal
  const container: DisplayComponentContainer = {
    type: 17,
    accent_color: 0xffa500,
    components: [
      {
        type: 10,
        content: `# <a:seven:1425666197466255481> Tienda - Ofertas Disponibles`,
      },
      {
        type: 10,
        content: `-# <:coin:1425667511013081169> Monedas: **${userCoins}**`,
      },
      {
        type: 14,
        divider: true,
        spacing: 2,
      },
    ],
  };

  // Si hay una oferta seleccionada, mostrar detalles
  if (selectedOffer) {
    const item = selectedOffer.item;
    const props = parseItemProps(item.props);
    const label = formatItemLabel(item, {
      fallbackIcon: getItemIcon(props, item.category),
      bold: true,
    });
    const price = formatPrice(selectedOffer.price);

    // Stock info
    let stockInfo = "";
    if (selectedOffer.stock != null) {
      stockInfo = `\n<:clipboard:1425669350316048435> Stock: ${selectedOffer.stock}`;
    }
    if (selectedOffer.perUserLimit != null) {
      const purchased = await prisma.shopPurchase.aggregate({
        where: { offerId: selectedOffer.id },
        _sum: { qty: true },
      });
      const userPurchased = purchased._sum.qty ?? 0;
      stockInfo += `\n<:Sup_urg:1420535068056748042> Límite por usuario: ${userPurchased}/${selectedOffer.perUserLimit}`;
    }

    // Stats del item
    let statsInfo = "";
    if (props.damage)
      statsInfo += `\n<:damage:1425670476449189998> Daño: +${props.damage}`;
    if (props.defense)
      statsInfo += `\n<:defens:1425670433910427862> Defensa: +${props.defense}`;
    if (props.maxHpBonus)
      statsInfo += `\n<:healbonus:1425671499792121877> HP Bonus: +${props.maxHpBonus}`;
    if (props.tool)
      statsInfo += `\n<:table:1425673712312782879> Herramienta: ${
        props.tool.type
      } T${props.tool.tier ?? 1}`;
    if (props.food && props.food.healHp)
      statsInfo += `\n<:cure:1425671519639572510> Cura: ${props.food.healHp} HP`;

    container.components.push({
      type: 10,
      content: `${label}\n\n${
        item.description || "Sin descripción"
      }${statsInfo}\n\n<:price:1425673879094820906> Precio: ${price}${stockInfo}`,
    });

    container.components.push({
      type: 14,
      divider: true,
      spacing: 1,
    });
  }

  // Lista de ofertas en la página
  container.components.push({
    type: 10,
    content: selectedOffer
      ? "<:clipboard:1425669350316048435> **Otras Ofertas:**"
      : "<:clipboard:1425669350316048435> **Ofertas Disponibles:**",
  });

  for (const offer of pageOffers) {
    const item = offer.item;
    const props = parseItemProps(item.props);
    const label = formatItemLabel(item, {
      fallbackIcon: getItemIcon(props, item.category),
      bold: true,
    });
    const price = formatPrice(offer.price);
    const isSelected = selectedOfferId === offer.id;

    const stockText =
      offer.stock != null ? ` (${offer.stock} disponibles)` : "";
    const selectedMark = isSelected ? " ✓" : "";

    container.components.push({
      type: 9,
      components: [
        {
          type: 10,
          content: `${label}${selectedMark}\n<:coin:1425667511013081169> ${price}${stockText}`,
        },
      ],
      accessory: {
        type: 2,
        style: isSelected ? ButtonStyle.Success : ButtonStyle.Primary,
        label: isSelected ? "Seleccionado" : "Ver",
        custom_id: `shop_view_${offer.id}`,
      },
    });
  }

  // Botones de navegación y acciones
  const actionRow1 = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: "◀️ Anterior",
        custom_id: "shop_prev_page",
        disabled: safePage <= 1,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: `Página ${safePage}/${totalPages}`,
        custom_id: "shop_current_page",
        disabled: true,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: "Siguiente ▶️",
        custom_id: "shop_next_page",
        disabled: safePage >= totalPages,
      },
    ],
  };

  const actionRow2 = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Success,
        label: "🛒 Comprar (x1)",
        custom_id: "shop_buy_1",
        disabled: !selectedOfferId,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Success,
        label: "🛒 Comprar (x5)",
        custom_id: "shop_buy_5",
        disabled: !selectedOfferId,
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: "🔄 Actualizar",
        custom_id: "shop_refresh",
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        label: "❌ Cerrar",
        custom_id: "shop_close",
      },
    ],
  };

  return [container, actionRow1, actionRow2];
}

async function handleButtonInteraction(
  interaction: ButtonInteraction,
  offers: any[],
  sessionState: { currentPage: number; selectedOfferId: string | null },
  userId: string,
  guildId: string,
  shopMessage: Message,
  collector: any
): Promise<void> {
  const customId = interaction.customId;

  // Ver detalles de un item
  if (customId.startsWith("shop_view_")) {
    const offerId = customId.replace("shop_view_", "");
    const wallet = await getOrCreateWallet(userId, guildId);
    sessionState.selectedOfferId = offerId;

    await interaction.update({
      components: await buildShopPanel(
        offers,
        sessionState.currentPage,
        wallet.coins,
        sessionState.selectedOfferId
      ),
    });
    return;
  }

  // Comprar
  if (customId === "shop_buy_1" || customId === "shop_buy_5") {
    const selectedOfferId = sessionState.selectedOfferId;
    if (!selectedOfferId) {
      await interaction.reply({
        content: "❌ Primero selecciona un item.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const qty = customId === "shop_buy_1" ? 1 : 5;

    try {
      await interaction.deferUpdate();
      const result = await buyFromOffer(userId, guildId, selectedOfferId, qty);
      const wallet = await getOrCreateWallet(userId, guildId);

      const purchaseLabel = formatItemLabel(result.item, {
        fallbackIcon: resolveItemIcon(result.item.icon),
      });
      await interaction.followUp({
        content: `✅ **Compra exitosa!**\n🛒 ${purchaseLabel} x${result.qty}\n<:coin:1425667511013081169> Te quedan: ${wallet.coins} monedas`,
        flags: MessageFlags.Ephemeral,
      });

      // Actualizar tienda
      await shopMessage.edit({
        components: await buildShopPanel(
          offers,
          sessionState.currentPage,
          wallet.coins,
          sessionState.selectedOfferId
        ),
      });
    } catch (error: any) {
      await interaction.followUp({
        content: `❌ No se pudo comprar: ${error?.message ?? error}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // Actualizar
  if (customId === "shop_refresh") {
    const wallet = await getOrCreateWallet(userId, guildId);
    await interaction.update({
      components: await buildShopPanel(
        offers,
        sessionState.currentPage,
        wallet.coins,
        sessionState.selectedOfferId
      ),
    });
    return;
  }

  // Cerrar
  if (customId === "shop_close") {
    await interaction.update({
      components: await buildClosedPanel(),
    });
    collector.stop();
    return;
  }

  // Navegación de páginas (ya manejado en el collect)
  if (customId === "shop_prev_page" || customId === "shop_next_page") {
    const wallet = await getOrCreateWallet(userId, guildId);
    let newPage = sessionState.currentPage;

    if (customId === "shop_prev_page") {
      newPage = Math.max(1, sessionState.currentPage - 1);
    } else {
      const totalPages = Math.ceil(offers.length / ITEMS_PER_PAGE);
      newPage = Math.min(totalPages, sessionState.currentPage + 1);
    }

    sessionState.currentPage = newPage;

    await interaction.update({
      components: await buildShopPanel(
        offers,
        sessionState.currentPage,
        wallet.coins,
        sessionState.selectedOfferId
      ),
    });
    return;
  }
}

async function handleSelectInteraction(
  interaction: StringSelectMenuInteraction,
  offers: any[],
  currentPage: number,
  userId: string,
  guildId: string,
  shopMessage: Message
): Promise<void> {
  // Si implementas un select menu, manejar aquí
  await interaction.reply({
    content: "Select menu no implementado aún",
    flags: MessageFlags.Ephemeral,
  });
}

async function buildExpiredPanel(): Promise<any[]> {
  const container: DisplayComponentContainer = {
    type: 17,
    accent_color: 0x36393f,
    components: [
      {
        type: 10,
        content: "⏰ **Tienda Expirada**",
      },
      {
        type: 14,
        divider: true,
        spacing: 1,
      },
      {
        type: 10,
        content:
          "La sesión de tienda ha expirado.\nUsa `!tienda` nuevamente para ver las ofertas.",
      },
    ],
  };

  return [container];
}

async function buildClosedPanel(): Promise<any[]> {
  const container: DisplayComponentContainer = {
    type: 17,
    accent_color: 0x36393f,
    components: [
      {
        type: 10,
        content: "✅ **Tienda Cerrada**",
      },
      {
        type: 14,
        divider: true,
        spacing: 1,
      },
      {
        type: 10,
        content: "¡Gracias por visitar la tienda!\nVuelve pronto. 🛒",
      },
    ],
  };

  return [container];
}
