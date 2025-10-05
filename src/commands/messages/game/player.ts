import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { getOrCreateWallet } from '../../../game/economy/service';
import { getEquipment, getEffectiveStats } from '../../../game/combat/equipmentService';
import { getPlayerStatsFormatted } from '../../../game/stats/service';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'player',
  type: 'message',
  aliases: ['perfil', 'profile', 'yo', 'me'],
  cooldown: 5,
  description: 'Muestra toda tu información de jugador con vista visual mejorada',
  usage: 'player [@usuario]',
  run: async (message, args, _client: Amayo) => {
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;
    const guildId = message.guild!.id;

    // Obtener datos del jugador
    const wallet = await getOrCreateWallet(userId, guildId);
    const { eq, weapon, armor, cape } = await getEquipment(userId, guildId);
    const stats = await getEffectiveStats(userId, guildId);
    const playerStats = await getPlayerStatsFormatted(userId, guildId);

    // Progreso por áreas
    const progress = await prisma.playerProgress.findMany({
      where: { userId, guildId },
      include: { area: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Inventario
    const inventoryCount = await prisma.inventoryEntry.count({
      where: { userId, guildId, quantity: { gt: 0 } },
    });

    const inventorySum = await prisma.inventoryEntry.aggregate({
      where: { userId, guildId },
      _sum: { quantity: true },
    });

    // Cooldowns activos
    const activeCooldowns = await prisma.actionCooldown.findMany({
      where: { userId, guildId, until: { gt: new Date() } },
      orderBy: { until: 'asc' },
      take: 3,
    });

    // Crear DisplayComponent
    const display = {
      type: 17,
      accent_color: 0x5865F2,
      components: [
        // Header
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `👤 **${targetUser.username}**\n${targetUser.bot ? '🤖 Bot' : '👨 Usuario'}`
            }
          ]
        },
        { type: 14, divider: true },
        // Stats Básicos
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**📊 ESTADÍSTICAS**\n` +
                       `❤️ HP: **${stats.hp}/${stats.maxHp}**\n` +
                       `⚔️ ATK: **${stats.damage}**\n` +
                       `🛡️ DEF: **${stats.defense}**\n` +
                       `💰 Monedas: **${wallet.coins.toLocaleString()}**`
            }
          ]
        },
        { type: 14, divider: true },
        // Equipo
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**⚔️ EQUIPO**\n` +
                       (weapon ? `🗡️ Arma: **${weapon.name || weapon.key}**\n` : '🗡️ Arma: *Ninguna*\n') +
                       (armor ? `🛡️ Armadura: **${armor.name || armor.key}**\n` : '🛡️ Armadura: *Ninguna*\n') +
                       (cape ? `🧥 Capa: **${cape.name || cape.key}**` : '🧥 Capa: *Ninguna*')
            }
          ]
        },
        { type: 14, divider: true },
        // Inventario
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**🎒 INVENTARIO**\n` +
                       `📦 Items únicos: **${inventoryCount}**\n` +
                       `🔢 Total items: **${inventorySum._sum.quantity ?? 0}**`
            }
          ]
        }
      ]
    };

    // Añadir stats de actividades si existen
    if (playerStats.activities) {
      const activitiesText = Object.entries(playerStats.activities)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => `${key}: **${value}**`)
        .join('\n');
      
      if (activitiesText) {
        display.components.push({ type: 14, divider: true });
        display.components.push({
          type: 9,
          components: [
            {
              type: 10,
              content: `**🎮 ACTIVIDADES**\n${activitiesText}`
            }
          ]
        });
      }
    }

    // Añadir progreso por áreas
    if (progress.length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [
          {
            type: 10,
            content: `**🗺️ PROGRESO EN ÁREAS**\n` +
                     progress.map(p => `• ${p.area.name || p.area.key}: Nivel **${p.highestLevel}**`).join('\n')
          }
        ]
      });
    }

    // Añadir cooldowns activos
    if (activeCooldowns.length > 0) {
      const now = Date.now();
      const cooldownsText = activeCooldowns.map(cd => {
        const remaining = Math.ceil((cd.until.getTime() - now) / 1000);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        return `• ${cd.key}: **${mins}m ${secs}s**`;
      }).join('\n');

      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [
          {
            type: 10,
            content: `**⏰ COOLDOWNS ACTIVOS**\n${cooldownsText}`
          }
        ]
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      display,
      reply: { messageReference: message.id }
    });
  }
};
