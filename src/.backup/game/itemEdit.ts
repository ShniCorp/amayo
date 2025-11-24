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
import { promptKeySelection, resolveItemIcon } from "./_helpers";

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
  // Nueva propiedad para receta de crafteo
  recipe?: {
    enabled: boolean;
    ingredients: Array<{ itemKey: string; quantity: number }>;
    productQuantity: number;
  };
  isGlobal?: boolean;
}

export const command: CommandMessage = {
  name: "item-editar",
  type: "message",
  aliases: ["editar-item", "itemedit"],
  cooldown: 10,
  description:
    "Edita un EconomyItem existente del servidor con un pequeño editor interactivo.",
  category: "Economía",
  usage: "item-editar",
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
    const items = await client.prisma.economyItem.findMany({
      where: { guildId },
      orderBy: [{ key: "asc" }],
    });
    const selection = await promptKeySelection(message, {
      entries: items,
      customIdPrefix: "item_edit",
      title: "Selecciona un ítem para editar",
      emptyText:
        "⚠️ **No hay ítems locales configurados.** Usa `!item-crear` primero.",
      placeholder: "Elige un ítem…",
      filterHint: "Filtra por nombre, key, categoría o tag.",
      getOption: (item) => {
        const icon = resolveItemIcon(item.icon);
        const label = `${icon} ${item.name ?? item.key}`.trim();
        const tags = Array.isArray(item.tags) ? item.tags : [];
        return {
          value: item.id,
          label: label.slice(0, 100),
          description: item.key,
          keywords: [item.key, item.name ?? "", item.category ?? "", ...tags],
        };
      },
    });

    if (!selection.entry || !selection.panelMessage) {
      return;
    }

    const existing = selection.entry;

    // Cargar receta si existe
    let existingRecipe: {
      ingredients: Array<{ item: { key: string }; quantity: number }>;
      productQuantity: number;
    } | null = null;
    try {
      existingRecipe = await client.prisma.itemRecipe.findUnique({
        where: { productItemId: existing.id },
        include: { ingredients: { include: { item: true } } },
      });
    } catch (e) {
      logger.warn({ err: e }, "Error cargando receta existente");
    }

    const state: ItemEditorState = {
      key: existing.key,
      name: existing.name,
      description: existing.description || undefined,
      category: existing.category || undefined,
      icon: existing.icon || undefined,
      stackable: existing.stackable ?? true,
      maxPerInventory: existing.maxPerInventory ?? null,
      tags: Array.isArray(existing.tags) ? existing.tags : [],
      props: existing.props || {},
      recipe: existingRecipe
        ? {
            enabled: true,
            ingredients: existingRecipe.ingredients.map((ing) => ({
              itemKey: ing.item.key,
              quantity: ing.quantity,
            })),
            productQuantity: existingRecipe.productQuantity,
          }
        : {
            enabled: false,
            ingredients: [],
            productQuantity: 1,
          },
      isGlobal: !!(existing.props as any)?.global || existing.guildId === null,
    };

    const buildEditorDisplay = () => {
      const baseInfo = [
        `**Nombre:** ${state.name || "*Sin definir*"}`,
        `**Descripción:** ${state.description || "*Sin definir*"}`,
        `**Categoría:** ${state.category || "*Sin definir*"}`,
        `**Icon URL:** ${state.icon || "*Sin definir*"}`,
        `**Stackable:** ${state.stackable ? "Sí" : "No"}`,
        `**Máx. Inventario:** ${state.maxPerInventory ?? "Ilimitado"}`,
        `**Global:** ${state.isGlobal ? "Sí" : "No"}`,
      ].join("\n");

      const tagsInfo = `**Tags:** ${
        state.tags.length > 0 ? state.tags.join(", ") : "*Ninguno*"
      }`;
      const propsJson = JSON.stringify(state.props ?? {}, null, 2);
      const recipeInfo = state.recipe?.enabled
        ? `**Receta:** Habilitada (${state.recipe.ingredients.length} ingredientes → ${state.recipe.productQuantity} unidades)`
        : `**Receta:** Deshabilitada`;

      return {
        type: 17,
        accent_color: 0x00d9ff,
        components: [
          {
            type: 10,
            content: `# 🛠️ Editando Item: \`${state.key}\``,
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: baseInfo,
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: tagsInfo,
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: recipeInfo,
          },
          { type: 14, divider: true },
          {
            type: 10,
            content: `**Props (JSON):**\n\`\`\`json\n${propsJson}\n\`\`\``,
          },
        ],
      };
    };

    const buildEditorComponents = () => [
      buildEditorDisplay(),
      {
        type: 1,
        components: [
          {
            type: 2,
            style: ButtonStyle.Primary,
            label: "Base",
            custom_id: "it_base",
          },
          {
            type: 2,
            style: ButtonStyle.Secondary,
            label: "Tags",
            custom_id: "it_tags",
          },
          {
            type: 2,
            style: ButtonStyle.Secondary,
            label: "Receta",
            custom_id: "it_recipe",
          },
          {
            type: 2,
            style: ButtonStyle.Secondary,
            label: "Props (JSON)",
            custom_id: "it_props",
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
            custom_id: "it_save",
          },
          {
            type: 2,
            style: ButtonStyle.Danger,
            label: "Cancelar",
            custom_id: "it_cancel",
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
        if (i.customId === "it_cancel") {
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
        }
        if (i.customId === "it_base") {
          await showBaseModal(
            i as ButtonInteraction,
            state,
            editorMsg,
            buildEditorComponents
          );
          return;
        }
        if (i.customId === "it_tags") {
          await showTagsModal(
            i as ButtonInteraction,
            state,
            editorMsg,
            buildEditorComponents
          );
          return;
        }
        if (i.customId === "it_recipe") {
          await showRecipeModal(
            i as ButtonInteraction,
            state,
            editorMsg,
            buildEditorComponents,
            client,
            guildId,
            existing.id
          );
          return;
        }
        if (i.customId === "it_props") {
          await showPropsModal(
            i as ButtonInteraction,
            state,
            editorMsg,
            buildEditorComponents
          );
          return;
        }
        if (i.customId === "it_save") {
          // Validar
          if (!state.name) {
            await i.reply({
              content: "❌ Falta el nombre del item (configura en Base).",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          // Revalidar global flag (en caso de editar props JSON)
          state.isGlobal =
            !!(state.props as any)?.global || existing.guildId === null;
          const BOT_OWNER_ID = "327207082203938818";
          if (state.isGlobal && i.user.id !== BOT_OWNER_ID) {
            await i.reply({
              content:
                "❌ No puedes editar un ítem global. Solo el owner del bot.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          // No permitir convertir un item local en global mediante edición si no es owner
          if (!existing.guildId && !state.isGlobal) {
            // Prevent accidental removal of global status
            (state.props as any).global = true;
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

          // Actualizar/crear/eliminar receta
          try {
            const existingRecipeCheck =
              await client.prisma.itemRecipe.findUnique({
                where: { productItemId: existing.id },
                include: { ingredients: true },
              });

            if (state.recipe?.enabled && state.recipe.ingredients.length > 0) {
              // Resolver itemIds de los ingredientes
              const ingredientsData: Array<{
                itemId: string;
                quantity: number;
              }> = [];
              for (const ing of state.recipe.ingredients) {
                const item = await client.prisma.economyItem.findFirst({
                  where: {
                    key: ing.itemKey,
                    OR: [{ guildId }, { guildId: null }],
                  },
                  orderBy: [{ guildId: "desc" }],
                });
                if (!item) {
                  throw new Error(`Ingrediente no encontrado: ${ing.itemKey}`);
                }
                ingredientsData.push({
                  itemId: item.id,
                  quantity: ing.quantity,
                });
              }

              if (existingRecipeCheck) {
                // Actualizar receta existente
                // Primero eliminar ingredientes viejos
                await client.prisma.recipeIngredient.deleteMany({
                  where: { recipeId: existingRecipeCheck.id },
                });
                // Luego actualizar la receta con los nuevos ingredientes
                await client.prisma.itemRecipe.update({
                  where: { id: existingRecipeCheck.id },
                  data: {
                    productQuantity: state.recipe.productQuantity,
                    ingredients: {
                      create: ingredientsData,
                    },
                  },
                });
              } else {
                // Crear nueva receta
                await client.prisma.itemRecipe.create({
                  data: {
                    productItemId: existing.id,
                    productQuantity: state.recipe.productQuantity,
                    ingredients: {
                      create: ingredientsData,
                    },
                  },
                });
              }
            } else if (existingRecipeCheck && !state.recipe?.enabled) {
              // Eliminar receta si está deshabilitada
              await client.prisma.recipeIngredient.deleteMany({
                where: { recipeId: existingRecipeCheck.id },
              });
              await client.prisma.itemRecipe.delete({
                where: { id: existingRecipeCheck.id },
              });
            }
          } catch (err: any) {
            logger.warn({ err }, "Error actualizando receta");
            await i.followUp({
              content: `⚠️ Item actualizado pero falló la receta: ${err.message}`,
              flags: MessageFlags.Ephemeral,
            });
          }

          await i.reply({
            content: "✅ Item actualizado!",
            flags: MessageFlags.Ephemeral,
          });
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
                    content: `✅ **Item Actualizado**\n└ Item \`${
                      state.key
                    }\` actualizado exitosamente.${
                      state.isGlobal ? " (Global)" : ""
                    }`,
                  },
                ],
              },
            ],
          });
          collector.stop("saved");
          return;
        }
      } catch (err) {
        logger.error({ err }, "item-editar interaction error");
        if (!i.deferred && !i.replied)
          await i.reply({
            content: "❌ Error procesando la acción.",
            flags: MessageFlags.Ephemeral,
          });
      }
    });

    collector.on("end", async (_c, r) => {
      if (r === "time") {
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
  state: ItemEditorState,
  editorMsg: any,
  buildComponents: () => any[]
) {
  const modal = {
    title: "Configuración base del Item",
    customId: "it_base_modal",
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
        label: "Descripción",
        component: {
          type: ComponentType.TextInput,
          customId: "desc",
          style: TextInputStyle.Paragraph,
          required: false,
          value: state.description ?? "",
        },
      },
      {
        type: ComponentType.Label,
        label: "Categoría",
        component: {
          type: ComponentType.TextInput,
          customId: "cat",
          style: TextInputStyle.Short,
          required: false,
          value: state.category ?? "",
        },
      },
      {
        type: ComponentType.Label,
        label: "Icon URL",
        component: {
          type: ComponentType.TextInput,
          customId: "icon",
          style: TextInputStyle.Short,
          required: false,
          value: state.icon ?? "",
        },
      },
      {
        type: ComponentType.Label,
        label: "Stackable y Máx inventario",
        component: {
          type: ComponentType.TextInput,
          customId: "stack_max",
          style: TextInputStyle.Short,
          required: false,
          placeholder: "true,10",
          value:
            state.stackable !== undefined
              ? `${state.stackable},${state.maxPerInventory ?? ""}`
              : "",
        },
      },
    ],
  } as const;

  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const name = sub.components.getTextInputValue("name").trim();
    const desc = sub.components.getTextInputValue("desc").trim();
    const cat = sub.components.getTextInputValue("cat").trim();
    const icon = sub.components.getTextInputValue("icon").trim();
    const stackMax = sub.components.getTextInputValue("stack_max").trim();

    state.name = name;
    state.description = desc || undefined;
    state.category = cat || undefined;
    state.icon = icon || undefined;

    if (stackMax) {
      const [s, m] = stackMax.split(",");
      state.stackable = String(s).toLowerCase() !== "false";
      const mv = m?.trim();
      state.maxPerInventory = mv ? Math.max(0, parseInt(mv, 10) || 0) : null;
    }

    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents(),
    });
  } catch {}
}

