import {bot} from "../main";
import {Events} from "discord.js";

bot.on(Events.ClientReady, () => {
    console.log("Ready!");
})