import { VarCtx } from "../types";

// Helper para obtener el usuario inviter de forma segura
const getInviter = (ctx: VarCtx) => ctx.invite?.inviter;

export const inviterVariables = {
    'inviter.user.name': ({ invite }: VarCtx) => invite?.inviter?.username ?? '',
    'inviter.user.id': ({ invite }: VarCtx) => invite?.inviter?.id ?? '',
    'inviter.user.mention': ({ invite }: VarCtx) => invite?.inviter?.id ? `<@${invite.inviter.id}>` : '',
    'inviter.user.avatar': ({ invite }: VarCtx) => {
        const inviter = invite?.inviter;
        return inviter?.displayAvatarURL({ forceStatic: false }) ?? '';
    },
    'inviter.user.created': ({ invite }: VarCtx) => {
        const inviter = invite?.inviter;
        return inviter?.createdAt ? `<t:${Math.floor(inviter.createdAt.getTime() / 1000)}:R>` : '';
    },
};
