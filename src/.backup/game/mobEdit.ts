import {
  Message,
  MessageFlags,
  MessageComponentInteraction,
  ButtonInteraction,
  TextBasedChannel,
} from "discord.js";
import {
  ComponentType,
  TextInputStyle,
  ButtonStyle,
} from "discord-api-types/v10";
import type { CommandMessage } from "../../../core/types/commands";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import logger from "../../../core/lib/logger";
import type Amayo from "../../../core/client";
import { promptKeySelection } from "./_helpers";

interface MobEditorState {
  key: string;
  name?: string;
  category?: string;
  stats?: any;
  drops?: any;
}
function createMobDisplay(state: MobEditorState, editing: boolean = false) {
  const title = editing ? "Editando Mob" : "Creando Mob";
  const stats = state.stats || {};
  return {
    type: 17,
    accent_color: 0xff0000,
    components: [
      { type: 10, content: `# 👹 ${title}: \`${state.key}\`` },
      { type: 14, divider: true },
      {
        type: 10,
        content: [
          "**📋 Estado Actual:**",
          `**Nombre:** ${state.name || "❌ No configurado"}`,
          `**Categoría:** ${state.category || "Sin categoría"}`,
          `**Attack:** ${stats.attack || 0}`,
          `**HP:** ${stats.hp || 0}`,
          `**Defense:** ${stats.defense || 0}`,
          `**Drops:** ${Object.keys(state.drops || {}).length} items`,
        ].join("\n"),
      },
      { type: 14, divider: true },
      {
        type: 10,
        content: [
          "**🎮 Instrucciones:**",
          "• **Base**: Nombre y categoría",
          "• **Stats (JSON)**: Estadísticas del mob",
          "• **Drops (JSON)**: Items que dropea",
          "• **Guardar**: Confirma los cambios",
          "• **Cancelar**: Descarta los cambios",
        ].join("\n"),
      },
    ],
  };
}

