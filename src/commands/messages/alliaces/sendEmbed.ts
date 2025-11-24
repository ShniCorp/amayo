import { CommandMessage } from "../../../core/types/commands";
import { MessageFlags } from "discord.js";
import { DisplayComponentUtils } from "../../../core/types/displayComponentEditor";
import { sendComponentsV2Message } from "../../../core/api/discordAPI";
import logger from "../../../core/lib/logger";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";

export const command: CommandMessage = {
    name: "send-embed",
    type: "message",
    aliases: ["sendembed", "sendblock", "sendblockv2"],
    cooldown: 5,
    description: "Envía un bloque DisplayComponents guardado por nombre.",
    category: "Alianzas",
    usage: "send-embed <nombre>",
    run: async (message, args, client) => {
        const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, client.prisma);
        if (!allowed) {
            await message.reply("❌ No tienes permisos de ManageGuild ni rol de staff.");
            return;
        }

        const blockName = (args[0] || "").trim();
        if (!blockName) {
            await message.reply("Debes proporcionar un nombre. Uso: `!send-embed <nombre>`");
            return;
        }

        try {
            const existingBlock = await client.prisma.blockV2Config.findFirst({
                where: { guildId: message.guild!.id, name: blockName }
            });

            if (!existingBlock) {
                await message.reply(`❌ No encontré un bloque con el nombre \`${blockName}\`.`);
                return;
            }

            const container = await DisplayComponentUtils.renderPreview(
                // @ts-ignore - guardamos BlockState como config
                existingBlock.config,
                message.member!,
                message.guild!
            );

            await sendComponentsV2Message(message.channel.id, {
                components: [container as any],
                replyToMessageId: message.id
            });
        } catch (error) {
            logger.error({ err: error }, "❌ Error enviando bloque con Components v2");
            try {
                await message.reply({
                    content: "❌ Ocurrió un error al enviar el bloque.",
                    flags: MessageFlags.SuppressEmbeds
                });
            } catch {}
        }
    }
};
