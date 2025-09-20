import {Guild, Invite, User} from "discord.js";

//@ts-ignore
export async function replaceVars(text: string, user: User | undefined, guild: Guild | undefined, stats?: any, invite: Invite | undefined): Promise<string> {
    if(!text) return '';

    // Crear inviteObject solo si invite existe y tiene guild
    const inviteObject = invite?.guild ? {
        guild: {
            //@ts-ignore
            icon: `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.webp?size=256`
        }
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
        .replace(/(invite\.name)/g, invite?.guild?.name ?? "")
        .replace(/(invite\.icon)/g, inviteObject?.guild.icon ?? '0')

}