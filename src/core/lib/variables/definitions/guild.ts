import { Guild } from "discord.js";
import { VarCtx } from "../types";

const getGuildIcon = (g?: Guild) => {
    try { return g?.iconURL({ forceStatic: false }) ?? ""; } catch { return ""; }
};

export const guildVariables = {
    'guild.name': ({ guild }: VarCtx) => guild?.name ?? '',
    'guild.id': ({ guild }: VarCtx) => guild?.id ?? '',
    'guild.icon': ({ guild }: VarCtx) => getGuildIcon(guild),
    'guild.memberCount': ({ guild }: VarCtx) => guild?.memberCount?.toString() ?? '0',
    'guild.created': ({ guild }: VarCtx) => guild?.createdAt ? `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:D>` : '',
    'guild.description': ({ guild }: VarCtx) => guild?.description ?? '',
    'guild.banner': ({ guild }: VarCtx) => guild?.bannerURL({ size: 1024 }) ?? '',
    'guild.splash': ({ guild }: VarCtx) => guild?.splashURL({ size: 1024 }) ?? '',
    'guild.boostLevel': ({ guild }: VarCtx) => guild?.premiumTier?.toString() ?? '0',
};
