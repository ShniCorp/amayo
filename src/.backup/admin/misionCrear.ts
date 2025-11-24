import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, TextInputStyle, ButtonStyle } from 'discord-api-types/v10';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';
import type { ButtonInteraction, MessageComponentInteraction, TextBasedChannel } from 'discord.js';

interface QuestState {
  key: string;
  name?: string;
  description?: string;
  category?: string;
  type?: string;
  icon?: string;
  requirements?: any;
  rewards?: any;
  repeatable?: boolean;
}

export const command: CommandMessage = {
  name: 'mision-crear',
  type: 'message',
  aliases: ['crear-mision', 'quest-create'],
  cooldown: 10,
  description: 'Crea una misión para el servidor con editor interactivo',
  usage: 'mision-crear <key-única>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const key = args[0]?.trim();
    if (!key) {
      await message.reply('Uso: `!mision-crear <key-única>`\nEjemplo: `!mision-crear daily_mine_10`');
      return;
    }

    const guildId = message.guild!.id;
    const exists = await prisma.quest.findFirst({ where: { key, guildId } });
    if (exists) {
      await message.reply('❌ Ya existe una misión con esa key en este servidor.');
      return;
    }

    const state: QuestState = {
      key,
      category: 'mining',
      type: 'daily',
      repeatable: false,
      requirements: { type: 'mine_count', count: 10 },
      rewards: { coins: 500 }
    };

    const channel = message.channel as TextBasedChannel & { send: Function };
    const editorMsg = await (channel.send as any)({
      content: null,
      flags: 32768,
      reply: { messageReference: message.id },
      components: buildEditorComponents(state)
    });

    const collector = editorMsg.createMessageComponentCollector({
      time: 30 * 60_000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;

        switch (i.customId) {
          case 'quest_cancel':
            await i.deferUpdate();
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                buildDisplay(0xFF0000, [
                  textBlock('**❌ Creación de misión cancelada.**')
                ])
              ]
            });
            collector.stop('cancel');
            return;

          case 'quest_base':
            await showBaseModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'quest_req':
            await showRequirementsModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'quest_reward':
            await showRewardsModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'quest_save':
            if (!state.name || !state.description) {
              await i.reply({ content: '❌ Completa al menos el nombre y descripción.', flags: 64 });
              return;
            }

            await prisma.quest.create({
              data: {
                guildId,
                key: state.key,
                name: state.name!,
                description: state.description!,
                category: state.category || 'mining',
                type: state.type || 'daily',
                icon: state.icon,
                requirements: state.requirements as any || {},
                rewards: state.rewards as any || {},
                repeatable: state.repeatable || false,
                active: true
              }
            });

            await i.reply({ content: '✅ Misión creada exitosamente.', flags: 64 });
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                buildDisplay(0x00FF00, [
                  textBlock(`**✅ Misión \`${state.key}\` creada exitosamente.**`)
                ])
              ]
            });
            collector.stop('saved');
            return;
        }
      } catch (e: any) {
        console.error('Error en editor de misiones:', e);
        if (!i.deferred && !i.replied) {
          await i.reply({ content: '❌ Error procesando la acción.', flags: 64 });
        }
      }
    });

    collector.on('end', async (_c, r) => {
      if (r === 'time') {
        try {
          await editorMsg.edit({
            content: null,
            flags: 32768,
            components: [
              buildDisplay(0xFFA500, [
                textBlock('**⏰ Editor expirado.**')
              ])
            ]
          });
        } catch {}
      }
    });
  }
};

function buildEditorDisplay(state: QuestState) {
  const typeEmojis: Record<string, string> = {
    daily: '📅',
    weekly: '📆',
    permanent: '♾️',
    event: '🎉'
  };

  const baseInfo = [
    `**Nombre:** ${state.name || '*Sin definir*'}`,
    `**Descripción:** ${state.description || '*Sin definir*'}`,
    `**Categoría:** ${state.category || 'mining'}`,
    `**Tipo:** ${typeEmojis[state.type || 'daily']} ${state.type || 'daily'}`,
    `**Icono:** ${state.icon || '📋'}`,
    `**Repetible:** ${state.repeatable ? 'Sí' : 'No'}`
  ].join('\n');

  return buildDisplay(0x5865F2, [
    textBlock(`# 📜 Creando Misión: \`${state.key}\``),
    dividerBlock(),
    textBlock(baseInfo),
    dividerBlock(),
    textBlock(`**Requisitos:**\n\`\`\`json\n${JSON.stringify(state.requirements, null, 2)}\n\`\`\``),
    dividerBlock(),
    textBlock(`**Recompensas:**\n\`\`\`json\n${JSON.stringify(state.rewards, null, 2)}\n\`\`\``)
  ]);
}

