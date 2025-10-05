import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import { Message, MessageComponentInteraction, MessageFlags, ButtonInteraction, TextBasedChannel } from 'discord.js';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';

interface AreaState {
  key: string;
  name?: string;
  type?: string;
  config?: any;
  metadata?: any;
}

function createAreaDisplay(state: AreaState, editing: boolean = false) {
  const title = editing ? 'Editando Área' : 'Creando Área';
  return {
    type: 17,
    accent_color: 0x00FF00,
    components: [
      {
        type: 9,
        components: [{
          type: 10,
          content: `🗺️ **${title}: \`${state.key}\`**`
        }]
      },
      { type: 14, divider: true },
      {
        type: 9,
        components: [{
          type: 10,
          content: `**📋 Estado Actual:**\n` +
                   `**Nombre:** ${state.name || '❌ No configurado'}\n` +
                   `**Tipo:** ${state.type || '❌ No configurado'}\n` +
                   `**Config:** ${Object.keys(state.config || {}).length} campos\n` +
                   `**Metadata:** ${Object.keys(state.metadata || {}).length} campos`
        }]
      },
      { type: 14, divider: true },
      {
        type: 9,
        components: [{
          type: 10,
          content: `**🎮 Instrucciones:**\n` +
                   `• **Base**: Configura nombre y tipo\n` +
                   `• **Config (JSON)**: Configuración técnica\n` +
                   `• **Meta (JSON)**: Metadatos adicionales\n` +
                   `• **Guardar**: Confirma los cambios\n` +
                   `• **Cancelar**: Descarta los cambios`
        }]
      }
    ]
  };
}

export const command: CommandMessage = {
  name: 'area-editar',
  type: 'message',
  aliases: ['editar-area','areaedit'],
  cooldown: 10,
  description: 'Edita una GameArea de este servidor con un editor interactivo.',
  usage: 'area-editar <key-única>',
  run: async (message, args, _client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: '❌ **Error de Permisos**\n└ No tienes permisos de ManageGuild ni rol de staff.'
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const key = args[0]?.trim();
    if (!key) {
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFFA500,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: '⚠️ **Uso Incorrecto**\n└ Uso: `!area-editar <key-única>`'
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const guildId = message.guild!.id;
    const area = await prisma.gameArea.findFirst({ where: { key, guildId } });
    if (!area) {
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: '❌ **Área No Encontrada**\n└ No existe un área con esa key en este servidor.'
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const state: AreaState = { key, name: area.name, type: area.type, config: area.config ?? {}, metadata: area.metadata ?? {} };

    const display = createAreaDisplay(state, true);
    
    const editorMsg = await (channel.send as any)({
      flags: 32768,
      components: [
        display,
        {
          type: 1,
          components: [
            { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'ga_base' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Config (JSON)', custom_id: 'ga_config' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Meta (JSON)', custom_id: 'ga_meta' },
            { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'ga_save' },
            { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'ga_cancel' },
          ]
        }
      ]
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30*60_000, filter: (i)=> i.user.id === message.author.id });
    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        switch (i.customId) {
          case 'ga_cancel':
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
                    content: '**❌ Editor de Área cancelado.**'
                  }]
                }]
              }]
            });
            collector.stop('cancel');
            return;
          case 'ga_base':
            await showBaseModal(i as ButtonInteraction, state, editorMsg, true);
            return;
          case 'ga_config':
            await showJsonModal(i as ButtonInteraction, state, 'config', 'Config del Área', editorMsg, true);
            return;
          case 'ga_meta':
            await showJsonModal(i as ButtonInteraction, state, 'metadata', 'Meta del Área', editorMsg, true);
            return;
          case 'ga_save':
            if (!state.name || !state.type) { await i.reply({ content: '❌ Completa Base (nombre/tipo).', flags: MessageFlags.Ephemeral }); return; }
            await prisma.gameArea.update({ where: { id: area.id }, data: { name: state.name!, type: state.type!, config: state.config ?? {}, metadata: state.metadata ?? {} } });
            await i.reply({ content: '✅ Área actualizada.', flags: MessageFlags.Ephemeral });
            await editorMsg.edit({
              flags: 32768,
              components: [{
                type: 17,
                accent_color: 0x00FF00,
                components: [{
                  type: 9,
                  components: [{
                    type: 10,
                    content: `**✅ Área \`${state.key}\` actualizada exitosamente.**`
                  }]
                }]
              }]
            });
            collector.stop('saved');
            return;
        }
      } catch (e) {
        if (!i.deferred && !i.replied) await i.reply({ content: '❌ Error procesando la acción.', flags: MessageFlags.Ephemeral });
      }
    });

    collector.on('end', async (_c,r)=> {
      if (r==='time') {
        try {
          await editorMsg.edit({
            flags: 32768,
            components: [{
              type: 17,
              accent_color: 0xFFA500,
              components: [{
                type: 9,
                components: [{
                  type: 10,
                  content: '**⏰ Editor expirado.**'
                }]
              }]
            }]
          });
        } catch {}
      }
    });
  }
};

async function showBaseModal(i: ButtonInteraction, state: AreaState, editorMsg: Message, editing: boolean) {
  const modal = { title: 'Base del Área', customId: 'ga_base_modal', components: [
    { type: ComponentType.Label, label: 'Nombre', component: { type: ComponentType.TextInput, customId: 'name', style: TextInputStyle.Short, required: true, value: state.name ?? '' } },
    { type: ComponentType.Label, label: 'Tipo (MINE/LAGOON/FIGHT/FARM)', component: { type: ComponentType.TextInput, customId: 'type', style: TextInputStyle.Short, required: true, value: state.type ?? '' } },
  ] } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    state.name = sub.components.getTextInputValue('name').trim();
    state.type = sub.components.getTextInputValue('type').trim().toUpperCase();
    await sub.reply({ content: '✅ Base actualizada.', flags: MessageFlags.Ephemeral });
    
    // Actualizar display
    const newDisplay = createAreaDisplay(state, editing);
    await editorMsg.edit({
      flags: 32768,
      components: [
        newDisplay,
        {
          type: 1,
          components: [
            { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'ga_base' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Config (JSON)', custom_id: 'ga_config' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Meta (JSON)', custom_id: 'ga_meta' },
            { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'ga_save' },
            { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'ga_cancel' },
          ]
        }
      ]
    });
  } catch {}
}

async function showJsonModal(i: ButtonInteraction, state: AreaState, field: 'config'|'metadata', title: string, editorMsg: Message, editing: boolean) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = { title, customId: `ga_json_${field}`, components: [
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
    
    // Actualizar display
    const newDisplay = createAreaDisplay(state, editing);
    await editorMsg.edit({
      flags: 32768,
      components: [
        newDisplay,
        {
          type: 1,
          components: [
            { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'ga_base' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Config (JSON)', custom_id: 'ga_config' },
            { type: 2, style: ButtonStyle.Secondary, label: 'Meta (JSON)', custom_id: 'ga_meta' },
            { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'ga_save' },
            { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'ga_cancel' },
          ]
        }
      ]
    });
  } catch {}
}

