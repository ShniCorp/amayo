import { Message, MessageFlags, MessageComponentInteraction, ButtonInteraction } from 'discord.js';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';
import type { CommandMessage } from '../../../core/types/commands';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import logger from '../../../core/lib/logger';
import type Amayo from '../../../core/client';

interface MobEditorState {
  key: string;
  name?: string;
  category?: string;
  stats?: any;
  drops?: any;
}

export const command: CommandMessage = {
  name: 'mob-editar',
  type: 'message',
  aliases: ['editar-mob','mobedit'],
  cooldown: 10,
  description: 'Edita un Mob (enemigo) de este servidor con editor interactivo.',
  category: 'Minijuegos',
  usage: 'mob-editar <key-única>',
  run: async (message: Message, args: string[], client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
    if (!allowed) { await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.'); return; }
    const key = args[0]?.trim();
    if (!key) { await message.reply('Uso: `!mob-editar <key-única>`'); return; }
    const guildId = message.guild!.id;

    const mob = await client.prisma.mob.findFirst({ where: { key, guildId } });
    if (!mob) { await message.reply('❌ No existe un mob con esa key en este servidor.'); return; }

    const state: MobEditorState = {
      key,
      name: mob.name,
      category: mob.category ?? undefined,
      stats: mob.stats ?? {},
      drops: mob.drops ?? {},
    };

    const editorMsg = await message.channel.send({
      content: `👾 Editor de Mob (editar): \`${key}\``,
      components: [ { type: 1, components: [
        { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'mb_base' },
        { type: 2, style: ButtonStyle.Secondary, label: 'Stats (JSON)', custom_id: 'mb_stats' },
        { type: 2, style: ButtonStyle.Secondary, label: 'Drops (JSON)', custom_id: 'mb_drops' },
        { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'mb_save' },
        { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'mb_cancel' },
      ] } ],
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30*60_000, filter: (i)=> i.user.id === message.author.id });
    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        if (i.customId === 'mb_cancel') { await i.deferUpdate(); await editorMsg.edit({ content: '❌ Editor cancelado.', components: [] }); collector.stop('cancel'); return; }
        if (i.customId === 'mb_base') { await showBaseModal(i as ButtonInteraction, state); return; }
        if (i.customId === 'mb_stats') { await showJsonModal(i as ButtonInteraction, state, 'stats', 'Stats del Mob (JSON)'); return; }
        if (i.customId === 'mb_drops') { await showJsonModal(i as ButtonInteraction, state, 'drops', 'Drops del Mob (JSON)'); return; }
        if (i.customId === 'mb_save') {
          if (!state.name) { await i.reply({ content: '❌ Falta el nombre del mob.', flags: MessageFlags.Ephemeral }); return; }
          await client.prisma.mob.update({ where: { id: mob.id }, data: { name: state.name!, category: state.category ?? null, stats: state.stats ?? {}, drops: state.drops ?? {} } });
          await i.reply({ content: '✅ Mob actualizado!', flags: MessageFlags.Ephemeral });
          await editorMsg.edit({ content: `✅ Mob \`${state.key}\` actualizado.`, components: [] });
          collector.stop('saved');
          return;
        }
      } catch (err) {
        logger.error({err}, 'mob-editar');
        if (!i.deferred && !i.replied) await i.reply({ content: '❌ Error procesando la acción.', flags: MessageFlags.Ephemeral });
      }
    });
    collector.on('end', async (_c,r)=> { if (r==='time') { try { await editorMsg.edit({ content:'⏰ Editor expirado.', components: [] }); } catch {} } });
  },
};

async function showBaseModal(i: ButtonInteraction, state: MobEditorState) {
  const modal = { title: 'Configuración base del Mob', customId: 'mb_base_modal', components: [
    { type: ComponentType.Label, label: 'Nombre', component: { type: ComponentType.TextInput, customId: 'name', style: TextInputStyle.Short, required: true, value: state.name ?? '' } },
    { type: ComponentType.Label, label: 'Categoría', component: { type: ComponentType.TextInput, customId: 'cat', style: TextInputStyle.Short, required: false, value: state.category ?? '' } },
  ] } as const;
  await i.showModal(modal);
  try { const sub = await i.awaitModalSubmit({ time: 300_000 }); state.name = sub.components.getTextInputValue('name').trim(); state.category = sub.components.getTextInputValue('cat').trim() || undefined; await sub.reply({ content: '✅ Base actualizada.', flags: MessageFlags.Ephemeral }); } catch {}
}

async function showJsonModal(i: ButtonInteraction, state: MobEditorState, field: 'stats'|'drops', label: string) {
  const current = JSON.stringify(state[field] ?? (field==='stats'? { attack: 5 }: {}));
  const modal = { title: label, customId: `mb_json_${field}`, components: [
    { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'json', style: TextInputStyle.Paragraph, required: false, value: current.slice(0, 4000) } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue('json');
    if (raw) { try { state[field] = JSON.parse(raw); await sub.reply({ content: '✅ Guardado.', flags: MessageFlags.Ephemeral }); } catch { await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral }); } }
    else { state[field] = field==='stats' ? { attack: 5 } : {}; await sub.reply({ content: 'ℹ️ Limpio.', flags: MessageFlags.Ephemeral }); }
  } catch {}
}
