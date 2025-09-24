// Comando de administración para sincronizar / limpiar comandos (solo dueño)
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";

const OWNER_ID = '327207082203938818';

export const command: CommandMessage = {
    name: 'admin-comandos',
    type: 'message',
    aliases: ['cmdadmin', 'synccommands', 'comandos-admin'],
    cooldown: 5,
    run: async (message, _args, _client) => {
        if (message.author.id !== OWNER_ID) {
            await message.reply({ content: '❌ No tienes permisos para usar este panel.' });
            return;
        }

        const panel = {
            type: 17,
            accent_color: 0x2b2d31,
            components: [
                {
                    type: 10,
                    content: '### 🛠️ Panel de Administración de Comandos\nGestiona el registro y limpieza de comandos **Slash**.'
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: 'Acciones disponibles:\n• Registrar comandos de GUILD (testing)\n• Registrar comandos GLOBAL (propagación lenta)\n• Limpiar comandos de GUILD\n• Limpiar comandos GLOBAL\n\nUsa los botones de abajo. Se evita ejecución simultánea.'
                }
            ]
        };

        const rows = [
            {
                type: 1,
                components: [
                    { type: 2, style: 1, label: 'Registrar GUILD', custom_id: 'cmd_reg_guild' },
                    { type: 2, style: 1, label: 'Registrar GLOBAL', custom_id: 'cmd_reg_global' }
                ]
            },
            {
                type: 1,
                components: [
                    { type: 2, style: 4, label: 'Limpiar GUILD', custom_id: 'cmd_clear_guild' },
                    { type: 2, style: 4, label: 'Limpiar GLOBAL', custom_id: 'cmd_clear_global' }
                ]
            }
        ];

        await message.reply({
            flags: 32768,
            components: [panel, ...rows]
        });
    }
};
