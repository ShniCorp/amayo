import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import { Message, MessageComponentInteraction, MessageFlags, ButtonInteraction } from 'discord.js';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';

interface OfferState {
  offerId: string;
  itemKey?: string;
  enabled?: boolean;
  price?: any;
  startAt?: string;
  endAt?: string;
  perUserLimit?: number | null;
  stock?: number | null;
  metadata?: any;
}

export const command: CommandMessage = {
  name: 'offer-editar',
  type: 'message',
  aliases: ['editar-oferta','offeredit'],
  cooldown: 10,
  description: 'Edita una ShopOffer por ID con editor interactivo (price/ventanas/stock/limit).',
  usage: 'offer-editar <offerId>',
  run: async (message, args, _client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) { await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.'); return; }

    const offerId = args[0]?.trim();
    if (!offerId) { await message.reply('Uso: `!offer-editar <offerId>`'); return; }

    const guildId = message.guild!.id;
    const offer = await prisma.shopOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.guildId !== guildId) { await message.reply('❌ Oferta no encontrada para este servidor.'); return; }

    const item = await prisma.economyItem.findUnique({ where: { id: offer.itemId } });

    const state: OfferState = {
      offerId,
      itemKey: item?.key,
      enabled: offer.enabled,
      price: offer.price ?? {},
      startAt: offer.startAt ? new Date(offer.startAt).toISOString() : '',
      endAt: offer.endAt ? new Date(offer.endAt).toISOString() : '',
      perUserLimit: offer.perUserLimit ?? null,
      stock: offer.stock ?? null,
      metadata: offer.metadata ?? {},
    };

    const editorMsg = await (message.channel as any).send({
      content: `🛒 Editor de Oferta (editar): ${offerId}`,
      components: [
        { type: 1, components: [
          { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'of_base' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Precio (JSON)', custom_id: 'of_price' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Ventana', custom_id: 'of_window' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Límites', custom_id: 'of_limits' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Meta (JSON)', custom_id: 'of_meta' },
        ] },
        { type: 1, components: [
          { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'of_save' },
          { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'of_cancel' },
        ] },
      ],
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30*60_000, filter: (i: MessageComponentInteraction)=> i.user.id === message.author.id });
    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        switch (i.customId) {
          case 'of_cancel': await i.deferUpdate(); await editorMsg.edit({ content: '❌ Editor de Oferta cancelado.', components: [] }); collector.stop('cancel'); return;
          case 'of_base': await showBaseModal(i as ButtonInteraction, state); return;
          case 'of_price': await showJsonModal(i as ButtonInteraction, state, 'price', 'Precio'); return;
          case 'of_window': await showWindowModal(i as ButtonInteraction, state); return;
          case 'of_limits': await showLimitsModal(i as ButtonInteraction, state); return;
          case 'of_meta': await showJsonModal(i as ButtonInteraction, state, 'metadata', 'Meta'); return;
          case 'of_save':
            if (!state.itemKey) { await i.reply({ content: '❌ Falta itemKey en Base.', flags: MessageFlags.Ephemeral }); return; }
            const it = await prisma.economyItem.findFirst({ where: { key: state.itemKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
            if (!it) { await i.reply({ content: '❌ Item no encontrado por key.', flags: MessageFlags.Ephemeral }); return; }
            try {
              await prisma.shopOffer.update({
                where: { id: state.offerId },
                data: {
                  itemId: it.id,
                  enabled: state.enabled ?? true,
                  price: state.price ?? {},
                  startAt: state.startAt ? new Date(state.startAt) : null,
                  endAt: state.endAt ? new Date(state.endAt) : null,
                  perUserLimit: state.perUserLimit ?? null,
                  stock: state.stock ?? null,
                  metadata: state.metadata ?? {},
                }
              });
              await i.reply({ content: '✅ Oferta actualizada.', flags: MessageFlags.Ephemeral });
              await editorMsg.edit({ content: `✅ Oferta ${state.offerId} actualizada.`, components: [] });
              collector.stop('saved');
            } catch (err: any) {
              await i.reply({ content: `❌ Error al guardar: ${err?.message ?? err}`, flags: MessageFlags.Ephemeral });
            }
            return;
        }
      } catch (e) {
        if (!i.deferred && !i.replied) await i.reply({ content: '❌ Error procesando la acción.', flags: MessageFlags.Ephemeral });
      }
    });
    collector.on('end', async (_c: any,r: string)=> { if (r==='time') { try { await editorMsg.edit({ content:'⏰ Editor expirado.', components: [] }); } catch {} } });
  }
};