export const command: CommandMessage = {
  name: "mob-editar",
  type: "message",
  aliases: ["editar-mob", "mobedit"],
  cooldown: 10,
  description:
    "Edita un Mob (enemigo) de este servidor con editor interactivo.",
  category: "Minijuegos",
  usage: "mob-editar",
  run: async (message: Message, _args: string[], client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      client.prisma
    );
    if (!allowed) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0xff0000,
            components: [
              {
                type: 10,
                content:
                  "❌ **Error de Permisos**\n└ No tienes permisos de ManageGuild ni rol de staff.",
              },
            ],
          },
        ],
        reply: { messageReference: message.id },
      });
      return;
    }

    const guildId = message.guild!.id;
    const { listMobsWithRows } = await import("../../../game/mobs/admin.js");
    const all = await listMobsWithRows();
    // Keep behaviour: only guild-local mobs editable here
    const localEntries = all.filter((e: any) => e.guildId === guildId);
    const selection = await promptKeySelection(message, {
      entries: localEntries,
      customIdPrefix: "mob_edit",
      title: "Selecciona un mob para editar",
      emptyText: "⚠️ **No hay mobs configurados.** Usa `!mob-crear` primero.",
      placeholder: "Elige un mob…",
      filterHint: "Filtra por nombre, key o categoría.",
      getOption: (entry: any) => ({
        value: entry.id ?? entry.def.key,
        label: entry.def.name ?? entry.def.key,
        description: [entry.def?.category ?? "Sin categoría", entry.def.key]
          .filter(Boolean)
          .join(" • "),
        keywords: [
          entry.def.key,
          entry.def.name ?? "",
          entry.def?.category ?? "",
        ],
      }),
    });

    if (!selection.entry || !selection.panelMessage) {
      return;
    }

    const entry = selection.entry as any;
    if (!entry) return;

    // If entry has an id (DB row), fetch the full row to get stats/drops stored in DB.
    let dbRow: any = null;
    if (entry.id) {
      try {
        dbRow = await client.prisma.mob.findUnique({ where: { id: entry.id } });
      } catch {}
    }

    const state: MobEditorState = {
      key: entry.def.key,
      name: (dbRow && dbRow.name) ?? entry.def.name,
      category: (dbRow && dbRow.category) ?? entry.def?.category ?? undefined,
      stats: (dbRow && dbRow.stats) ?? entry.def?.base ?? {},
      drops: (dbRow && dbRow.drops) ?? entry.def?.drops ?? {},
    };

    const buildEditorComponents = () => [
      createMobDisplay(state, true),
      {
        type: 1,
        components: [
          {
            type: 2,
            style: ButtonStyle.Primary,
            label: "Base",
            custom_id: "mb_base",
          },
          {
            type: 2,
            style: ButtonStyle.Secondary,
            label: "Stats (JSON)",
            custom_id: "mb_stats",
          },
          {
            type: 2,
            style: ButtonStyle.Secondary,
            label: "Drops (JSON)",
            custom_id: "mb_drops",
          },
          {
            type: 2,
            style: ButtonStyle.Success,
            label: "Guardar",
            custom_id: "mb_save",
          },
          {
            type: 2,
            style: ButtonStyle.Danger,
            label: "Cancelar",
            custom_id: "mb_cancel",
          },
        ],
      },
    ];

    const editorMsg = selection.panelMessage;
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildEditorComponents(),
    });

    const collector = editorMsg.createMessageComponentCollector({
      time: 30 * 60_000,
      filter: (i) => i.user.id === message.author.id,
    });
    collector.on("collect", async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        switch (i.customId) {
          case "mb_cancel":
            await i.deferUpdate();
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                {
                  type: 17,
                  accent_color: 0xff0000,
                  components: [
                    {
                      type: 10,
                      content: "**❌ Editor cancelado.**",
                    },
                  ],
                },
              ],
            });
            collector.stop("cancel");
            return;
          case "mb_base":
            await showBaseModal(
              i as ButtonInteraction,
              state,
              editorMsg,
              buildEditorComponents
            );
            return;
          case "mb_stats":
            await showJsonModal(
              i as ButtonInteraction,
              state,
              "stats",
              "Stats del Mob (JSON)",
              editorMsg,
              buildEditorComponents
            );
            return;
          case "mb_drops":
            await showJsonModal(
              i as ButtonInteraction,
              state,
              "drops",
              "Drops del Mob (JSON)",
              editorMsg,
              buildEditorComponents
            );
            return;
          case "mb_save":
            if (!state.name) {
              await i.reply({
                content: "❌ Falta el nombre del mob.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            try {
              const { createOrUpdateMob } = await import(
                "../../../game/mobs/admin.js"
              );
              // Provide guildId so admin can scope or return db row
              await createOrUpdateMob({ ...(state as any), guildId });
              await i.reply({
                content: "✅ Mob actualizado!",
                flags: MessageFlags.Ephemeral,
              });
            } catch (e) {
              // fallback to direct update
              await client.prisma.mob.update({
                where: { id: entry.id },
                data: {
                  name: state.name!,
                  category: state.category ?? null,
                  stats: state.stats ?? {},
                  drops: state.drops ?? {},
                },
              });
              await i.reply({
                content: "✅ Mob actualizado (fallback)!",
                flags: MessageFlags.Ephemeral,
              });
            }
            await editorMsg.edit({
              content: null,
              flags: 32768,
              components: [
                {
                  type: 17,
                  accent_color: 0x00ff00,
                  components: [
                    {
                      type: 10,
                      content: `**✅ Mob \`${state.key}\` actualizado exitosamente.**`,
                    },
                  ],
                },
              ],
            });
            collector.stop("saved");
            return;
        }
      } catch (err) {
        logger.error({ err }, "mob-editar");
        if (!i.deferred && !i.replied)
          await i.reply({
            content: "❌ Error procesando la acción.",
            flags: MessageFlags.Ephemeral,
          });
      }
    });
    collector.on("end", async (_c, reason) => {
      if (reason === "time") {
        try {
          await editorMsg.edit({
            content: null,
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: 0xffa500,
                components: [
                  {
                    type: 10,
                    content: "**⏰ Editor expirado.**",
                  },
                ],
              },
            ],
          });
        } catch {}
      }
    });
  },
};

async function showBaseModal(
  i: ButtonInteraction,
  state: MobEditorState,
  editorMsg: Message,
  buildComponents: () => any[]
) {
  const modal = {
    title: "Base del Mob",
    customId: "mb_base_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Nombre",
        component: {
          type: ComponentType.TextInput,
          customId: "name",
          style: TextInputStyle.Short,
          required: true,
          value: state.name ?? "",
        },
      },
      {
        type: ComponentType.Label,
        label: "Categoría (opcional)",
        component: {
          type: ComponentType.TextInput,
          customId: "category",
          style: TextInputStyle.Short,
          required: false,
          value: state.category ?? "",
        },
      },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    state.name = sub.components.getTextInputValue("name").trim();
    const cat = sub.components.getTextInputValue("category")?.trim();
    state.category = cat || undefined;
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents(),
    });
  } catch {}
}

async function showJsonModal(
  i: ButtonInteraction,
  state: MobEditorState,
  field: "stats" | "drops",
  title: string,
  editorMsg: Message,
  buildComponents: () => any[]
) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = {
    title,
    customId: `mb_json_${field}`,
    components: [
      {
        type: ComponentType.Label,
        label: "JSON",
        component: {
          type: ComponentType.TextInput,
          customId: "json",
          style: TextInputStyle.Paragraph,
          required: false,
          value: current.slice(0, 4000),
        },
      },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue("json");
    if (raw) {
      try {
        state[field] = JSON.parse(raw);
        await sub.deferUpdate();
      } catch {
        await sub.reply({
          content: "❌ JSON inválido.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else {
      state[field] = {};
      await sub.deferUpdate();
    }
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents(),
    });
  } catch {}
}
