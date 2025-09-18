import {Guild, User} from "discord.js";

export async function replaceVars(text: string, user: User | undefined, guild: Guild | undefined, stats?: any): Promise<string> {
    if(!text) return '';

    return text
        /**
         *  USER INFO
         */
        .replace(/(user\.name)/g, user?.username ?? '')
        .replace(/(user\.id)/g, user?.id ?? '')
        .replace(/(user\.mention)/g, user ? `<@${user.id}>` : '')
        .replace(/(user\.avatar)/g, user?.displayAvatarURL({ forceStatic: false }) ?? '')

        /**
         *  GUILD INFO
         */
        .replace(/(guild\.name)/g, guild?.name ?? '')
        .replace(/(guild\.icon)/g, guild?.iconURL({ forceStatic: false }) ?? '');
}