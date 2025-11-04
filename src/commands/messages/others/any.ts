import type { Message } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "Everyone",
  description: "Has reply everyone",
  type: 'message' as const,
  category: "any",
  cooldown: 1,
  async run(message: Message, args: string[], client: Amayo) {
    // Tu código aquí
    await message.reply("¡Comando Everyone ejecutado!");
  }
}