import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import { prisma } from "../../../core/database/prisma";
import {
  Message,
  MessageComponentInteraction,
  MessageFlags,
  ButtonInteraction,
} from "discord.js";
import {
  ComponentType,
  TextInputStyle,
  ButtonStyle,
} from "discord-api-types/v10";

interface LevelState {
  areaKey: string;
  level: number;
  requirements?: any;
  rewards?: any;
  mobs?: any;
  metadata?: any;
  availableFrom?: string;
  availableTo?: string;
}

export const command: CommandMessage = {
  name: "area-nivel",
  type: "message",
  aliases: ["nivel-area", "arealevel"],
  cooldown: 10,
  description:
    "Crea o edita un nivel de una GameArea (requisitos, recompensas, mobs, ventana).",
  usage: "area-nivel <areaKey> <level>",
  run: async (message, args, _client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      prisma
    );
    if (!allowed) {
      await message.reply(
        "❌ No tienes permisos de ManageGuild ni rol de staff."
      );
      return;
    }

    const areaKey = args[0]?.trim();
    const levelNum = parseInt(args[1] || "", 10);
    if (!areaKey || !Number.isFinite(levelNum) || levelNum <= 0) {
      await message.reply("Uso: `!area-nivel <areaKey> <level>`");
      return;
    }

    const guildId = message.guild!.id;
    const area = await prisma.gameArea.findFirst({
      where: { key: areaKey, OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    if (!area) {
      await message.reply("❌ Área no encontrada.");
      return;
    }

    const existing = await prisma.gameAreaLevel.findFirst({
      where: { areaId: area.id, level: levelNum },
    });

    const state: LevelState = {
      areaKey,
      level: levelNum,
      requirements: existing?.requirements ?? {},
      rewards: existing?.rewards ?? {},
      mobs: existing?.mobs ?? {},
      metadata: existing?.metadata ?? {},
      availableFrom: existing?.availableFrom
        ? new Date(existing.availableFrom).toISOString()
        : "",
      availableTo: existing?.availableTo
        ? new Date(existing.availableTo).toISOString()
        : "",
    };

    const editorMsg = await (message.channel as any).send({
      content: `📊 Editor Nivel Área: \`${areaKey}\` nivel ${levelNum} ${
        existing ? "(editar)" : "(nuevo)"
      }`,
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: ButtonStyle.Primary,
              label: "Requisitos",
              custom_id: "gl_req",
            },
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Recompensas",
              custom_id: "gl_rewards",
            },
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Mobs",
              custom_id: "gl_mobs",
            },
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Ventana",
              custom_id: "gl_window",
            },
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Meta/Imagen",
              custom_id: "gl_meta",
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: ButtonStyle.Success,
              label: "Guardar",
              custom_id: "gl_save",
            },
            {
              type: 2,
              style: ButtonStyle.Danger,
              label: "Cancelar",
              custom_id: "gl_cancel",
            },
          ],
        },
      ],
    });

    const collector = editorMsg.createMessageComponentCollector({
      time: 30 * 60_000,
      filter: (i: MessageComponentInteraction) =>
        i.user.id === message.author.id,
    });
    collector.on("collect", async (i: MessageComponentInteraction) => {
      try {
        if (!i.isButton()) return;
        switch (i.customId) {
          case "gl_cancel":
            await i.deferUpdate();
            await editorMsg.edit({
              content: "❌ Editor de Nivel cancelado.",
              components: [],
            });
            collector.stop("cancel");
            return;
          case "gl_req":
            await showJsonModal(
              i as ButtonInteraction,
              state,
              "requirements",
              "Requisitos"
            );
            return;
          case "gl_rewards":
            await showJsonModal(
              i as ButtonInteraction,
              state,
              "rewards",
              "Recompensas"
            );
            return;
          case "gl_mobs":
            await showJsonModal(i as ButtonInteraction, state, "mobs", "Mobs");
            return;
          case "gl_window":
            await showWindowModal(i as ButtonInteraction, state);
            return;
          case "gl_meta":
            await showJsonModal(
              i as ButtonInteraction,
              state,
              "metadata",
              "Metadata (incl. imagen)"
            );
            return;
          case "gl_save":
            const data = {
              areaId: area.id,
              level: state.level,
              requirements: state.requirements ?? {},
              rewards: state.rewards ?? {},
              mobs: state.mobs ?? {},
              metadata: state.metadata ?? {},
              availableFrom: state.availableFrom
                ? new Date(state.availableFrom)
                : null,
              availableTo: state.availableTo
                ? new Date(state.availableTo)
                : null,
            } as const;
            if (existing) {
              await prisma.gameAreaLevel.update({
                where: { id: existing.id },
                data,
              });
            } else {
              await prisma.gameAreaLevel.create({ data });
            }
            await i.reply({
              content: "✅ Nivel guardado.",
              flags: MessageFlags.Ephemeral,
            });
            await editorMsg.edit({
              content: `✅ Nivel guardado para \`${areaKey}\` (${state.level}).`,
              components: [],
            });
            collector.stop("saved");
            return;
        }
      } catch (e) {
        if (!i.deferred && !i.replied)
          await i.reply({
            content: "❌ Error procesando la acción.",
            flags: MessageFlags.Ephemeral,
          });
      }
    });
    collector.on("end", async (_c: any, r: string) => {
      if (r === "time") {
        try {
          await editorMsg.edit({
            content: "⏰ Editor expirado.",
            components: [],
          });
        } catch {}
      }
    });
  },
};

async function showJsonModal(
  i: ButtonInteraction,
  state: LevelState,
  field: "requirements" | "rewards" | "mobs" | "metadata",
  title: string
) {
  const current = JSON.stringify(state[field] ?? {});
  const modal = {
    title,
    customId: `gl_json_${field}`,
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
        await sub.reply({
          content: "✅ Guardado.",
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await sub.reply({
          content: "❌ JSON inválido.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      state[field] = {};
      await sub.reply({ content: "ℹ️ Limpio.", flags: MessageFlags.Ephemeral });
    }
  } catch {}
}

async function showWindowModal(i: ButtonInteraction, state: LevelState) {
  const modal = {
    title: "Ventana del Nivel",
    customId: "gl_window_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Desde (ISO, opcional)",
        component: {
          type: ComponentType.TextInput,
          customId: "from",
          style: TextInputStyle.Short,
          required: false,
          value: state.availableFrom ?? "",
        },
      },
      {
        type: ComponentType.Label,
        label: "Hasta (ISO, opcional)",
        component: {
          type: ComponentType.TextInput,
          customId: "to",
          style: TextInputStyle.Short,
          required: false,
          value: state.availableTo ?? "",
        },
      },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const from = sub.components.getTextInputValue("from").trim();
    const to = sub.components.getTextInputValue("to").trim();
    state.availableFrom = from || "";
    state.availableTo = to || "";
    await sub.reply({
      content: "✅ Ventana actualizada.",
      flags: MessageFlags.Ephemeral,
    });
  } catch {}
}
