import { prisma } from "../../src/core/database/prisma";
import {
  generateDailyQuests,
  updateQuestProgress,
  claimQuestReward,
  getPlayerQuests,
} from "../../src/game/quests/service";
import { seedAchievements } from "../../src/game/achievements/seed";
import {
  checkAchievements,
  getPlayerAchievements,
} from "../../src/game/achievements/service";
import {
  ensureGuildExists,
  ensureUserExists,
} from "../../src/game/core/userService";

async function resetDb(guildId: string) {
  // Delete created quests, achievements and progress for a clean test
  await prisma.questProgress.deleteMany({ where: { guildId } }).catch(() => {});
  await prisma.quest.deleteMany({ where: { guildId } }).catch(() => {});
  await prisma.playerAchievement
    .deleteMany({ where: { guildId } })
    .catch(() => {});
  await prisma.achievement.deleteMany({ where: { guildId } }).catch(() => {});
}

async function runTests() {
  const guildId = "test-guild-1";
  const userId = "user-test-1";

  // Make sure guild and user exist to satisfy FK constraints
  await ensureGuildExists(guildId, "Test Guild");
  await ensureUserExists(userId);

  await resetDb(guildId);

  console.log("Seeding achievements...");
  await seedAchievements(guildId);
  const achBefore = await getPlayerAchievements(userId, guildId);
  console.log("Player achievements before:", achBefore);

  console.log("Generating daily quests...");
  const count = await generateDailyQuests(guildId);
  console.log("Daily quests generated:", count);

  const quests = await getPlayerQuests(userId, guildId);
  console.log(
    "Player quests after generate:",
    Object.keys(quests).reduce((acc, k) => acc + (quests as any)[k].length, 0)
  );

  // Pick a quest from mining if any
  const daily = quests.daily as any[];
  if (daily.length > 0) {
    const q = daily[0].quest;
    console.log("Testing progress update for quest:", q.key);
    const updates = await updateQuestProgress(
      userId,
      guildId,
      (q.requirements as any).type,
      (q.requirements as any).count
    );
    console.log(
      "Quests completed by updateQuestProgress:",
      updates.map((u) => u.key)
    );

    // Claim reward
    const progressRows = await prisma.questProgress.findMany({
      where: { userId, guildId, questId: q.id },
    });
    if (progressRows.length > 0) {
      const res = await claimQuestReward(userId, guildId, q.id).catch((e) => {
        console.error("Claim failed", e);
        return null;
      });
      console.log("Claim result:", res);
    }
  } else {
    console.warn("No daily quests found in test run — skipping claim flow");
  }

  // Trigger achievements check by running checkAchievements with a trigger from seeded achievements
  console.log("Checking achievements via trigger mine_count");
  const unlocked = await checkAchievements(userId, guildId, "mine_count");
  console.log(
    "Achievements unlocked:",
    unlocked.map((a) => a.key)
  );

  const achAfter = await getPlayerAchievements(userId, guildId);
  console.log("Player achievements after:", achAfter);

  console.log("Tests finished.");
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
