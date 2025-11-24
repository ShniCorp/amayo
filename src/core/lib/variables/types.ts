import { Guild, Invite, User, GuildMember } from "discord.js";

/**
 * Contexto disponible para resolver una variable.
 */
export type VarCtx = {
    user?: User | GuildMember;
    guild?: Guild;
    stats?: any;
    invite?: Invite;
};

/**
 * Función que resuelve el valor de una variable dado un contexto.
 */
export type VarResolver = (ctx: VarCtx) => string | Promise<string>;

/**
 * Definición de una variable.
 */
export interface VariableDefinition {
    /** Nombre de la variable (sin llaves), ej: 'user.name' */
    name: string;
    /** Función que resuelve el valor */
    resolver: VarResolver;
    /** Descripción opcional para documentación/UI */
    description?: string;
}
