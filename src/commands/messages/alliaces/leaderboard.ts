// Comando para mostrar el leaderboard de alianzas con botón de refresco
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import { PermissionFlagsBits } from "discord.js";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
import { prisma } from "../../../core/database/prisma";
import type { Message } from "discord.js";
import { DisplayComponentV2Builder } from "../../../core/lib/displayComponents/builders";

const MAX_ENTRIES = 10;

function formatRow(index: number, displayName: string, points: number): string {
  const rank = String(index + 1).padStart(2, " ");
  const pts = String(points).padStart(5, " ");
  return `#${rank}  ${displayName}  (${pts})`;
}

async function getLeaderboardData(guildId: string) {
  try {
    const [weekly, monthly, total] = await Promise.all([
      prisma.partnershipStats.findMany({
        where: { guildId },
        orderBy: { weeklyPoints: "desc" },
        take: MAX_ENTRIES,
      }),
      prisma.partnershipStats.findMany({
        where: { guildId },
        orderBy: { monthlyPoints: "desc" },
        take: MAX_ENTRIES,
      }),
      prisma.partnershipStats.findMany({
        where: { guildId },
        orderBy: { totalPoints: "desc" },
        take: MAX_ENTRIES,
      }),
    ]);
    return { weekly, monthly, total, error: null };
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return { weekly: [], monthly: [], total: [], error: error as Error };
  }
}

async function getSelfRanks(guildId: string, userId: string) {
  try {
    const self = await prisma.partnershipStats.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
    if (!self) return { weekly: 0, monthly: 0, total: 0 };
    const [wHigher, mHigher, tHigher] = await Promise.all([
      prisma.partnershipStats.count({
        where: { guildId, weeklyPoints: { gt: self.weeklyPoints } },
      }),
      prisma.partnershipStats.count({
        where: { guildId, monthlyPoints: { gt: self.monthlyPoints } },
      }),
      prisma.partnershipStats.count({
        where: { guildId, totalPoints: { gt: self.totalPoints } },
      }),
    ]);
    return { weekly: wHigher + 1, monthly: mHigher + 1, total: tHigher + 1 };
  } catch (error) {
    console.error("Error fetching self ranks:", error);
    return { weekly: 0, monthly: 0, total: 0 };
  }
}

function codeBlock(lines: string[]): string {
  return ["```", ...lines, "```"].join("\n");
}

