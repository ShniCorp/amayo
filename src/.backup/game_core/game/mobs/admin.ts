import { prisma } from "../../core/database/prisma";
import { z } from "zod";
import {
  BaseMobDefinition,
  MOB_DEFINITIONS,
  findMobDef,
  BaseMobDefinitionSchema,
} from "./mobData";

type MobInput = z.infer<typeof BaseMobDefinitionSchema>;

export type CreateOrUpdateResult = {
  def: BaseMobDefinition;
  row?: any;
};

function prismaMobAvailable(): boolean {
  const anyPrisma: any = prisma as any;
  if (!process.env.XATA_DB) return false;
  return !!(
    anyPrisma &&
    anyPrisma.mob &&
    typeof anyPrisma.mob.create === "function"
  );
}

export async function listMobs(): Promise<BaseMobDefinition[]> {
  const rows = await listMobsWithRows();
  return rows.map((r) => r.def);
}

export type MobWithRow = {
  def: BaseMobDefinition;
  id?: string | null;
  guildId?: string | null;
  isDb?: boolean;
};

export async function listMobsWithRows(): Promise<MobWithRow[]> {
  const map: Record<string, MobWithRow> = {};
  // Start with built-ins
  for (const d of MOB_DEFINITIONS) {
    map[d.key] = { def: d, id: null, guildId: null, isDb: false };
  }

  if (!prismaMobAvailable()) {
    return Object.values(map);
  }

  try {
    const anyPrisma: any = prisma as any;
    const rows = await anyPrisma.mob.findMany();
    // eslint-disable-next-line no-console
    console.info(`listMobsWithRows: DB returned ${rows.length} rows`);
    for (const r of rows) {
      const cfg =
        r.metadata ??
        r.stats ??
        r.drops ??
        r.config ??
        r.definition ??
        r.data ??
        null;
      if (!cfg || typeof cfg !== "object") continue;
      try {
        const parsed = BaseMobDefinitionSchema.parse(cfg as any);
        map[parsed.key] = {
          def: parsed,
          id: r.id ?? null,
          guildId: r.guildId ?? null,
          isDb: true,
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          "Skipping invalid mob row id=",
          r.id,
          (e as any)?.errors ?? e
        );
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("listMobsWithRows: DB read failed:", (e as any)?.message ?? e);
  }

  return Object.values(map).sort((a, b) => a.def.key.localeCompare(b.def.key));
}

export async function getMob(key: string): Promise<BaseMobDefinition | null> {
  // Check DB first
  if (prismaMobAvailable()) {
    try {
      const anyPrisma: any = prisma as any;
      const row = await anyPrisma.mob.findFirst({ where: { key } });
      if (row) {
        const cfg =
          row.metadata ??
          row.stats ??
          row.drops ??
          row.config ??
          row.definition ??
          row.data ??
          null;
        if (cfg) {
          try {
            return BaseMobDefinitionSchema.parse(cfg as any);
          } catch (e) {
            return null;
          }
        }
      }
    } catch (e) {
      // ignore DB issues
    }
  }
  // Fallback to built-ins
  return findMobDef(key);
}

export async function createOrUpdateMob(
  input: MobInput & { guildId?: string; category?: string }
): Promise<CreateOrUpdateResult> {
  const parsed = BaseMobDefinitionSchema.parse(input);
  let row: any | undefined;
  if (prismaMobAvailable()) {
    try {
      const anyPrisma: any = prisma as any;
      const where: any = { key: parsed.key };
      if (input.guildId) where.guildId = input.guildId;
      const existing = await anyPrisma.mob.findFirst({ where });
      if (existing) {
        row = await anyPrisma.mob.update({
          where: { id: existing.id },
          data: {
            name: parsed.name,
            category: (input as any).category ?? null,
            metadata: parsed,
          },
        });
        // eslint-disable-next-line no-console
        console.info(
          `createOrUpdateMob: updated mob id=${row.id} key=${parsed.key}`
        );
      } else {
        row = await anyPrisma.mob.create({
          data: {
            key: parsed.key,
            name: parsed.name,
            category: (input as any).category ?? null,
            guildId: input.guildId ?? null,
            metadata: parsed,
          },
        });
        // eslint-disable-next-line no-console
        console.info(
          `createOrUpdateMob: created mob id=${row.id} key=${parsed.key}`
        );
      }
    } catch (e) {
      // if DB fails, fallthrough to return parsed but do not throw
      // eslint-disable-next-line no-console
      console.warn(
        "createOrUpdateMob: DB save failed:",
        (e as any)?.message ?? e
      );
    }
  }
  return { def: parsed, row };
}

export async function deleteMob(key: string): Promise<boolean> {
  if (prismaMobAvailable()) {
    try {
      const anyPrisma: any = prisma as any;
      const existing = await anyPrisma.mob.findFirst({ where: { key } });
      if (existing) {
        await anyPrisma.mob.delete({ where: { id: existing.id } });
        // eslint-disable-next-line no-console
        console.info(`deleteMob: deleted mob id=${existing.id} key=${key}`);
        return true;
      }
    } catch (e) {
      // ignore
      // eslint-disable-next-line no-console
      console.warn("deleteMob: DB delete failed:", (e as any)?.message ?? e);
      return false;
    }
  }
  // If no DB or not found, attempt to delete from in-memory builtins (no-op)
  return false;
}

export async function ensureMobRepoUpToDate() {
  // helper to tell mobData to refresh caches — import dynamically to avoid cycles
  try {
    const mod = await import("./mobData.js");
    if (typeof mod.refreshMobDefinitionsFromDb === "function") {
      await mod.refreshMobDefinitionsFromDb();
    }
    if (typeof mod.validateAllMobDefs === "function") {
      mod.validateAllMobDefs();
    }
  } catch (e) {
    // ignore
  }
}
