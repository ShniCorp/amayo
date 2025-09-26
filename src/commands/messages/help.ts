// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import { commands as registry } from "../../core/loader";

export const command: CommandMessage = {
    name: 'ayuda',
    type: "message",
    aliases: ['help', 'comandos', 'cmds'],
    cooldown: 5,
    description: 'Muestra la lista de comandos y detalles por categoría.',
    category: 'Utilidad',
    usage: 'ayuda [comando] | [categoría] | vacío',
    run: async (message: any, args: string[], client: any) => {
        // Obtener información del servidor para mostrar el prefix actual
        const server = await client.prisma.guild.findFirst({
            where: { id: message.guild!.id }
        });
        const prefix = server?.prefix || "!";

        // Construir lista de comandos únicos (sin duplicar aliases)
        const seen = new Set<string>();
        const allMsgCommands = [] as Array<{
            name: string;
            aliases: string[];
            description: string;
            category: string;
            usage: string;
            cooldown?: number;
        }>;

        for (const [, cmd] of registry) {
            if (!cmd || cmd.type !== 'message') continue;
            const baseName: string | undefined = cmd.name ?? cmd.data?.name;
            if (!baseName) continue;
            if (seen.has(baseName)) continue; // evitar duplicados por alias
            seen.add(baseName);

            const cdesc = (cmd.description ?? '').toString().trim();
            const ccat = (cmd.category ?? 'Otros').toString();
            const usage = (cmd.usage ? `${prefix}${cmd.usage}` : `${prefix}${baseName}`);

            allMsgCommands.push({
                name: baseName,
                aliases: Array.isArray(cmd.aliases) ? cmd.aliases : [],
                description: cdesc || 'Sin descripción',
                category: ccat,
                usage,
                cooldown: typeof cmd.cooldown === 'number' ? cmd.cooldown : undefined
            });
        }

        // Si no hay comandos
        if (allMsgCommands.length === 0) {
            const emptyPanel = {
                type: 17,
                accent_color: 0xf04747,
                components: [
                    {
                        type: 10,
                        content: `### ❌ No hay comandos disponibles\n\nAún no se han cargado comandos de mensaje.`
                    }
                ]
            };
            await message.reply({ flags: 32768, components: [emptyPanel] });
            return;
        }

        // Index para búsqueda rápida por nombre/alias
        const findByNameOrAlias = (q: string) => {
            const term = q.toLowerCase();
            return allMsgCommands.find(c => c.name === term || c.aliases.map(a => a.toLowerCase()).includes(term));
        };

        // Agrupar por categoría
        const byCategory = new Map<string, typeof allMsgCommands>();
        for (const c of allMsgCommands) {
            const cat = c.category || 'Otros';
            if (!byCategory.has(cat)) byCategory.set(cat, [] as any);
            // @ts-ignore
            byCategory.get(cat)!.push(c);
        }

        // Ordenar categorías por nombre
        const categories = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b, 'es'));

        // Si se solicita un comando concreto
        if (args.length > 0) {
            const query = args.join(' ').trim();
            const found = findByNameOrAlias(query);
            if (found) {
                const panel = {
                    type: 17,
                    accent_color: 0x5865f2,
                    components: [
                        {
                            type: 10,
                            content: `### 📖 Ayuda: \`${found.name}\`\n\n` +
                                     `• Categoría: **${found.category}**\n` +
                                     `• Descripción: ${found.description}\n` +
                                     `• Uso: \`${found.usage}\`\n` +
                                     (found.aliases.length ? `• Aliases: ${found.aliases.map(a => `\`${prefix}${a}\``).join(', ')}` : '')
                        }
                    ]
                };
                const backRow = {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: '↩️ Volver', custom_id: 'back_to_main' }
                    ]
                };
                await message.reply({ flags: 32768, components: [panel, backRow] });
                return;
            }
            // También permitir filtrar por categoría si coincide exacto (case-insensitive)
            const matchCat = categories.find(c => c.toLowerCase() === query.toLowerCase());
            if (matchCat) {
                const cmds = byCategory.get(matchCat)!;
                const catPanel = {
                    type: 17,
                    accent_color: 0x00a8ff,
                    components: [
                        { type: 10, content: `### 📂 Categoría: **${matchCat}** (${cmds.length})` },
                        { type: 14, spacing: 2, divider: true },
                        ...cmds.map(cmd => ({
                            type: 10,
                            content: `**${cmd.name}** — ${cmd.description}\n\`${cmd.usage}\``
                        }))
                    ]
                };
                const backRow = {
                    type: 1,
                    components: [ { type: 2, style: 2, label: '↩️ Volver', custom_id: 'back_to_main' } ]
                };
                await message.reply({ flags: 32768, components: [catPanel, backRow] });
                return;
            }
        }

        // Panel principal dinámico
        const helpPanel: any = {
            type: 17,
            accent_color: 0x5865f2,
            components: [
                { type: 10, content: `### 📚 Centro de Ayuda — ${message.guild!.name}` },
                { type: 14, spacing: 1, divider: true },
                { type: 10, content: `**Prefix actual:** \`${prefix}\`\n**Total de comandos:** ${allMsgCommands.length}\n**Categorías disponibles:** ${categories.length}` },
                { type: 14, spacing: 2, divider: false },
                ...categories.map(cat => {
                    const list = byCategory.get(cat)!;
                    const names = list.map(c => `\`${c.name}\``).join(', ');
                    return { type: 10, content: `🔹 **${cat}** (${list.length})\n${names}` };
                })
            ]
        };

        // Select de categorías + botón exportar
        const categorySelectRow = {
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: 'help_category_select',
                    placeholder: '📂 Selecciona una categoría...',
                    options: categories.slice(0, 25).map(c => ({ label: c, value: `cat:${c}` }))
                }
            ]
        };
        const exportRow = {
            type: 1,
            components: [
                { type: 2, style: 3, label: '📋 Exportar', custom_id: 'export_commands' }
            ]
        };

        const panelMessage = await message.reply({ flags: 32768, components: [helpPanel, categorySelectRow, exportRow] });

        const collector = panelMessage.createMessageComponentCollector({
            time: 600000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on('collect', async (interaction: any) => {
            // Selección de categoría
            if (interaction.customId === 'help_category_select' && interaction.isStringSelectMenu()) {
                const val = interaction.values?.[0] ?? '';
                const cat = val.startsWith('cat:') ? val.slice(4) : val;
                const list = byCategory.get(cat) ?? [];

                const catPanel = {
                    type: 17,
                    accent_color: 0x00a8ff,
                    components: [
                        { type: 10, content: `### 📂 Categoría: **${cat}** (${list.length})` },
                        { type: 14, spacing: 2, divider: true },
                        ...list.map(cmd => ({ type: 10, content: `**${cmd.name}** — ${cmd.description}\n\`${cmd.usage}\`` }))
                    ]
                };
                const backRow = { type: 1, components: [ { type: 2, style: 2, label: '↩️ Volver', custom_id: 'back_to_main' } ] };
                await interaction.update({ components: [catPanel, backRow] });
                return;
            }

            if (interaction.customId === 'back_to_main' || interaction.customId === 'show_all_commands') {
                await interaction.update({ components: [helpPanel, categorySelectRow, exportRow] });
                return;
            }

            if (interaction.customId === 'export_commands') {
                let exportText = `Comandos — ${message.guild!.name}\n\nPrefix: ${prefix}\n\n`;
                for (const cat of categories) {
                    const list = byCategory.get(cat)!;
                    exportText += `${cat}\n`;
                    for (const cmd of list) {
                        exportText += `• ${cmd.name} — ${cmd.description}\n  Uso: ${cmd.usage}\n`;
                        if (cmd.aliases.length) exportText += `  Aliases: ${cmd.aliases.join(', ')}\n`;
                    }
                    exportText += `\n`;
                }
                await interaction.reply({ content: `\`\`\`\n${exportText}\n\`\`\``, flags: 64 });
                return;
            }
        });

        collector.on('end', async (collected: any, reason: string) => {
            if (reason === 'time') {
                try {
                    await panelMessage.edit({ components: [helpPanel] });
                } catch {}
            }
        });
    }
};
