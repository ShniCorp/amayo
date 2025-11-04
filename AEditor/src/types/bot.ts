// Tipos que mapean la estructura del bot de Discord

export interface CommandMessage {
  name: string;
  type: "message";
  aliases?: string[];
  cooldown?: number;
  description?: string;
  category?: string;
  usage?: string;
  run: string; // Código de la función run como string
}

export interface CommandSlash {
  name: string;
  description: string;
  type: "slash";
  options?: any[];
  cooldown?: number;
  run: string; // Código de la función run como string
}

export type Command = CommandMessage | CommandSlash;

export interface Event {
  name: string;
  type: "standard" | "extra";
  eventName?: string; // Para eventos estándar (ready, messageCreate, etc.)
  path: string;
  code: string;
}

export interface ProjectStats {
  messageCommands: number;
  slashCommands: number;
  standardEvents: number;
  customEvents: number;
  totalCommands: number;
  totalEvents: number;
}

export interface FileInfo {
  name: string;
  path: string;
  relative_path: string;
  type: "command" | "event";
  commandType?: "message" | "slash";
  eventType?: "standard" | "extra";
  folder?: string;
}
