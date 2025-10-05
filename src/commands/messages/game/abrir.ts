import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { openChestByKey } from '../../../game/economy/service';

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
    try {
      const res = await openChestByKey(message.author.id, message.guild!.id, itemKey);
      const coins = res.coinsDelta ? `🪙 +${res.coinsDelta}` : '';
      const items = res.itemsToAdd.length ? res.itemsToAdd.map(i => `${i.itemKey ?? i.itemId} x${i.qty}`).join(' · ') : '';
      let rolesGiven: string[] = [];
      let rolesFailed: string[] = [];
      if (res.rolesToGrant.length && message.member) {
        for (const r of res.rolesToGrant) {
          try { await message.member.roles.add(r); rolesGiven.push(r); } catch { rolesFailed.push(r); }
        }
      }
      const lines = [
        `🎁 Abriste ${itemKey}${res.consumed ? ' (consumido 1)' : ''}`,
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

