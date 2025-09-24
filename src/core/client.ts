// @ts-ignore
import { Client, GatewayIntentBits, Options, Partials } from 'discord.js';
// 1. Importa PrismaClient (singleton)
// @ts-ignore
import { prisma, ensurePrismaConnection } from './prisma';

process.loadEnvFile();

class Amayo extends Client {
    public key: string;
    // 2. Propiedad prisma apuntando al singleton
    public prisma = prisma;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
                // Eliminado GuildMessageTyping para reducir tráfico/memoria si no se usa
            ],
            partials: [Partials.Channel, Partials.Message], // Permite recibir eventos sin cachear todo
            makeCache: Options.cacheWithLimits({
                // Limitar el tamaño de los managers más pesados
                MessageManager: parseInt(process.env.CACHE_MESSAGES_LIMIT || '50', 10),
                GuildMemberManager: parseInt(process.env.CACHE_MEMBERS_LIMIT || '100', 10),
                ThreadManager: 10,
                ReactionManager: 0,
                GuildInviteManager: 0,
                StageInstanceManager: 0,
                PresenceManager: 0
            }),
            sweepers: {
                messages: {
                    // Cada 5 min barrer mensajes más antiguos que 15 min (ajustable por env)
                    interval: parseInt(process.env.SWEEP_MESSAGES_INTERVAL_SECONDS || '300', 10),
                    lifetime: parseInt(process.env.SWEEP_MESSAGES_LIFETIME_SECONDS || '900', 10)
                },
                users: {
                    interval: 60 * 30, // cada 30 minutos
                    filter: () => (user) => user.bot && user.id !== this.user?.id
                }
            },
            rest: {
                retries: 5 // bajar un poco para evitar colas largas en memoria
            }
        });

        this.key = process.env.TOKEN ?? '';
    }

    async play () {
        if(!this.key) {
            console.error('No key provided');
            throw new Error('Missing DISCORD TOKEN');
        } else {
            try {
                await ensurePrismaConnection();
                console.log('Successfully connected to the database (singleton).');
                await this.login(this.key);
            } catch (error) {
                console.error('Failed to connect to DB or login to Discord:', error);
                throw error; // Propaga para que withRetry en main.ts reintente
            }
        }
    }
}

export default Amayo;