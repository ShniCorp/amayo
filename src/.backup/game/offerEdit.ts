import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import { Message, MessageComponentInteraction, MessageFlags, ButtonInteraction, TextBasedChannel } from 'discord.js';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';
import { promptKeySelection, resolveItemIcon } from './_helpers';

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
  usage: 'offer-editar',
  run: async (message, _args, _client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 10,
            content: '❌ **Error de Permisos**\n└ No tienes permisos de ManageGuild ni rol de staff.'
          }]
        }],
        reply: { messageReference: message.id }
      });
      return;
    }

    const guildId = message.guild!.id;
    const offers = await prisma.shopOffer.findMany({
      where: { guildId },
      orderBy: [{ updatedAt: 'desc' }],
      include: { item: true },
    });

    const selection = await promptKeySelection(message, {
      entries: offers,
      customIdPrefix: 'offer_edit',
      title: 'Selecciona una oferta para editar',
      emptyText: '⚠️ **No hay ofertas configuradas.** Usa `!offer-crear` primero.',
      placeholder: 'Elige una oferta…',
      filterHint: 'Filtra por item, key o estado.',
      getOption: (offer) => {
        const icon = resolveItemIcon(offer.item?.icon);
        const itemName = offer.item?.name ?? offer.item?.key ?? 'Item sin nombre';
        const status = offer.enabled ? 'Activa' : 'Inactiva';
        const label = `${icon} ${itemName}`.trim();
        return {
          value: offer.id,
          label: label.slice(0, 100),
          description: `${status} • ${offer.id.slice(0, 14)}…`,
          keywords: [offer.id, itemName, offer.item?.key ?? '', status],
        };
      },
    });

    if (!selection.entry || !selection.panelMessage) {
      return;
    }

    const offer = selection.entry;

    const state: OfferState = {
      offerId: offer.id,
      itemKey: offer.item?.key,
      enabled: offer.enabled,
      price: offer.price ?? {},
      startAt: offer.startAt ? new Date(offer.startAt).toISOString() : '',
      endAt: offer.endAt ? new Date(offer.endAt).toISOString() : '',
      perUserLimit: offer.perUserLimit ?? null,
      stock: offer.stock ?? null,
      metadata: offer.metadata ?? {},
    };

    const buildEditorDisplay = () => {
      const status = state.enabled ? '✅ Activa' : '⛔ Inactiva';
      const priceInfo = state.price && Object.keys(state.price ?? {}).length ? 'Configurado' : 'Sin configurar';
      const windowInfo = state.startAt || state.endAt ? `${state.startAt || '—'} → ${state.endAt || '—'}` : 'Sin ventana';
      const limitsInfo = `Usuario: ${state.perUserLimit ?? '∞'} • Stock: ${state.stock ?? '∞'}`;
      const metaInfo = state.metadata && Object.keys(state.metadata ?? {}).length ? `${Object.keys(state.metadata!).length} campos` : 'Vacío';
      return {
        type: 17,
        accent_color: state.enabled ? 0x00D9FF : 0x666666,
        components: [
          {
            type: 10,
            content: `# 🛒 Editando Oferta: \`${state.offerId}\`\n**Item:** ${state.itemKey ?? '*Sin asignar*'}\n**Estado:** ${status}\n**Precio:** ${priceInfo}\n**Ventana:** ${windowInfo}\n**Límites:** ${limitsInfo}\n**Meta:** ${metaInfo}`
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: '**📋 Pasos rápidos:**\n• Base: item y estado\n• Precio: JSON de coste\n• Ventana: fechas inicio/fin\n• Límites: stock y por usuario\n• Meta: datos adicionales'
          }
        ]
      };
    };

    const buildEditorComponents = () => [
      buildEditorDisplay(),
      {
        type: 1,
        components: [
          { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'of_base' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Precio (JSON)', custom_id: 'of_price' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Ventana', custom_id: 'of_window' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Límites', custom_id: 'of_limits' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Meta (JSON)', custom_id: 'of_meta' },
        ]
      },
      {
        type: 1,
        components: [
          { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'of_save' },
          { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'of_cancel' },
        ]
      }
    ];

    const editorMsg = selection.panelMessage;
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildEditorComponents(),
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30 * 60_000, filter: (i: MessageComponentInteraction) => i.user.id === message.author.id });
    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        switch (i.customId) {
          case 'of_cancel':
            await i.deferUpdate();
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [{
                type: 17,
                accent_color: 0xFF0000,
                components: [{
                  type: 10,
                  content: '**❌ Editor de Oferta cancelado.**'
                }]
              }]
            });
            collector.stop('cancel');
            return;
          case 'of_base':
            await showBaseModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
            return;
          case 'of_price':
            await showJsonModal(i as ButtonInteraction, state, 'price', 'Precio', editorMsg, buildEditorComponents);
            return;
          case 'of_window':
            await showWindowModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
            return;
          case 'of_limits':
            await showLimitsModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
            return;
          case 'of_meta':
            await showJsonModal(i as ButtonInteraction, state, 'metadata', 'Meta', editorMsg, buildEditorComponents);
            return;
          case 'of_save':
            if (!state.itemKey) {
              await i.reply({ content: '❌ Falta itemKey en Base.', flags: MessageFlags.Ephemeral });
              return;
            }
            const it = await prisma.economyItem.findFirst({ where: { key: state.itemKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
            if (!it) {
              await i.reply({ content: '❌ Item no encontrado por key.', flags: MessageFlags.Ephemeral });
              return;
            }
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
              await editorMsg.edit({
                content: null,
                flags: 32768,
                components: [{
                  type: 17,
                  accent_color: 0x00FF00,
                  components: [{
                    type: 10,
                    content: `✅ **Oferta \`${state.offerId}\` actualizada.**`
                  }]
                }]
              });
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

    collector.on('end', async (_c: any, reason: string) => {
      if (reason === 'time') {
        try {
          await editorMsg.edit({
            content: null,
            flags: 32768,
            components: [{
              type: 17,
              accent_color: 0xFFA500,
              components: [{
                type: 10,
                content: '**⏰ Editor expirado.**'
              }]
            }]
          });
        } catch {}
      }
    });
  }
};

async function showBaseModal(i: ButtonInteraction, state: OfferState, editorMsg: Message, buildComponents: () => any[]) {
  const modal = { title: 'Base de Oferta', customId: 'of_base_modal', components: [
    { type: ComponentType.Label, label: 'Item Key', component: { type: ComponentType.TextInput, customId: 'itemKey', style: TextInputStyle.Short, required: true, value: state.itemKey ?? '' } },
    { type: ComponentType.Label, label: 'Habilitada? (true/false)', component: { type: ComponentType.TextInput, customId: 'enabled', style: TextInputStyle.Short, required: false, value: String(state.enabled ?? true) } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    state.itemKey = sub.components.getTextInputValue('itemKey').trim();
    const en = sub.components.getTextInputValue('enabled').trim();
    state.enabled = en ? (en.toLowerCase() !== 'false') : (state.enabled ?? true);
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}

async function showJsonModal(i: ButtonInteraction, state: OfferState, field: 'price'|'metadata', title: string, editorMsg: Message, buildComponents: () => any[]) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = { title, customId: `of_json_${field}`, components: [
    { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'json', style: TextInputStyle.Paragraph, required: false, value: current.slice(0,4000) } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue('json');
    if (raw) {
      try {
        state[field] = JSON.parse(raw);
        await sub.deferUpdate();
      } catch {
        await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral });
        return;
      }
    } else {
      state[field] = {};
      await sub.deferUpdate();
    }
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}

async function showWindowModal(i: ButtonInteraction, state: OfferState, editorMsg: Message, buildComponents: () => any[]) {
  const modal = { title: 'Ventana', customId: 'of_window_modal', components: [
    { type: ComponentType.Label, label: 'Inicio (ISO opcional)', component: { type: ComponentType.TextInput, customId: 'start', style: TextInputStyle.Short, required: false, value: state.startAt ?? '' } },
    { type: ComponentType.Label, label: 'Fin (ISO opcional)', component: { type: ComponentType.TextInput, customId: 'end', style: TextInputStyle.Short, required: false, value: state.endAt ?? '' } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const s = sub.components.getTextInputValue('start').trim();
    const e = sub.components.getTextInputValue('end').trim();
    state.startAt = s || '';
    state.endAt = e || '';
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}

async function showLimitsModal(i: ButtonInteraction, state: OfferState, editorMsg: Message, buildComponents: () => any[]) {
  const modal = { title: 'Límites', customId: 'of_limits_modal', components: [
    { type: ComponentType.Label, label: 'Límite por usuario (vacío = sin límite)', component: { type: ComponentType.TextInput, customId: 'limit', style: TextInputStyle.Short, required: false, value: state.perUserLimit != null ? String(state.perUserLimit) : '' } },
    { type: ComponentType.Label, label: 'Stock global (vacío = ilimitado)', component: { type: ComponentType.TextInput, customId: 'stock', style: TextInputStyle.Short, required: false, value: state.stock != null ? String(state.stock) : '' } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const lim = sub.components.getTextInputValue('limit').trim();
    const st = sub.components.getTextInputValue('stock').trim();
    state.perUserLimit = lim ? Math.max(0, parseInt(lim, 10) || 0) : null;
    state.stock = st ? Math.max(0, parseInt(st, 10) || 0) : null;
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}