async function showTagsModal(
  i: ButtonInteraction,
  state: ItemEditorState,
  editorMsg: any,
  buildComponents: () => any[]
) {
  const modal = {
    title: "Tags del Item (separados por coma)",
    customId: "it_tags_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Tags",
        component: {
          type: ComponentType.TextInput,
          customId: "tags",
          style: TextInputStyle.Paragraph,
          required: false,
          value: state.tags.join(", "),
        },
      },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const tags = sub.components.getTextInputValue("tags");
    state.tags = tags
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents(),
    });
  } catch {}
}

async function showPropsModal(
  i: ButtonInteraction,
  state: ItemEditorState,
  editorMsg: any,
  buildComponents: () => any[]
) {
  const template =
    state.props && Object.keys(state.props).length
      ? JSON.stringify(state.props)
      : JSON.stringify({
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
    title: "Props (JSON) del Item",
    customId: "it_props_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "JSON",
        component: {
          type: ComponentType.TextInput,
          customId: "props",
          style: TextInputStyle.Paragraph,
          required: false,
          value: template.slice(0, 4000),
        },
      },
    ],
  } as const;
  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const raw = sub.components.getTextInputValue("props");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state.props = parsed;
        await sub.deferUpdate();
        await editorMsg.edit({
          content: null,
          flags: 32768,
          components: buildComponents(),
        });
      } catch (e) {
        await sub.reply({
          content: "❌ JSON inválido.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      state.props = {};
      await sub.reply({
        content: "ℹ️ Props limpiados.",
        flags: MessageFlags.Ephemeral,
      });
      try {
        await editorMsg.edit({
          content: null,
          flags: 32768,
          components: buildComponents(),
        });
      } catch {}
    }
  } catch {}
}

