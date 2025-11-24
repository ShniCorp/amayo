import type { GuildMember } from 'discord.js';
import type { PrismaClient } from '@prisma/client';

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[]).filter((v): v is string => typeof v === 'string');
}

/**
 * Returns true if the member has ManageGuild permission or has a role included
 * in the Guild.staff JSON (expected: string[] of role IDs).
 */
export async function hasManageGuildOrStaff(
  member: GuildMember | null | undefined,
  guildId: string,
  prisma: PrismaClient
): Promise<boolean> {
  if (!member) return false;

  try {
    // Native permission first
    if (member.permissions.has('ManageGuild')) return true;

    // Load guild staff config and coerce safely to string[]
    const guild = await prisma.guild.findFirst({ where: { id: guildId } });
    const staff = toStringArray(guild?.staff ?? []);
    if (!staff.length) return false;

    // Check role intersection
    const memberRoles = member.roles?.cache ? Array.from(member.roles.cache.keys()) : [];
    return staff.some((roleId) => memberRoles.includes(roleId));
  } catch {
    return false;
  }
}
