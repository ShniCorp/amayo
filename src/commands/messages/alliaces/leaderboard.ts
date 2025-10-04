// Comando para mostrar el leaderboard de alianzas con botón de refresco
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import { prisma } from "../../../core/database/prisma";
import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";

const MAX_ENTRIES = 10;

function formatRow(index: number, displayName: string, points: number): string {
  const rank = String(index + 1).padStart(2, ' ');
  const pts = String(points).padStart(5, ' ');
  return `#${rank}  ${displayName}  (${pts})`;
}

async function getLeaderboardData(guildId: string) {
  try {
    const [weekly, monthly, total] = await Promise.all([
      prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { weeklyPoints: 'desc' }, take: MAX_ENTRIES }),
      prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { monthlyPoints: 'desc' }, take: MAX_ENTRIES }),
      prisma.partnershipStats.findMany({ where: { guildId }, orderBy: { totalPoints: 'desc' }, take: MAX_ENTRIES }),
    ]);
    return { weekly, monthly, total, error: null };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return { weekly: [], monthly: [], total: [], error: error as Error };
  }
}

async function getSelfRanks(guildId: string, userId: string) {
  try {
    const self = await prisma.partnershipStats.findUnique({ where: { userId_guildId: { userId, guildId } } });
    if (!self) return { weekly: 0, monthly: 0, total: 0 };
    const [wHigher, mHigher, tHigher] = await Promise.all([
      prisma.partnershipStats.count({ where: { guildId, weeklyPoints: { gt: self.weeklyPoints } } }),
      prisma.partnershipStats.count({ where: { guildId, monthlyPoints: { gt: self.monthlyPoints } } }),
      prisma.partnershipStats.count({ where: { guildId, totalPoints: { gt: self.totalPoints } } }),
    ]);
    return { weekly: wHigher + 1, monthly: mHigher + 1, total: tHigher + 1 };
  } catch (error) {
    console.error('Error fetching self ranks:', error);
    return { weekly: 0, monthly: 0, total: 0 };
  }
}

function codeBlock(lines: string[]): string {
  return [
    '```',
    ...lines,
    '```'
  ].join('\n');
}

export async function buildLeaderboardPanel(message: Message, isAdmin: boolean = false) {
  const guild = message.guild!;
  const guildId = guild.id;
  const userId = message.author.id;

  const [boards, ranks] = await Promise.all([
    getLeaderboardData(guildId),
    getSelfRanks(guildId, userId)
  ]);

  // Si hay error de base de datos, mostrar panel de error
  if (boards.error) {
    const errorPanel = {
      type: 17,
      accent_color: 0xff6b6b, // Color rojo para error
      components: [
        { type: 10, content: '## ⚠️ Error de Conexión' },
        { type: 10, content: '-# No se pudo conectar con la base de datos.' },
        { type: 14, divider: true, spacing: 1 },

        { type: 10, content: '### 🔌 Problema de Conectividad' },
        { type: 10, content: 'No se puede acceder a los datos del leaderboard en este momento.' },
        { type: 10, content: 'Esto puede ser debido a:' },
        { type: 10, content: '• Mantenimiento de la base de datos' },
        { type: 10, content: '• Problemas de conectividad temporal' },
        { type: 10, content: '• Sobrecarga del servidor' },

        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: '### 🔄 ¿Qué hacer?' },
        { type: 10, content: 'Intenta nuevamente en unos minutos. Si el problema persiste, contacta a un administrador.' },

        { type: 14, divider: false, spacing: 1 },
        {
          type: 1,
          components: [
            { type: 2, style: 2, emoji: '🔄', label: 'Reintentar', custom_id: 'ld_refresh' }
          ]
        }
      ]
    };
    return errorPanel;
  }

  // Construir mapa de nombres visibles para los usuarios presentes en los top
  const ids = new Set<string>();
  for (const x of boards.weekly) ids.add(x.userId);
  for (const x of boards.monthly) ids.add(x.userId);
  for (const x of boards.total) ids.add(x.userId);

  const idList = Array.from(ids);
  const nameMap = new Map<string, string>();
  // Intentar primero desde el cache del guild
  for (const id of idList) {
    const m = guild.members.cache.get(id);
    if (m) nameMap.set(id, m.displayName || m.user.username || id);
  }
  // Fetch individual para los que falten (evitar peticiones innecesarias)
  for (const id of idList) {
    if (nameMap.has(id)) continue;
    try {
      const m = await guild.members.fetch(id);
      if (m) {
        nameMap.set(id, m.displayName || m.user.username || id);
        continue;
      }
    } catch {}
    try {
      const u = await message.client.users.fetch(id);
      if (u) {
        nameMap.set(id, u.username || id);
        continue;
      }
    } catch {}
    // Fallback: no mostrar ID crudo; usar placeholder
    nameMap.set(id, 'Usuario desconocido');
  }

  const weeklyLines = boards.weekly.length
    ? boards.weekly.map((x, i) => formatRow(i, nameMap.get(x.userId) || 'Usuario desconocido', x.weeklyPoints))
    : ['(sin datos)'];

  const monthlyLines = boards.monthly.length
    ? boards.monthly.map((x, i) => formatRow(i, nameMap.get(x.userId) || 'Usuario desconocido', x.monthlyPoints))
    : ['(sin datos)'];

  const totalLines = boards.total.length
    ? boards.total.map((x, i) => formatRow(i, nameMap.get(x.userId) || 'Usuario desconocido', x.totalPoints))
    : ['(sin datos)'];

  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').split('.')[0];

  // Botón base que todos ven
  const buttons: any[] = [
    { type: 2, style: 2, emoji: '1420539242643193896', label: 'Refrescar', custom_id: 'ld_refresh' }
  ];

  // Si es admin, añadir botón de gestión
  if (isAdmin) {
    buttons.push(
      { type: 2, style: 1, emoji: '⚙️', label: 'Gestionar Puntos', custom_id: 'ld_manage_points' }
    );
  }

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
        components: buttons
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

    // Verificar si el usuario es administrador
    const member = await message.guild.members.fetch(message.author.id);
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild);

    const panel = await buildLeaderboardPanel(message, isAdmin);
    await message.reply({
      // @ts-ignore Flag de componentes V2
      flags: 32768,
      components: [panel]
    });
  }
};
