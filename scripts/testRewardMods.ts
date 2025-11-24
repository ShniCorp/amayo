import {
  initializeMobRepository,
  getMobInstance,
  listMobKeys,
} from "../src/game/mobs/mobData";
import { runMinigame } from "../src/game/minigames/service";
import { prisma } from "../src/core/database/prisma";

async function run() {
  console.log("Initializing mob repository...");
  await initializeMobRepository();
  console.log("Available mob keys:", listMobKeys());

  // Mock user/guild for smoke (these should exist in your test DB or the functions will create wallet entries etc.)
  const userId = "test-user";
  const guildId = "test-guild";

  try {
    console.log("Ensuring minimal game area 'mine.cavern' exists...");
    // create minimal area and level if not present
    let area = await prisma.gameArea.findFirst({
      where: { key: "mine.cavern", OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    if (!area) {
      area = await prisma.gameArea.create({
        data: {
          key: "mine.cavern",
          guildId: null,
          name: "Cavern of Tests",
          type: "MINE",
          config: {},
          metadata: {},
        } as any,
      });
    }
    let lvl = await prisma.gameAreaLevel.findFirst({
      where: { areaId: area.id, level: 1 },
    });
    if (!lvl) {
      lvl = await prisma.gameAreaLevel.create({
        data: {
          areaId: area.id,
          level: 1,
          requirements: {} as any,
          rewards: {
            draws: 1,
            table: [{ type: "coins", amount: 5, weight: 1 }],
          } as any,
          mobs: { draws: 0, table: [] } as any,
        } as any,
      });
    }

    console.log("Running minigame mine.cavern level 1 as smoke test...");
    const res = await runMinigame(userId, guildId, "mine.cavern", 1);
    console.log("Minigame result:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("runMinigame failed:", e);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
