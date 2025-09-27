// Comando para mostrar el leaderboard de alianzas con botón de refresco
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import { prisma } from "../../../core/database/prisma";
import type { Message } from "discord.js";

const MAX_ENTRIES = 10;

function formatRow(index: number, userId: string, points: number): string {
  const rank = String(index + 1).padStart(2, ' ');
  const pts = String(points).padStart(5, ' ');
  return `#${rank}  <@${userId}>  (${pts})`;
}

async function getLeaderboardData(guildId: string) {
  const [weekly, monthly, total] = await Promise.all([
    prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { weeklyPoints: 'desc' }, take: MAX_ENTRIES }),
    prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { monthlyPoints: 'desc' }, take: MAX_ENTRIES }),
    prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { totalPoints: 'desc' }, take: MAX_ENTRIES }),
  ]);
  return { weekly, monthly, total };
}

async function getSelfRanks(guildId: string, userId: string) {
  const self = await prisma.partnershipStats.findUnique({ where: { userId_guildId: { userId, guildId } } });
  if (!self) return { weekly: 0, monthly: 0, total: 0 };
  const [wHigher, mHigher, tHigher] = await Promise.all([
    prisma.partnershipStats.count({ where: { guildId, weeklyPoints: { gt: self.weeklyPoints } } }),
    prisma.partnershipStats.count({ where: { guildId, monthlyPoints: { gt: self.monthlyPoints } } }),
    prisma.partnershipStats.count({ where: { guildId, totalPoints: { gt: self.totalPoints } } }),
  ]);
  return { weekly: wHigher + 1, monthly: mHigher + 1, total: tHigher + 1 };
}

function codeBlock(lines: string[]): string {
  return [
    '```',
    ...lines,
    '```'
  ].join('\n');
}

export async function buildLeaderboardPanel(message: Message) {
  const guild = message.guild!;
  const guildId = guild.id;
  const userId = message.author.id;

  const [boards, ranks] = await Promise.all([
    getLeaderboardData(guildId),
    getSelfRanks(guildId, userId)
  ]);

  const weeklyLines = boards.weekly.length
    ? boards.weekly.map((x, i) => formatRow(i, x.userId, x.weeklyPoints))
    : ['(sin datos)'];

  const monthlyLines = boards.monthly.length
    ? boards.monthly.map((x, i) => formatRow(i, x.userId, x.monthlyPoints))
    : ['(sin datos)'];

  const totalLines = boards.total.length
    ? boards.total.map((x, i) => formatRow(i, x.userId, x.totalPoints))
    : ['(sin datos)'];

  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').split('.')[0];

  // @ts-ignore - estructura de Display Components V2
  const panel = {
    type: 17,
    accent_color: 0x2b2d31,
    components: [
      { type: 10, content: '## 🏆 Leaderboard de Alianzas' },
      { type: 10, content: '-# Top semanal, mensual y total del servidor.' },
      { type: 14, divider: true, spacing: 1 },

      { type: 10, content: '### 📅 Semanal' },
      { type: 10, content: codeBlock(weeklyLines) },

      { type: 14, divider: false, spacing: 1 },
      { type: 10, content: '### 🗓️ Mensual' },
      { type: 10, content: codeBlock(monthlyLines) },

      { type: 14, divider: false, spacing: 1 },
      { type: 10, content: '### 🧮 Total' },
      { type: 10, content: codeBlock(totalLines) },

      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: `Tus puestos → semanal: ${ranks.weekly || 0} • mensual: ${ranks.monthly || 0} • total: ${ranks.total || 0}` },
      { type: 10, content: `Última actualización: ${ts} UTC` },

      { type: 14, divider: false, spacing: 1 },
      {
        type: 1,
        components: [
          { type: 2, style: 2, emoji: '1420539242643193896', label: 'Refrescar', custom_id: 'ld_refresh' }
        ]
      }
    ]
  };

  return panel;
}

export const command: CommandMessage = {
  name: 'leaderboard',
  type: 'message',
  aliases: ['ld'],
  cooldown: 5,
  description: 'Muestra el leaderboard de alianzas (semanal, mensual y total) con botón de refresco.',
  category: 'Utilidad',
  usage: 'leaderboard',
  run: async (message) => {
    if (!message.guild) {
      await message.reply({ content: '❌ Este comando solo puede usarse en servidores.' });
      return;
    }

    const panel = await buildLeaderboardPanel(message);
    await message.reply({
      // @ts-ignore Flag de componentes V2
      flags: 32768,
      components: [panel]
    });
  }
};

