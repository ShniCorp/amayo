import {CommandMessage} from "../../../core/types/commands";
//@ts-ignore
import {
    ButtonStyle, ChannelType,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextChannel,
    TextDisplayBuilder,
    UserSelectMenuBuilder
} from "discord.js";

export const command: CommandMessage = {
    name: 'settings',
    type: "message",
    aliases: ['options', 'stts'],
    cooldown: 5,
    run: async (message, args, client) => {
        const server = await client.prisma.guild.findFirst({ where: { id: message.guild!.id } });
        const title = new TextDisplayBuilder()
            .setContent("## ﹒⌒　　　　Settings Seɾveɾ　　　　╰୧﹒")
        const description = new TextDisplayBuilder()
            .setContent("Panel de Administracion del bot dentro del servidor.")
        const sect = new TextDisplayBuilder()
            .setContent("**Prefix del bot:** " + ` \`\`\`${server.prefix}\`\`\``)

        const section = new SectionBuilder()
            .addTextDisplayComponents(sect)
            //@ts-ignore
            .setButtonAccessory(button => button
                .setCustomId('prefixsettings')
                .setLabel('Prefix')
                .setStyle(ButtonStyle.Primary),
                )

        const separator = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(false);

        const main = new ContainerBuilder()
            .addTextDisplayComponents(title, description)
            .addSeparatorComponents(separator)
            .addSectionComponents(section)


        //@ts-ignore
        if (message.channel.type === ChannelType.GuildText) {
            const channel = message.channel as TextChannel;
            await channel.send({ components: [main], flags: MessageFlags.IsComponentsV2});
        }
    }
}