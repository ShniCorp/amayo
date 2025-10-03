import {bot} from "../main";
import {ActivityType, Events} from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, () => {
    logger.info("Ready!");

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
            name: '<a:SparklyRose:1321195729259073668> Rolear con la IA "!ai hola"',
        },
        {
            type: ActivityType.Watching,
            name: `!help | ${bot.guilds.cache.size} servidores`
        },
        {
            name: "",
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
        logger.info(`Actividad cambiada a: ${activities[currentActivity].name || activities[currentActivity].state}`);
    }, 30000); // Cambiado a 30 segundos para reducir llamadas API

})