import { VarCtx, VarResolver, VariableDefinition } from "./types";

/**
 * Registro central de variables.
 * Permite registrar, listar y resolver variables de forma modular.
 */
export class VariableRegistry {
    private variables: Map<string, VarResolver> = new Map();

    /**
     * Registra una nueva variable.
     * @param name Nombre de la variable (ej: 'user.name')
     * @param resolver Función que resuelve el valor
     */
    register(name: string, resolver: VarResolver): void {
        this.variables.set(name, resolver);
    }

    /**
     * Registra múltiples variables a la vez.
     * @param definitions Objeto con pares nombre -> resolver
     */
    registerMany(definitions: Record<string, VarResolver>): void {
        for (const [name, resolver] of Object.entries(definitions)) {
            this.register(name, resolver);
        }
    }

    /**
     * Obtiene el resolver de una variable.
     */
    get(name: string): VarResolver | undefined {
        return this.variables.get(name);
    }

    /**
     * Lista todas las variables registradas.
     */
    list(): string[] {
        return Array.from(this.variables.keys());
    }

    /**
     * Resuelve todas las variables en un texto.
     */
    async replace(text: string, ctx: VarCtx): Promise<string> {
        if (!text) return '';

        const keys = this.list();
        if (keys.length === 0) return text;

        // Escapar caracteres especiales para RegExp
        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Ordenar por longitud descendente para evitar falsas coincidencias de prefijos
        const keysEscaped = keys.sort((a, b) => b.length - a.length).map(escapeRegex);
        const pattern = new RegExp(`(${keysEscaped.join('|')})`, 'g');

        const parts: (string | Promise<string>)[] = [];
        let lastIndex = 0;
        let m: RegExpExecArray | null;

        while ((m = pattern.exec(text)) !== null) {
            const matchStart = m.index;
            if (matchStart > lastIndex) parts.push(text.slice(lastIndex, matchStart));

            const token = m[1];
            const resolver = this.variables.get(token);

            if (resolver) {
                try {
                    const value = resolver(ctx);
                    parts.push(Promise.resolve(value).then(v => (v ?? '').toString()));
                } catch {
                    parts.push('');
                }
            } else {
                parts.push(token);
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) parts.push(text.slice(lastIndex));

        const resolved = await Promise.all(parts.map(p => Promise.resolve(p as any)));
        return resolved.join('');
    }
}

// Instancia singleton por defecto
export const registry = new VariableRegistry();
