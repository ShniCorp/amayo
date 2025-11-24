import { prisma } from '../../core/database/prisma';
import { addItemByKey } from '../economy/service';
import { runMinigame } from './service';

async function main() {
  const userId = process.env.TEST_USER_ID;
  const guildId = process.env.TEST_GUILD_ID || 'test-guild';
  if (!userId) throw new Error('Set TEST_USER_ID in env');

  // Ensure User and Guild exist logically for foreign keys if you enforce them in app
  // Here we just make sure they exist in DB if needed.
  await prisma.guild.upsert({ where: { id: guildId }, update: {}, create: { id: guildId, name: 'Test Guild' } });
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });

  // Ensure player has a basic pickaxe
  await addItemByKey(userId, guildId, 'tool.pickaxe.basic', 1);

  // Run mining level 1
  const result = await runMinigame(userId, guildId, 'mine.cavern', 1, { toolKey: 'tool.pickaxe.basic' });
  console.log('[demo:minigame] result:', JSON.stringify(result));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

