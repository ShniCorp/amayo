import type {CommandMessage} from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import {hasManageGuildOrStaff} from '../../../core/lib/permissions';
import {prisma} from '../../../core/database/prisma';
import {ButtonStyle, ComponentType, TextInputStyle} from 'discord-api-types/v10';
import {buildDisplay, dividerBlock, textBlock} from '../../../core/lib/componentsV2';
import type {ButtonInteraction, MessageComponentInteraction, TextBasedChannel} from 'discord.js';

interface AchievementState {
  key: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  requirements?: any;
  rewards?: any;
  points?: number;
  hidden?: boolean;
}

export const command: CommandMessage = {
  name: 'logro-crear',
  type: 'message',
  aliases: ['crear-logro', 'achievement-create'],
  cooldown: 10,
  description: 'Crea un logro para el servidor con editor interactivo',
  usage: 'logro-crear <key-única>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const key = args[0]?.trim();
    if (!key) {
      await message.reply('Uso: `!logro-crear <key-única>`\nEjemplo: `!logro-crear master_fisher`');
      return;
    }

    const guildId = message.guild!.id;
    const exists = await prisma.achievement.findFirst({ where: { key, guildId } });
    if (exists) {
      await message.reply('❌ Ya existe un logro con esa key en este servidor.');
      return;
    }

    const state: AchievementState = {
      key,
      category: 'economy',
      points: 10,
      hidden: false,
      requirements: { type: 'mine_count', value: 1 },
      rewards: { coins: 100 }
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
          case 'ach_cancel':
            await i.deferUpdate();
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                buildDisplay(0xFF0000, [
                  textBlock('**❌ Creación de logro cancelada.**')
                ])
              ]
            });
            collector.stop('cancel');
            return;

          case 'ach_base':
            await showBaseModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'ach_req':
            await showRequirementsModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'ach_reward':
            await showRewardsModal(i as ButtonInteraction, state, editorMsg);
            return;

          case 'ach_save':
            if (!state.name || !state.description) {
              await i.reply({ content: '❌ Completa al menos el nombre y descripción.', flags: 64 });
              return;
            }

            await prisma.achievement.create({
              data: {
                guildId,
                key: state.key,
                name: state.name!,
                description: state.description!,
                category: state.category || 'economy',
                icon: state.icon,
                requirements: state.requirements as any || {},
                rewards: state.rewards as any || {},
                points: state.points || 10,
                hidden: state.hidden || false
              }
            });

            await i.reply({ content: '✅ Logro creado exitosamente!', flags: 64 });
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                buildDisplay(0x00FF00, [
                  textBlock(`**✅ Logro \`${state.key}\` creado exitosamente.**`)
                ])
              ]
            });
            collector.stop('saved');
            return;
        }
      } catch (e: any) {
        console.error('Error en editor de logros:', e);
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

function buildEditorDisplay(state: AchievementState) {
  const baseInfo = [
    `**Nombre:** ${state.name || '*Sin definir*'}`,
    `**Descripción:** ${state.description || '*Sin definir*'}`,
    `**Categoría:** ${state.category || 'economy'}`,
    `**Icono:** ${state.icon || '🏆'}`,
    `**Puntos:** ${state.points ?? 10}`,
    `**Oculto:** ${state.hidden ? 'Sí' : 'No'}`,
  ].join('\n');

  return buildDisplay(0xFFD700, [
    textBlock(`# 🏆 Creando Logro: \`${state.key}\``),
    dividerBlock(),
    textBlock(baseInfo),
    dividerBlock(),
    textBlock(`**Requisitos:**\n\`\`\`json\n${JSON.stringify(state.requirements, null, 2)}\n\`\`\``),
    dividerBlock(),
    textBlock(`**Recompensas:**\n\`\`\`json\n${JSON.stringify(state.rewards, null, 2)}\n\`\`\``),
  ]);
}

function buildEditorComponents(state: AchievementState) {
  return [
    buildEditorDisplay(state),
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, style: ButtonStyle.Primary, label: 'Base', custom_id: 'ach_base' },
        { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Requisitos', custom_id: 'ach_req' },
        { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Recompensas', custom_id: 'ach_reward' },
        { type: ComponentType.Button, style: ButtonStyle.Success, label: 'Guardar', custom_id: 'ach_save' },
        { type: ComponentType.Button, style: ButtonStyle.Danger, label: 'Cancelar', custom_id: 'ach_cancel' }
      ]
    }
  ];
}

async function showBaseModal(i: ButtonInteraction, state: AchievementState, editorMsg: any) {
  const modal = {
    title: 'Información Base del Logro',
    customId: 'ach_base_modal',
    components: [
      {
        type: ComponentType.Label,
        label: 'Nombre del logro',
        component: {
          type: ComponentType.TextInput,
          customId: 'name',
          style: TextInputStyle.Short,
          required: true,
          value: state.name || '',
          placeholder: 'Ej: Maestro Pescador'
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
          placeholder: 'Ej: Pesca 100 veces'
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
          placeholder: '(mining/fishing/combat/economy/crafting)',
          value: state.category || 'economy'
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
          value: state.icon || '🏆'
        }
      },
      {
        type: ComponentType.Label,
        label: 'Puntos (número)',
        component: {
          type: ComponentType.TextInput,
          customId: 'points',
          style: TextInputStyle.Short,
          required: false,
          value: String(state.points || 10)
        }
      }
    ]
  } as const;

  await i.showModal(modal);

  const submit = await i.awaitModalSubmit({ time: 5 * 60_000 }).catch(() => null);
  if (!submit) return;

  state.name = submit.components.getTextInputValue('name');
  state.description = submit.components.getTextInputValue('description');
  state.category = submit.components.getTextInputValue('category') || 'economy';
  state.icon = submit.components.getTextInputValue('icon') || '🏆';
  state.points = parseInt(submit.components.getTextInputValue('points')) || 10;

  await submit.deferUpdate();
  await editorMsg.edit({
    content: null,
    flags: 32768,
    components: buildEditorComponents(state)
  });
}

async function showRequirementsModal(i: ButtonInteraction, state: AchievementState, editorMsg: any) {
  const modal = {
    title: 'Requisitos del Logro',
    customId: 'ach_req_modal',
    components: [
      {
        type: ComponentType.TextDisplay,
        content: 'Formato JSON con "type" y "value"'
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
          placeholder: '{"type": "mine_count", "value": 100}'
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

async function showRewardsModal(i: ButtonInteraction, state: AchievementState, editorMsg: any) {
  const modal = {
    title: 'Recompensas del Logro',
    customId: 'ach_reward_modal',
    components: [
      {
        type: ComponentType.TextDisplay,
        content: 'Formato JSON con coins, items, etc.'
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
          placeholder: '{"coins": 1000, "items": [{"key": "item.key", "quantity": 1}]}'
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
