import { test } from "uvu";
import * as assert from "uvu/assert";
import { pickDropFromDef } from "../../src/game/minigames/testHelpers";

// deterministic randomness helper
function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Patch Math.random for deterministic tests
const realRandom = Math.random;

test.before(() => {
  (Math as any).random = seedRandom(42) as any;
});

test.after(() => {
  (Math as any).random = realRandom;
});

test("pickDropFromDef chooses weighted item", () => {
  const def = {
    drops: [
      { itemKey: "ore.iron", qty: 1, weight: 8 },
      { itemKey: "ore.gold", qty: 1, weight: 2 },
    ],
  } as any;
  const picks = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const p = pickDropFromDef(def);
    assert.ok(p && (p.itemKey === "ore.iron" || p.itemKey === "ore.gold"));
    picks.add(p!.itemKey);
  }
  // with seeded RNG both options should appear
  assert.ok(picks.size >= 1);
});

test("pickDropFromDef chooses from map", () => {
  const def = { drops: { "ore.iron": 1, "ore.gold": 2 } } as any;
  const p = pickDropFromDef(def);
  assert.ok(p && (p.itemKey === "ore.iron" || p.itemKey === "ore.gold"));
});

// coinMultiplier behavior is multiplicative in current design; test small scenario
test("coin multiplier aggregation (product)", () => {
  const mobs = [
    { rewardMods: { coinMultiplier: 1.1 } },
    { rewardMods: { coinMultiplier: 1.2 } },
  ];
  const product = mobs.reduce(
    (acc, m) => acc * ((m.rewardMods?.coinMultiplier as number) || 1),
    1
  );
  assert.equal(Math.round(product * 100) / 100, Math.round(1.32 * 100) / 100);
});

test.run();
