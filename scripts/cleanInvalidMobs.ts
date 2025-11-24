import { prisma } from "../src/core/database/prisma";
import { BaseMobDefinitionSchema } from "../src/game/mobs/mobData";

async function run() {
  if (!process.env.XATA_DB) {
    console.error("XATA_DB not set — aborting");
    process.exit(1);
  }
  console.log("Scanning mobs table for invalid definitions...");
  const rows: any[] = await (prisma as any).mob.findMany();
  const invalid: any[] = [];
  for (const r of rows) {
    const cfg =
      r.metadata ??
      r.stats ??
      r.drops ??
      r.config ??
      r.definition ??
      r.data ??
      null;
    try {
      BaseMobDefinitionSchema.parse(cfg as any);
    } catch (e) {
      invalid.push({ id: r.id, error: (e as any)?.errors ?? e, row: r });
    }
  }
  if (invalid.length === 0) {
    console.log("No invalid mob definitions found.");
    process.exit(0);
  }
  console.log(
    `Found ${invalid.length} invalid rows. Backing up and deleting...`
  );
  // backup
  console.log("Backup file: invalid_mobs_backup.json");
  require("fs").writeFileSync(
    "invalid_mobs_backup.json",
    JSON.stringify(invalid, null, 2)
  );
  for (const it of invalid) {
    try {
      await (prisma as any).mob.delete({ where: { id: it.id } });
      console.log("Deleted invalid mob id=", it.id);
    } catch (e) {
      console.warn("Failed to delete id=", it.id, e);
    }
  }
  console.log("Cleanup complete. Review invalid_mobs_backup.json");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
