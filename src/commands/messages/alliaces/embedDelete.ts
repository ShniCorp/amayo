import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: "embeddelete",
    type: "message",
    aliases: ["delembed", "removeembed"],
    cooldown: 10,
    //@ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const embedName = args[0];
        if (!embedName) {
            return message.reply("Debes proporcionar el nombre del embed a eliminar. Uso: `!embeddelete <nombre>`");
        }

        try {
            await client.prisma.blockV2Config.delete({
                where: {
                    guildId_name: {
                        guildId: message.guildId!,
                        name: embedName,
                    },
                },
            });

            return message.reply(`✅ El embed **${embedName}** fue eliminado con éxito.`);
        } catch {
            return message.reply("❌ No encontré un embed con ese nombre.");
        }
    },
};