async function showRecipeModal(
  i: ButtonInteraction,
  state: ItemEditorState,
  editorMsg: Message,
  buildComponents: () => any[],
  client: Amayo,
  guildId: string,
  itemId: string
) {
  const currentRecipe = state.recipe || {
    enabled: false,
    ingredients: [],
    productQuantity: 1,
  };
  const ingredientsStr = currentRecipe.ingredients
    .map((ing) => `${ing.itemKey}:${ing.quantity}`)
    .join(", ");

  const modal = {
    title: "Receta de Crafteo",
    customId: "it_recipe_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Habilitar receta? (true/false)",
        component: {
          type: ComponentType.TextInput,
          customId: "enabled",
          style: TextInputStyle.Short,
          required: false,
          value: String(currentRecipe.enabled),
          placeholder: "true o false",
        },
      },
      {
        type: ComponentType.Label,
        label: "Cantidad que produce",
        component: {
          type: ComponentType.TextInput,
          customId: "quantity",
          style: TextInputStyle.Short,
          required: false,
          value: String(currentRecipe.productQuantity),
          placeholder: "1",
        },
      },
      {
        type: ComponentType.Label,
        label: "Ingredientes (itemKey:qty, ...)",
        component: {
          type: ComponentType.TextInput,
          customId: "ingredients",
          style: TextInputStyle.Paragraph,
          required: false,
          value: ingredientsStr,
          placeholder: "iron_ingot:3, wood_plank:1",
        },
      },
    ],
  } as const;

  await i.showModal(modal);
  try {
    const sub = await i.awaitModalSubmit({ time: 300_000 });
    const enabledStr = sub.components
      .getTextInputValue("enabled")
      .trim()
      .toLowerCase();
    const quantityStr = sub.components.getTextInputValue("quantity").trim();
    const ingredientsInput = sub.components
      .getTextInputValue("ingredients")
      .trim();

    const enabled = enabledStr === "true";
    const productQuantity = parseInt(quantityStr, 10) || 1;

    // Parsear ingredientes
    const ingredients: Array<{ itemKey: string; quantity: number }> = [];
    if (ingredientsInput && enabled) {
      const parts = ingredientsInput
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const part of parts) {
        const [itemKey, qtyStr] = part.split(":").map((s) => s.trim());
        const qty = parseInt(qtyStr, 10);
        if (itemKey && qty > 0) {
          ingredients.push({ itemKey, quantity: qty });
        }
      }
    }

    state.recipe = { enabled, ingredients, productQuantity };

    await sub.deferUpdate();
    await editorMsg.edit({
      content: null,
      flags: 32768,
      components: buildComponents(),
    });
  } catch {}
}
