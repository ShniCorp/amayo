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
  description: 'Edita un EconomyItem existente del servidor con un pequeño editor interactivo.',
  category: 'Economía',
  usage: 'item-editar <key-única>',
  run: async (message: Message, args: string[], client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
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

    const key = args[0]?.trim();
    if (!key) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFFA500,
          components: [{
            type: 10,
            content: '⚠️ **Uso Incorrecto**\n└ Uso: `!item-editar <key-única>`'
          }]
        }],
        reply: { messageReference: message.id }
      });
      return;
    }

    const guildId = message.guild!.id;

    const existing = await client.prisma.economyItem.findFirst({ where: { key, guildId } });
    if (!existing) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 10,
            content: '❌ **Item No Encontrado**\n└ No existe un item con esa key en este servidor.'
          }]
        }],
        reply: { messageReference: message.id }
      });
      return;
    }

    const state: ItemEditorState = {
      key,
      name: existing.name,
      description: existing.description || undefined,
      category: existing.category || undefined,
      icon: existing.icon || undefined,
      stackable: existing.stackable ?? true,
      maxPerInventory: existing.maxPerInventory || null,
      tags: existing.tags || [],
      props: existing.props || {},
    };

    const buildEditorDisplay = () => {
      const baseInfo = [
        `**Nombre:** ${state.name || '*Sin definir*'}`,
        `**Descripción:** ${state.description || '*Sin definir*'}`,
        `**Categoría:** ${state.category || '*Sin definir*'}`,
        `**Icon URL:** ${state.icon || '*Sin definir*'}`,
        `**Stackable:** ${state.stackable ? 'Sí' : 'No'}`,
        `**Máx. Inventario:** ${state.maxPerInventory ?? 'Ilimitado'}`,
      ].join('\n');

      const tagsInfo = `**Tags:** ${state.tags.length > 0 ? state.tags.join(', ') : '*Ninguno*'}`;
      const propsJson = JSON.stringify(state.props ?? {}, null, 2);

      return {
        type: 17,
        accent_color: 0x00D9FF,
        components: [
          {
            type: 10,
            content: `# 🛠️ Editando Item: \`${key}\``
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: baseInfo
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: tagsInfo
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: `**Props (JSON):**\n\`\`\`json\n${propsJson}\n\`\`\``
          }
        ]
      };
    };

    const buildEditorComponents = () => [
      buildEditorDisplay(),
      {
        type: 1,
        components: [
          { type: 2, style: ButtonStyle.Primary, label: 'Base', custom_id: 'it_base' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Tags', custom_id: 'it_tags' },
          { type: 2, style: ButtonStyle.Secondary, label: 'Props (JSON)', custom_id: 'it_props' },
          { type: 2, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'it_save' },
          { type: 2, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'it_cancel' },
        ]
      }
    ];

    const editorMsg = await (channel.send as any)({
      content: null,
      flags: 32768,
      components: buildEditorComponents(),
      reply: { messageReference: message.id }
    });

    const collector = editorMsg.createMessageComponentCollector({ time: 30 * 60_000, filter: (i) => i.user.id === message.author.id });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        if (i.customId === 'it_cancel') {
          await i.deferUpdate();
          await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [{
                type: 17,
                accent_color: 0xFF0000,
                components: [{
                  type: 10,
                  content: '**❌ Editor cancelado.**'
                }]
              }]
            });
          collector.stop('cancel');
          return;
        }
        if (i.customId === 'it_base') {
          await showBaseModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
          return;
        }
        if (i.customId === 'it_tags') {
          await showTagsModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
          return;
        }
        if (i.customId === 'it_props') {
          await showPropsModal(i as ButtonInteraction, state, editorMsg, buildEditorComponents);
          return;
        }
        if (i.customId === 'it_save') {
          // Validar
          if (!state.name) {
            await i.reply({ content: '❌ Falta el nombre del item (configura en Base).', flags: MessageFlags.Ephemeral });
            return;
          }
          // Actualizar
          await client.prisma.economyItem.update({
            where: { id: existing.id },
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
          await editorMsg.edit({ 
            content: null,
            flags: 32768,
            components: [{
              type: 17,
              accent_color: 0x00FF00,
              components: [{
                type: 10,
                content: `✅ **Item Actualizado**\n└ Item \`${state.key}\` actualizado exitosamente.`
              }]
            }]
          });
          collector.stop('saved');
          return;
        }
      } catch (err) {
        logger.error({ err }, 'item-editar interaction error');
        if (!i.deferred && !i.replied) await i.reply({ content: '❌ Error procesando la acción.', flags: MessageFlags.Ephemeral });
      }
    });

    collector.on('end', async (_c, r) => {
      if (r === 'time') {
        try { await editorMsg.edit({
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
          }); } catch {}
      }
    });
  },
};

