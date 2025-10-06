
import Amayo from "./core/client";
import { loadCommands } from "./core/loaders/loader";
import { loadEvents } from "./core/loaders/loaderEvents";
import { redis, redisConnect } from "./core/database/redis";
import { registeringCommands } from "./core/api/discordAPI";
import {loadComponents} from "./core/lib/components";
import { startMemoryMonitor } from "./core/memory/memoryMonitor";
import {memoryOptimizer} from "./core/memory/memoryOptimizer";
import { startReminderPoller } from "./core/api/reminders";
import { ensureRemindersSchema } from "./core/api/remindersSchema";
import logger from "./core/lib/logger";
import { applyModalSubmitInteractionPatch } from "./core/patches/discordModalPatch";
import { server } from "./server/server";
import 'newrelic';

// Activar monitor de memoria si se define la variable
const __memInt = parseInt(process.env.MEMORY_LOG_INTERVAL_SECONDS || '0', 10);
if (__memInt > 0) {
    startMemoryMonitor({ intervalSeconds: __memInt });
}

// Activar optimizador de memoria adicional
if (process.env.ENABLE_MEMORY_OPTIMIZER === 'true') {
    memoryOptimizer.start();
}

// Apply safety patch for ModalSubmitInteraction members resolution before anything else
try {
    applyModalSubmitInteractionPatch();
} catch (e) {
    logger.warn({ err: e }, 'No se pudo aplicar el patch de ModalSubmitInteraction');
}

export const bot = new Amayo();

// Listeners de robustez del cliente Discord
bot.on('error', (e) => logger.error({ err: e }, '🐞 Discord client error'));
bot.on('warn', (m) => logger.warn('⚠️ Discord warn: %s', m));

// Evitar reintentos de re-login simultáneos
let relogging = false;
// Cuando la sesión es invalidada, intentamos reconectar/login
bot.on('invalidated', () => {
    if (relogging) return;
    relogging = true;
    logger.error('🔄 Sesión de Discord invalidada. Reintentando login...');
    withRetry('Re-login tras invalidated', () => bot.play(), { minDelayMs: 2000, maxDelayMs: 60_000 })
        .catch(() => {
            logger.error('No se pudo reloguear tras invalidated, se seguirá intentando en el bucle general.');
        })
        .finally(() => { relogging = false; });
});

// Utilidad: reintentos con backoff exponencial + jitter
async function withRetry<T>(name: string, fn: () => Promise<T>, opts?: {
    retries?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
    jitter?: boolean;
    isRetryable?: (err: unknown, attempt: number) => boolean;
}): Promise<T> {
    const {
        retries = Infinity,
        minDelayMs = 1000,
        maxDelayMs = 30_000,
        factor = 1.8,
        jitter = true,
        isRetryable = () => true,
    } = opts ?? {};

    let attempt = 0;
    let delay = minDelayMs;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        } catch (err) {
            attempt++;
            const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            logger.error(`❌ ${name} falló (intento ${attempt}) => %s`, errMsg);

            if (!isRetryable(err, attempt)) {
                logger.error(`⛔ ${name}: error no recuperable, deteniendo reintentos.`);
                throw err;
            }

            if (attempt >= retries) throw err;

            // calcular backoff
            let wait = delay;
            if (jitter) {
                const rand = Math.random() + 0.5; // 0.5x a 1.5x
                wait = Math.min(maxDelayMs, Math.floor(delay * rand));
            } else {
                wait = Math.min(maxDelayMs, delay);
            }
            logger.warn(`⏳ Reintentando ${name} en ${wait}ms...`);
            await new Promise((r) => setTimeout(r, wait));
            delay = Math.min(maxDelayMs, Math.floor(delay * factor));
        }
    }
}

// Handlers globales para robustez
process.on('unhandledRejection', (reason: any, p) => {
    logger.error({ promise: p, reason }, '🚨 UnhandledRejection en Promise');
});

