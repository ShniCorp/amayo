import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: "setchannel-alliance",
    type: "message",
    aliases: ["alchannel", "channelally"],
    cooldown: 10,
    //@ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        // Validar argumentos
        if (args.length < 2) {
            return message.reply("❌ Uso correcto: `!setchannel-alliance <#canal|ID> <blockConfigName>`");
        }

        const channelInput = args[0];
        const blockConfigName = args[1];

        // Extraer ID del canal
        let channelId: string;

        // Si es una mención de canal (#canal)
        if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
            channelId = channelInput.slice(2, -1);
        }
        // Si es solo un ID
        else if (/^\d+$/.test(channelInput)) {
            channelId = channelInput;
        }
        else {
            return message.reply("❌ Formato de canal inválido. Usa `#canal` o el ID del canal.");
        }

        try {
            // Verificar que el canal existe en el servidor
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel) {
                return message.reply("❌ El canal especificado no existe en este servidor.");
            }

            // Verificar que el canal es un canal de texto
            if (!channel.isTextBased()) {
                return message.reply("❌ El canal debe ser un canal de texto.");
            }

            // Verificar que existe el blockConfig
            const blockConfig = await client.prisma.blockV2Config.findFirst({
                where: {
                    guildId: message.guildId,
                    name: blockConfigName
                }
            });

            if (!blockConfig) {
                return message.reply(`❌ No se encontró el bloque de configuración \`${blockConfigName}\`. Asegúrate de que exista.`);
            }

            // Configurar el canal de alianzas
            const allianceChannel = await client.prisma.allianceChannel.upsert({
                where: {
                    guildId_channelId: {
                        guildId: message.guildId,
                        channelId: channelId
                    }
                },
                create: {
                    guildId: message.guildId,
                    channelId: channelId,
                    blockConfigName: blockConfigName,
                    isActive: true
                },
                update: {
                    blockConfigName: blockConfigName,
                    isActive: true,
                    updatedAt: new Date()
                }
            });

            return message.reply(`✅ Canal de alianzas configurado correctamente!\n\n` +
                `**Canal:** <#${channelId}>\n` +
                `**Configuración:** \`${blockConfigName}\`\n` +
                `**Estado:** Activo\n\n` +
                `Los enlaces de Discord válidos en este canal ahora otorgarán puntos de alianza.`);

        } catch (error) {
            console.error('Error configurando canal de alianzas:', error);
            return message.reply("❌ Ocurrió un error al configurar el canal de alianzas. Inténtalo de nuevo.");
        }
    }
}
