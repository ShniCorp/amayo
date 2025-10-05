import { Message, MessageFlags, MessageComponentInteraction, ButtonInteraction, TextBasedChannel } from 'discord.js';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';
import type { CommandMessage } from '../../../core/types/commands';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import logger from '../../../core/lib/logger';
import type Amayo from '../../../core/client';

interface ItemEditorState {
  key: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  stackable?: boolean;
  maxPerInventory?: number | null;
  tags: string[];
  props?: any;
}

export const command: CommandMessage = {
  name: 'item-editar',
  type: 'message',
  aliases: ['editar-item','itemedit'],
  cooldown: 10,
  description: 'Edita un EconomyItem de este servidor con un editor interactivo.',
  category: 'Economía',
  usage: 'item-editar <key-única>',
  run: async (message: Message, args: string[], client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
    if (!allowed) { await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.'); return; }
    const key = args[0]?.trim();
    if (!key) { await message.reply('Uso: `!item-editar <key-única>`'); return; }
    const guildId = message.guild!.id;

    const item = await client.prisma.economyItem.findFirst({ where: { key, guildId } });
    if (!item) { await message.reply('❌ No existe un item con esa key en este servidor.'); return; }

    const state: ItemEditorState = {
      key,
      name: item.name,
      description: item.description ?? undefined,
      category: item.category ?? undefined,
      icon: item.icon ?? undefined,
      stackable: item.stackable ?? true,
      maxPerInventory: item.maxPerInventory ?? null,
      tags: item.tags ?? [],
      props: item.props ?? {},
    };

    const channel = message.channel as TextBasedChannel & { send: Function };
    const editorMsg = await channel.send({
      content: `🛠️ Editor de Item (editar): \`${key}\``,
      components: [ { type: 1, components: [
        { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'it_base' },
        { type: 2, style: ButtonStyle.Secondary, label: 'Tags', custom_id: 'it_tags' },
        { type: 2, style: ButtonStyle.Secondary, label: 'Props (JSON)', custom_id: 'it_props' },
        { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'it_save' },
        { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'it_cancel' },
      ] } ],
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30 * 60_000, filter: (i) => i.user.id === message.author.id });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        if (i.customId === 'it_cancel') { await i.deferUpdate(); await editorMsg.edit({ content: '❌ Editor cancelado.', components: [] }); collector.stop('cancel'); return; }
        if (i.customId === 'it_base') { await showBaseModal(i as ButtonInteraction, state); return; }
        if (i.customId === 'it_tags') { await showTagsModal(i as ButtonInteraction, state); return; }
        if (i.customId === 'it_props') { await showPropsModal(i as ButtonInteraction, state); return; }
        if (i.customId === 'it_save') {
          if (!state.name) { await i.reply({ content: '❌ Falta el nombre del item.', flags: MessageFlags.Ephemeral }); return; }
          await client.prisma.economyItem.update({
            where: { id: item.id },
            data: {
              name: state.name!,
              description: state.description,
              category: state.category,
              icon: state.icon,
              stackable: state.stackable ?? true,
              maxPerInventory: state.maxPerInventory ?? undefined,
              tags: state.tags,
              props: state.props ?? {},
            },
          });
          await i.reply({ content: '✅ Item actualizado!', flags: MessageFlags.Ephemeral });
          await editorMsg.edit({ content: `✅ Item \`${state.key}\` actualizado.`, components: [] });
          collector.stop('saved');
          return;
        }
      } catch (err) {
        logger.error({ err }, 'item-editar interaction error');
        if (!i.deferred && !i.replied) await i.reply({ content: '❌ Error procesando la acción.', flags: MessageFlags.Ephemeral });
      }
    });

    collector.on('end', async (_c, r) => { if (r === 'time') { try { await editorMsg.edit({ content: '⏰ Editor expirado.', components: [] }); } catch {} } });
  },
};

async function showBaseModal(i: ButtonInteraction, state: ItemEditorState) {
  const modal = {
    title: 'Configuración base del Item', customId: 'it_base_modal', components: [
      { type: ComponentType.Label, label: 'Nombre', component: { type: ComponentType.TextInput, customId: 'name', style: TextInputStyle.Short, required: true, value: state.name ?? '' } },
      { type: ComponentType.Label, label: 'Descripción', component: { type: ComponentType.TextInput, customId: 'desc', style: TextInputStyle.Paragraph, required: false, value: state.description ?? '' } },
      { type: ComponentType.Label, label: 'Categoría', component: { type: ComponentType.TextInput, customId: 'cat', style: TextInputStyle.Short, required: false, value: state.category ?? '' } },
      { type: ComponentType.Label, label: 'Icon URL', component: { type: ComponentType.TextInput, customId: 'icon', style: TextInputStyle.Short, required: false, value: state.icon ?? '' } },
      { type: ComponentType.Label, label: 'Stackable y Máx inventario', component: { type: ComponentType.TextInput, customId: 'stack_max', style: TextInputStyle.Short, required: false, placeholder: 'true,10', value: state.stackable !== undefined ? `${state.stackable},${state.maxPerInventory ?? ''}` : '' } },
    ], } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    state.name = sub.components.getTextInputValue('name').trim();
    state.description = sub.components.getTextInputValue('desc').trim() || undefined;
    state.category = sub.components.getTextInputValue('cat').trim() || undefined;
    state.icon = sub.components.getTextInputValue('icon').trim() || undefined;
    const stackMax = sub.components.getTextInputValue('stack_max').trim();
    if (stackMax) { const [s,m] = stackMax.split(','); state.stackable = String(s).toLowerCase() !== 'false'; const mv = m?.trim(); state.maxPerInventory = mv ? Math.max(0, parseInt(mv,10)||0) : null; }
    await sub.reply({ content: '✅ Base actualizada.', flags: MessageFlags.Ephemeral });
  } catch {}
}

async function showTagsModal(i: ButtonInteraction, state: ItemEditorState) {
  const modal = { title: 'Tags del Item (separados por coma)', customId: 'it_tags_modal', components: [
    { type: ComponentType.Label, label: 'Tags', component: { type: ComponentType.TextInput, customId: 'tags', style: TextInputStyle.Paragraph, required: false, value: state.tags.join(', ') } },
  ], } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); const tags = sub.components.getTextInputValue('tags'); state.tags = tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : []; await sub.reply({ content: '✅ Tags actualizados.', flags: MessageFlags.Ephemeral }); } catch {}
}

async function showPropsModal(i: ButtonInteraction, state: ItemEditorState) {
  const template = state.props && Object.keys(state.props).length ? JSON.stringify(state.props) : JSON.stringify({});
  const modal = { title: 'Props (JSON) del Item', customId: 'it_props_modal', components: [
    { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'props', style: TextInputStyle.Paragraph, required: false, value: template.slice(0,4000) } },
  ], } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue('props');
    if (raw) { try { state.props = JSON.parse(raw); await sub.reply({ content: '✅ Props guardados.', flags: MessageFlags.Ephemeral }); } catch { await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral }); } }
    else { state.props = {}; await sub.reply({ content: 'ℹ️ Props limpiados.', flags: MessageFlags.Ephemeral }); }
  } catch {}
}
