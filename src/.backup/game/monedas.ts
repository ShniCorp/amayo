import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { getOrCreateWallet } from "../../../game/economy/service";
import type { TextBasedChannel } from "discord.js";

export const command: CommandMessage = {
  name: "monedas",
  type: "message",
  aliases: ["coins", "saldo"],
  cooldown: 2,
  description: "Muestra tu saldo de monedas en este servidor.",
  category: "Economía",
  usage: "monedas",
  run: async (message, _args, _client: Amayo) => {
    const wallet = await getOrCreateWallet(
      message.author.id,
      message.guild!.id
    );

    const display = {
      type: 17,
      accent_color: 0xffd700,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**<:coin:1425667511013081169> Monedas de ${
                message.author.username
              }**\n\nSaldo: **${wallet.coins.toLocaleString()}** monedas`,
            },
          ],
        },
      ],
    };

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      display,
      flags: 32768,
      reply: { messageReference: message.id },
    });
  },
};
