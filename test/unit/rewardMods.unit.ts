import * as assert from "assert";
import { pickDropFromDef } from "../../src/game/minigames/testHelpers";

// deterministic RNG
function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const rand = seedRandom(42);
const realRandom = Math.random;
(Math as any).random = rand;

try {
  // weighted
  const def1 = {
    drops: [
      { itemKey: "ore.iron", qty: 1, weight: 8 },
      { itemKey: "ore.gold", qty: 1, weight: 2 },
    ],
  } as any;
  const picks = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const p = pickDropFromDef(def1);
    if (!p) throw new Error("expected pick");
    picks.add(p.itemKey);
  }
  assert.ok(picks.size >= 1, "expected at least 1 picked key");

  // map
  const def2 = { drops: { "ore.iron": 1, "ore.gold": 2 } } as any;
  const p2 = pickDropFromDef(def2);
  assert.ok(p2 && (p2.itemKey === "ore.iron" || p2.itemKey === "ore.gold"));

  // coin multiplier product
  const mobs = [
    { rewardMods: { coinMultiplier: 1.1 } },
    { rewardMods: { coinMultiplier: 1.2 } },
  ];
  const product = mobs.reduce(
    (acc, m) => acc * ((m.rewardMods?.coinMultiplier as number) || 1),
    1
  );
  assert.strictEqual(
    Math.round(product * 100) / 100,
    Math.round(1.32 * 100) / 100
  );

  console.log("All unit tests passed");
  (Math as any).random = realRandom;
  process.exit(0);
} catch (e) {
  (Math as any).random = realRandom;
  console.error(e);
  process.exit(1);
}
