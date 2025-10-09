import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";
import type { Prisma } from "@prisma/client";

type ItemProps = {
  breakable?: {
    enabled?: boolean;
    maxDurability?: number;
    durabilityPerUse?: number;
  };
  [k: string]: unknown;
};

type InventoryState = {
  instances?: Array<{
    durability?: number;
    expiresAt?: string;
    notes?: string;
    mutations?: string[];
  }>;
  notes?: string;
  [k: string]: unknown;
};

export const command: CommandMessage = {
  name: "reset-inventory",
  type: "message",
  aliases: ["resetinv", "fix-stackable"],
  cooldown: 0,
  category: "Admin",
  description:
    "Resetea el inventario de herramientas/armas de un usuario para migrar de stackable a non-stackable con durabilidad.",
  usage: "reset-inventory [@user]",
  run: async (message, args, _client: Amayo) => {
    // Solo el owner del bot puede ejecutar esto
    if (message.author.id !== process.env.OWNER_ID) {
      await message.reply("❌ Solo el owner del bot puede usar este comando.");
      return;
    }

    const targetUser = message.mentions.users.first() ?? message.author;
    const guildId = message.guild!.id;
    const userId = targetUser.id;

    await message.reply(
      `🔄 Iniciando reseteo de inventario para <@${userId}>...`
    );

    try {
      // Paso 1: Obtener todos los items non-stackable (herramientas/armas/armaduras/capas)
      const nonStackableItems = await prisma.economyItem.findMany({
        where: {
          stackable: false,
          OR: [
            { key: { startsWith: "tool." } },
            { key: { startsWith: "weapon." } },
            { key: { startsWith: "armor." } },
            { key: { startsWith: "cape." } },
          ],
        },
      });

      let migratedCount = 0;
      let deletedCount = 0;
      let recreatedCount = 0;

      for (const item of nonStackableItems) {
        const entry = await prisma.inventoryEntry.findUnique({
          where: {
            userId_guildId_itemId: { userId, guildId, itemId: item.id },
          },
        });

        if (!entry) continue;

        const props = (item.props as ItemProps | null) ?? {};
        const breakable = props.breakable;
        const maxDurability =
          breakable?.enabled !== false
            ? breakable?.maxDurability ?? 100
            : undefined;

        const currentState = (entry.state as InventoryState | null) ?? {};
        const currentInstances = currentState.instances ?? [];
        const currentQuantity = entry.quantity ?? 0;

        // Si tiene quantity>1 sin instances, está corrupto
        if (currentQuantity > 1 && currentInstances.length === 0) {
          // Opción 1: Migrar (convertir quantity a instances)
          const newInstances: InventoryState["instances"] = [];
          for (let i = 0; i < currentQuantity; i++) {
            if (maxDurability && maxDurability > 0) {
              newInstances.push({ durability: maxDurability });
            } else {
              newInstances.push({});
            }
          }

          await prisma.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              state: {
                ...currentState,
                instances: newInstances,
              } as unknown as Prisma.InputJsonValue,
              quantity: newInstances.length,
            },
          });

          migratedCount++;
        }
        // Si tiene quantity=1 pero sin instancia, crear instancia
        else if (currentQuantity === 1 && currentInstances.length === 0) {
          const newInstance =
            maxDurability && maxDurability > 0
              ? { durability: maxDurability }
              : {};

          await prisma.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              state: {
                ...currentState,
                instances: [newInstance],
              } as unknown as Prisma.InputJsonValue,
              quantity: 1,
            },
          });

          migratedCount++;
        }
        // Si tiene instances pero sin durabilidad, inicializar
        else if (currentInstances.length > 0 && maxDurability) {
          let needsUpdate = false;
          const fixedInstances = currentInstances.map((inst) => {
            if (inst.durability == null) {
              needsUpdate = true;
              return { ...inst, durability: maxDurability };
            }
            return inst;
          });

          if (needsUpdate) {
            await prisma.inventoryEntry.update({
              where: { id: entry.id },
              data: {
                state: {
                  ...currentState,
                  instances: fixedInstances,
                } as unknown as Prisma.InputJsonValue,
                quantity: fixedInstances.length,
              },
            });
            migratedCount++;
          }
        }
      }

      // Paso 2: Actualizar items en DB para asegurar stackable=false
      const itemUpdateResult = await prisma.$executeRaw`
        UPDATE "EconomyItem"
        SET "stackable" = false
        WHERE "key" LIKE 'tool.%'
           OR "key" LIKE 'weapon.%'
           OR "key" LIKE 'armor.%'
           OR "key" LIKE 'cape.%'
      `;

      await message.reply(
        `✅ **Reseteo completado para <@${userId}>**\n` +
          `• Entradas migradas: ${migratedCount}\n` +
          `• Items actualizados en DB: ${itemUpdateResult}\n\n` +
          `El usuario puede volver a usar sus herramientas normalmente.`
      );
    } catch (error) {
      console.error("Error en reset-inventory:", error);
      await message.reply(
        `❌ Error durante el reseteo: ${
          error instanceof Error ? error.message : "Desconocido"
        }`
      );
    }
  },
};
