import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";
import { getOrCreateWallet } from "../../../game/economy/service";
import {
  getEquipment,
  getEffectiveStats,
} from "../../../game/combat/equipmentService";
import type { ItemProps } from "../../../game/economy/types";
import {
  buildDisplay,
  dividerBlock,
  textBlock,
} from "../../../core/lib/componentsV2";
import { sendDisplayReply, formatItemLabel } from "./_helpers";

const PAGE_SIZE = 15;

import { parseItemProps } from "../../../game/core/utils";

function fmtTool(props: ItemProps) {
  const t = props.tool;
  if (!t) return "";
  const icon =
    t.type === "pickaxe"
      ? "⛏️"
      : t.type === "rod"
      ? "🎣"
      : t.type === "sword"
      ? "🗡️"
      : t.type === "bow"
      ? "🏹"
      : t.type === "halberd"
      ? "⚔️"
      : t.type === "net"
      ? "🕸️"
      : "🔧";
  const tier = t.tier != null ? ` t${t.tier}` : "";
  return `${icon}${tier}`;
}

function fmtStats(props: ItemProps) {
  const parts: string[] = [];
  if (typeof props.damage === "number" && props.damage > 0)
    parts.push(`atk+${props.damage}`);
  if (typeof props.defense === "number" && props.defense > 0)
    parts.push(`def+${props.defense}`);
  if (typeof props.maxHpBonus === "number" && props.maxHpBonus > 0)
    parts.push(`hp+${props.maxHpBonus}`);
  return parts.length ? ` (${parts.join(" ")})` : "";
}

const INVENTORY_ACCENT = 0xfee75c;

