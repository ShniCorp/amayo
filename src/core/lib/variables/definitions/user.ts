import { User, GuildMember } from "discord.js";
import { prisma } from "../../../database/prisma";
import { VarCtx } from "../types";

// Helpers
const getUserId = (u?: User | GuildMember) => (u as any)?.id || (u as any)?.user?.id || "";
const getUsername = (u?: User | GuildMember) => (u as any)?.username || (u as any)?.user?.username || "";
const getAvatar = (u?: User | GuildMember) => {
    try {
        const fn = (u as any)?.displayAvatarURL || (u as any)?.user?.displayAvatarURL;
        return typeof fn === 'function' ? fn.call((u as any)?.user ?? u, { forceStatic: false }) : "";
    } catch { return ""; }
};

// Helper: calcula el rank dentro del servidor
async function computeRankInGuild(
    guildId: string,
    userId: string,
    field: 'weeklyPoints' | 'monthlyPoints' | 'totalPoints',
    knownPoints?: number
): Promise<number> {
    try {
        let points = knownPoints;
        if (typeof points !== 'number') {
            const self = await prisma.partnershipStats.findUnique({
                where: { userId_guildId: { userId, guildId } }
            });
            if (!self) return 0;
            // @ts-ignore
            points = (self as any)[field] as number;
        }
        const higher = await prisma.partnershipStats.count({
            where: { guildId, [field]: { gt: points as number } } as any
        });
        return higher + 1;
    } catch {
        return 0;
    }
}

export const userVariables = {
    // USER INFO
    'user.name': ({ user }: VarCtx) => getUsername(user),
    'user.id': ({ user }: VarCtx) => getUserId(user),
    'user.mention': ({ user }: VarCtx) => {
        const id = getUserId(user);
        return id ? `<@${id}>` : '';
    },
    'user.avatar': ({ user }: VarCtx) => getAvatar(user),
    'user.created': ({ user }: VarCtx) => {
        const u = (user as any)?.user ?? user;
        return u?.createdAt ? `<t:${Math.floor(u.createdAt.getTime() / 1000)}:R>` : '';
    },
    'user.joined': ({ user }: VarCtx) => {
        // Solo si es GuildMember
        if (user && 'joinedAt' in user && user.joinedAt) {
            return `<t:${Math.floor(user.joinedAt.getTime() / 1000)}:R>`;
        }
        return '';
    },
    'user.bot': ({ user }: VarCtx) => {
        const u = (user as any)?.user ?? user;
        return u?.bot ? 'Yes' : 'No';
    },

    // USER STATS
    'user.pointsAll': ({ stats }: VarCtx) => stats?.totalPoints?.toString?.() ?? '0',
    'user.pointsWeekly': ({ stats }: VarCtx) => stats?.weeklyPoints?.toString?.() ?? '0',
    'user.pointsMonthly': ({ stats }: VarCtx) => stats?.monthlyPoints?.toString?.() ?? '0',

    // USER RANKS
    'user.rankWeekly': async ({ user, guild, stats }: VarCtx) => {
        const userId = getUserId(user);
        const guildId = guild?.id;
        if (!userId || !guildId) return '0';
        const rank = await computeRankInGuild(guildId, userId, 'weeklyPoints', stats?.weeklyPoints);
        return String(rank || 0);
    },
    'user.rankMonthly': async ({ user, guild, stats }: VarCtx) => {
        const userId = getUserId(user);
        const guildId = guild?.id;
        if (!userId || !guildId) return '0';
        const rank = await computeRankInGuild(guildId, userId, 'monthlyPoints', stats?.monthlyPoints);
        return String(rank || 0);
    },
    'user.rankTotal': async ({ user, guild, stats }: VarCtx) => {
        const userId = getUserId(user);
        const guildId = guild?.id;
        if (!userId || !guildId) return '0';
        const rank = await computeRankInGuild(guildId, userId, 'totalPoints', stats?.totalPoints);
        return String(rank || 0);
    },
};
