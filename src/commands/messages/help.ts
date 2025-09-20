// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";

export const command: CommandMessage = {
    name: 'ayuda',
    type: "message",
    aliases: ['help', 'comandos', 'cmds'],
    cooldown: 5,
    run: async (message: any, args: string[], client: any) => {
        // Obtener información del servidor para mostrar el prefix actual
        const server = await client.prisma.guild.findFirst({
            where: { id: message.guild!.id }
        });
        const prefix = server?.prefix || "!";

        // Definir categorías de comandos con nombres modernos
        const commandCategories = {
            "Alianzas": [
                {
                    name: "crear-embed",
                    aliases: ["embed-crear", "nuevo-embed"],
                    description: "Crear nuevos embeds con DisplayComponents modernos",
                    usage: `${prefix}crear-embed <nombre>`
                },
                {
                    name: "editar-embed",
                    aliases: ["embed-editar", "modificar-embed"],
                    description: "Editor avanzado de embeds con interfaz interactiva",
                    usage: `${prefix}editar-embed <nombre>`
                },
                {
                    name: "lista-embeds",
                    aliases: ["embeds", "ver-embeds"],
                    description: "Centro de gestión de embeds con paginación",
                    usage: `${prefix}lista-embeds`
                },
                {
                    name: "eliminar-embed",
                    aliases: ["embed-eliminar", "borrar-embed"],
                    description: "Panel interactivo para eliminar embeds",
                    usage: `${prefix}eliminar-embed [nombre]`
                },
                {
                    name: "canal-alianza",
                    aliases: ["configurar-canal", "setup-canal"],
                    description: "Configurar canales para sistema de alianzas",
                    usage: `${prefix}canal-alianza`
                },
                {
                    name: "eliminar-canal-alianza",
                    aliases: ["removechannel-alliance", "removealchannel", "delalchannel"],
                    description: "Eliminar canales de la configuración de alianzas",
                    usage: `${prefix}eliminar-canal-alianza`
                },
                {
                    name: "listar-canales-alianza",
                    aliases: ["listchannels-alliance", "listalchannel", "channelsally"],
                    description: "Ver lista detallada de canales configurados para alianzas",
                    usage: `${prefix}listar-canales-alianza`
                },
                {
                    name: "demo-componentes",
                    aliases: ["demo", "prueba-componentes"],
                    description: "Demostración de DisplayComponents con accesorios",
                    usage: `${prefix}demo-componentes`
                }
            ],
            "Red": [
                {
                    name: "ping",
                    aliases: ["latencia", "pong"],
                    description: "Verificar latencia y estado del bot",
                    usage: `${prefix}ping`
                }
            ],
            "Configuracion": [
                {
                    name: "configuracion",
                    aliases: ["config", "ajustes", "settings"],
                    description: "Panel de configuración del servidor",
                    usage: `${prefix}configuracion`
                }
            ]
        };

        // Definir backRow una sola vez fuera de los casos
        const backRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 2,
                    label: "↩️ Volver al Menú",
                    custom_id: "back_to_main"
                }
            ]
        };

        // Si se especifica un comando específico
        if (args.length > 0) {
            const searchCommand = args[0].toLowerCase();
            let foundCommand = null;
            let foundCategory = null;

            // Buscar el comando en todas las categorías
            for (const [category, commands] of Object.entries(commandCategories)) {
                const command = commands.find(cmd => 
                    cmd.name === searchCommand || cmd.aliases.includes(searchCommand)
                );
                if (command) {
                    foundCommand = command;
                    foundCategory = category;
                    break;
                }
            }

            if (foundCommand) {
                // Panel detallado del comando específico - SIMPLIFICADO
                const commandDetailPanel = {
                    type: 17,
                    accent_color: 0x5865f2,
                    components: [
                        {
                            type: 10,
                            content: `### 📖 **Ayuda: \`${foundCommand.name}\`**\n\n**Categoría:** ${foundCategory}\n**Descripción:** ${foundCommand.description}\n**Uso:** ${foundCommand.usage}\n\n**Aliases disponibles:**\n${foundCommand.aliases.map(alias => `\`${prefix}${alias}\``).join(", ")}`
                        }
                    ]
                };

                const detailActionsRow = {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            label: "📋 Ver Todos",
                            custom_id: "show_all_commands"
                        },
                        {
                            type: 2,
                            style: 2,
                            label: "🔍 Buscar Otro",
                            custom_id: "search_command"
                        }
                    ]
                };

                await message.reply({
                    flags: 32768,
                    components: [commandDetailPanel, detailActionsRow]
                });
                return;
            } else {
                // Comando no encontrado - SIMPLIFICADO
                const notFoundPanel = {
                    type: 17,
                    accent_color: 0xf04747,
                    components: [
                        {
                            type: 10,
                            content: `### ❌ **Comando no encontrado: \`${searchCommand}\`**\n\nNo se encontró ningún comando con el nombre o alias \`${searchCommand}\`.\n\n🔍 **Sugerencias:**\n• Verifica la ortografía\n• Usa \`${prefix}ayuda\` para ver todos los comandos\n• Usa \`${prefix}ayuda <categoría>\` para filtrar`
                        }
                    ]
                };

                const notFoundRow = {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            label: "📋 Ver Todos",
                            custom_id: "show_all_commands"
                        }
                    ]
                };

                await message.reply({
                    flags: 32768,
                    components: [notFoundPanel, notFoundRow]
                });
                return;
            }
        }

        // Panel principal de ayuda - OPTIMIZADO para no exceder límite de componentes
        const helpPanel = {
            type: 17,
            accent_color: 0x5865f2,
            components: [
                {
                    type: 10,
                    content: `### 📚 **Centro de Ayuda - ${message.guild!.name}**`
                },
                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },
                {
                    type: 10,
                    content: `**Prefix actual:** \`${prefix}\`\n**Total de comandos:** ${Object.values(commandCategories).flat().length}\n**Categorías disponibles:** ${Object.keys(commandCategories).length}`
                },
                {
                    type: 14,
                    spacing: 2,
                    divider: false
                }
            ]
        };

        // Agregar resumen de categorías de forma compacta
        for (const [categoryName, commands] of Object.entries(commandCategories)) {
            const commandsList = commands.map(cmd => `\`${cmd.name}\``).join(", ");
            helpPanel.components.push({
                type: 10,
                content: `🔹 **${categoryName}** (${commands.length})\n${commandsList}`
            });
        }

        // Botones de navegación
        const navigationRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 1,
                    label: "🤝 Alianzas",
                    custom_id: "category_alliances"
                },
                {
                    type: 2,
                    style: 2,
                    label: "🌐 Red",
                    custom_id: "category_network"
                },
                {
                    type: 2,
                    style: 2,
                    label: "⚙️ Config",
                    custom_id: "category_settings"
                },
                {
                    type: 2,
                    style: 3,
                    label: "📋 Exportar",
                    custom_id: "export_commands"
                }
            ]
        };

        const panelMessage = await message.reply({
            flags: 32768,
            components: [helpPanel, navigationRow]
        });

        const collector = panelMessage.createMessageComponentCollector({
            time: 600000,
            filter: (i: any) => i.user.id === message.author.id
        });

        collector.on("collect", async (interaction: any) => {
            // Manejar información específica de comandos
            if (interaction.customId.startsWith("cmd_info_")) {
                const commandName = interaction.customId.replace("cmd_info_", "");
                let foundCommand = null;
                let foundCategory = null;

                for (const [category, commands] of Object.entries(commandCategories)) {
                    const command = commands.find(cmd => cmd.name === commandName);
                    if (command) {
                        foundCommand = command;
                        foundCategory = category;
                        break;
                    }
                }

                if (foundCommand) {
                    await interaction.reply({
                        content: `📖 **${foundCommand.name}**\n\n**Categoría:** ${foundCategory}\n**Descripción:** ${foundCommand.description}\n**Uso:** ${foundCommand.usage}\n**Aliases:** ${foundCommand.aliases.join(", ")}\n\n💡 **Tip:** Usa \`${foundCommand.usage}\` para ejecutar este comando.`,
                        flags: 64
                    });
                }
                return;
            }

            // Manejar categorías específicas - VERSIÓN COMPACTA
            switch (interaction.customId) {
                case "category_alliances":
                    const alliancePanel = {
                        type: 17,
                        accent_color: 0x00ff88,
                        components: [
                            {
                                type: 10,
                                content: "### 🤝 **Comandos de Alianzas**\n\nSistema completo para gestionar alianzas entre servidores:"
                            },
                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            }
                        ]
                    };

                    // Agregar comandos de forma compacta
                    commandCategories["Alianzas"].forEach(cmd => {
                        alliancePanel.components.push({
                            type: 10,
                            content: `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\``
                        });
                    });

                    await interaction.update({
                        components: [alliancePanel, backRow]
                    });
                    break;

                case "category_network":
                    const networkPanel = {
                        type: 17,
                        accent_color: 0x0099ff,
                        components: [
                            {
                                type: 10,
                                content: "### 🌐 **Comandos de Red**"
                            },
                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            }
                        ]
                    };

                    commandCategories["Red"].forEach(cmd => {
                        networkPanel.components.push({
                            type: 10,
                            content: `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\``
                        });
                    });

                    await interaction.update({
                        components: [networkPanel, backRow]
                    });
                    break;

                case "category_settings":
                    const settingsPanel = {
                        type: 17,
                        accent_color: 0xff9500,
                        components: [
                            {
                                type: 10,
                                content: "### ⚙️ **Comandos de Configuración**"
                            },
                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            }
                        ]
                    };

                    commandCategories["Configuracion"].forEach(cmd => {
                        settingsPanel.components.push({
                            type: 10,
                            content: `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\``
                        });
                    });

                    await interaction.update({
                        components: [settingsPanel, backRow]
                    });
                    break;

                case "back_to_main":
                    await interaction.update({
                        components: [helpPanel, navigationRow]
                    });
                    break;

                case "export_commands":
                    let exportText = `📋 **Lista Completa de Comandos - ${message.guild!.name}**\n\n`;
                    exportText += `**Prefix:** ${prefix}\n\n`;

                    for (const [category, commands] of Object.entries(commandCategories)) {
                        exportText += `**${category}**\n`;
                        commands.forEach(cmd => {
                            exportText += `• ${cmd.name} - ${cmd.description}\n`;
                            exportText += `  Uso: ${cmd.usage}\n`;
                            if (cmd.aliases.length > 0) {
                                exportText += `  Aliases: ${cmd.aliases.join(", ")}\n`;
                            }
                            exportText += `\n`;
                        });
                        exportText += `\n`;
                    }

                    await interaction.reply({
                        content: `\`\`\`\n${exportText}\`\`\``,
                        flags: 64
                    });
                    break;

                default:
                    if (interaction.customId.startsWith("use_")) {
                        const commandName = interaction.customId.replace("use_", "");
                        const foundCmd = Object.values(commandCategories).flat().find(cmd => cmd.name === commandName);
                        
                        if (foundCmd) {
                            await interaction.reply({
                                content: `🚀 **Ejecutar: \`${foundCmd.name}\`**\n\nUsa: \`${foundCmd.usage}\`\n\n💡 **Tip:** Copia y pega el comando en el chat para usarlo.`,
                                flags: 64
                            });
                        }
                    }
                    break;
            }
        });

        collector.on("end", async (collected: any, reason: string) => {
            if (reason === "time") {
                const timeoutPanel = {
                    type: 17,
                    accent_color: 0x36393f,
                    components: [
                        {
                            type: 10,
                            content: `### ⏰ **Panel de Ayuda Expirado**\n\nEl panel de ayuda ha expirado por inactividad.\n\nUsa \`${prefix}ayuda\` para abrir un nuevo panel.`
                        }
                    ]
                };

                try {
                    await panelMessage.edit({
                        components: [timeoutPanel]
                    });
                } catch (error) {
                    // Mensaje eliminado o error de edición
                }
            }
        });
    }
};
