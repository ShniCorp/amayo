import { registry } from "./registry";
import { userVariables } from "./definitions/user";
import { guildVariables } from "./definitions/guild";
import { inviteVariables } from "./definitions/invite";
import { inviterVariables } from "./definitions/inviter";

// Registrar variables por defecto
registry.registerMany(userVariables);
registry.registerMany(guildVariables);
registry.registerMany(inviteVariables);
registry.registerMany(inviterVariables);

// Exportar todo
export * from "./types";
export * from "./registry";
export { registry };
