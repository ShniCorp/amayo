// @ts-ignore
import { Client, GatewayIntentBits } from 'discord.js';
// 1. Importa PrismaClient
// @ts-ignore
import { PrismaClient } from '@prisma/client';

process.loadEnvFile();

class Amayo extends Client {
    public key: string;
    // 2. Declara la propiedad prisma
    public prisma: PrismaClient;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageTyping
            ],
            rest: {
                retries: 10
            }
        });

        this.key = process.env.TOKEN ?? '';
        // 3. Instancia PrismaClient en el constructor
        this.prisma = new PrismaClient();
    }

    async play () {
        if(!this.key) {
            console.error('No key provided');
            throw new Error('Missing DISCORD TOKEN');
        } else {
            // Ejemplo de cómo usarías prisma antes de iniciar sesión
            try {
                await this.prisma.$connect();
                console.log('Successfully connected to the database.');
                await this.login(this.key);
            } catch (error) {
                console.error('Failed to connect to DB or login to Discord:', error);
                throw error; // Propaga para que withRetry en main.ts reintente
            }
        }
    }
}

export default Amayo;