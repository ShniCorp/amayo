import {bot} from "../main";
import {Events} from "discord.js";
import {redis} from "../core/database/redis";
import {commands} from "../core/loaders/loader";
import {alliance} from "./extras/alliace";


bot.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    await alliance(message);
    const server = await bot.prisma.guild.upsert({
        where: {
            id: message.guildId || undefined
        },
        create: {
            id: message!.guildId || message.guild!.id,
            name: message.guild!.name
        },
        update: {}
    })
    const PREFIX = server.prefix || "!"
    if (!message.content.startsWith(PREFIX)) return;

    const [cmdName, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = commands.get(cmdName);
    if (!command) return;

    const cooldown = Math.floor(Number(command.cooldown) || 0);

    if (cooldown > 0) {
        const key = `cooldown:${command.name}:${message.author.id}`;
        const ttl = await redis.ttl(key);
        console.log(`Key: ${key}, TTL: ${ttl}`);

        if (ttl > 0) {
            return message.reply(`⏳ Espera ${ttl}s antes de volver a usar **${command.name}**.`);
        }

        // SET con expiración correcta para redis v4+
        await redis.set(key, "1", { EX: cooldown });
    }


    try {
        await command.run(message, args, message.client);
    } catch (error) {
        console.error(error);
        await message.reply("❌ Hubo un error ejecutando el comando.");
    }
})