import { prisma } from "../../core/database/prisma";

// Seed para crear el ítem de purga de efectos (potion.purga)
// Ejecutar manualmente una vez.
// node -r ts-node/register src/game/economy/seedPurgePotion.ts (según tu setup)

async function main() {
  const key = "potion.purga";
  const existing = await prisma.economyItem.findFirst({
    where: { key, guildId: null },
  });
  if (existing) {
    console.log("Ya existe potion.purga (global)");
    return;
  }
  const item = await prisma.economyItem.create({
    data: {
      key,
      name: "Poción de Purga",
      description:
        "Elimina todos tus efectos de estado activos al usar el comando !efectos purgar.",
      category: "consumable",
      icon: "🧪",
      stackable: true,
      props: { usable: true, purgeAllEffects: true },
      tags: ["purge", "status", "utility"],
    },
  });
  console.log("Creado:", item.id, item.key);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
