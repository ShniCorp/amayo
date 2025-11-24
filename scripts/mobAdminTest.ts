import {
  createOrUpdateMob,
  listMobs,
  getMob,
  deleteMob,
  ensureMobRepoUpToDate,
} from "../src/game/mobs/admin";

async function run() {
  console.log("Ensuring repo up-to-date...");
  await ensureMobRepoUpToDate();

  const testMob = {
    key: "test.goblin",
    name: "Goblin Test",
    tier: 1,
    base: { hp: 12, attack: 3 },
  } as any;

  console.log("Creating test mob...");
  const created = await createOrUpdateMob(testMob);
  console.log("Created:", created.key);

  console.log("Listing mobs (sample):");
  const all = await listMobs();
  console.log(`Total mobs: ${all.length}`);
  console.log(all.map((m) => m.key).join(", "));

  console.log("Fetching test.mob...");
  const fetched = await getMob("test.goblin");
  console.log("Fetched:", !!fetched, fetched ? fetched : "(no data)");

  console.log("Deleting test mob...");
  const deleted = await deleteMob("test.goblin");
  console.log("Deleted?", deleted);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
