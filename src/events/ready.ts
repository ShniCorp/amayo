import {bot} from "../main";
import {Events} from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, () => {
    logger.info("Ready!");
})