async function showBaseModal(i: ButtonInteraction, state: ItemEditorState, editorMsg: any, buildComponents: () => any[]) {
  const modal = {
    title: 'Configuración base del Item',
    customId: 'it_base_modal',
    components: [
      { type: ComponentType.Label, label: 'Nombre', component: { type: ComponentType.TextInput, customId: 'name', style: TextInputStyle.Short, required: true, value: state.name ?? '' } },
      { type: ComponentType.Label, label: 'Descripción', component: { type: ComponentType.TextInput, customId: 'desc', style: TextInputStyle.Paragraph, required: false, value: state.description ?? '' } },
      { type: ComponentType.Label, label: 'Categoría', component: { type: ComponentType.TextInput, customId: 'cat', style: TextInputStyle.Short, required: false, value: state.category ?? '' } },
      { type: ComponentType.Label, label: 'Icon URL', component: { type: ComponentType.TextInput, customId: 'icon', style: TextInputStyle.Short, required: false, value: state.icon ?? '' } },
      { type: ComponentType.Label, label: 'Stackable y Máx inventario', component: { type: ComponentType.TextInput, customId: 'stack_max', style: TextInputStyle.Short, required: false, placeholder: 'true,10', value: state.stackable !== undefined ? `${state.stackable},${state.maxPerInventory ?? ''}` : '' } },
    ],
  } as const;

  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const name = sub.components.getTextInputValue('name').trim();
    const desc = sub.components.getTextInputValue('desc').trim();
    const cat = sub.components.getTextInputValue('cat').trim();
    const icon = sub.components.getTextInputValue('icon').trim();
    const stackMax = sub.components.getTextInputValue('stack_max').trim();

    state.name = name;
    state.description = desc || undefined;
    state.category = cat || undefined;
    state.icon = icon || undefined;

    if (stackMax) {
      const [s, m] = stackMax.split(',');
      state.stackable = String(s).toLowerCase() !== 'false';
      const mv = m?.trim();
      state.maxPerInventory = mv ? Math.max(0, parseInt(mv, 10) || 0) : null;
    }

    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}

async function showTagsModal(i: ButtonInteraction, state: ItemEditorState, editorMsg: any, buildComponents: () => any[]) {
  const modal = {
    title: 'Tags del Item (separados por coma)',
    customId: 'it_tags_modal',
    components: [
      { type: ComponentType.Label, label: 'Tags', component: { type: ComponentType.TextInput, customId: 'tags', style: TextInputStyle.Paragraph, required: false, value: state.tags.join(', ') } },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const tags = sub.components.getTextInputValue('tags');
    state.tags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents()
    });
  } catch {}
}

async function showPropsModal(i: ButtonInteraction, state: ItemEditorState, editorMsg: any, buildComponents: () => any[]) {
  const template = state.props && Object.keys(state.props).length ? JSON.stringify(state.props) : JSON.stringify({
    tool: undefined,
    breakable: undefined,
    chest: undefined,
    eventCurrency: undefined,
    passiveEffects: [],
    mutationPolicy: undefined,
    craftingOnly: false,
    food: undefined,
    damage: undefined,
    defense: undefined,
    maxHpBonus: undefined,
  });
  const modal = {
    title: 'Props (JSON) del Item',
    customId: 'it_props_modal',
    components: [
      { type: ComponentType.Label, label: 'JSON', component: { type: ComponentType.TextInput, customId: 'props', style: TextInputStyle.Paragraph, required: false, value: template.slice(0,4000) } },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue('props');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state.props = parsed;
        await sub.deferUpdate(); 
        await editorMsg.edit({
          content: null,
          flags: 32768,
          components: buildComponents()
        });
      } catch (e) {
        await sub.reply({ content: '❌ JSON inválido.', flags: MessageFlags.Ephemeral });
      }
    } else {
      state.props = {};
      await sub.reply({ content: 'ℹ️ Props limpiados.', flags: MessageFlags.Ephemeral });
      try {
        await editorMsg.edit({
          content: null,
          flags: 32768,
          components: buildComponents()
        });
      } catch {}
    }
  } catch {}
}
