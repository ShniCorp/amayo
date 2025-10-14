import {
  initializeMobRepository,
  getMobInstance,
  listMobKeys,
} from "../src/game/mobs/mobData";

async function run() {
  console.log("Initializing mob repository...");
  await initializeMobRepository();
  console.log("Available mob keys:", listMobKeys());
  const inst = getMobInstance("slime.green", 3);
  console.log("Sample slime.green @ lvl3 ->", inst);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
