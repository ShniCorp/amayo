import { Message, TextBasedChannel } from "discord.js";
import type { CommandMessage } from "../../../core/types/commands";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import fs from "fs";
import path from "path";
import logger from "../../../core/lib/logger";
import type Amayo from "../../../core/client";

// Helper: split text into chunks under Discord message limit (~2000)
function chunkText(text: string, size = 1900) {
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    parts.push(text.slice(i, i + size));
    i += size;
  }
  return parts;
}

export const command: CommandMessage = {
  name: "setup",
  type: "message",
  aliases: ["setup-ejemplos", "setup-demo"],
  cooldown: 10,
  description:
    "Publica ejemplos básicos y avanzados para configurar items, mobs y áreas.",
  category: "Admin",
  usage: "setup [advanced]",
  run: async (message: Message, args: string[], client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(
      message.member,
      message.guild!.id,
      client.prisma
    );
    if (!allowed) {
      await channel.send({
        content: "❌ No tienes permisos de ManageGuild ni rol de staff.",
      });
      return;
    }

    const doInitFull = args[0] === "init-full" || args.includes("init-full");
    if (doInitFull) {
      await channel.send(
        "Iniciando FULL setup: creando items, areas, mobs y recetas (modo idempotente). Esto puede tardar unos segundos."
      );
      try {
        const setupMod: any = await import(
          "../../../../scripts/fullServerSetup.js"
        );
        if (typeof setupMod.runFullServerSetup === "function") {
          // Use guild id from the current guild context
          await setupMod.runFullServerSetup(message.guild!.id);
          await channel.send("✅ Full setup completado.");
        } else {
          await channel.send(
            "❌ El módulo de setup completo no exporta runFullServerSetup()."
          );
        }
      } catch (e) {
        logger.error({ e }, "setup init-full failed");
        await channel.send(
          `❌ Error corriendo fullServerSetup: ${
            (e && (e as any).message) || e
          }`
        );
      }
      return;
    }
  },
};
