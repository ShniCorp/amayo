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
  // Derivado de props.global (solo owner puede establecerlo)
  isGlobal?: boolean;
}

export const command: CommandMessage = {
  name: "item-crear",
  type: "message",
  aliases: ["crear-item", "itemcreate"],
  cooldown: 10,
  description:
    "Crea un EconomyItem para este servidor con un pequeño editor interactivo.",
  category: "Economía",
  usage: "item-crear <key-única>",
  run: async (message: Message, args: string[], client: Amayo) => {
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

    const key = args[0]?.trim();
    if (!key) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0xffa500,
            components: [
              {
                type: 10,
                content:
                  "⚠️ **Uso Incorrecto**\n└ Uso: `!item-crear <key-única>`",
              },
            ],
          },
        ],
        reply: { messageReference: message.id },
      });
      return;
    }

    const guildId = message.guild!.id;

    const exists = await client.prisma.economyItem.findFirst({
      where: { key, guildId },
    });
    if (exists) {
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
                  "❌ **Item Ya Existe**\n└ Ya existe un item con esa key en este servidor.",
              },
            ],
          },
        ],
        reply: { messageReference: message.id },
      });
      return;
    }

    const state: ItemEditorState = {
      key,
      tags: [],
      stackable: true,
      maxPerInventory: null,
      props: {},
      recipe: {
        enabled: false,
        ingredients: [],
        productQuantity: 1,
      },
      isGlobal: false,
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
            content: `# 🛠️ Editor de Item: \`${key}\``,
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

    const editorMsg = await (channel.send as any)({
      content: null,
      flags: 32768,
      components: buildEditorComponents(),
      reply: { messageReference: message.id },
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
            client
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
          // Revisar bandera global en props (puede haberse puesto manualmente en JSON)
          state.isGlobal = !!state.props?.global;
          const BOT_OWNER_ID = "327207082203938818";
          if (state.isGlobal && i.user.id !== BOT_OWNER_ID) {
            await i.reply({
              content:
                "❌ No puedes crear ítems globales. Solo el owner del bot.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          // Si es global, usar guildId = null y verificar que no exista ya global con esa key
          let targetGuildId: string | null = message.guild!.id;
          if (state.isGlobal) {
            const existsGlobal = await client.prisma.economyItem.findFirst({
              where: { key: state.key, guildId: null },
            });
            if (existsGlobal) {
              await i.reply({
                content: "❌ Ya existe un ítem global con esa key.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            targetGuildId = null;
          }

          // Guardar item
          const createdItem = await client.prisma.economyItem.create({
            data: {
              guildId: targetGuildId,
              key: state.key,
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

          // Guardar receta si está habilitada
          if (state.recipe?.enabled && state.recipe.ingredients.length > 0) {
            try {
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

              // Crear la receta
              await client.prisma.itemRecipe.create({
                data: {
                  productItemId: createdItem.id,
                  productQuantity: state.recipe.productQuantity,
                  ingredients: {
                    create: ingredientsData,
                  },
                },
              });
            } catch (err: any) {
              logger.warn({ err }, "Error creando receta para item");
              await i.followUp({
                content: `⚠️ Item creado pero falló la receta: ${err.message}`,
                flags: MessageFlags.Ephemeral,
              });
            }
          }
          await i.reply({
            content: "✅ Item guardado!",
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
                    content: `✅ **Item Creado**\n└ Item \`${
                      state.key
                    }\` creado exitosamente.${
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
        logger.error({ err }, "item-crear interaction error");
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
  editorMsg: any,
  buildComponents: () => any[],
  client: Amayo
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