process.on('uncaughtException', (err) => {
    logger.error({ err }, '🚨 UncaughtException');
    // No salimos; dejamos que el bot continúe vivo
});

process.on('multipleResolves', (type, promise, reason: any) => {
    // Ignorar resoluciones sin razón (ruido)
    if (type === 'resolve' && (reason === undefined || reason === null)) {
        return;
    }
    const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    const stack = (reason && (reason as any).stack) ? String((reason as any).stack) : '';
    const isAbortErr = (reason && ((reason as any).code === 'ABORT_ERR' || /AbortError|operation was aborted/i.test(msg)));
    const isDiscordWs = /@discordjs\/ws|WebSocketShard/.test(stack);
    if (isAbortErr && isDiscordWs) {
        // Ruido benigno de reconexiones del WS de Discord: ignorar
        return;
    }
    logger.warn('⚠️ multipleResolves: %s %s', type, msg);
});

let shuttingDown = false;
async function gracefulShutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('🛑 Apagado controlado iniciado...');
    try {
        // Detener optimizador de memoria
        memoryOptimizer.stop();

        // Cerrar Redis si procede
        try {
            if (redis?.isOpen) {
                await redis.quit();
                logger.info('🔌 Redis cerrado');
            }
        } catch (e) {
            logger.warn({ err: e }, 'No se pudo cerrar Redis limpiamente');
        }
        // Cerrar Prisma y Discord
        try {
            await bot.prisma.$disconnect();
        } catch {}
        try {
            await bot.destroy();
        } catch {}
    } finally {
        logger.info('✅ Apagado controlado completo');
    }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function bootstrap() {
    logger.info("🚀 Iniciando bot...");
   await server.listen(process.env.PORT || 3000, () => {
        logger.info(`📘 Amayo Docs disponible en http://localhost:${process.env.PORT || 3000}`);
    });
    // Cargar recursos locales (no deberían tirar el proceso si fallan)
    try { loadCommands(); } catch (e) { logger.error({ err: e }, 'Error cargando comandos'); }
    try { loadComponents(); } catch (e) { logger.error({ err: e }, 'Error cargando componentes'); }
    try { loadEvents(); } catch (e) { logger.error({ err: e }, 'Error cargando eventos'); }

    // Registrar comandos en segundo plano con reintentos; no bloquea el arranque del bot
    withRetry('Registrar slash commands', async () => {
        await registeringCommands();
    }).catch((e) => logger.error({ err: e }, 'Registro de comandos agotó reintentos'));

    // Conectar Redis con reintentos
    await withRetry('Conectar a Redis', async () => {
        await redisConnect();
    });

    // Login Discord + DB con reintentos (gestionado en Amayo.play -> conecta Prisma + login)
    await withRetry('Login de Discord', async () => {
        await bot.play();
    }, {
        isRetryable: (err) => {
            const msg = err instanceof Error ? `${err.message}` : String(err);
            // Si falta el TOKEN o token inválido, no tiene sentido reintentar sin cambiar config
            return !/missing discord token|invalid token/i.test(msg);
        }
    });

    // Asegurar esquema de Appwrite para recordatorios (colección + atributos + índice)
    try { await ensureRemindersSchema(); } catch (e) { logger.warn({ err: e }, 'No se pudo asegurar el esquema de recordatorios'); }

    // Iniciar poller de recordatorios si Appwrite está configurado
    startReminderPoller(bot);

    logger.info("✅ Bot conectado a Discord");
}

// Bucle de arranque resiliente: si bootstrap completo falla, reintenta sin matar el proceso
(async function startLoop() {
    await withRetry('Arranque', bootstrap, {
        minDelayMs: 1000,
        maxDelayMs: 60_000,
        isRetryable: (err) => {
            const msg = err instanceof Error ? `${err.message}` : String(err);
            // No reintentar en bucle si el problema es falta/invalid token
            return !/missing discord token|invalid token/i.test(msg);
        }
    });
})();
