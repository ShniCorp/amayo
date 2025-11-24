import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
  name: "ping",
  type: "message",
  aliases: ["latency", "pong"],
  cooldown: 5,
  description: "Verifica la latencia y que el bot esté respondiendo.",
  category: "Red",
  usage: "ping",
  run: async (message, args) => {
    await message.reply("pong!");
  },
};
