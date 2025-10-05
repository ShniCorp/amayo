import { Message, MessageFlags, MessageComponentInteraction, ButtonInteraction, TextBasedChannel } from 'discord.js';
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
function createMobDisplay(state: MobEditorState, editing: boolean = false) {
  const title = editing ? 'Editando Mob' : 'Creando Mob';
  const stats = state.stats || {};
  return {
    type: 17,
    accent_color: 0xFF0000,
    components: [
      {
        type: 9,
        components: [{
          type: 10,
          content: `👹 **${title}: \`${state.key}\`**`
        }]
      },
      { type: 14, divider: true },
      {
        type: 9,
        components: [{
          type: 10,
          content: `**📋 Estado Actual:**\n` +
                   `**Nombre:** ${state.name || '❌ No configurado'}\n` +
                   `**Categoría:** ${state.category || 'Sin categoría'}\n` +
                   `**Attack:** ${stats.attack || 0}\n` +
                   `**HP:** ${stats.hp || 0}\n` +
                   `**Defense:** ${stats.defense || 0}\n` +
                   `**Drops:** ${Object.keys(state.drops || {}).length} items`
        }]
      },
      { type: 14, divider: true },
      {
        type: 9,
        components: [{
          type: 10,
          content: `**🎮 Instrucciones:**\n` +
                   `• **Base**: Nombre y categoría\n` +
                   `• **Stats (JSON)**: Estadísticas del mob\n` +
                   `• **Drops (JSON)**: Items que dropea\n` +
                   `• **Guardar**: Confirma los cambios\n` +
                   `• **Cancelar**: Descarta los cambios`
        }]
      }
    ]
  };
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

    const channel = message.channel as TextBasedChannel & { send: Function };
    const editorMsg = await channel.send({
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
        if (i.customId === 'mb_cancel') {
          await i.deferUpdate();
          await editorMsg.edit({
            flags: 32768,
            components: [{
              type: 17,
              accent_color: 0xFF0000,
              components: [{
                type: 9,
                components: [{
                  type: 10,
                  content: '**❌ Editor cancelado.**'
                }]
              }]
            }]
          });
          collector.stop('cancel');
          return;
        }
        if (i.customId === 'mb_base') { await showBaseModal(i as ButtonInteraction, state, editorMsg, true); return; }
        if (i.customId === 'mb_stats') { await showJsonModal(i as ButtonInteraction, state, 'stats', 'Stats del Mob (JSON)', editorMsg, true); return; }
        if (i.customId === 'mb_drops') { await showJsonModal(i as ButtonInteraction, state, 'drops', 'Drops del Mob (JSON)', editorMsg, true); return; }
        if (i.customId === 'mb_save') {
          if (!state.name) { await i.reply({ content: '❌ Falta el nombre del mob.', flags: MessageFlags.Ephemeral }); return; }
          await client.prisma.mob.update({ where: { id: mob.id }, data: { name: state.name!, category: state.category ?? null, stats: state.stats ?? {}, drops: state.drops ?? {} } });
          await i.reply({ content: '✅ Mob actualizado!', flags: MessageFlags.Ephemeral });
          await editorMsg.edit({
            flags: 32768,
            components: [{
              type: 17,
              accent_color: 0x00FF00,
              components: [{
                type: 9,
                components: [{
                  type: 10,
                  content: `**✅ Mob \`${state.key}\` actualizado exitosamente.**`
                }]
              }]
            }]
          });
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

async function showBaseModal(i: ButtonInteraction, state: MobEditorState, editorMsg: Message, editing: boolean) {
  const modal = { title: 'Base del Mob', customId: 'mb_base_modal', components: [
    { type: ComponentType.Label, label: 'Nombre', component: { type: ComponentType.TextInput, customId: 'name', style: TextInputStyle.Short, required: true, value: state.name ?? '' } },
    { type: ComponentType.Label, label: 'Categoría (opcional)', component: { type: ComponentType.TextInput, customId: 'category', style: TextInputStyle.Short, required: false, value: state.category ?? '' } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    state.name = sub.components.getTextInputValue('name').trim();
    const cat = sub.components.getTextInputValue('category')?.trim();
    state.category = cat || undefined;
    await sub.reply({ content: '✅ Base actualizada.', flags: MessageFlags.Ephemeral });
    
    // Refresh display
    const newDisplay = createMobDisplay(state, editing);
    await editorMsg.edit({
      flags: 32768,
      components: [
        newDisplay,
        {
          type: 1,
          components: [
            { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'mb_base' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Stats (JSON)', custom_id: 'mb_stats' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Drops (JSON)', custom_id: 'mb_drops' },
            { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'mb_save' },
            { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'mb_cancel' },
          ]
        }
      ]
    });
  } catch {}
}

async function showJsonModal(i: ButtonInteraction, state: MobEditorState, field: 'stats'|'drops', title: string, editorMsg: Message, editing: boolean) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = { title, customId: `mb_json_${field}`, components: [
    { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'json', style: TextInputStyle.Paragraph, required: false, value: current.slice(0,4000) } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue('json');
    if (raw) {
      try {
        state[field] = JSON.parse(raw);
        await sub.reply({ content: '✅ Guardado.', flags: MessageFlags.Ephemeral });
      } catch {
        await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral });
        return;
      }
    } else {
      state[field] = {};
      await sub.reply({ content: 'ℹ️ Limpio.', flags: MessageFlags.Ephemeral });
    }
    
    // Refresh display
    const newDisplay = createMobDisplay(state, editing);
    await editorMsg.edit({
      flags: 32768,
      components: [
        newDisplay,
        {
          type: 1,
          components: [
            { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'mb_base' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Stats (JSON)', custom_id: 'mb_stats' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Drops (JSON)', custom_id: 'mb_drops' },
            { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'mb_save' },
            { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'mb_cancel' },
          ]
        }
      ]
    });
  } catch {}
}
