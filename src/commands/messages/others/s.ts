import type { Message } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "sdfsdfsdf",
  description: "dfsdf",
  type: 'message' as const,
  aliases: ["dfsf"],
  async run(message: Message, args: string[], client: Amayo) {
    // Tu código aquí
    await message.reply("¡Comando sdfsdfsdf ejecutado!");
  }
}