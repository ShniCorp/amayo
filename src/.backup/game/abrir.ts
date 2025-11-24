import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { openChestByKey } from '../../../game/economy/service';
import { prisma } from '../../../core/database/prisma';
import { fetchItemBasics, formatItemLabel } from './_helpers';
import type { ItemBasicInfo } from './_helpers';

export const command: CommandMessage = {
  name: 'abrir',
  type: 'message',
  aliases: ['open'],
  cooldown: 3,
  description: 'Abre un cofre (item) por key y recibe sus recompensas/roles.',
  usage: 'abrir <itemKey>',
  run: async (message, args, _client: Amayo) => {
    const itemKey = args[0]?.trim();
    if (!itemKey) { await message.reply('Uso: `!abrir <itemKey>`'); return; }
    const userId = message.author.id;
    const guildId = message.guild!.id;
    try {
      const res = await openChestByKey(userId, guildId, itemKey);

      const keyRewards = res.itemsToAdd
        .map((it) => it.itemKey)
        .filter((key): key is string => typeof key === 'string' && key.trim().length > 0);

      const basicsKeys = [itemKey, ...keyRewards].filter((key): key is string => typeof key === 'string' && key.trim().length > 0);
      const infoMap = basicsKeys.length > 0 ? await fetchItemBasics(guildId, basicsKeys) : new Map<string, ItemBasicInfo>();

      const idRewards = res.itemsToAdd
        .filter((it) => !it.itemKey && it.itemId)
        .map((it) => it.itemId!)
        .filter((id, idx, arr) => arr.indexOf(id) === idx);
      const itemsById = new Map<string, ItemBasicInfo>();
      if (idRewards.length) {
        const rows = await prisma.economyItem.findMany({
          where: { id: { in: idRewards } },
          select: { id: true, key: true, name: true, icon: true },
        });
        for (const row of rows) {
          const info = { key: row.key, name: row.name, icon: row.icon };
          itemsById.set(row.id, info);
          if (!infoMap.has(row.key)) infoMap.set(row.key, info);
        }
      }

  const chestLabel = formatItemLabel(infoMap.get(itemKey) ?? { key: itemKey, name: null, icon: null }, { bold: true });
      const coins = res.coinsDelta ? `🪙 +${res.coinsDelta}` : '';
      const items = res.itemsToAdd.length
        ? res.itemsToAdd.map((i) => {
            const info = i.itemKey
              ? infoMap.get(i.itemKey)
              : i.itemId
                ? itemsById.get(i.itemId)
                : null;
            const label = info
              ? formatItemLabel(info)
              : formatItemLabel({ key: i.itemKey ?? (i.itemId ?? 'item'), name: null, icon: null });
            return `${label} x${i.qty}`;
          }).join(' · ')
        : '';
      let rolesGiven: string[] = [];
      let rolesFailed: string[] = [];
      if (res.rolesToGrant.length && message.member) {
        for (const r of res.rolesToGrant) {
          try { await message.member.roles.add(r); rolesGiven.push(r); } catch { rolesFailed.push(r); }
        }
      }
      const lines = [
        `🎁 Abriste ${chestLabel}${res.consumed ? ' (consumido 1)' : ''}`,
        coins && `Monedas: ${coins}`,
        items && `Ítems: ${items}`,
        rolesGiven.length ? `Roles otorgados: ${rolesGiven.map(id=>`<@&${id}>`).join(', ')}` : '',
        rolesFailed.length ? `Roles fallidos: ${rolesFailed.join(', ')}` : '',
      ].filter(Boolean);
      await message.reply(lines.join('\n'));
    } catch (e: any) {
      await message.reply(`❌ No se pudo abrir ${itemKey}: ${e?.message ?? e}`);
    }
  }
};