async function showBaseModal(i: ButtonInteraction, state: OfferState) {
  const modal = { title: 'Base de Oferta', customId: 'of_base_modal', components: [
    { type: ComponentType.Label, label: 'Item Key', component: { type: ComponentType.TextInput, customId: 'itemKey', style: TextInputStyle.Short, required: true, value: state.itemKey ?? '' } },
    { type: ComponentType.Label, label: 'Habilitada? (true/false)', component: { type: ComponentType.TextInput, customId: 'enabled', style: TextInputStyle.Short, required: false, value: String(state.enabled ?? true) } },
  ] } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); state.itemKey = sub.components.getTextInputValue('itemKey').trim(); const en = sub.components.getTextInputValue('enabled').trim(); state.enabled = en ? (en.toLowerCase() !== 'false') : (state.enabled ?? true); await sub.reply({ content: '✅ Base actualizada.', flags: MessageFlags.Ephemeral }); } catch {}
}

async function showJsonModal(i: ButtonInteraction, state: OfferState, field: 'price'|'metadata', title: string) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = { title, customId: `of_json_${field}`, components: [
    { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'json', style: TextInputStyle.Paragraph, required: false, value: current.slice(0,4000) } },
  ] } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); const raw = sub.components.getTextInputValue('json'); if (raw) { try { state[field] = JSON.parse(raw); await sub.reply({ content: '✅ Guardado.', flags: MessageFlags.Ephemeral }); } catch { await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral }); } } else { state[field] = {}; await sub.reply({ content: 'ℹ️ Limpio.', flags: MessageFlags.Ephemeral }); } } catch {}
}

async function showWindowModal(i: ButtonInteraction, state: OfferState) {
  const modal = { title: 'Ventana', customId: 'of_window_modal', components: [
    { type: ComponentType.Label, label: 'Inicio (ISO opcional)', component: { type: ComponentType.TextInput, customId: 'start', style: TextInputStyle.Short, required: false, value: state.startAt ?? '' } },
    { type: ComponentType.Label, label: 'Fin (ISO opcional)', component: { type: ComponentType.TextInput, customId: 'end', style: TextInputStyle.Short, required: false, value: state.endAt ?? '' } },
  ] } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); const s = sub.components.getTextInputValue('start').trim(); const e = sub.components.getTextInputValue('end').trim(); state.startAt = s || ''; state.endAt = e || ''; await sub.reply({ content: '✅ Ventana actualizada.', flags: MessageFlags.Ephemeral }); } catch {}
}

async function showLimitsModal(i: ButtonInteraction, state: OfferState) {
  const modal = { title: 'Límites', customId: 'of_limits_modal', components: [
    { type: ComponentType.Label, label: 'Límite por usuario (vacío = sin límite)', component: { type: ComponentType.TextInput, customId: 'limit', style: TextInputStyle.Short, required: false, value: state.perUserLimit != null ? String(state.perUserLimit) : '' } },
    { type: ComponentType.Label, label: 'Stock global (vacío = ilimitado)', component: { type: ComponentType.TextInput, customId: 'stock', style: TextInputStyle.Short, required: false, value: state.stock != null ? String(state.stock) : '' } },
  ] } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); const lim = sub.components.getTextInputValue('limit').trim(); const st = sub.components.getTextInputValue('stock').trim(); state.perUserLimit = lim ? Math.max(0, parseInt(lim,10)||0) : null; state.stock = st ? Math.max(0, parseInt(st,10)||0) : null; await sub.reply({ content: '✅ Límites actualizados.', flags: MessageFlags.Ephemeral }); } catch {}
}
