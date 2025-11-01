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

    // Determine which slots the user actually has items for (based on item.tags)
    const slotsSet = new Set<string>();
    for (const inv of inventory) {
      const tags = Array.isArray(inv.item.tags) ? inv.item.tags : [];
      if (tags.includes("weapon")) slotsSet.add("weapon");
      if (tags.includes("armor")) slotsSet.add("armor");
      if (tags.includes("cape")) slotsSet.add("cape");
    }
    const availableSlots = Array.from(slotsSet);
    if (availableSlots.length === 0) {
      await message.reply(
        "❌ No tienes items equipables en el inventario (weapon/armor/cape)."
      );
      return;
    }

    const buildItemOptionsForSlot = (slot: string) =>
      inventory
        .filter((inv) => {
          const tags = Array.isArray(inv.item.tags) ? inv.item.tags : [];
          return tags.includes(slot);
        })
        .slice(0, 25)
        .map((inv) => ({
          label: inv.item.name || inv.item.key,
          value: inv.item.id,
          description: inv.item.key,
        }));

    const slotOptions = availableSlots.map((s) => {
      if (s === "weapon")
        return {
          label: "Weapon (arma)",
          value: "weapon",
          description: "Equipar como arma",
        };
      if (s === "armor")
        return {
          label: "Armor (armadura)",
          value: "armor",
          description: "Equipar como armadura",
        };
      return {
        label: "Cape (capa)",
        value: "cape",
        description: "Equipar como capa",
      };
    });

    const slotSelect = {
      type: ComponentType.StringSelect,
      custom_id: "equip_slot_select",
      placeholder: "Selecciona el slot",
      min_values: 1,
      max_values: 1,
      options: slotOptions,
    } as any;

    // If only one slot available, preselect it and build item options for it.
    let initialSelectedSlot: string | null = null;
    if (availableSlots.length === 1) initialSelectedSlot = availableSlots[0];

    const initialItemOptions = initialSelectedSlot
      ? buildItemOptionsForSlot(initialSelectedSlot)
      : // default to first slot's items so the select is populated
        buildItemOptionsForSlot(availableSlots[0]);

    const itemSelect = {
      type: ComponentType.StringSelect,
      custom_id: "equip_item_select",
      placeholder: initialSelectedSlot
        ? "Selecciona el item a equipar"
        : "Selecciona primero el slot (o usa el slot disponible)",
      min_values: 1,
      max_values: 1,
      options: initialItemOptions,
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

    let selectedSlot: string | null = initialSelectedSlot;
    let selectedItemId: string | null = null;

    collector.on("collect", async (i: MessageComponentInteraction) => {
      if (!i.isStringSelectMenu()) return;
      await i.deferUpdate();
      if (i.customId === "equip_slot_select") {
        selectedSlot = (i as StringSelectMenuInteraction).values[0];
        // rebuild item select options for the chosen slot
        const newItemOptions = buildItemOptionsForSlot(selectedSlot);
        const newSlotSelect =
          prompt.components[0]?.components?.[0] ?? slotSelect;
        const newItemSelect = {
          type: ComponentType.StringSelect,
          custom_id: "equip_item_select",
          placeholder: "Selecciona el item a equipar",
          min_values: 1,
          max_values: 1,
          options: newItemOptions,
        } as any;
        try {
          await prompt.edit({
            content: `Slot seleccionado: **${selectedSlot}**`,
            components: [
              { type: ComponentType.ActionRow, components: [newSlotSelect] },
              { type: ComponentType.ActionRow, components: [newItemSelect] },
            ],
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

        // validate that the selected item belongs to the chosen slot
        const chosenItem = await prisma.economyItem.findUnique({
          where: { id: selectedItemId },
        });
        const chosenTags = Array.isArray(chosenItem?.tags)
          ? chosenItem!.tags
          : [];
        if (!chosenTags.includes(selectedSlot)) {
          try {
            await prompt.edit({
              content: `❌ Ese ítem no puede equiparse en el slot **${selectedSlot}**.`,
              components: [],
            });
          } catch {}
          collector.stop();
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
