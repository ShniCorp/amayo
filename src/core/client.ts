import {
  Client,
  GatewayIntentBits,
  Options,
  Partials,
  ClientOptions,
} from "discord.js";
import { Shoukaku, Connectors } from "shoukaku";
import { prisma, ensurePrismaConnection } from "./database/prisma";
import logger from "./lib/logger";

const DEFAULTS = {
  CACHE_MESSAGES_LIMIT: 50,
  CACHE_MEMBERS_LIMIT: 100,
  SWEEP_MESSAGES_INTERVAL_SECONDS: 300,
  SWEEP_MESSAGES_LIFETIME_SECONDS: 900,
  USERS_SWEEP_INTERVAL_SECONDS: 60 * 30,
  REST_RETRIES: 5,
} as const;

function intEnv(name: keyof typeof DEFAULTS, fallback?: number): number {
  const raw = process.env[name];
  const val = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(val) ? val : fallback ?? DEFAULTS[name];
}

class Amayo extends Client {
  public key: string;
  public prisma = prisma;
  public mode: string;
  public music!: Shoukaku;

  constructor() {
    // Build options here so `this` can be referenced in the users.sweep filter
    const options: ClientOptions = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [Partials.Channel, Partials.Message],
      makeCache: Options.cacheWithLimits({
        MessageManager: intEnv("CACHE_MESSAGES_LIMIT"),
        GuildMemberManager: intEnv("CACHE_MEMBERS_LIMIT"),
        ThreadManager: 10,
        ReactionManager: 0,
        GuildInviteManager: 0,
        StageInstanceManager: 0,
        PresenceManager: 0,
      }),
      sweepers: {
        messages: {
          interval: intEnv("SWEEP_MESSAGES_INTERVAL_SECONDS"),
          lifetime: intEnv("SWEEP_MESSAGES_LIFETIME_SECONDS"),
        },
        users: {
          interval: DEFAULTS.USERS_SWEEP_INTERVAL_SECONDS,
          filter: () => (user) => user.bot && user.id !== this.user?.id,
        },
      },
      rest: {
        retries: DEFAULTS.REST_RETRIES,
      },
    };

    super(options);

    this.key = process.env.TOKEN ?? "";
    this.mode = process.env.MODE ?? "Normal";

    // Inicializar Shoukaku para Lavalink v4
    this.music = new Shoukaku(
      new Connectors.DiscordJS(this),
      [
        {
          name: "Main",
          url: "192.168.0.150:2333",
          auth: "youshallnotpass",
        },
      ],
      {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 2,
        restTimeout: 10000,
      }
    );

    // Configurar eventos de Shoukaku
    this.music.on("ready", (name) => {
      logger.info(`Lavalink node "${name}" conectado y listo.`);
    });

    this.music.on("error", (name, error) => {
      logger.error({ err: error, node: name }, "Error en nodo Lavalink");
    });

    this.music.on("close", (name, code, reason) => {
      logger.warn({ node: name, code, reason }, "Nodo Lavalink desconectado");
    });

    this.music.on("disconnect", (name, count) => {
      logger.warn({ node: name, count }, "Nodo Lavalink desconectado");
    });
  }

  /**
   * Inicia la conexión a la base de datos y al gateway de Discord.
   * Lanza si falta la clave o si falla la conexión/login.
   */
  public async play(): Promise<void> {
    if (!this.key) {
      logger.error("No key provided");
      throw new Error("Missing DISCORD TOKEN");
    }

    try {
      await ensurePrismaConnection();
      logger.info("Successfully connected to the database (singleton).");
      await this.login(this.key);
      logger.info("Shoukaku music manager inicializado.");
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to connect to DB or login to Discord"
      );
      throw error;
    }
  }
}

export default Amayo;
