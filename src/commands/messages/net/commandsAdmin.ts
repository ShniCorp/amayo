// Comando de administración para sincronizar / limpiar comandos (solo dueño)
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";

const OWNER_ID = '327207082203938818';

function formatBytesMB(bytes: number) {
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function buildAdminPanel() {
    const m = process.memoryUsage();
    const rss = formatBytesMB(m.rss);
    const heapUsed = formatBytesMB(m.heapUsed);
    const heapTotal = formatBytesMB(m.heapTotal);
    const ext = formatBytesMB(m.external);
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').split('.')[0];

    // @ts-ignore
    return {
        type: 17,
        accent_color: 0x2b2d31,
        components: [
            {
                type: 10,
                content: '## <:Sup_bug:1420537401692131400> Panel de Administrativo'
            },
            {
                type: 10,
                content: '-# Gestiona el registro y limpieza de comandos **Slash**.'
            },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 9,
                components: [
                    { type: 10, content: "<:astar:1336533817296683059> Registrar los comandos **/** dentro del servidor de pruebas" }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "1421364744412991520",
                    label: 'Registrar CMD en ServerTest',
                    custom_id: 'cmd_reg_guild'
                }
            },
            {
                type: 9,
                components: [
                    { type: 10, content: "<:astar:1336533817296683059> Registrar los comandos **/** de manera GLOBAL (todos los servidores)" }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "1421364744412991520",
                    label: 'Registrar GLOBAL',
                    custom_id: 'cmd_reg_global'
                }
            },
            {
                type: 9,
                components: [
                    { type: 10, content: "<:Sup_urg:1420535068056748042> Eliminar los comandos **/** dentro del servidor de pruebas" }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "1420535096208920576",
                    label: 'Eliminar CMD en ServerTest',
                    custom_id: 'cmd_clear_guild'
                }
            },
            {
                type: 9,
                components: [
                    { type: 10, content: "<:Sup_urg:1420535068056748042> Eliminar los comandos **/** de manera GLOBAL (todos los servidores)" }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "1420535096208920576",
                    label: 'Eliminar ALL',
                    custom_id: 'cmd_clear_global'
                }
            },

            { type: 14, divider: true, spacing: 1 },
            {
                type: 10,
                content: ` ## <:Sup_bug:1420537401692131400> Uso de Memoria
                \`\`\`
┌─────────────────┬──────────────┐
│ Memory Type     │ Usage        │
├─────────────────┼──────────────┤
│ RSS             │ ${rss.padEnd(12)} │
│ Heap Used       │ ${heapUsed.padEnd(12)} │
│ Heap Total      │ ${heapTotal.padEnd(12)} │
│ External        │ ${ext.padEnd(12)} │
└─────────────────┴──────────────┘
\`\`\`
Última actualización: ${ts} UTC
`
            },
            {
                type: 1,
                components: [
                    { type: 2, style: 2, emoji: "1420539242643193896", label: 'Refrescar Memoria', custom_id: 'cmd_mem_refresh' }
                ]
            },
            { type: 14, divider: false, spacing: 1 }
        ]
    };
}

export const command: CommandMessage = {
    name: 'admin-comandos',
    type: 'message',
    aliases: ['cmdadmin', 'synccommands', 'comandos-admin'],
    cooldown: 5,
    description: 'Panel del dueño para registrar/limpiar comandos slash y revisar memoria.',
    category: 'Administración',
    usage: 'admin-comandos',
    run: async (message, _args, _client) => {
        if (message.author.id !== OWNER_ID) {
            await message.reply({ content: '❌ No tienes permisos para usar este panel.' });
            return;
        }

        const panel = buildAdminPanel();

        await message.reply({
            flags: 32768,
            components: [panel]
        });
    }
};

// Exportamos builder para reutilizar en el botón de refresco
export { buildAdminPanel };