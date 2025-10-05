import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { getOrCreateWallet } from '../../../game/economy/service';
import { getEquipment, getEffectiveStats } from '../../../game/combat/equipmentService';
import type { ItemProps } from '../../../game/economy/types';

const PAGE_SIZE = 15;

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== 'object') return {};
  return json as ItemProps;
}

function fmtTool(props: ItemProps) {
  const t = props.tool;
  if (!t) return '';
  const icon = t.type === 'pickaxe' ? '⛏️' : t.type === 'rod' ? '🎣' : t.type === 'sword' ? '🗡️' : t.type === 'bow' ? '🏹' : t.type === 'halberd' ? '⚔️' : t.type === 'net' ? '🕸️' : '🔧';
  const tier = t.tier != null ? ` t${t.tier}` : '';
  return `${icon}${tier}`;
}

function fmtStats(props: ItemProps) {
  const parts: string[] = [];
  if (typeof props.damage === 'number' && props.damage > 0) parts.push(`atk+${props.damage}`);
  if (typeof props.defense === 'number' && props.defense > 0) parts.push(`def+${props.defense}`);
  if (typeof props.maxHpBonus === 'number' && props.maxHpBonus > 0) parts.push(`hp+${props.maxHpBonus}`);
  return parts.length ? ` (${parts.join(' ')})` : '';
}

export const command: CommandMessage = {
  name: 'inventario',
  type: 'message',
  aliases: ['inv'],
  cooldown: 3,
  description: 'Muestra tu inventario por servidor, con saldo y equipo. Usa "inv <página>" o "inv <filtro|itemKey>".',
  usage: 'inventario [página|filtro|itemKey]',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;

    const wallet = await getOrCreateWallet(userId, guildId);
    const { weapon, armor, cape } = await getEquipment(userId, guildId);
    const stats = await getEffectiveStats(userId, guildId);

    const arg = args[0]?.trim();
    const asPage = arg && /^\d+$/.test(arg) ? Math.max(1, parseInt(arg, 10)) : 1;
    const filter = arg && !/^\d+$/.test(arg) ? arg.toLowerCase() : '';

    // detalle exacto si coincide completamente una key
    let detailKey: string | null = null;
    if (filter) detailKey = filter; // intentaremos exact match primero

    if (detailKey) {
      const itemRow = await prisma.economyItem.findFirst({ where: { key: detailKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
      if (itemRow) {
        const inv = await prisma.inventoryEntry.findUnique({ where: { userId_guildId_itemId: { userId, guildId, itemId: itemRow.id } } });
        const qty = inv?.quantity ?? 0;
        const props = parseItemProps(itemRow.props);
        const tool = fmtTool(props);
        const st = fmtStats(props);
        const tags = (itemRow.tags || []).join(', ');
        await message.reply([
          `📦 ${itemRow.name || itemRow.key} — x${qty}`,
          `Key: ${itemRow.key}`,
          itemRow.category ? `Categoría: ${itemRow.category}` : '',
          tags ? `Tags: ${tags}` : '',
          tool ? `Herramienta: ${tool}` : '',
          st ? `Bonos: ${st}` : '',
          props.craftingOnly ? 'Solo crafteo' : '',
        ].filter(Boolean).join('\n'));
        return;
      }
    }

    // listado paginado
    const whereInv = { userId, guildId, quantity: { gt: 0 } } as const;
    const all = await prisma.inventoryEntry.findMany({ where: whereInv, include: { item: true } });
    const filtered = filter
      ? all.filter(e => e.item.key.toLowerCase().includes(filter) || (e.item.name ?? '').toLowerCase().includes(filter))
      : all;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(asPage, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered
      .sort((a, b) => (b.quantity - a.quantity) || a.item.key.localeCompare(b.item.key))
      .slice(start, start + PAGE_SIZE);

    const lines: string[] = [];
    // header con saldo y equipo
    lines.push(`💰 Monedas: ${wallet.coins}`);
    const gear: string[] = [];
    if (weapon) gear.push(`🗡️ ${weapon.key}`);
    if (armor) gear.push(`🛡️ ${armor.key}`);
    if (cape) gear.push(`🧥 ${cape.key}`);
    if (gear.length) lines.push(`🧰 Equipo: ${gear.join(' · ')}`);
    lines.push(`❤️ HP: ${stats.hp}/${stats.maxHp} · ⚔️ ATK: ${stats.damage} · 🛡️ DEF: ${stats.defense}`);

    if (!pageItems.length) {
      lines.push(filter ? `No hay ítems que coincidan con "${filter}".` : 'No tienes ítems en tu inventario.');
      await message.reply(lines.join('\n'));
      return;
    }

    lines.push(`\n📦 Inventario (página ${page}/${totalPages}${filter ? `, filtro: ${filter}` : ''})`);

    for (const e of pageItems) {
      const p = parseItemProps(e.item.props);
      const tool = fmtTool(p);
      const st = fmtStats(p);
      const name = e.item.name || e.item.key;
      lines.push(`• ${name} — x${e.quantity}${tool ? ` ${tool}` : ''}${st}`);
    }

    if (totalPages > 1) {
      lines.push(`\nUsa: \`!inv ${filter ? `${page+1} ${filter}` : page+1}\` para la siguiente página.`);
    }

    await message.reply(lines.join('\n'));
  }
};

