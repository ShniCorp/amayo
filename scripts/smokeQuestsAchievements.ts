import "dotenv/config";
import { prisma } from "../src/core/database/prisma";
import { seedAchievements } from "../src/game/achievements/seed";
import {
  generateDailyQuests,
  updateQuestProgress,
  claimQuestReward,
  getPlayerQuests,
} from "../src/game/quests/service";
import {
  checkAchievements,
  getPlayerAchievements,
} from "../src/game/achievements/service";

async function ensureGuildAndUser(guildId: string, userId: string) {
  await prisma.guild.upsert({
    where: { id: guildId },
    update: { name: "test" },
    create: { id: guildId, name: "test", prefix: "!" },
  });
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}

async function run() {
  const guildId = "test-guild-quests";
  const userId = "test-user-1";
  await ensureGuildAndUser(guildId, userId);

  console.log("Seeding achievements global...");
  await seedAchievements(null);

  console.log("Seeding achievements for guild...");
  await seedAchievements(guildId);

  console.log("Generating daily quests for guild...");
  await generateDailyQuests(guildId);

  console.log("Player quests before progress:");
  console.log(await getPlayerQuests(userId, guildId));

  // Buscar una quest de tipo fight_count
  const quests = await prisma.quest.findMany({
    where: { guildId, type: "daily" },
  });
  const q = quests.find((q) => (q.requirements as any).type === "fight_count");
  if (!q) {
    console.log("No daily fight quest found, picking first.");
  }
  const questToUse = q || quests[0];
  console.log("Using quest:", questToUse?.key);

  // Simular progreso para completarla
  const req = (questToUse.requirements as any) || { count: 1 };
  const needed = req.count || 1;
  console.log("Incrementing progress by", needed);
  const updates = await updateQuestProgress(
    userId,
    guildId,
    req.type || "fight_count",
    needed
  );
  console.log(
    "Quests completed by updateQuestProgress:",
    updates.map((u) => u.key)
  );

  // Intentar reclamar
  const progressRow = await prisma.questProgress.findFirst({
    where: { userId, guildId, questId: questToUse.id, completed: true },
  });
  if (progressRow) {
    const claim = await claimQuestReward(userId, guildId, questToUse.id);
    console.log("Claim result:", claim);
  } else {
    console.log("No completed quest progress to claim");
  }

  // Check achievements trigger
  console.log("Checking achievements for fight_count");
  const unlocked = await checkAchievements(userId, guildId, "fight_count");
  console.log(
    "Achievements unlocked:",
    unlocked.map((a) => a.key)
  );

  console.log("Player achievements summary:");
  console.log(await getPlayerAchievements(userId, guildId));

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
