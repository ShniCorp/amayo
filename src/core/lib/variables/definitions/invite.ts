import { Invite } from "discord.js";
import { VarCtx } from "../types";

const getInviteObject = (invite?: Invite) => {
    if (invite && 'guild' in invite && invite.guild) {
        return {
            name: invite.guild.name,
            icon: invite.guild.icon ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.webp?size=256` : ''
        };
    }
    return null;
};

export const inviteVariables = {
    'invite.name': ({ invite }: VarCtx) => getInviteObject(invite)?.name ?? '',
    'invite.icon': ({ invite }: VarCtx) => getInviteObject(invite)?.icon ?? '',
    'invite.code': ({ invite }: VarCtx) => invite?.code ?? '',
    'invite.url': ({ invite }: VarCtx) => invite?.url ?? '',
    'invite.channel': ({ invite }: VarCtx) => invite?.channel?.name ?? '',
    'invite.expires': ({ invite }: VarCtx) => invite?.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : '',
    'invite.uses': ({ invite }: VarCtx) => invite?.uses?.toString() ?? '0',
    'invite.maxUses': ({ invite }: VarCtx) => invite?.maxUses?.toString() ?? '0',
};
