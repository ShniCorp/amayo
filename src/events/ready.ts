import {bot} from "../main";
import {ActivityType, Events} from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, () => {
    logger.info("Ready!");

    // ============================================
    // 🛡️ HANDLER GLOBAL PARA ERRORES DE DISCORD.JS
    // ============================================

    process.on('uncaughtException', (error: Error) => {
        // Interceptar errores específicos de Discord.js GuildMemberManager
        if (error.message?.includes("Cannot read properties of undefined (reading 'id')") &&
            error.stack?.includes('GuildMemberManager._add')) {

            logger.warn('🔧 Discord.js bug interceptado: GuildMemberManager error con UserSelect en modal');
            // NO terminar el proceso, solo logear el error
            return;
        }

        // Para otros errores críticos, mantener el comportamiento original
        // @ts-ignore
        logger.error('💥 UncaughtException crítico:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
        // Interceptar rechazos relacionados con el mismo bug
        if (reason &&
            typeof reason === 'object' &&
            reason !== null &&
            'message' in reason &&
            typeof (reason as any).message === 'string' &&
            (reason as any).message.includes("Cannot read properties of undefined (reading 'id')")) {

            logger.warn('🔧 Discord.js promise rejection interceptada: GuildMemberManager error');
            // NO terminar el proceso
            return;
        }

        // Para otras promesas rechazadas, logear pero continuar
        // @ts-ignore
        logger.error('🚨 UnhandledRejection:', reason as Error);
    });

    // ============================================
    // 🚀 OPCIÓN 1: ACTIVIDAD FIJA (RECOMENDADO PARA HEROKU 512MB)
    // ============================================
    // Una sola actividad, sin interval, sin uso adicional de recursos

    //bot.user?.setPresence({
    //    activities: [{
    //        type: ActivityType.Custom,
    //        name: 'custom',
    //        state: '✨ Activo y funcionando'
    //    }],
    //    status: 'online',
    //});

    // Otras opciones de actividad fija (descomenta la que prefieras):

    // 🎮 Jugando a...
    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Playing,
    //         name: `en ${bot.guilds.cache.size} servidores`
    //     }],
    //     status: 'online',
    // });

    // 👀 Viendo...
    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Watching,
    //         name: 'tus mensajes'
    //     }],
    //     status: 'online',
    // });

    logger.info(`Presencia configurada para ${bot.user?.tag}`);

    // ============================================
    // 🔄 OPCIÓN 2: ACTIVIDADES ROTATIVAS (Solo si tienes recursos)
    // ============================================
    // ⚠️ NOTA: El interval usa recursos MÍNIMOs (~1KB RAM)
    // pero si quieres máxima optimización, usa la OPCIÓN 1

    // DESCOMENTA ESTE BLOQUE SI QUIERES ROTACIÓN:

    const activities = [
        {
            type: ActivityType.Custom,
            name: 'custom',
            state: '💫 Tu cazadora de confiaza',
        },
        {
            type: ActivityType.Playing,
            name: 'Rolear con la IA "!ai hola"',
        },
        {
            type: ActivityType.Watching,
            name: `!help | ${bot.guilds.cache.size} servidores`
        },
        {
            name: "Streaming en YouTube",
            type: ActivityType.Streaming,
            url: "https://youtu.be/MRkOSkBbjSw?si=PuTkDgJn5eBMHnoN",
        }
    ];

    let currentActivity = 0;

    // Establecer la primera actividad
    bot.user?.setPresence({
        activities: [activities[currentActivity]],
        status: 'online',
    });

    // Rotar actividades cada 30 segundos (más tiempo = menos llamadas)
    setInterval(() => {
        currentActivity = (currentActivity + 1) % activities.length;
        bot.user?.setPresence({
            activities: [activities[currentActivity]],
            status: 'online',
        });
    }, 30000); // Cambiado a 30 segundos para reducir llamadas API

})