export const command: CommandMessage = {
  name: "inventario",
  type: "message",
  aliases: ["inv"],
  cooldown: 3,
  description:
    'Muestra tu inventario por servidor, con saldo y equipo. Usa "inv <página>" o "inv <filtro|itemKey>".',
  usage: "inventario [página|filtro|itemKey]",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;

    const wallet = await getOrCreateWallet(userId, guildId);
    const { weapon, armor, cape } = await getEquipment(userId, guildId);
    const stats = await getEffectiveStats(userId, guildId);

    const arg = args[0]?.trim();
    const asPage =
      arg && /^\d+$/.test(arg) ? Math.max(1, parseInt(arg, 10)) : 1;
    const filter = arg && !/^\d+$/.test(arg) ? arg.toLowerCase() : "";

    // detalle exacto si coincide completamente una key
    let detailKey: string | null = null;
    if (filter) detailKey = filter; // intentaremos exact match primero

    if (detailKey) {
      const itemRow = await prisma.economyItem.findFirst({
        where: { key: detailKey, OR: [{ guildId }, { guildId: null }] },
        orderBy: [{ guildId: "desc" }],
      });
      if (itemRow) {
        const inv = await prisma.inventoryEntry.findUnique({
          where: {
            userId_guildId_itemId: { userId, guildId, itemId: itemRow.id },
          },
        });
        const qty = inv?.quantity ?? 0;
        const props = parseItemProps(itemRow.props);
        const tool = fmtTool(props);
        const st = fmtStats(props);
        const tags = (itemRow.tags || []).join(", ");
        const detailLines = [
          `**Cantidad:** x${qty}`,
          `**Key:** \`${itemRow.key}\``,
          itemRow.category ? `**Categoría:** ${itemRow.category}` : "",
          tags ? `**Tags:** ${tags}` : "",
          tool ? `**Herramienta:** ${tool}` : "",
          st ? `**Bonos:** ${st}` : "",
          props.craftingOnly ? "⚠️ Solo crafteo" : "",
        ]
          .filter(Boolean)
          .join("\n");

        const display = buildDisplay(INVENTORY_ACCENT, [
          textBlock(`# ${formatItemLabel(itemRow, { bold: true })}`),
          dividerBlock(),
          textBlock(detailLines || "*Sin información adicional.*"),
        ]);

        await sendDisplayReply(message, display);
        return;
      }
    }

    // listado paginado
    const whereInv = { userId, guildId, quantity: { gt: 0 } } as const;
    const all = await prisma.inventoryEntry.findMany({
      where: whereInv,
      include: { item: true },
    });
    const filtered = filter
      ? all.filter(
          (e) =>
            e.item.key.toLowerCase().includes(filter) ||
            (e.item.name ?? "").toLowerCase().includes(filter)
        )
      : all;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(asPage, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered
      .sort(
        (a, b) =>
          b.quantity - a.quantity || a.item.key.localeCompare(b.item.key)
      )
      .slice(start, start + PAGE_SIZE);

    const gear: string[] = [];
    if (weapon)
      gear.push(`🗡️ ${formatItemLabel(weapon, { fallbackIcon: "" })}`);
    if (armor) gear.push(`🛡️ ${formatItemLabel(armor, { fallbackIcon: "" })}`);
    if (cape) gear.push(`🧥 ${formatItemLabel(cape, { fallbackIcon: "" })}`);
    const headerLines = [
      `💰 Monedas: **${wallet.coins}**`,
      gear.length ? `🧰 Equipo: ${gear.join(" · ")}` : "",
      `❤️ HP: ${stats.hp}/${stats.maxHp} · ⚔️ ATK: ${stats.damage} · 🛡️ DEF: ${stats.defense}`,
      filter ? `🔍 Filtro: ${filter}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blocks = [
      textBlock("# 📦 Inventario"),
      dividerBlock(),
      textBlock(headerLines),
    ];

    if (!pageItems.length) {
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      blocks.push(
        textBlock(
          filter
            ? `No hay ítems que coincidan con "${filter}".`
            : "No tienes ítems en tu inventario."
        )
      );
      const display = buildDisplay(INVENTORY_ACCENT, blocks);
      await sendDisplayReply(message, display);
      return;
    }

    blocks.push(dividerBlock({ divider: false, spacing: 1 }));
    blocks.push(
      textBlock(
        `📦 Inventario (página ${page}/${totalPages}${
          filter ? `, filtro: ${filter}` : ""
        })`
      )
    );
    blocks.push(dividerBlock({ divider: false, spacing: 1 }));

    pageItems.forEach((entry, index) => {
      const props = parseItemProps(entry.item.props);
      const tool = fmtTool(props);
      const st = fmtStats(props);
      const label = formatItemLabel(entry.item);

      // Mostrar durabilidad para items non-stackable con breakable
      let qtyDisplay = `x${entry.quantity}`;
      if (
        !entry.item.stackable &&
        props.breakable &&
        props.breakable.enabled !== false
      ) {
        const state = entry.state as any;
        const instances = state?.instances ?? [];
        if (instances.length > 0 && instances[0]?.durability != null) {
          const firstDur = instances[0].durability;
          const maxDur = props.breakable.maxDurability ?? 100;
          qtyDisplay = `(${firstDur}/${maxDur})`;
          if (instances.length > 1) {
            qtyDisplay += ` x${instances.length}`;
          }
        } else if (instances.length === 0) {
          qtyDisplay = `⚠️ CORRUPTO (x${entry.quantity})`;
        }
      }

      blocks.push(
        textBlock(`• ${label} — ${qtyDisplay}${tool ? ` ${tool}` : ""}${st}`)
      );
      if (index < pageItems.length - 1) {
        blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      }
    });

    if (totalPages > 1) {
      const nextPage = Math.min(page + 1, totalPages);
      const nextCommand = filter
        ? `!inv ${nextPage} ${filter}`
        : `!inv ${nextPage}`;
      const backtick = "`";
      blocks.push(dividerBlock({ divider: false, spacing: 2 }));
      blocks.push(
        textBlock(
          `💡 Usa ${backtick}${nextCommand}${backtick} para la siguiente página.`
        )
      );
    }

    const display = buildDisplay(INVENTORY_ACCENT, blocks);
    await sendDisplayReply(message, display);
  },
};
