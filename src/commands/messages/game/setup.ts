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

    const showAdvanced = args[0] === "advanced" || args.includes("advanced");
    const doInit = args[0] === "init" || args.includes("init");
    const doInitFull = args[0] === "init-full" || args.includes("init-full");
    const initAdvanced = args.includes("advanced") && doInit;
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
    if (doInit) {
      // Run seed logic in-process by importing the seed script module
      await channel.send(
        "Iniciando setup: creando items, areas, mobs y recetas... Esto puede tardar unos segundos."
      );
      try {
        const seedMod: any = await import("../../../game/minigames/seed.js");
        if (typeof seedMod.main === "function") {
          await seedMod.main();
          await channel.send("✅ Setup inicial completado.");
        } else {
          // fallback: try executing default export or module itself
          if (typeof seedMod === "function") {
            await seedMod();
            await channel.send("✅ Setup inicial completado (fallback).");
          } else {
            await channel.send(
              "❌ Módulo seed no expone main(). Ejecuta el seed manualmente."
            );
          }
        }
      } catch (e) {
        logger.error({ e }, "setup init failed");
        await channel.send(
          `❌ Error corriendo seed: ${(e && (e as any).message) || e}`
        );
      }
      return;
    }
    try {
      const readPath = path.resolve(process.cwd(), "README", "Mas Ejemplos.md");
      if (!fs.existsSync(readPath)) {
        await channel.send("README/Mas Ejemplos.md no encontrado en el repo.");
        return;
      }
      const raw = fs.readFileSync(readPath, "utf8");

      // Extract two sections: "Flujo rápido" and "Items: creación" and the mobs section
      // We'll be generous and send large chunks; the README already contains the examples.
      const header = "# Guía rápida para el staff";
      const basicIndex = raw.indexOf(
        "## Flujo rápido: Crear un ítem con receta"
      );
      const itemsIndex = raw.indexOf("## Items: creación, edición y revisión");
      const mobsIndex = raw.indexOf("## Mobs: enemigos y NPCs");

      // Fallback: send the whole file (chunked) if parsing fails
      if (basicIndex === -1 || itemsIndex === -1) {
        const chunks = chunkText(raw);
        for (const c of chunks) await channel.send(c);
        if (!showAdvanced) return;
        // advanced is basically the rest of the README; already sent
        return;
      }

      const basicSection = raw.slice(basicIndex, itemsIndex);
      const itemsSection = raw.slice(
        itemsIndex,
        mobsIndex === -1 ? raw.length : mobsIndex
      );
      const mobsSection =
        mobsIndex === -1 ? "" : raw.slice(mobsIndex, raw.length);

      // Send basic & items
      for (const chunk of chunkText(basicSection)) await channel.send(chunk);
      for (const chunk of chunkText(itemsSection)) await channel.send(chunk);

      if (showAdvanced) {
        for (const chunk of chunkText(mobsSection)) await channel.send(chunk);
        // Also send rest of file
        const restIndex = raw.indexOf("\n---\n", mobsIndex);
        if (restIndex !== -1) {
          const rest = raw.slice(restIndex);
          for (const chunk of chunkText(rest)) await channel.send(chunk);
        }
      } else {
        await channel.send(
          "Usa `!setup advanced` para publicar la sección avanzada (mobs, crafteos avanzados y workflows)."
        );
      }
    } catch (e) {
      logger.error({ e }, "setup command failed");
      await channel.send("❌ Error al publicar ejemplos. Revisa logs.");
    }
  },
};
