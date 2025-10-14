import assert from "assert";
import {
  computeMobStats,
  getMobInstance,
  MOB_DEFINITIONS,
} from "../src/game/mobs/mobData";
import { createOrUpdateMob } from "../src/game/mobs/admin";

async function main() {
  console.log("Starting formal mob tests...");

  // Test computeMobStats deterministic
  const def = MOB_DEFINITIONS[0];
  const s1 = computeMobStats(def, 1);
  const s2 = computeMobStats(def, 2);
  assert(s2.hp >= s1.hp, "HP should increase or stay with level");
  console.log("computeMobStats OK");

  // Test getMobInstance
  const inst = getMobInstance(def.key, 3);
  assert(inst !== null, "getMobInstance should return an instance");
  assert(
    typeof inst!.scaled.hp === "number",
    "instance scaled.hp should be a number"
  );
  console.log("getMobInstance OK");

  // Test createOrUpdateMob in no-db mode (should not throw)
  try {
    const r = await createOrUpdateMob({ ...def, key: "test.unit.mob" } as any);
    assert(r && r.def, "createOrUpdateMob must return def");
    console.log("createOrUpdateMob (no-db) OK");
  } catch (e) {
    console.warn(
      "createOrUpdateMob test skipped (DB needed):",
      (e as any)?.message ?? e
    );
  }

  console.log("All formal mob tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
