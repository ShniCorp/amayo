import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { MusicHistoryService } from "../../../core/services/MusicHistoryService";
import { RecommendationEngine } from "../../../core/services/RecommendationEngine";
import { queues } from "./play";

// Track autoplay status per guild
const autoplayEnabled = new Map<string, boolean>();

export const command: CommandMessage = {
  name: "autoplay",
  type: "message",
  aliases: ["ap", "auto"],
  cooldown: 3,
  description:
    "Activa/desactiva el autoplay inteligente que aprende de tus gustos",
  category: "Música",
  usage: "autoplay [on|off]",
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;

    // Toggle or set autoplay
    if (!args.length) {
      const current = autoplayEnabled.get(guildId) || false;
      autoplayEnabled.set(guildId, !current);

      if (!current) {
        await message.reply(
          "✅ **Autoplay activado!**\n" +
            "🎵 El bot agregará canciones automáticamente basadas en tu historial de escucha.\n" +
            "💡 Mientras más escuches, mejores serán las recomendaciones."
        );
      } else {
        await message.reply("❌ **Autoplay desactivado.**");
      }
      return;
    }

    const action = args[0].toLowerCase();

    if (action === "on" || action === "enable" || action === "activar") {
      autoplayEnabled.set(guildId, true);
      await message.reply(
        "✅ **Autoplay activado!**\n" +
          "🎵 Recomendaciones personalizadas basadas en tu historial."
      );
    } else if (
      action === "off" ||
      action === "disable" ||
      action === "desactivar"
    ) {
      autoplayEnabled.set(guildId, false);
      await message.reply("❌ **Autoplay desactivado.**");
    } else {
      await message.reply("❌ Uso: `!autoplay [on|off]`");
    }
  },
};

/**
 * Function to add autoplay suggestion to queue
 * Called from playNextTrack when queue is empty
 */
export async function addAutoplaySuggestion(
  guildId: string,
  userId: string,
  lastTrack: { title: string; author: string; encoded: string },
  client: Amayo
): Promise<boolean> {
  // Check if autoplay is enabled for this guild
  if (!autoplayEnabled.get(guildId)) {
    return false;
  }

  try {
    const isNew = await RecommendationEngine.isNewUser(userId);
    const recommendation = await RecommendationEngine.getAutoplaySuggestion(
      userId,
      { title: lastTrack.title, author: lastTrack.author },
      isNew
    );

    // Search for the recommended song
    const node = [...client.music.nodes.values()][0];
    if (!node) {
      return false;
    }

    const searchQuery = `ytsearch:${recommendation.query}`;
    const result: any = await node.rest.resolve(searchQuery);

    if (!result || result.loadType === "empty" || result.loadType === "error") {
      return false;
    }

    let tracks: any[] = [];

    if (result.loadType === "track") {
      tracks = [result.data];
    } else if (result.loadType === "search" || result.loadType === "playlist") {
      tracks = result.data.tracks || result.data || [];
    }

    if (!tracks.length) {
      return false;
    }

    // Add to queue
    const queue = queues.get(guildId);
    if (queue) {
      // Add first suggestion
      queue.push(tracks[0]);

      // Optionally add 2-3 more for continuous playback
      const additionalTracks = tracks.slice(1, 4);
      queue.push(...additionalTracks);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error in autoplay suggestion:", error);
    return false;
  }
}

// Export autoplay status check
export function isAutoplayEnabled(guildId: string): boolean {
  return autoplayEnabled.get(guildId) || false;
}

// Export toggle function
export function toggleAutoplay(guildId: string): boolean {
  const current = autoplayEnabled.get(guildId) || false;
  autoplayEnabled.set(guildId, !current);
  return !current;
}

// Export the Map itself for button access
export { autoplayEnabled };
