import fs from "fs";
import { prisma } from "../src/core/database/prisma";

async function run() {
  if (!process.env.XATA_DB) {
    console.error("XATA_DB not set — aborting");
    process.exit(1);
  }

  if (!fs.existsSync("invalid_mobs_backup.json")) {
    console.error("invalid_mobs_backup.json not found — run cleanup first");
    process.exit(1);
  }

  const bak = JSON.parse(fs.readFileSync("invalid_mobs_backup.json", "utf8"));
  const ids: string[] = bak.map((b: any) => b.id).filter(Boolean);
  if (ids.length === 0) {
    console.log("No ids found in invalid_mobs_backup.json");
    return;
  }

  console.log(
    "Backing up ScheduledMobAttack rows that reference these mob ids..."
  );
  try {
    const deps = await (prisma as any).scheduledMobAttack.findMany({
      where: { mobId: { in: ids } },
    });
    fs.writeFileSync(
      "scheduled_mob_attack_backup.json",
      JSON.stringify(deps, null, 2)
    );
    console.log(
      `Backed up ${deps.length} ScheduledMobAttack rows to scheduled_mob_attack_backup.json`
    );

    if (deps.length > 0) {
      console.log(
        "Deleting ScheduledMobAttack rows referencing invalid mobs..."
      );
      const delRes = await (prisma as any).scheduledMobAttack.deleteMany({
        where: { mobId: { in: ids } },
      });
      console.log(`Deleted ${delRes.count || delRes} ScheduledMobAttack rows`);
    } else {
      console.log("No dependent ScheduledMobAttack rows to delete.");
    }
  } catch (e: any) {
    console.error("Failed to backup/delete dependent rows:", e?.message ?? e);
    process.exit(1);
  }

  console.log("Deleting invalid mob rows from Mob table...");
  try {
    const delMobs = await (prisma as any).mob.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`Deleted ${delMobs.count || delMobs} mob rows`);
  } catch (e: any) {
    console.error("Failed to delete mob rows:", e?.message ?? e);
    process.exit(1);
  }

  console.log(
    "Done. Backups: invalid_mobs_backup.json, scheduled_mob_attack_backup.json"
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
