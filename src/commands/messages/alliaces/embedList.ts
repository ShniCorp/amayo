import {CommandMessage} from "../../../core/types/commands";
import {
    //@ts-ignore
    ChannelType,
    ContainerBuilder,
    //@ts-ignore
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    //@ts-ignore
    SeparatorSpacingSize,
    TextChannel,
    TextDisplayBuilder
} from "discord.js";

export const command: CommandMessage = {
    name: "embedlist",
    type: "message",
    aliases: ["listembeds", "embeds"],
    cooldown: 10,
    //@ts-ignore
    run: async (message, args, client) => {
        if (!message.member?.permissions.has("Administrator")) {
            return message.reply("❌ No tienes permisos de Administrador.");
        }

        const embeds = await client.prisma.embedConfig.findMany({
            where: { guildId: message.guildId! },
        });

        if (embeds.length === 0) {
            return message.reply("📭 No hay ningún embed guardado en este servidor.");
        }

        const title = new TextDisplayBuilder()
            .setContent('﹒⌒　　　　Embed List　　　　╰୧﹒');

        // Combina la lista de embeds en la misma sección que la miniatura
        // para un mejor diseño.
        //@ts-ignore
        const embedListContent = embeds.map((e, i) => `**${i + 1}.** ${e.name}`).join("\n");

        // Obtenemos la URL del icono de forma segura
        const guildIconURL = message.guild?.iconURL({ forceStatic: false });

        // Creamos la sección que contendrá el texto Y la miniatura
        const mainSection = new SectionBuilder()
            .addTextDisplayComponents(text => text.setContent(embedListContent)); // <--- Componente principal requerido

        // Solo añadimos la miniatura si la URL existe
        if (guildIconURL) {
            //@ts-ignore
            mainSection.setThumbnailAccessory(thumbnail => thumbnail
                .setURL(guildIconURL)
                .setDescription('Icono del servidor')
            );
        }

        const separator = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(false);

        const container = new ContainerBuilder()
            .setAccentColor(0x49225B)
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addSectionComponents(mainSection); // <--- Añadimos la sección ya completa


        if (message.channel.type === ChannelType.GuildText) {
            const channel = message.channel as TextChannel;
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2});
        }
    },
};