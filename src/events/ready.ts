import {bot} from "../main";
import {ActivityType, Events} from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, () => {
    logger.info("Ready!");

    // 🔄 ACTIVIDADES ROTATIVAS - Cambia cada 15 segundos
    const activities = [
        {
            type: ActivityType.Custom,
            name: 'custom',
            state: '✨ Activo y funcionando'
        },
        {
            type: ActivityType.Playing,
            name: '🎮 con los comandos'
        },
        {
            type: ActivityType.Watching,
            name: `${bot.guilds.cache.size} servidores`
        },
        {
            type: ActivityType.Listening,
            name: 'tus mensajes'
        }
    ];

    let currentActivity = 0;

    // Establecer la primera actividad
    bot.user?.setPresence({
        activities: [activities[currentActivity]],
        status: 'online',
    });

    // Rotar actividades cada 15 segundos
    setInterval(() => {
        currentActivity = (currentActivity + 1) % activities.length;
        bot.user?.setPresence({
            activities: [activities[currentActivity]],
            status: 'online',
        });
        logger.info(`Actividad cambiada a: ${activities[currentActivity].name || activities[currentActivity].state}`);
    }, 15000); // Cambia cada 15 segundos

    // ============================================
    // 📌 ALTERNATIVA: Una sola actividad fija
    // ============================================
    // Si prefieres una sola actividad sin rotación, descomenta una de estas:

    // ✨ ESTADO PERSONALIZADO (como usuarios normales)
    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Custom,
    //         name: 'custom',
    //         state: '✨ Activo y funcionando'
    //     }],
    //     status: 'online',
    // });

    // 🎮 JUGANDO A...
    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Playing,
    //         name: '🎮 Moderando servidores'
    //     }],
    //     status: 'online',
    // });

    // 👀 VIENDO...
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'tus mensajes 👀',
    //         type: ActivityType.Watching,
    //     }],
    //     status: 'online',
    // });

    // 🎵 ESCUCHANDO...
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'Spotify',
    //         type: ActivityType.Listening
    //     }],
    //     status: 'online',
    // });

    // 🏆 COMPITIENDO EN...
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'Ranked',
    //         type: ActivityType.Competing
    //     }],
    //     status: 'dnd',
    // });

    // 📺 STREAMING (requiere URL válida de Twitch/YouTube)
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'Mi Stream',
    //         type: ActivityType.Streaming,
    //         url: 'https://twitch.tv/tu-canal'
    //     }],
    //     status: 'online',
    // });

    logger.info(`Presencia configurada para ${bot.user?.tag}`);
})