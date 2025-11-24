import logger from "../logger";

// Regex para detectar URLs válidas
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

// Dominios de Discord válidos para invitaciones
const DISCORD_DOMAINS = [
    "discord.gg",
    "discord.com/invite",
    "discordapp.com/invite",
];

/**
 * Extrae enlaces válidos de un texto.
 */
export function extractValidLinks(content: string): string[] {
    const matches = content.match(URL_REGEX);
    return matches || [];
}

/**
 * Valida y filtra enlaces de Discord.
 */
export function validateDiscordLinks(links: string[]): string[] {
    const results: string[] = [];
    for (const link of links) {
        try {
            const code = extractInviteCode(link);
            if (code) {
                results.push(link);
                continue;
            }
            // Fallback: comprobar dominios conocidos
            if (DISCORD_DOMAINS.some((d) => link.includes(d))) {
                results.push(link);
            }
        } catch {
            // ignorar enlaces que causen excepciones
        }
    }
    return results;
}

/**
 * Extrae el código de invitación de un enlace, manejando query params.
 */
export function extractInviteCode(link: string): string | null {
    try {
        // Intentar parsear como URL completa primero para manejar query params limpiamente
        const urlObj = new URL(link);

        // Caso 1: discord.gg/CODE
        if (urlObj.hostname === 'discord.gg') {
            const path = urlObj.pathname.slice(1); // quitar '/' inicial
            return path.split('/')[0]; // tomar solo la primera parte si hay más
        }

        // Caso 2: discord.com/invite/CODE o discordapp.com/invite/CODE
        if (urlObj.hostname.includes('discord.com') || urlObj.hostname.includes('discordapp.com')) {
            if (urlObj.pathname.startsWith('/invite/')) {
                const parts = urlObj.pathname.split('/');
                // parts[0] is empty, parts[1] is 'invite', parts[2] is CODE
                return parts[2] || null;
            }
        }
    } catch (e) {
        // Si falla URL parsing, intentar regex fallback (para enlaces parciales o mal formados que igual funcionen)
    }

    // Fallback Regex
    const patterns = [
        /discord\.gg\/([a-zA-Z0-9-]+)/,
        /discord\.com\/invite\/([a-zA-Z0-9-]+)/,
        /discordapp\.com\/invite\/([a-zA-Z0-9-]+)/,
    ];

    for (const pattern of patterns) {
        const match = link.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Valida una invitación con la API de Discord.
 */
export async function validateDiscordInvite(link: string): Promise<any> {
    try {
        const inviteCode = extractInviteCode(link);
        if (!inviteCode) return null;

        const response = await fetch(
            `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`,
            {
                method: "GET",
                headers: {
                    "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
                },
            }
        );

        if (response.status === 200) {
            const inviteData = await response.json();
            if (inviteData.guild && inviteData.guild.id) {
                return inviteData;
            }
        }

        return null;
    } catch (error) {
        logger.error({ err: error }, "Error validando invitación de Discord");
        return null;
    }
}

/**
 * Helper: URLs http/https únicamente
 */
export function isHttpUrl(url: unknown): url is string {
    if (typeof url !== "string" || !url) return false;
    try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Helper: permitir http/https y attachment:// para medios
 */
export function isMediaUrl(url: unknown): boolean {
    if (typeof url !== "string" || !url) return false;
    if (isHttpUrl(url)) return true;
    const s = url as string;
    return s.startsWith("attachment://");
}
