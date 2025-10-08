import { prisma } from "../../../core/database/prisma";
import { textBlock, dividerBlock } from "../../../core/lib/componentsV2";
import type { GameArea } from "@prisma/client";
import type { ItemProps } from "../../../game/economy/types";
import type {
  Message,
  TextBasedChannel,
  MessageComponentInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { MessageFlags } from "discord.js";
import {
  ButtonStyle,
  ComponentType,
  TextInputStyle,
} from "discord-api-types/v10";

export function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== "object") return {};
  return json as ItemProps;
}

export async function resolveArea(guildId: string, areaKey: string) {
  const area = await prisma.gameArea.findFirst({
    where: { key: areaKey, OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
  return area;
}

export interface ResolvedAreaInfo {
  area: GameArea | null;
  source: "guild" | "global" | "none";
}

export async function resolveGuildAreaWithFallback(
  guildId: string,
  areaKey: string
): Promise<ResolvedAreaInfo> {
  const guildArea = await prisma.gameArea.findFirst({
    where: { key: areaKey, guildId },
  });
  if (guildArea) {
    return { area: guildArea, source: "guild" };
  }

  const globalArea = await prisma.gameArea.findFirst({
    where: { key: areaKey, guildId: null },
  });
  if (globalArea) {
    return { area: globalArea, source: "global" };
  }

  return { area: null, source: "none" };
}

export async function resolveAreaByType(
  guildId: string,
  type: string
): Promise<ResolvedAreaInfo> {
  const guildArea = await prisma.gameArea.findFirst({
    where: { type, guildId },
    orderBy: [{ createdAt: "asc" }],
  });
  if (guildArea) {
    return { area: guildArea, source: "guild" };
  }

  const globalArea = await prisma.gameArea.findFirst({
    where: { type, guildId: null },
    orderBy: [{ createdAt: "asc" }],
  });
  if (globalArea) {
    return { area: globalArea, source: "global" };
  }

  return { area: null, source: "none" };
}

export async function getDefaultLevel(
  userId: string,
  guildId: string,
  areaId: string
): Promise<number> {
  const prog = await prisma.playerProgress.findUnique({
    where: { userId_guildId_areaId: { userId, guildId, areaId } },
  });
  return Math.max(1, prog?.highestLevel ?? 1);
}

export async function findBestToolKey(
  userId: string,
  guildId: string,
  toolType: string
): Promise<string | null> {
  const inv = await prisma.inventoryEntry.findMany({
    where: { userId, guildId, quantity: { gt: 0 } },
    include: { item: true },
  });
  let best: { key: string; tier: number } | null = null;
  for (const e of inv) {
    const it = e.item;
    const props = parseItemProps(it.props);
    const t = props.tool;
    if (!t || t.type !== toolType) continue;
    const tier = Math.max(0, t.tier ?? 0);
    if (!best || tier > best.tier) best = { key: it.key, tier };
  }
  return best?.key ?? null;
}

export interface ParsedGameArgs {
  levelArg: number | null;
  providedTool: string | null;
  areaOverride: string | null;
}

const AREA_OVERRIDE_PREFIX = "area:";

export function parseGameArgs(args: string[]): ParsedGameArgs {
  const tokens = args.filter(
    (arg): arg is string => typeof arg === "string" && arg.trim().length > 0
  );

  let levelArg: number | null = null;
  let providedTool: string | null = null;
  let areaOverride: string | null = null;

  for (const token of tokens) {
    if (token.startsWith(AREA_OVERRIDE_PREFIX)) {
      const override = token.slice(AREA_OVERRIDE_PREFIX.length).trim();
      if (override) areaOverride = override;
      continue;
    }

    if (levelArg === null && /^\d+$/.test(token)) {
      levelArg = parseInt(token, 10);
      continue;
    }

    if (!providedTool) {
      providedTool = token;
    }
  }

  return { levelArg, providedTool, areaOverride };
}

const DEFAULT_ITEM_ICON = "📦";

export function resolveItemIcon(
  icon?: string | null,
  fallback = DEFAULT_ITEM_ICON
) {
  const trimmed = icon?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function formatItemLabel(
  item: { key: string; name?: string | null; icon?: string | null },
  options: { fallbackIcon?: string; bold?: boolean } = {}
): string {
  const fallbackIcon = options.fallbackIcon ?? DEFAULT_ITEM_ICON;
  const icon = resolveItemIcon(item.icon, fallbackIcon);
  const label = (item.name ?? "").trim() || item.key;
  const content = `${icon ? `${icon} ` : ""}${label}`.trim();
  return options.bold ? `**${content}**` : content;
}

export type ItemBasicInfo = {
  key: string;
  name: string | null;
  icon: string | null;
};

export async function fetchItemBasics(
  guildId: string,
  keys: string[]
): Promise<Map<string, ItemBasicInfo>> {
  const uniqueKeys = Array.from(
    new Set(keys.filter((key): key is string => Boolean(key && key.trim())))
  );
  if (uniqueKeys.length === 0) return new Map();

  const rows = await prisma.economyItem.findMany({
    where: {
      key: { in: uniqueKeys },
      OR: [{ guildId }, { guildId: null }],
    },
    orderBy: [{ key: "asc" }, { guildId: "desc" }],
    select: { key: true, name: true, icon: true, guildId: true },
  });

  const result = new Map<string, ItemBasicInfo>();
  for (const row of rows) {
    const current = result.get(row.key);
    if (!current || row.guildId === guildId) {
      result.set(row.key, { key: row.key, name: row.name, icon: row.icon });
    }
  }

  for (const key of uniqueKeys) {
    if (!result.has(key)) {
      result.set(key, { key, name: null, icon: null });
    }
  }

  return result;
}

export type AreaMetadata =
  | {
      previewImage?: string;
      image?: string;
      referenceImage?: string;
      description?: string;
      [k: string]: any;
    }
  | null
  | undefined;

export function buildAreaMetadataBlocks(
  area: Pick<GameArea, "metadata" | "key" | "name">
) {
  const blocks: any[] = [];
  const meta = (area.metadata as AreaMetadata) || undefined;
  if (!meta) return blocks;

  const img = meta.previewImage || meta.image || meta.referenceImage;
  const desc =
    typeof meta.description === "string" && meta.description.trim().length > 0
      ? meta.description.trim()
      : null;

  if (desc) {
    blocks.push(textBlock(`**🗺️ Detalles del área**\n${desc}`));
  }
  if (img && typeof img === "string") {
    // Mostrar también como texto para compatibilidad, y dejar que el renderer agregue imagen si soporta
    blocks.push(dividerBlock({ divider: false, spacing: 1 }));
    blocks.push(textBlock(`**🖼️ Mapa/Imagen:** ${img}`));
    // Si el renderer soporta bloque de imagen, los consumidores podrán usarlo
    // @ts-ignore: el builder acepta bloques extendidos
    blocks.push({ kind: "image", url: img });
  }
  return blocks;
}

export interface KeyPickerOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
}

export interface KeyPickerConfig<T> {
  entries: T[];
  getOption: (entry: T) => KeyPickerOption;
  title: string;
  customIdPrefix: string;
  emptyText: string;
  placeholder?: string;
  filterHint?: string;
  accentColor?: number;
  userId?: string;
}

export interface KeyPickerResult<T> {
  entry: T | null;
  panelMessage: Message | null;
  reason: "selected" | "empty" | "cancelled" | "timeout";
}

export async function promptKeySelection<T>(
  message: Message,
  config: KeyPickerConfig<T>
): Promise<KeyPickerResult<T>> {
  const channel = message.channel as TextBasedChannel & { send: Function };
  const userId = config.userId ?? message.author?.id ?? message.member?.user.id;

  const baseOptions = config.entries.map((entry) => {
    const option = config.getOption(entry);
    const searchText = [
      option.label,
      option.description,
      option.value,
      ...(option.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return { entry, option, searchText };
  });

  if (baseOptions.length === 0) {
    const emptyPanel = {
      type: 17,
      accent_color: 0xffa500,
      components: [
        {
          type: 10,
          content: config.emptyText,
        },
      ],
    };
    await (channel.send as any)({
      content: null,
      flags: 32768,
      reply: { messageReference: message.id },
      components: [emptyPanel],
    });
    return { entry: null, panelMessage: null, reason: "empty" };
  }

  let filter = "";
  let page = 0;
  const pageSize = 25;
  const accentColor = config.accentColor ?? 0x5865f2;
  const placeholder = config.placeholder ?? "Selecciona una opción…";

  const buildComponents = () => {
    const normalizedFilter = filter.trim().toLowerCase();
    const filtered = normalizedFilter
      ? baseOptions.filter((item) => item.searchText.includes(normalizedFilter))
      : baseOptions;
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    if (safePage !== page) page = safePage;
    const start = safePage * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    const pageLabel = `Página ${
      totalFiltered === 0 ? 0 : safePage + 1
    }/${totalPages}`;
    const statsLine = `Total: **${baseOptions.length}** • Coincidencias: **${totalFiltered}**\n${pageLabel}`;
    const filterLine = filter ? `\nFiltro activo: \`${filter}\`` : "";
    const hintLine = config.filterHint ? `\n${config.filterHint}` : "";

    const display = {
      type: 17,
      accent_color: accentColor,
      components: [
        { type: 10, content: `# ${config.title}` },
        { type: 14, divider: true },
        {
          type: 10,
          content: `${statsLine}${filterLine}${hintLine}`,
        },
        { type: 14, divider: true },
        {
          type: 10,
          content:
            totalFiltered === 0
              ? "No hay resultados para el filtro actual. Ajusta el filtro o limpia la búsqueda."
              : "Selecciona una opción del menú desplegable para continuar.",
        },
      ],
    };

    let options = slice.map(({ option }) => ({
      label: option.label.slice(0, 100),
      value: option.value,
      description: option.description?.slice(0, 100),
    }));

    const selectDisabled = options.length === 0;
    if (selectDisabled) {
      options = [
        {
          label: "Sin resultados",
          value: `${config.customIdPrefix}_empty`,
          description: "Ajusta el filtro para ver opciones.",
        },
      ];
    }

    const selectRow = {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: `${config.customIdPrefix}_select`,
          placeholder,
          options,
          disabled: selectDisabled,
        },
      ],
    };

    const navRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: ButtonStyle.Secondary,
          label: "◀️",
          custom_id: `${config.customIdPrefix}_prev`,
          disabled: safePage <= 0 || totalFiltered === 0,
        },
        {
          type: 2,
          style: ButtonStyle.Secondary,
          label: "▶️",
          custom_id: `${config.customIdPrefix}_next`,
          disabled: safePage >= totalPages - 1 || totalFiltered === 0,
        },
        {
          type: 2,
          style: ButtonStyle.Primary,
          label: "🔎 Filtro",
          custom_id: `${config.customIdPrefix}_filter`,
        },
        {
          type: 2,
          style: ButtonStyle.Secondary,
          label: "Limpiar",
          custom_id: `${config.customIdPrefix}_clear`,
          disabled: filter.length === 0,
        },
        {
          type: 2,
          style: ButtonStyle.Danger,
          label: "Cancelar",
          custom_id: `${config.customIdPrefix}_cancel`,
        },
      ],
    };

    return [display, selectRow, navRow];
  };

  const panelMessage: Message = await (channel.send as any)({
    content: null,
    flags: 32768,
    reply: { messageReference: message.id },
    components: buildComponents(),
  });

  let resolved = false;

  const result = await new Promise<KeyPickerResult<T>>((resolve) => {
    const finish = (
      entry: T | null,
      reason: "selected" | "cancelled" | "timeout"
    ) => {
      if (resolved) return;
      resolved = true;
      resolve({ entry, panelMessage, reason });
    };

    const collector = panelMessage.createMessageComponentCollector({
      time: 5 * 60_000,
      filter: (i: MessageComponentInteraction) =>
        i.user.id === userId && i.customId.startsWith(config.customIdPrefix),
    });

    collector.on(
      "collect",
      async (interaction: MessageComponentInteraction) => {
        try {
          if (
            interaction.customId === `${config.customIdPrefix}_select` &&
            interaction.isStringSelectMenu()
          ) {
            const select = interaction as StringSelectMenuInteraction;
            const value = select.values?.[0];
            const selected = baseOptions.find(
              (opt) => opt.option.value === value
            );
            if (!selected) {
              await select.reply({
                content: "❌ Opción no válida.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            try {
              await select.update({
                components: [
                  {
                    type: 17,
                    accent_color: accentColor,
                    components: [
                      {
                        type: 10,
                        content: `⏳ Cargando **${selected.option.label}**…`,
                      },
                    ],
                  },
                ],
              });
            } catch {
              if (!select.deferred && !select.replied) {
                try {
                  await select.deferUpdate();
                } catch {}
              }
            }

            finish(selected.entry, "selected");
            collector.stop("selected");
            return;
          }

          if (
            interaction.customId === `${config.customIdPrefix}_prev` &&
            interaction.isButton()
          ) {
            if (page > 0) page -= 1;
            await interaction.update({ components: buildComponents() });
            return;
          }

          if (
            interaction.customId === `${config.customIdPrefix}_next` &&
            interaction.isButton()
          ) {
            page += 1;
            await interaction.update({ components: buildComponents() });
            return;
          }

          if (
            interaction.customId === `${config.customIdPrefix}_clear` &&
            interaction.isButton()
          ) {
            filter = "";
            page = 0;
            await interaction.update({ components: buildComponents() });
            return;
          }

          if (
            interaction.customId === `${config.customIdPrefix}_cancel` &&
            interaction.isButton()
          ) {
            try {
              await interaction.update({
                components: [
                  {
                    type: 17,
                    accent_color: 0xff0000,
                    components: [
                      { type: 10, content: "❌ Selección cancelada." },
                    ],
                  },
                ],
              });
            } catch {
              if (!interaction.deferred && !interaction.replied) {
                try {
                  await interaction.deferUpdate();
                } catch {}
              }
            }

            finish(null, "cancelled");
            collector.stop("cancelled");
            return;
          }

          if (
            interaction.customId === `${config.customIdPrefix}_filter` &&
            interaction.isButton()
          ) {
            const modal = {
              title: "Filtrar lista",
              customId: `${config.customIdPrefix}_filter_modal`,
              components: [
                {
                  type: ComponentType.Label,
                  label: "Texto a buscar",
                  component: {
                    type: ComponentType.TextInput,
                    customId: "query",
                    style: TextInputStyle.Short,
                    required: false,
                    value: filter,
                    placeholder: "Nombre, key, categoría…",
                  },
                },
              ],
            } as const;

            await (interaction as ButtonInteraction).showModal(modal);
            let submitted: ModalSubmitInteraction | undefined;
            try {
              submitted = await interaction.awaitModalSubmit({
                time: 120_000,
                filter: (sub) =>
                  sub.user.id === userId &&
                  sub.customId === `${config.customIdPrefix}_filter_modal`,
              });
            } catch {
              return;
            }

            try {
              const value =
                submitted.components.getTextInputValue("query")?.trim() ?? "";
              filter = value;
              page = 0;
              await submitted.deferUpdate();
              await panelMessage.edit({ components: buildComponents() });
            } catch {
              // ignore errors updating filter
            }
            return;
          }
        } catch (err) {
          if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
              content: "❌ Error procesando la selección.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    );

    collector.on("end", async (_collected, reason) => {
      if (resolved) return;
      resolved = true;
      if (reason !== "selected" && reason !== "cancelled") {
        const expiredPanel = {
          type: 17,
          accent_color: 0xffa500,
          components: [{ type: 10, content: "⏰ Selección expirada." }],
        };
        try {
          await panelMessage.edit({ components: [expiredPanel] });
        } catch {}
      }

      let mappedReason: "selected" | "cancelled" | "timeout";
      if (reason === "selected") mappedReason = "selected";
      else if (reason === "cancelled") mappedReason = "cancelled";
      else mappedReason = "timeout";

      resolve({ entry: null, panelMessage, reason: mappedReason });
    });
  });

  return result;
}

export function sendDisplayReply(
  message: Message,
  display: any,
  extraComponents: any[] = []
) {
  const channel = message.channel as TextBasedChannel & { send: Function };
  return (channel.send as any)({
    flags: 32768,
    message_reference: { message_id: message.id },
    components: [display, ...extraComponents],
  });
}
