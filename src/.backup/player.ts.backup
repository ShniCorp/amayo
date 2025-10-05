import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { getOrCreateWallet } from '../../../game/economy/service';
import { getEquipment, getEffectiveStats } from '../../../game/combat/equipmentService';
import type { ItemProps } from '../../../game/economy/types';

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== 'object') return {};
  return json as ItemProps;
}

function fmtTool(props: ItemProps) {
  const t = props.tool;
  if (!t) return '';
  const icon = t.type === 'pickaxe' ? '⛏️' : t.type === 'rod' ? '🎣' : t.type === 'sword' ? '🗡️' : t.type === 'bow' ? '🏹' : t.type === 'halberd' ? '⚔️' : t.type === 'net' ? '🕸️' : '🔧';
  const tier = t.tier != null ? ` T${t.tier}` : '';
  return `${icon}${tier}`;
}

export const command: CommandMessage = {
  name: 'player',
  type: 'message',
  aliases: ['perfil', 'profile', 'yo', 'me'],
  cooldown: 5,
  description: 'Muestra toda tu información de jugador: stats, equipo, progreso y últimas actividades.',
  usage: 'player [@usuario]',
  run: async (message, args, _client: Amayo) => {
    // Permitir ver perfil de otros usuarios mencionándolos
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;
    const guildId = message.guild!.id;

    // Obtener datos del jugador
    const wallet = await getOrCreateWallet(userId, guildId);
    const { eq, weapon, armor, cape } = await getEquipment(userId, guildId);
    const stats = await getEffectiveStats(userId, guildId);
    const playerState = await prisma.playerState.findUnique({ where: { userId_guildId: { userId, guildId } } });

    // Progreso por áreas
    const progress = await prisma.playerProgress.findMany({
      where: { userId, guildId },
      include: { area: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Últimas actividades de minijuegos
    const recentRuns = await prisma.minigameRun.findMany({
      where: { userId, guildId },
      include: { area: true },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    // Conteo de items en inventario
    const inventoryCount = await prisma.inventoryEntry.count({
      where: { userId, guildId, quantity: { gt: 0 } },
    });

    // Total de items (cantidad sumada)
    const inventorySum = await prisma.inventoryEntry.aggregate({
      where: { userId, guildId },
      _sum: { quantity: true },
    });

    // Compras totales
    const purchaseCount = await prisma.shopPurchase.count({
      where: { userId, guildId },
    });

    // Cooldowns activos
    const activeCooldowns = await prisma.actionCooldown.findMany({
      where: { userId, guildId, until: { gt: new Date() } },
      orderBy: { until: 'asc' },
      take: 5,
    });

    // Construir el mensaje
    const lines: string[] = [];

    // Header
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👤 **Perfil de ${targetUser.username}**`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 📊 Stats Básicos
    lines.push(`📊 **ESTADÍSTICAS**`);
    lines.push(`❤️  HP: ${stats.hp}/${stats.maxHp}`);
    lines.push(`⚔️  ATK: ${stats.damage}`);
    lines.push(`🛡️  DEF: ${stats.defense}`);
    lines.push(`💰 Monedas: ${wallet.coins}`);
    lines.push(``);

    // 🎒 Inventario
    lines.push(`🎒 **INVENTARIO**`);
    lines.push(`📦 Items únicos: ${inventoryCount}`);
    lines.push(`🔢 Total items: ${inventorySum._sum.quantity ?? 0}`);
    lines.push(`🛒 Compras totales: ${purchaseCount}`);
    lines.push(``);

    // 🧰 Equipamiento
    lines.push(`🧰 **EQUIPAMIENTO**`);
    if (weapon) {
      const wProps = parseItemProps(weapon.props);
      const wTool = fmtTool(wProps);
      const wDmg = wProps.damage ? ` +${wProps.damage} ATK` : '';
      lines.push(`🗡️  Arma: ${weapon.name || weapon.key}${wTool ? ` ${wTool}` : ''}${wDmg}`);
    } else {
      lines.push(`🗡️  Arma: -`);
    }

    if (armor) {
      const aProps = parseItemProps(armor.props);
      const aDef = aProps.defense ? ` +${aProps.defense} DEF` : '';
      lines.push(`🛡️  Armadura: ${armor.name || armor.key}${aDef}`);
    } else {
      lines.push(`🛡️  Armadura: -`);
    }

    if (cape) {
      const cProps = parseItemProps(cape.props);
      const cHp = cProps.maxHpBonus ? ` +${cProps.maxHpBonus} HP` : '';
      lines.push(`🧥 Capa: ${cape.name || cape.key}${cHp}`);
    } else {
      lines.push(`🧥 Capa: -`);
    }
    lines.push(``);

    // 🗺️ Progreso por Áreas
    if (progress.length > 0) {
      lines.push(`🗺️  **PROGRESO EN ÁREAS**`);
      for (const p of progress) {
        const areaIcon = p.area.type === 'MINE' ? '⛏️' : p.area.type === 'LAGOON' ? '🎣' : p.area.type === 'FIGHT' ? '⚔️' : p.area.type === 'FARM' ? '🌾' : '🗺️';
        lines.push(`${areaIcon} ${p.area.name}: Nivel ${p.highestLevel}`);
      }
      lines.push(``);
    }

    // 📜 Últimas Actividades
    if (recentRuns.length > 0) {
      lines.push(`📜 **ÚLTIMAS ACTIVIDADES**`);
      for (const run of recentRuns.slice(0, 3)) {
        const result = run.result as any;
        const areaIcon = run.area.type === 'MINE' ? '⛏️' : run.area.type === 'LAGOON' ? '🎣' : run.area.type === 'FIGHT' ? '⚔️' : run.area.type === 'FARM' ? '🌾' : '🗺️';
        const timestamp = run.startedAt;
        const relativeTime = getRelativeTime(timestamp);
        const rewardsCount = result.rewards?.length ?? 0;
        lines.push(`${areaIcon} ${run.area.name} (Nv.${run.level}) - ${rewardsCount} recompensas - ${relativeTime}`);
      }
      lines.push(``);
    }

    // ⏱️ Cooldowns Activos
    if (activeCooldowns.length > 0) {
      lines.push(`⏱️  **COOLDOWNS ACTIVOS**`);
      for (const cd of activeCooldowns) {
        const remaining = Math.max(0, Math.ceil((cd.until.getTime() - Date.now()) / 1000));
        const cdName = formatCooldownKey(cd.key);
        lines.push(`⏳ ${cdName}: ${formatDuration(remaining)}`);
      }
      lines.push(``);
    }

    // Stats adicionales del PlayerState
    if (playerState?.stats) {
      const additionalStats = playerState.stats as any;
      if (Object.keys(additionalStats).length > 0) {
        lines.push(`🎯 **STATS ADICIONALES**`);
        if (additionalStats.attack != null) lines.push(`⚔️  Ataque Base: ${additionalStats.attack}`);
        if (additionalStats.defense != null) lines.push(`🛡️  Defensa Base: ${additionalStats.defense}`);
        if (additionalStats.strength != null) lines.push(`💪 Fuerza: ${additionalStats.strength}`);
        if (additionalStats.luck != null) lines.push(`🍀 Suerte: ${additionalStats.luck}`);
        lines.push(``);
      }
    }

    // Footer
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Usa \`!inventario\` para ver tus items completos`);

    await message.reply(lines.join('\n'));
  },
};

// Helpers
function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatCooldownKey(key: string): string {
  // Convertir keys como "minigame:mine.starter" a "Mina"
  if (key.startsWith('minigame:')) {
    const areaKey = key.split(':')[1];
    if (areaKey?.includes('mine')) return 'Mina';
    if (areaKey?.includes('lagoon')) return 'Laguna';
    if (areaKey?.includes('fight')) return 'Pelea';
    if (areaKey?.includes('farm')) return 'Granja';
    return areaKey || key;
  }
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
