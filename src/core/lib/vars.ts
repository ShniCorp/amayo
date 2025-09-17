import {Guild, User} from "discord.js";

export async function replaceVars(text: string, user: User | undefined, guild:
Guild | undefined, stats: any) {
    if(!text) return;

    return text
        .replace(/(user.name)/g, user!.username ?? '')
        .replace(/(user.id)/g, user!.id ?? '')
        .replace(/(user.mention)/g, `<@${user!.id}>`)
        .replace(/(user.avatar)/g, user!.displayAvatarURL({ forceStatic: false }))
}