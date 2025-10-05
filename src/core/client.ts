import { Client, GatewayIntentBits, Options, Partials } from 'discord.js';
import { prisma, ensurePrismaConnection } from './database/prisma';
import logger from './lib/logger';

class Amayo extends Client {
    public key: string;
    public prisma = prisma;
    public mode: string;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel, Partials.Message],
            makeCache: Options.cacheWithLimits({
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
                    interval: parseInt(process.env.SWEEP_MESSAGES_INTERVAL_SECONDS || '300', 10),
                    lifetime: parseInt(process.env.SWEEP_MESSAGES_LIFETIME_SECONDS || '900', 10)
                },
                users: {
                    interval: 60 * 30,
                    filter: () => (user) => user.bot && user.id !== this.user?.id
                }
            },
            rest: {
                retries: 5
            }
        });

        this.key = process.env.TOKEN ?? '';
        this.mode = process.env.MODE ?? 'Normal';
    }

    async play() {
        if (!this.key) {
            logger.error('No key provided');
            throw new Error('Missing DISCORD TOKEN');
        } else {
            try {
                await ensurePrismaConnection();
                logger.info('Successfully connected to the database (singleton).');
                await this.login(this.key);
            } catch (error) {
                logger.error({ err: error }, 'Failed to connect to DB or login to Discord');
                throw error;
            }
        }
    }
}

export default Amayo;