export async function buildLeaderboardPanel(
  message: Message,
  isAdmin: boolean = false
) {
  const guild = message.guild!;
  const guildId = guild.id;
  const userId = message.author.id;

  // Validar que el usuario y guild existan antes de proceder
  if (!guild || !userId) {
    const errorPanel = new DisplayComponentV2Builder()
      .setAccentColor(0xff6b6b)
      .addText("## ⚠️ Error de Usuario")
      .addText("-# No se pudo identificar al usuario o servidor.")
      .addSeparator(1, true)
      .addText("Por favor, intenta nuevamente el comando.")
      .toJSON();
    return errorPanel;
  }

  const [boards, ranks] = await Promise.all([
    getLeaderboardData(guildId),
    getSelfRanks(guildId, userId),
  ]);

  // Si hay error de base de datos, mostrar panel de error
  if (boards.error) {
    const errorPanel = new DisplayComponentV2Builder()
      .setAccentColor(0xff6b6b) // Color rojo para error
      .addText("## ⚠️ Error de Conexión")
      .addText("-# No se pudo conectar con la base de datos.")
      .addSeparator(1, true)
      .addText("### 🔌 Problema de Conectividad")
      .addText(
        "No se puede acceder a los datos del leaderboard en este momento."
      )
      .addText("Esto puede ser debido a:")
      .addText("• Mantenimiento de la base de datos")
      .addText("• Problemas de conectividad temporal")
      .addText("• Sobrecarga del servidor")
      .addSeparator(1, true)
      .addText("### 🔄 ¿Qué hacer?")
      .addText(
        "Intenta nuevamente en unos minutos. Si el problema persiste, contacta a un administrador."
      )
      .toJSON();

    // ActionRow separado
    const row = {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          emoji: { name: "🔄" },
          label: "Reintentar",
          custom_id: "ld_refresh",
        },
      ],
    };

    // Retornamos un objeto que contiene el panel y el row, pero la función original retornaba solo el panel.
    // Modificaremos el retorno para ser consistente con el panel principal.
    // Como el panel de error original tenía el row DENTRO (incorrectamente), ahora lo sacamos.
    // Para mantener compatibilidad con el caller, retornaremos un objeto especial o array si el caller lo soporta.
    // Pero el caller espera `components: [panel]`.
    // Vamos a retornar el panel y el row en una estructura que el caller pueda desestructurar o manejar.
    // O mejor, retornamos un array de componentes [panel, row] si el tipo de retorno lo permite.
    // Typescript se quejará si la firma no coincide.
    // Vamos a cambiar la firma de retorno implícitamente a `Promise<any>`.
    return [errorPanel, row];
  }

  // Construir mapa de nombres visibles para los usuarios presentes en los top
  const ids = new Set<string>();
  for (const x of boards.weekly) {
    if (x && x.userId) ids.add(x.userId);
  }
  for (const x of boards.monthly) {
    if (x && x.userId) ids.add(x.userId);
  }
  for (const x of boards.total) {
    if (x && x.userId) ids.add(x.userId);
  }

  const idList = Array.from(ids);
  const nameMap = new Map<string, string>();

  // Intentar primero desde el cache del guild
  for (const id of idList) {
    try {
      const m = guild.members.cache.get(id);
      if (m && m.user) {
        nameMap.set(id, m.displayName || m.user.username || id);
      }
    } catch (error) {
      console.warn(`Error getting cached member ${id}:`, error);
    }
  }

  // Fetch individual para los que falten (evitar peticiones innecesarias)
  for (const id of idList) {
    if (nameMap.has(id)) continue;
    try {
      const m = await guild.members.fetch(id);
      if (m && m.user) {
        nameMap.set(id, m.displayName || m.user.username || id);
        continue;
      }
    } catch (error) {
      console.warn(`Error fetching member ${id}:`, error);
    }

    try {
      const u = await message.client.users.fetch(id);
      if (u && u.username) {
        nameMap.set(id, u.username);
        continue;
      }
    } catch (error) {
      console.warn(`Error fetching user ${id}:`, error);
    }

    // Fallback: usar placeholder para usuarios no encontrados
    nameMap.set(id, "Usuario desconocido");
  }

  const weeklyLines = boards.weekly.length
    ? boards.weekly
        .filter((x) => x && x.userId)
        .map((x, i) =>
          formatRow(
            i,
            nameMap.get(x.userId) || "Usuario desconocido",
            x.weeklyPoints || 0
          )
        )
    : ["(sin datos)"];

  const monthlyLines = boards.monthly.length
    ? boards.monthly
        .filter((x) => x && x.userId)
        .map((x, i) =>
          formatRow(
            i,
            nameMap.get(x.userId) || "Usuario desconocido",
            x.monthlyPoints || 0
          )
        )
    : ["(sin datos)"];

  const totalLines = boards.total.length
    ? boards.total
        .filter((x) => x && x.userId)
        .map((x, i) =>
          formatRow(
            i,
            nameMap.get(x.userId) || "Usuario desconocido",
            x.totalPoints || 0
          )
        )
    : ["(sin datos)"];

  const now = new Date();
  const ts = now.toISOString().replace("T", " ").split(".")[0];

  // Mensaje especial si el usuario no tiene datos
  const userMessage =
    ranks.weekly === 0 && ranks.monthly === 0 && ranks.total === 0
      ? "No tienes puntos registrados aún • ¡Empieza a participar!"
      : `Tus puestos → semanal: ${ranks.weekly || 0} • mensual: ${
          ranks.monthly || 0
        } • total: ${ranks.total || 0}`;

  // Botón base que todos ven
  const buttons: any[] = [
    {
      type: 2,
      style: 2,
      emoji: { name: "🔄" },
      label: "Refrescar",
      custom_id: "ld_refresh",
    },
  ];

  // Si es admin, añadir botón de gestión
  if (isAdmin) {
    buttons.push({
      type: 2,
      style: 1,
      emoji: { name: "⚙️" },
      label: "Gestionar Puntos",
      custom_id: "ld_manage_points",
    });
  }

  const panel = new DisplayComponentV2Builder()
    .setAccentColor(0x2b2d31)
    .addText("## 🏆 Leaderboard de Alianzas")
    .addText("-# Top semanal, mensual y total del servidor.")
    .addSeparator(1, true)
    .addText("### 📅 Semanal")
    .addText(codeBlock(weeklyLines))
    .addSeparator(1, false)
    .addText("### 🗓️ Mensual")
    .addText(codeBlock(monthlyLines))
    .addSeparator(1, false)
    .addText("### 🧮 Total")
    .addText(codeBlock(totalLines))
    .addSeparator(1, true)
    .addText(userMessage)
    .addText(`Última actualización: ${ts} UTC`)
    .toJSON();

  const row = {
    type: 1,
    components: buttons,
  };

  return [panel, row];
}

export const command: CommandMessage = {
  name: "leaderboard",
  type: "message",
  aliases: ["ld"],
  cooldown: 5,
  description:
    "Muestra el leaderboard de alianzas (semanal, mensual y total) con botón de refresco.",
  category: "Alianzas",
  usage: "leaderboard",
  run: async (message) => {
    if (!message.guild) {
      await message.reply({
        content: "❌ Este comando solo puede usarse en servidores.",
      });
      return;
    }

    // Verificar si el usuario es admin o staff
    const member = await message.guild.members.fetch(message.author.id);
    const isAdmin = await hasManageGuildOrStaff(
      member,
      message.guild.id,
      prisma
    );

    const components = await buildLeaderboardPanel(message, isAdmin);

    // components es un array [panel, row] o [errorPanel] (si errorPanel fuera solo, pero lo hice array tambien)
    // Si errorPanel es devuelto como objeto único en el primer check de usuario, debemos manejarlo.
    // En el primer check (usuario/guild error), retorné `errorPanel` directo (objeto).
    // Debo corregir eso para que sea consistente.

    // Corrección en runtime:
    const payloadComponents = Array.isArray(components)
      ? components
      : [components];

    await message.reply({
      // @ts-ignore Flag de componentes V2
      flags: 32768,
      components: payloadComponents,
    });
  },
};
