import {bot} from "../main";
import {ActivityType, Events} from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, () => {
    logger.info("Ready!");

    // ✨ ESTADO PERSONALIZADO (como usuarios normales) - RECOMENDADO
    bot.user?.setPresence({
        activities: [{
            type: ActivityType.Custom,
            name: 'custom', // Este campo es requerido pero no se muestra
            state: '✨ Activo y funcionando' // Este es el texto que se ve como estado
        }],
        status: 'online', // online, idle, dnd, invisible
    });

    // Otras opciones que puedes usar:

    // Opción 1: Configuración simple con setActivity
    // bot.user?.setActivity('con los comandos', { type: ActivityType.Playing });

    // Opción 2: Ver mensajes (Watching)
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'tus mensajes 👀',
    //         type: ActivityType.Watching,
    //     }],
    //     status: 'online',
    // });

    // Para mostrar "Jugando a..."
    // bot.user?.setPresence({
    //     activities: [{ name: 'Minecraft', type: ActivityType.Playing }],
    //     status: 'online',
    // });

    // Para mostrar "Escuchando..."
    // bot.user?.setPresence({
    //     activities: [{ name: 'Spotify', type: ActivityType.Listening }],
    //     status: 'online',
    // });

    // Para mostrar "Compitiendo en..."
    // bot.user?.setPresence({
    //     activities: [{ name: 'Ranked', type: ActivityType.Competing }],
    //     status: 'dnd',
    // });

    // Para streaming (requiere una URL válida de Twitch/YouTube)
    // bot.user?.setPresence({
    //     activities: [{
    //         name: 'Mi Stream',
    //         type: ActivityType.Streaming,
    //         url: 'https://twitch.tv/tu-canal'
    //     }],
    //     status: 'online',
    // });

    // Más ejemplos de estados personalizados con emojis:
    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Custom,
    //         name: 'custom',
    //         state: '🚀 Listo para ayudar'
    //     }],
    //     status: 'online',
    // });

    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Custom,
    //         name: 'custom',
    //         state: '💻 Desarrollando features'
    //     }],
    //     status: 'dnd',
    // });

    // bot.user?.setPresence({
    //     activities: [{
    //         type: ActivityType.Custom,
    //         name: 'custom',
    //         state: '🎮 Moderando servidores'
    //     }],
    //     status: 'idle',
    // });

    logger.info(`Presencia configurada para ${bot.user?.tag}`);
})