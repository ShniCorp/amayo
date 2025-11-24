// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import { commands as registry } from "../../core/loaders/loader";
import { registry as varRegistry } from "../../core/lib/variables/registry";
import { DisplayComponentV2Builder } from "../../core/lib/displayComponents/builders";
import { Message, ComponentType, ButtonStyle } from "discord.js";

export const command: CommandMessage = {
  name: "ayuda",
  type: "message",
  aliases: ["help", "comandos", "cmds", "variables", "vars"],
  cooldown: 5,
  description: "Centro de ayuda interactivo. Explora comandos y variables disponibles.",
  category: "Utilidad",
  usage: "ayuda [comando | variable]",
  run: async (message: any, args: string[], client: any) => {
    const server = await client.prisma.guild.findFirst({
      where: { id: message.guild!.id },
    });
    const prefix = server?.prefix || "!";

    // --- DATA GATHERING ---

    // 1. Commands
    const seen = new Set<string>();
    const allMsgCommands = [] as Array<{
      name: string;
      aliases: string[];
      description: string;
      category: string;
      usage: string;
      featureFlag?: string;
    }>;

    for (const [, cmd] of registry) {
      if (!cmd || cmd.type !== "message") continue;
      const baseName: string | undefined = cmd.name ?? cmd.data?.name;
      if (!baseName) continue;
      if (seen.has(baseName)) continue;
      seen.add(baseName);

      const cdesc = (cmd.description ?? "").toString().trim();
      const ccat = (cmd.category ?? "Otros").toString();
      const usage = cmd.usage
        ? `${prefix}${cmd.usage}`
        : `${prefix}${baseName}`;

      allMsgCommands.push({
        name: baseName,
        aliases: Array.isArray(cmd.aliases) ? cmd.aliases : [],
        description: cdesc || "Sin descripción",
        category: ccat,
        usage,
        featureFlag: cmd.featureFlag,
      });
    }

    const commandCategories = new Map<string, typeof allMsgCommands>();
    for (const c of allMsgCommands) {
      const cat = c.category || "Otros";
      if (!commandCategories.has(cat)) commandCategories.set(cat, []);
      commandCategories.get(cat)!.push(c);
    }
    const sortedCmdCategories = Array.from(commandCategories.keys()).sort((a, b) =>
      a.localeCompare(b, "es")
    );

    // 2. Variables
    const allVars = varRegistry.list();
    const varCategories = new Map<string, string[]>();
    for (const v of allVars) {
      const [cat] = v.split(".");
      const categoryName = cat.charAt(0).toUpperCase() + cat.slice(1); // Capitalize
      if (!varCategories.has(categoryName)) varCategories.set(categoryName, []);
      varCategories.get(categoryName)!.push(v);
    }
    const sortedVarCategories = Array.from(varCategories.keys()).sort((a, b) =>
      a.localeCompare(b, "es")
    );

    // --- HELPERS ---

    const buildHome = () => {
      return new DisplayComponentV2Builder()
        .setAccentColor(0x5865f2)
        .addText(`### 📚 Centro de Ayuda — ${message.guild!.name}`)
        .addSeparator(1, true)
        .addText(
          `Bienvenido al sistema de ayuda de **${client.user?.username}**.\n` +
          `Aquí podrás encontrar información sobre todos los comandos y variables disponibles para configurar tu servidor.`
        )
        .addSeparator(2, false)
        .addText(
          `**Prefix:** \`${prefix}\`\n` +
          `**Comandos:** ${allMsgCommands.length} en ${sortedCmdCategories.length} categorías\n` +
          `**Variables:** ${allVars.length} en ${sortedVarCategories.length} categorías`
        )
        .toJSON();
    };

    const buildCommandCategoryList = (cat: string) => {
      const cmds = commandCategories.get(cat) || [];
      const builder = new DisplayComponentV2Builder()
        .setAccentColor(0x00a8ff)
        .addText(`### ⌨️ Comandos: ${cat}`)
        .addSeparator(2, true);

      if (cmds.length === 0) {
        builder.addText("_No hay comandos en esta categoría._");
      } else {
        for (const cmd of cmds) {
          let text = `**${cmd.name}**`;
          if (cmd.featureFlag) text += " 🏁"; // Flag indicator
          text += `\n${cmd.description}\n\`${cmd.usage}\``;
          builder.addText(text);
        }
      }
      return builder.toJSON();
    };

    const buildVariableCategoryList = (cat: string) => {
      const vars = varCategories.get(cat) || [];
      const builder = new DisplayComponentV2Builder()
        .setAccentColor(0x2ecc71)
        .addText(`### 💲 Variables: ${cat}`)
        .addSeparator(2, true)
        .addText(
          "Estas variables pueden ser usadas en mensajes de bienvenida, despedida y otros textos configurables."
        );

      if (vars.length === 0) {
        builder.addText("_No hay variables en esta categoría._");
      } else {
        // Group in chunks of 3 for better display if needed, or just list them
        const list = vars.map((v) => `\`{${v}}\``).join(", ");
        builder.addText(list);
      }
      return builder.toJSON();
    };

    const buildCommandDetail = (cmdName: string) => {
      const cmd = allMsgCommands.find(
        (c) =>
          c.name === cmdName ||
          c.aliases.includes(cmdName)
      );
      if (!cmd) return null;

      const builder = new DisplayComponentV2Builder()
        .setAccentColor(0x5865f2)
        .addText(`### 📖 Comando: ${cmd.name}`)
        .addSeparator(1, true)
        .addText(`**Descripción:**\n${cmd.description}`)
        .addText(`**Uso:**\n\`${cmd.usage}\``)
        .addText(`**Categoría:** ${cmd.category}`);

      if (cmd.aliases.length > 0) {
        builder.addText(
          `**Aliases:** ${cmd.aliases.map((a) => `\`${a}\``).join(", ")}`
        );
      }

      if (cmd.featureFlag) {
        builder.addText(`**Requiere Feature Flag:** \`${cmd.featureFlag}\``);
      }

      return builder.toJSON();
    };

    // --- NAVIGATION COMPONENTS ---

    const getHomeRow = () => ({
      type: 1,
      components: [
        {
          type: 2,
          style: ButtonStyle.Primary,
          label: "Comandos",
          emoji: "⌨️",
          custom_id: "menu_commands",
        },
        {
          type: 2,
          style: ButtonStyle.Success,
          label: "Variables",
          emoji: "💲",
          custom_id: "menu_variables",
        },
      ],
    });

    const getBackRow = (to: "home" | "commands" | "variables") => {
      const components: any[] = [];

      if (to === "home") {
        components.push({
          type: 2,
          style: ButtonStyle.Secondary,
          label: "Inicio",
          emoji: "🏠",
          custom_id: "menu_home",
        });
      } else if (to === "commands") {
        components.push({
          type: 2,
          style: ButtonStyle.Secondary,
          label: "Volver a Categorías",
          emoji: "↩️",
          custom_id: "menu_commands",
        });
      } else if (to === "variables") {
        components.push({
          type: 2,
          style: ButtonStyle.Secondary,
          label: "Volver a Variables",
          emoji: "↩️",
          custom_id: "menu_variables",
        });
      }

      return { type: 1, components };
    };

    const getCategorySelectRow = (
      type: "commands" | "variables",
      categories: string[]
    ) => ({
      type: 1,
      components: [
        {
          type: 3,
          custom_id: type === "commands" ? "select_cmd_cat" : "select_var_cat",
          placeholder: "Selecciona una categoría...",
          options: categories.slice(0, 25).map((c) => ({
            label: c,
            value: c,
            emoji: type === "commands" ? "📂" : "🏷️",
          })),
        },
      ],
    });

    // --- INITIAL RESPONSE ---

    // Check for arguments (direct lookup)
    if (args.length > 0) {
      const query = args[0].toLowerCase();
      const detail = buildCommandDetail(query);
      if (detail) {
        await message.reply({
          flags: 32768,
          components: [detail, getBackRow("home")],
        });
        return;
      }
      // If not a command, maybe a variable category?
      // For now, just default to home if not found
    }

    const msg = await message.reply({
      flags: 32768,
      components: [buildHome(), getHomeRow()],
    });

    // --- COLLECTOR ---

    const collector = msg.createMessageComponentCollector({
      filter: (i: any) => i.user.id === message.author.id,
      time: 300000, // 5 mins
    });

    collector.on("collect", async (i: any) => {
      try {
        await i.deferUpdate();

        // HOME
        if (i.customId === "menu_home") {
          await i.editReply({
            components: [buildHome(), getHomeRow()],
          });
        }

        // COMMANDS MENU
        else if (i.customId === "menu_commands") {
          await i.editReply({
            components: [
              buildHome(), // Keep header or maybe make a specific "Select Category" header?
              // Let's use a simple text component for the header if we want
              // For now reusing buildHome is okay, but maybe we want to show the select menu
              getCategorySelectRow("commands", sortedCmdCategories),
              getBackRow("home"),
            ],
          });
        }

        // VARIABLES MENU
        else if (i.customId === "menu_variables") {
          await i.editReply({
            components: [
              buildHome(),
              getCategorySelectRow("variables", sortedVarCategories),
              getBackRow("home"),
            ],
          });
        }

        // SELECT COMMAND CATEGORY
        else if (i.customId === "select_cmd_cat") {
          const cat = i.values[0];
          await i.editReply({
            components: [
              buildCommandCategoryList(cat),
              getBackRow("commands"),
            ],
          });
        }

        // SELECT VARIABLE CATEGORY
        else if (i.customId === "select_var_cat") {
          const cat = i.values[0];
          await i.editReply({
            components: [
              buildVariableCategoryList(cat),
              getBackRow("variables"),
            ],
          });
        }
      } catch (e) {
        // Ignore interactions that fail (e.g. timeout)
      }
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => { });
    });
  },
};
