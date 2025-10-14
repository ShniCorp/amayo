import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { setEquipmentSlot } from "../../../game/combat/equipmentService";
import { prisma } from "../../../core/database/prisma";
import { formatItemLabel } from "./_helpers";
import { ComponentType } from "discord-api-types/v10";
import type {
  MessageComponentInteraction,
  StringSelectMenuInteraction,
  TextBasedChannel,
} from "discord.js";

export const command: CommandMessage = {
  name: "equipar",
  type: "message",
  aliases: ["equip"],
  cooldown: 3,
  description:
    "Equipa un item en un slot (weapon|armor|cape) por su key, si lo tienes en inventario.",
  usage: "equipar <weapon|armor|cape> <itemKey>",
  run: async (message, args, _client: Amayo) => {
    const guildId = message.guild!.id;
    const userId = message.author.id;

    // Backwards compatible: if both args provided, keep old behavior
    const maybeSlot = args[0]?.trim()?.toLowerCase() as
      | "weapon"
      | "armor"
      | "cape"
      | undefined;
    const maybeItemKey = args[1]?.trim();
    if (maybeSlot && maybeItemKey) {
      if (!["weapon", "armor", "cape"].includes(maybeSlot)) {
        await message.reply("Uso: `!equipar <weapon|armor|cape> <itemKey>`");
        return;
      }
      const item = await prisma.economyItem.findFirst({
        where: { key: maybeItemKey, OR: [{ guildId }, { guildId: null }] },
        orderBy: [{ guildId: "desc" }],
      });
      if (!item) {
        await message.reply("❌ Item no encontrado.");
        return;
      }
      const inv = await prisma.inventoryEntry.findUnique({
        where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
      });
      if (!inv || inv.quantity <= 0) {
        await message.reply(
          `❌ No tienes ${formatItemLabel(item, {
            bold: true,
          })} en tu inventario.`
        );
        return;
      }
      await setEquipmentSlot(userId, guildId, maybeSlot, item.id);
      await message.reply(
        `🧰 Equipado en ${maybeSlot}: ${formatItemLabel(item, { bold: true })}`
      );
      return;
    }

    // Interactive flow: build select menus for slot and for items in user's inventory
    const inventory = await prisma.inventoryEntry.findMany({
      where: { userId, guildId, quantity: { gt: 0 } },
      include: { item: true },
    });
    if (!inventory || inventory.length === 0) {
      await message.reply("❌ No tienes items en el inventario para equipar.");
      return;
    }

    // Build select options (max 25)
    const options = inventory
      .slice(0, 25)
      .map((inv) => ({
        label: inv.item.name || inv.item.key,
        value: inv.item.id,
        description: inv.item.key,
      }));

    const slotSelect = {
      type: ComponentType.StringSelect,
      custom_id: "equip_slot_select",
      placeholder: "Selecciona el slot (weapon / armor / cape)",
      min_values: 1,
      max_values: 1,
      options: [
        {
          label: "Weapon (arma)",
          value: "weapon",
          description: "Equipar como arma",
        },
        {
          label: "Armor (armadura)",
          value: "armor",
          description: "Equipar como armadura",
        },
        {
          label: "Cape (capa)",
          value: "cape",
          description: "Equipar como capa",
        },
      ],
    } as any;

    const itemSelect = {
      type: ComponentType.StringSelect,
      custom_id: "equip_item_select",
      placeholder: "Selecciona el item a equipar",
      min_values: 1,
      max_values: 1,
      options,
    } as any;

    const channel = message.channel as TextBasedChannel & { send: Function };
    const prompt = await (channel.send as any)({
      content: null,
      flags: 32768,
      reply: { messageReference: message.id },
      components: [
        { type: ComponentType.ActionRow, components: [slotSelect] },
        { type: ComponentType.ActionRow, components: [itemSelect] },
      ],
    });

    const collector = prompt.createMessageComponentCollector({
      time: 2 * 60_000,
      filter: (i: MessageComponentInteraction) =>
        i.user.id === message.author.id,
    });

    let selectedSlot: string | null = null;
    let selectedItemId: string | null = null;

    collector.on("collect", async (i: MessageComponentInteraction) => {
      if (!i.isStringSelectMenu()) return;
      await i.deferUpdate();
      if (i.customId === "equip_slot_select") {
        selectedSlot = (i as StringSelectMenuInteraction).values[0];
        // inform user visually by editing the prompt to show selection
        try {
          await prompt.edit({
            content: `Slot seleccionado: **${selectedSlot}**`,
            components: prompt.components,
          });
        } catch {}
        return;
      }
      if (i.customId === "equip_item_select") {
        selectedItemId = (i as StringSelectMenuInteraction).values[0];
        if (!selectedSlot) {
          // ask user to pick slot first
          try {
            await i.followUp({
              content:
                "Por favor selecciona primero el slot donde quieres equipar.",
              flags: 64,
            });
          } catch {}
          return;
        }

        // perform equip
        try {
          await setEquipmentSlot(
            userId,
            guildId,
            selectedSlot as any,
            selectedItemId
          );
          // fetch item for label
          const item = await prisma.economyItem.findUnique({
            where: { id: selectedItemId },
          });
          await prompt.edit({
            content: `🧰 Equipado en **${selectedSlot}**: ${
              item ? formatItemLabel(item, { bold: true }) : selectedItemId
            }`,
            components: [],
          });
        } catch (e) {
          console.error("Error equipping item:", e);
          try {
            await prompt.edit({
              content: `❌ Error al equipar: ${(e as any).message || e}`,
              components: [],
            });
          } catch {}
        }
        collector.stop();
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        try {
          await prompt.edit({
            content: "Sesión de equipar expirada. Ejecuta `!equipar` de nuevo.",
            components: [],
          });
        } catch {}
      }
    });
  },
};
