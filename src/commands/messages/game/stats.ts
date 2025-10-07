import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getPlayerStatsFormatted } from '../../../game/stats/service';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'stats',
  type: 'message',
  aliases: ['estadisticas', 'est'],
  cooldown: 5,
  description: 'Ver estadísticas detalladas de un jugador',
  usage: 'stats [@usuario]',
  run: async (message, args, client: Amayo) => {
    try {
      const guildId = message.guild!.id;
      const targetUser = message.mentions.users.first() || message.author;
      const userId = targetUser.id;

      // Obtener estadísticas formateadas
      const stats = await getPlayerStatsFormatted(userId, guildId);

      const formatValue = (value: unknown): string => {
        if (typeof value === 'number') return value.toLocaleString();
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'string') return value.trim() || '0';
        return value == null ? '0' : String(value);
      };

      const components: any[] = [
        {
          type: 10,
          content: `# 📊 Estadísticas de ${targetUser.username}`
        },
        { type: 14, divider: true }
      ];

      const addSection = (title: string, data?: Record<string, unknown>) => {
        if (!data || typeof data !== 'object') return;
        const entries = Object.entries(data);
        const lines = entries.map(([key, value]) => `${key}: **${formatValue(value)}**`);
        const content = lines.length > 0 ? lines.join('\n') : 'Sin datos';
        components.push({
          type: 10,
          content: `**${title}**\n${content}`
        });
        components.push({ type: 14, divider: false, spacing: 1 });
      };

      addSection('🎮 ACTIVIDADES', stats.activities as Record<string, unknown> | undefined);
      addSection('⚔️ COMBATE', stats.combat as Record<string, unknown> | undefined);
      addSection('💰 ECONOMÍA', stats.economy as Record<string, unknown> | undefined);
      addSection('📦 ITEMS', stats.items as Record<string, unknown> | undefined);
      addSection('🏆 RÉCORDS', stats.records as Record<string, unknown> | undefined);

      // Remove trailing separator if present
      if (components.length > 0 && components[components.length - 1]?.type === 14) {
        components.pop();
      }

      if (components.length === 1) {
        components.push({ type: 10, content: '*Sin estadísticas registradas.*' });
      }

      // Crear DisplayComponent
      const display = {
        type: 17,
        accent_color: 0x5865F2,
        components
      };

      // Enviar con flags
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        content: null,
        components: [display],
        flags: 32768, // MessageFlags.IS_COMPONENTS_V2
        reply: { messageReference: message.id }
      });
    } catch (error) {
      console.error('Error en comando stats:', error);
      await message.reply('❌ Error al obtener las estadísticas.');
    }
  }
};
