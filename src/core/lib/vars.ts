import { Guild, Invite, User, GuildMember } from "discord.js";
import { registry, VarCtx } from "./variables";

// Re-exportar tipos para compatibilidad
export { VarCtx };

/**
 * Lista de variables válidas del sistema (derivada del registro)
 * Exportada por compatibilidad y para UI.
 */
// @ts-ignore
export const VALID_VARIABLES: string[] = Object.freeze(registry.list());

/** Devuelve la lista actual de variables (no congelada) */
export function listVariables(): string[] {
    return registry.list();
}

/**
 * Validar si un texto es una URL válida o contiene variables del sistema
 * Mantiene la semántica previa: true si contiene cualquier token válido o si es http/https válido.
 */
export function isValidUrlOrVariable(text: string): boolean {
    if (!text) return false;

    // ¿Contiene alguna variable?
    if (registry.list().some(v => text.includes(v))) return true;

    // ¿Es URL http/https válida?
    try {
        const u = new URL(text);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Reemplaza variables en un texto usando el registro de VARIABLES.
 * Compatible con llamadas existentes: acepta User o GuildMember en el primer parámetro (históricamente llamado "user").
 */
export async function replaceVars(
    text: string,
    userOrMember: User | GuildMember | undefined,
    guild: Guild | undefined,
    stats?: any,
    invite?: Invite
): Promise<string> {
    const ctx: VarCtx = { user: userOrMember, guild, stats, invite };
    return registry.replace(text, ctx);
}