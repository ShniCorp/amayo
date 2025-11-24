// Utilidades de formato visual estilo RPG para comandos y resúmenes.
// Centraliza lógica repetida (barras de corazones, durabilidad, etiquetas de herramientas).

export function heartsBar(
  current: number,
  max: number,
  opts?: { segments?: number; fullChar?: string; emptyChar?: string }
) {
  const segments = opts?.segments ?? Math.min(20, max); // límite visual
  const full = opts?.fullChar ?? "❤";
  const empty = opts?.emptyChar ?? "♡";
  const clampedMax = Math.max(1, max);
  const ratio = current / clampedMax;
  const filled = Math.max(0, Math.min(segments, Math.round(ratio * segments)));
  return full.repeat(filled) + empty.repeat(segments - filled);
}

export function durabilityBar(remaining: number, max: number, segments = 10) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, remaining / safeMax));
  const filled = Math.round(ratio * segments);
  const bar = Array.from({ length: segments })
    .map((_, i) => (i < filled ? "█" : "░"))
    .join("");
  return `[${bar}] ${Math.max(0, remaining)}/${safeMax}`;
}

export function formatToolLabel(params: {
  key: string;
  displayName: string;
  instancesRemaining?: number | null;
  broken?: boolean;
  brokenInstance?: boolean;
  durabilityDelta?: number | null;
  remaining?: number | null;
  max?: number | null;
  source?: string | null;
  fallbackIcon?: string;
}) {
  const {
    key,
    displayName,
    instancesRemaining,
    broken,
    brokenInstance,
    durabilityDelta,
    remaining,
    max,
    source,
    fallbackIcon = "🔧",
  } = params;

  const multi =
    instancesRemaining && instancesRemaining > 1
      ? ` (x${instancesRemaining})`
      : "";
  const base = `${displayName || key}${multi}`;
  let status = "";
  if (broken) status = " (agotada)";
  else if (brokenInstance)
    status = ` (instancia rota, quedan ${instancesRemaining})`;
  const delta = durabilityDelta != null ? ` (-${durabilityDelta} dur.)` : "";
  const dur =
    remaining != null && max != null
      ? `\nDurabilidad: ${durabilityBar(remaining, max)}`
      : "";
  const src = source ? ` \`(${source})\`` : "";
  return `${base}${status}${delta}${src}${dur}`;
}

export function outcomeLabel(outcome?: "victory" | "defeat") {
  if (!outcome) return "";
  return outcome === "victory" ? "🏆 Victoria" : "💀 Derrota";
}

export function combatSummaryRPG(c: {
  mobs: number;
  mobsDefeated: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  playerStartHp?: number | null;
  playerEndHp?: number | null;
  outcome?: "victory" | "defeat";
  maxRefHp?: number; // para cálculo visual si difiere
  autoDefeatNoWeapon?: boolean;
  deathPenalty?: {
    goldLost?: number;
    fatigueAppliedMinutes?: number;
    fatigueMagnitude?: number;
    percentApplied?: number;
  };
}) {
  const header = `**Combate (${outcomeLabel(c.outcome)})**`;
  const lines = [
    `• Mobs: ${c.mobs} | Derrotados: ${c.mobsDefeated}/${c.mobs}`,
    `• Daño hecho: ${c.totalDamageDealt} | Daño recibido: ${c.totalDamageTaken}`,
  ];
  if (c.autoDefeatNoWeapon) {
    lines.push(
      `• Derrota automática: no tenías arma equipada o válida (daño 0). Equipa un arma para poder atacar.`
    );
  }
  if (c.deathPenalty) {
    const parts: string[] = [];
    if (
      typeof c.deathPenalty.goldLost === "number" &&
      c.deathPenalty.goldLost > 0
    )
      parts.push(`-${c.deathPenalty.goldLost} monedas`);
    if (c.deathPenalty.fatigueAppliedMinutes) {
      const pct = c.deathPenalty.fatigueMagnitude
        ? Math.round(c.deathPenalty.fatigueMagnitude * 100)
        : 15;
      parts.push(`Fatiga ${pct}% ${c.deathPenalty.fatigueAppliedMinutes}m`);
    }
    if (typeof c.deathPenalty.percentApplied === "number") {
      parts.push(`(${Math.round(c.deathPenalty.percentApplied * 100)}% oro)`);
    }
    if (parts.length) lines.push(`• Penalización: ${parts.join(" | ")}`);
  }
  if (c.playerStartHp != null && c.playerEndHp != null) {
    const maxHp = c.maxRefHp || Math.max(c.playerStartHp, c.playerEndHp);
    lines.push(
      `• HP: ${c.playerStartHp} → ${c.playerEndHp}  ${heartsBar(
        c.playerEndHp,
        maxHp
      )}`
    );
  }
  return `${header}\n${lines.join("\n")}`;
}
