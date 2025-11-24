import { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { MusicHistoryService } from "../../../core/services/MusicHistoryService";
import { addAutoplaySuggestion } from "./autoplay";
import { sendComponentsV2Message } from "../../../core/api/discordAPI";
import { createNowPlayingMessage } from "../../../core/utils/musicMessages";
import { redis } from "../../../core/database/redis";

// Sistema de cola simple para cada guild (exportado para otros comandos)
export const queues = new Map<string, any[]>();

// Track if music is currently playing per guild
const nowPlaying = new Map<string, boolean>();

export const command: CommandMessage = {
  name: "play",
  type: "message",
  aliases: ["p", "tocar"],
  cooldown: 3,
  description: "Reproduce una canción desde YouTube o Spotify",
  category: "Música",
  usage: "play <canción o URL>",
  run: async (message, args, client: Amayo) => {
    if (!message.member?.voice.channel) {
      await message.reply(
        "❌ Debes estar en un canal de voz para usar este comando."
      );
      return;
    }

    if (!args.length) {
      await message.reply(
        `❌ Debes proporcionar una canción o URL.\nUso: \`!play <canción o URL>\``
      );
      return;
    }

    const query = args.join(" ");

    try {
      const node = [...client.music.nodes.values()][0];
      if (!node) {
        await message.reply("❌ No hay ningún nodo de música disponible.");
        return;
      }

      let player = client.music.players.get(message.guild!.id);

      if (!player) {
        player = client.music.options.structures?.player
          ? new client.music.options.structures.player(message.guild!.id, {
              guildId: message.guild!.id,
              channelId: message.member.voice.channel.id,
              shardId: message.guild!.shardId,
              deaf: true,
            })
          : await client.music.joinVoiceChannel({
              guildId: message.guild!.id,
              channelId: message.member.voice.channel.id,
              shardId: message.guild!.shardId,
              deaf: true,
            });

        player.on("end", async (data) => {
          if (data.reason === "finished") {
            await playNextTrack(
              player!,
              message.channel.id,
              message.guild!.id,
              client,
              message.author.id
            );
          }
        });

        player.on("closed", () => {
          queues.delete(message.guild!.id);
          nowPlaying.delete(message.guild!.id);
        });
      }

      const searchQuery = query.startsWith("http")
        ? query
        : `ytsearch:${query}`;
      const result: any = await node.rest.resolve(searchQuery);

      if (
        !result ||
        result.loadType === "empty" ||
        result.loadType === "error"
      ) {
        await message.reply("❌ No se encontraron resultados.");
        return;
      }

      let queue = queues.get(message.guild!.id);
      if (!queue) {
        queue = [];
        queues.set(message.guild!.id, queue);
      }

      const isPlaying = nowPlaying.get(message.guild!.id) || false;

      let tracks: any[] = [];

      if (result.loadType === "track") {
        tracks = [result.data];
      } else if (
        result.loadType === "search" ||
        result.loadType === "playlist"
      ) {
        tracks = result.data.tracks || result.data || [];
      }

      if (!tracks.length) {
        await message.reply("❌ No se encontraron resultados.");
        return;
      }

      if (result.loadType === "playlist") {
        queue.push(...tracks);
        const playlistName =
          result.data.info?.name || result.data.pluginInfo?.name || "Playlist";
        await message.reply(
          `✅ **Playlist agregada:** ${playlistName}\n📝 **${tracks.length} canciones** añadidas a la cola.`
        );
      } else {
        const track = tracks[0];
        queue.push(track);
        const duration = track.info.length || track.info.duration || 0;

        if (isPlaying) {
          await message.reply(
            `✅ **Añadido a la cola:** ${
              track.info.title
            }\n⏱️ Duración: ${formatDuration(duration)}\n📍 Posición: #${
              queue.length
            }`
          );
        } else {
          await message.reply(
            `✅ **Añadido a la cola:** ${
              track.info.title
            }\n⏱️ Duración: ${formatDuration(duration)}`
          );
        }
      }

      if (!isPlaying) {
        await playNextTrack(
          player,
          message.channel.id,
          message.guild!.id,
          client,
          message.author.id
        );
      }
    } catch (error: any) {
      console.error("Error en comando play:", error);
      await message.reply(
        `❌ Error al reproducir: ${error.message || "Error desconocido"}`
      );
    }
  },
};

async function playNextTrack(
  player: any,
  textChannelId: string,
  guildId: string,
  client: Amayo,
  lastUserId?: string
) {
  const queue = queues.get(guildId);

  if (!queue || queue.length === 0) {
    nowPlaying.set(guildId, false);

    if (lastUserId) {
      try {
        const lastTrack = player.track;

        if (lastTrack) {
          const trackInfo =
            typeof lastTrack === "string" ? lastTrack : lastTrack;
          const added = await addAutoplaySuggestion(
            guildId,
            lastUserId,
            {
              title: (trackInfo as any)?.info?.title || "Unknown",
              author: (trackInfo as any)?.info?.author || "Unknown",
              encoded: (trackInfo as any)?.encoded || lastTrack,
            },
            client
          );

          // FIX: Check the updated queue from the Map after adding suggestions
          const updatedQueue = queues.get(guildId);
          if (added && updatedQueue && updatedQueue.length > 0) {
            const channel = client.channels.cache.get(textChannelId);
            if (channel && "send" in channel) {
              channel.send(
                "🎵 **Autoplay** - Agregando recomendaciones basadas en tu historial..."
              );
            }
            await playNextTrack(
              player,
              textChannelId,
              guildId,
              client,
              lastUserId
            );
            return;
          }
        }
      } catch (error) {
        console.error("Error en autoplay:", error);
      }
    }

    const channel = client.channels.cache.get(textChannelId);
    if (channel && "send" in channel) {
      channel.send("✅ Cola terminada. Desconectando...");
    }
    player.connection.disconnect();
    client.music.players.delete(guildId);
    queues.delete(guildId);
    nowPlaying.delete(guildId);
    return;
  }

  const track = queue.shift();

  // Mark as playing
  nowPlaying.set(guildId, true);

  if (lastUserId) {
    try {
      await MusicHistoryService.trackSongStart(lastUserId, guildId, {
        trackId: track.encoded,
        title: track.info.title,
        author: track.info.author,
        duration: track.info.length || track.info.duration || 0,
        source: "youtube",
      });
    } catch (error) {
      console.error("Error tracking song history:", error);
    }
  }

  await player.playTrack({ encodedTrack: track.encoded });

  // Send interactive ComponentsV2 message with 2 containers
  if (lastUserId) {
    try {
      // Delete previous "Now Playing" message if it exists
      if (redis && redis.isOpen) {
        const previousMessageKey = `music:nowplaying:${guildId}`;
        const previousMessageId = await redis.get(previousMessageKey);

        if (previousMessageId) {
          try {
            const channel = client.channels.cache.get(textChannelId);
            if (channel && "messages" in channel) {
              await channel.messages.delete(previousMessageId);
            }
          } catch (error) {
            // Message might already be deleted, ignore error
            console.log(
              "Could not delete previous message, might be already deleted"
            );
          }
        }
      }

      const queueRef = queues.get(guildId);
      const containers = await createNowPlayingMessage(
        {
          title: track.info.title,
          author: track.info.author,
          duration: track.info.length || track.info.duration || 0,
          trackId: track.encoded,
          thumbnail: track.info.artworkUrl,
        },
        queueRef?.length || 0,
        lastUserId,
        guildId
      );

      // Send ComponentsV2 with both containers
      const sentMessage = await sendComponentsV2Message(textChannelId, {
        components: containers as any,
      });

      // Store new message ID in Redis for future deletion
      if (redis && redis.isOpen && sentMessage?.id) {
        const messageKey = `music:nowplaying:${guildId}`;
        await redis.set(messageKey, sentMessage.id, { EX: 3600 }); // Expire after 1 hour
      }
    } catch (error) {
      console.error("Error sending ComponentsV2 message:", error);
      // Fallback to plain text if ComponentsV2 fails
      const channel = client.channels.cache.get(textChannelId);
      if (channel && "send" in channel) {
        channel.send(
          `🎵 Ahora reproduciendo: **${track.info.title}** - \`${track.info.author}\``
        );
      }
    }
  } else {
    // No user ID, send plain text
    const channel = client.channels.cache.get(textChannelId);
    if (channel && "send" in channel) {
      channel.send(
        `🎵 Ahora reproduciendo: **${track.info.title}** - \`${track.info.author}\``
      );
    }
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