function buildEditorComponents(state: QuestState) {
  return [
    buildEditorDisplay(state),
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Base', custom_id: 'quest_base' },
        { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Requisitos', custom_id: 'quest_req' },
        { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Recompensas', custom_id: 'quest_reward' },
        { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'quest_save' },
        { type: ComponentType.Button, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'quest_cancel' }
      ]
    }
  ];
}

async function showBaseModal(i: ButtonInteraction, state: QuestState, editorMsg: any) {
  const modal = {
    title: 'Información Base de la Misión',
    customId: 'quest_base_modal',
    components: [
      {
        type: ComponentType.Label,
        label: 'Nombre de la misión',
        component: {
          type: ComponentType.TextInput,
          customId: 'name',
          style: TextInputStyle.Short,
          required: true,
          value: state.name || '',
          placeholder: 'Ej: Minero Diario'
        }
      },
      {
        type: ComponentType.Label,
        label: 'Descripción',
        component: {
          type: ComponentType.TextInput,
          customId: 'description',
          style: TextInputStyle.Paragraph,
          required: true,
          value: state.description || '',
          placeholder: 'Ej: Mina 10 veces hoy'
        }
      },
      {
        type: ComponentType.Label,
        label: 'Categoría',
        component: {
          type: ComponentType.TextInput,
          customId: 'category',
          style: TextInputStyle.Short,
          required: false,
          placeholder: "(mining/fishing/combat/economy/crafting)",
          value: state.category || 'mining'
        }
      },
      {
        type: ComponentType.Label,
        label: 'Tipo (daily/weekly/permanent/event)',
        component: {
          type: ComponentType.TextInput,
          customId: 'type',
          style: TextInputStyle.Short,
          required: false,
          value: state.type || 'daily'
        }
      },
      {
        type: ComponentType.Label,
        label: 'Icono (emoji)',
        component: {
          type: ComponentType.TextInput,
          customId: 'icon',
          style: TextInputStyle.Short,
          required: false,
          value: state.icon || '📋'
        }
      }
    ]
  } as const;

  await i.showModal(modal);

  const submit = await i.awaitModalSubmit({ time: 5 * 60_000 }).catch(() => null);
  if (!submit) return;

  state.name = submit.components.getTextInputValue('name');
  state.description = submit.components.getTextInputValue('description');
  state.category = submit.components.getTextInputValue('category') || 'mining';
  state.type = submit.components.getTextInputValue('type') || 'daily';
  state.icon = submit.components.getTextInputValue('icon') || '📋';

  await submit.deferUpdate();
  await editorMsg.edit({
    content: null,
    flags: 32768,
    components: buildEditorComponents(state)
  });
}

async function showRequirementsModal(i: ButtonInteraction, state: QuestState, editorMsg: any) {
  const modal = {
    title: 'Requisitos de la Misión',
    customId: 'quest_req_modal',
    components: [
      {
        type: ComponentType.TextDisplay,
        content: 'Formato JSON con "type" y "count"'
      },
      {
        type: ComponentType.Label,
        label: 'Requisitos (JSON)',
        component: {
          type: ComponentType.TextInput,
          customId: 'requirements',
          style: TextInputStyle.Paragraph,
          required: true,
          value: JSON.stringify(state.requirements, null, 2),
          placeholder: '{"type": "mine_count", "count": 10}'
        }
      }
    ]
  } as const;

  await i.showModal(modal);

  const submit = await i.awaitModalSubmit({ time: 5 * 60_000 }).catch(() => null);
  if (!submit) return;

  try {
    state.requirements = JSON.parse(submit.components.getTextInputValue('requirements'));
    await submit.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildEditorComponents(state)
    });
  } catch (e) {
    await submit.reply({ content: '❌ JSON inválido en requisitos.', flags: 64 });
  }
}

async function showRewardsModal(i: ButtonInteraction, state: QuestState, editorMsg: any) {
  const modal = {
    title: 'Recompensas de la Misión',
    customId: 'quest_reward_modal',
    components: [
      {
        type: ComponentType.TextDisplay,
        content: 'Formato JSON con coins, items, xp, etc.'
      },
      {
        type: ComponentType.Label,
        label: 'Recompensas (JSON)',
        component: {
          type: ComponentType.TextInput,
          customId: 'rewards',
          style: TextInputStyle.Paragraph,
          required: true,
          value: JSON.stringify(state.rewards, null, 2),
          placeholder: '{"coins": 500, "items": [{"key": "item.key", "quantity": 1}]}'
        }
      }
    ]
  } as const;

  await i.showModal(modal);

  const submit = await i.awaitModalSubmit({ time: 5 * 60_000 }).catch(() => null);
  if (!submit) return;

  try {
    state.rewards = JSON.parse(submit.components.getTextInputValue('rewards'));
    await submit.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildEditorComponents(state)
    });
  } catch (e) {
    await submit.reply({ content: '❌ JSON inválido en recompensas.', flags: 64 });
  }
}
