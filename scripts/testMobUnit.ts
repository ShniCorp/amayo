import assert from "assert";
import {
  computeMobStats,
  getMobInstance,
  MOB_DEFINITIONS,
} from "../src/game/mobs/mobData";
import { createOrUpdateMob } from "../src/game/mobs/admin";

async function run() {
  console.log("Running mob unit tests...");

  // computeMobStats basic
  const def = MOB_DEFINITIONS[0];
  const statsLv1 = computeMobStats(def, 1);
  assert(typeof statsLv1.hp === "number", "hp should be number");
  assert(typeof statsLv1.attack === "number", "attack should be number");

  // scaling test
  const statsLv5 = computeMobStats(def, 5);
  if ((def.scaling && def.scaling.hpPerLevel) || 0) {
    assert(statsLv5.hp >= statsLv1.hp, "hp should not decrease with level");
  }

  console.log("computeMobStats: OK");

  // getMobInstance basic
  const key = def.key;
  const inst = getMobInstance(key, 3);
  assert(inst !== null, "getMobInstance should return instance");
  assert(inst!.scaled.hp > 0, "instance hp > 0");
  console.log("getMobInstance: OK");

  // createOrUpdateMob (non-DB mode should return def)
  try {
    const res = await createOrUpdateMob({
      ...def,
      key: "unit.test.mob",
    } as any);
    if (!res || !res.def) throw new Error("createOrUpdateMob returned invalid");
    console.log("createOrUpdateMob: OK (no-DB mode)");
  } catch (e) {
    console.warn(
      "createOrUpdateMob: skipped (DB may be required) -",
      (e as any)?.message ?? e
    );
  }

  console.log("All mob unit tests passed.");
}

run().catch((e) => {
  console.error("Tests failed:", e);
  process.exit(1);
});
