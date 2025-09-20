import { Guild, Invite, User, GuildMember } from "discord.js";

/**
 * Registro central de variables -> resolutores
 * Cada clave es el token que aparecerá en el texto (sin llaves),
 * y su valor es una función que recibe el contexto y devuelve el string a insertar.
 */
type VarCtx = {
    user?: User | GuildMember;
    guild?: Guild;
    stats?: any;
    invite?: Invite;
};

type VarResolver = (ctx: VarCtx) => string | Promise<string>;

// Helpers seguros para leer datos de usuario/miembro y guild/invite
const getUserId = (u?: User | GuildMember) => (u as any)?.id || (u as any)?.user?.id || "";
const getUsername = (u?: User | GuildMember) => (u as any)?.username || (u as any)?.user?.username || "";
const getAvatar = (u?: User | GuildMember) => {
    try {
        const fn = (u as any)?.displayAvatarURL || (u as any)?.user?.displayAvatarURL;
        return typeof fn === 'function' ? fn.call((u as any)?.user ?? u, { forceStatic: false }) : "";
    } catch { return ""; }
};
const getGuildIcon = (g?: Guild) => {
    try { return g?.iconURL({ forceStatic: false }) ?? ""; } catch { return ""; }
};

// Construye datos de invite similares a la versión previa
const getInviteObject = (invite?: Invite) => invite?.guild ? {
    name: invite.guild.name,
    icon: invite.guild.icon ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.webp?size=256` : ''
} : null;

export const VARIABLES: Record<string, VarResolver> = {
    // USER INFO
    'user.name': ({ user }) => getUsername(user),
    'user.id': ({ user }) => getUserId(user),
    'user.mention': ({ user }) => {
        const id = getUserId(user);
        return id ? `<@${id}>` : '';
    },
    'user.avatar': ({ user }) => getAvatar(user),

    // USER STATS
    'user.pointsAll': ({ stats }) => stats?.totalPoints?.toString?.() ?? '0',
    'user.pointsWeekly': ({ stats }) => stats?.weeklyPoints?.toString?.() ?? '0',
    'user.pointsMonthly': ({ stats }) => stats?.monthlyPoints?.toString?.() ?? '0',

    // GUILD INFO
    'guild.name': ({ guild }) => guild?.name ?? '',
    'guild.icon': ({ guild }) => getGuildIcon(guild),

    // INVITE INFO
    'invite.name': ({ invite }) => getInviteObject(invite)?.name ?? '',
    'invite.icon': ({ invite }) => getInviteObject(invite)?.icon ?? ''
};

/**
 * Lista de variables válidas del sistema (derivada del registro)
 * Exportada por compatibilidad y para UI.
 */
// @ts-ignore
 export const VALID_VARIABLES: string[] = Object.freeze(Object.keys(VARIABLES));

/** Devuelve la lista actual de variables (no congelada) */
export function listVariables(): string[] {
    return Object.keys(VARIABLES);
}

/** Escapa una cadena para uso literal dentro de una RegExp */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validar si un texto es una URL válida o contiene variables del sistema
 * Mantiene la semántica previa: true si contiene cualquier token válido o si es http/https válido.
 */
export function isValidUrlOrVariable(text: string): boolean {
    if (!text) return false;

    // ¿Contiene alguna variable?
    if (VALID_VARIABLES.some(v => text.includes(v))) return true;

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
    if (!text) return '';

    const ctx: VarCtx = { user: userOrMember, guild, stats, invite };

    // Construimos una única RegExp que contenga todas las claves (sin anchors, para coincidir en cualquier parte)
    const keys = Object.keys(VARIABLES);
    if (keys.length === 0) return text;
    // Ordenar por longitud descendente para evitar falsas coincidencias de prefijos (defensivo)
    const keysEscaped = keys.sort((a, b) => b.length - a.length).map(escapeRegex);
    const pattern = new RegExp(`(${keysEscaped.join('|')})`, 'g');

    // Reemplazo asíncrono
    const parts: (string | Promise<string>)[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
        const matchStart = m.index;
        if (matchStart > lastIndex) parts.push(text.slice(lastIndex, matchStart));
        const token = m[1];
        const resolver = VARIABLES[token];
        if (resolver) {
            try {
                const value = resolver(ctx);
                parts.push(Promise.resolve(value).then(v => (v ?? '').toString()));
            } catch {
                parts.push('');
            }
        } else {
            // No debería ocurrir, pero añadimos el literal por seguridad
            parts.push(token);
        }
        lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));

    // Resolver todas las partes (las literales quedan tal cual)
    const resolved = await Promise.all(parts.map(p => Promise.resolve(p as any)));
    return resolved.join('');
}