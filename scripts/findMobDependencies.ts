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

  console.log("Looking for FK constraints that reference the Mob table...");
  const fkSql = `
    SELECT
      tc.constraint_name, kcu.table_name, kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND LOWER(ccu.table_name) = 'mob'
  `;

  const refs: any[] = await (prisma as any).$queryRawUnsafe(fkSql);
  if (!refs || refs.length === 0) {
    console.log("No FK constraints found referencing mob table.");
    return;
  }

  console.log("Found referencing constraints:");
  for (const r of refs) {
    console.log(
      ` - ${r.table_name}.${r.column_name} -> ${r.referenced_table}.${r.referenced_column} (constraint ${r.constraint_name})`
    );
  }

  // For each referencing table/column, search rows that use our ids
  for (const r of refs) {
    const table = r.table_name;
    const column = r.column_name;
    console.log(
      `\nChecking table ${table} (column ${column}) for dependent rows...`
    );
    for (const id of ids) {
      try {
        const cntRes: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT COUNT(*) AS cnt FROM "${table}" WHERE "${column}" = '${id}'`
        );
        const cnt =
          cntRes && cntRes[0]
            ? Number(cntRes[0].cnt || cntRes[0].count || 0)
            : 0;
        console.log(`  mob id=${id} -> ${cnt} dependent row(s)`);
        if (cnt > 0) {
          const rows: any[] = await (prisma as any).$queryRawUnsafe(
            `SELECT * FROM "${table}" WHERE "${column}" = '${id}' LIMIT 5`
          );
          console.log("   Sample rows:", rows);
        }
      } catch (e) {
        console.warn("   Failed to query", table, column, e?.message ?? e);
      }
    }
  }

  console.log("\nDependency scan complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
