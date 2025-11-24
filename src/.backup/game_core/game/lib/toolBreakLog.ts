// Logger en memoria de rupturas de herramientas.
// Reemplazable en el futuro por una tabla ToolBreakLog.

export interface ToolBreakEvent {
  ts: number;
  userId: string;
  guildId: string;
  toolKey: string;
  brokenInstance: boolean; // true si fue una instancia, false si se agotó totalmente (última)
  instancesRemaining: number;
}

const MAX_EVENTS = 200;
const buffer: ToolBreakEvent[] = [];

export function logToolBreak(ev: ToolBreakEvent) {
  buffer.unshift(ev);
  if (buffer.length > MAX_EVENTS) buffer.pop();
}

export function getToolBreaks(
  limit = 20,
  guildFilter?: string,
  userFilter?: string
) {
  return buffer
    .filter(
      (e) =>
        (!guildFilter || e.guildId === guildFilter) &&
        (!userFilter || e.userId === userFilter)
    )
    .slice(0, limit);
}
