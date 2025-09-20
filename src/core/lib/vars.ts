import {Guild, Invite, User} from "discord.js";

/**
 * Lista de variables válidas del sistema (sin llaves {})
 */
export const VALID_VARIABLES = [
    'user.name', 'user.id', 'user.mention', 'user.avatar',
    'user.pointsAll', 'user.pointsWeekly', 'user.pointsMonthly',
    'guild.name', 'guild.icon',
    'invite.name', 'invite.icon'
];

/**
 * Validar si una URL es válida o contiene variables del sistema
 * @param url - La URL o texto a validar
 * @returns boolean - true si es válida
 */
export function isValidUrlOrVariable(url: string): boolean {
    if (!url) return false;

    // Verificar si el texto contiene variables válidas
    const hasValidVariables = VALID_VARIABLES.some(variable => url.includes(variable));
    if (hasValidVariables) return true;

    // Si no tiene variables, validar como URL normal
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

//@ts-ignore
export async function replaceVars(text: string, user: User | undefined, guild: Guild | undefined, stats?: any, invite: Invite | undefined): Promise<string> {
    if(!text) return '';

    // Crear inviteObject solo si invite existe y tiene guild
    const inviteObject = invite?.guild ? {
        name: invite.guild.name,
        icon: invite.guild.icon ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.webp?size=256` : ''
    } : null;

    return text
        /**
         *  USER INFO
         */
        .replace(/(user\.name)/g, user?.username ?? '')
        .replace(/(user\.id)/g, user?.id ?? '')
        .replace(/(user\.mention)/g, user ? `<@${user.id}>` : '')
        .replace(/(user\.avatar)/g, user?.displayAvatarURL({ forceStatic: false }) ?? '')

        /**
         *  USER STATS
         */
        .replace(/(user\.pointsAll)/g, stats?.totalPoints?.toString() ?? '0')
        .replace(/(user\.pointsWeekly)/g, stats?.weeklyPoints?.toString() ?? '0')
        .replace(/(user\.pointsMonthly)/g, stats?.monthlyPoints?.toString() ?? '0')

        /**
         *  GUILD INFO
         */
        .replace(/(guild\.name)/g, guild?.name ?? '')
        .replace(/(guild\.icon)/g, guild?.iconURL({ forceStatic: false }) ?? '')

        /**
         *  INVITE INFO
         */
        .replace(/(invite\.name)/g, inviteObject?.name ?? "")
        .replace(/(invite\.icon)/g, inviteObject?.icon ?? '')
}