import { prisma } from '../../../core/database/prisma';
import type { ItemProps } from '../../../game/economy/types';

export function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== 'object') return {};
  return json as ItemProps;
}

export async function resolveArea(guildId: string, areaKey: string) {
  const area = await prisma.gameArea.findFirst({ where: { key: areaKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
  return area;
}

export async function getDefaultLevel(userId: string, guildId: string, areaId: string): Promise<number> {
  const prog = await prisma.playerProgress.findUnique({ where: { userId_guildId_areaId: { userId, guildId, areaId } } });
  return Math.max(1, prog?.highestLevel ?? 1);
}

export async function findBestToolKey(userId: string, guildId: string, toolType: string): Promise<string | null> {
  const inv = await prisma.inventoryEntry.findMany({ where: { userId, guildId, quantity: { gt: 0 } }, include: { item: true } });
  let best: { key: string; tier: number } | null = null;
  for (const e of inv) {
    const it = e.item;
    const props = parseItemProps(it.props);
    const t = props.tool;
    if (!t || t.type !== toolType) continue;
    const tier = Math.max(0, t.tier ?? 0);
    if (!best || tier > best.tier) best = { key: it.key, tier };
  }
  return best?.key ?? null;
}

export interface ParsedGameArgs {
  areaKey: string;
  levelArg: number | null;
  providedTool: string | null;
}

const AREA_OVERRIDE_PREFIX = 'area:';

export function parseGameArgs(args: string[], defaultAreaKey: string): ParsedGameArgs {
  const tokens = args.filter((arg): arg is string => typeof arg === 'string' && arg.trim().length > 0);

  let areaKey = defaultAreaKey;
  let levelArg: number | null = null;
  let providedTool: string | null = null;

  for (const token of tokens) {
    if (token.startsWith(AREA_OVERRIDE_PREFIX)) {
      const override = token.slice(AREA_OVERRIDE_PREFIX.length).trim();
      if (override) areaKey = override;
      continue;
    }

    if (levelArg === null && /^\d+$/.test(token)) {
      levelArg = parseInt(token, 10);
      continue;
    }

    if (!providedTool) {
      providedTool = token;
    }
  }

  return { areaKey, levelArg, providedTool };
}

