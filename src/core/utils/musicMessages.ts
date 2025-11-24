import { DisplayComponentV2Builder } from "../lib/displayComponents/builders/v2Builder";
import { LikeService } from "../services/LikeService";
import { PlaylistService } from "../services/PlaylistService";

interface TrackInfo {
  title: string;
  author: string;
  duration: number;
  trackId: string;
  thumbnail?: string;
}

/**
 * Creates ComponentsV2 messages for "Now Playing" with interactive buttons and playlist SelectMenu
 * Returns array of 2 containers: [info container, buttons+menu container]
 */
export async function createNowPlayingMessage(
  trackInfo: TrackInfo,
  queueLength: number,
  userId: string,
  guildId: string
) {
  // Create consistent trackId from title and author (same format as music_like.ts)
  const consistentTrackId = Buffer.from(
    `${trackInfo.title}:${trackInfo.author}`
  )
    .toString("base64")
    .substring(0, 50);

  const isLiked = await LikeService.isTrackLiked(
    userId,
    guildId,
    consistentTrackId
  );
  const durationText = formatDuration(trackInfo.duration);

  // Container 1: Track info with thumbnail
  const infoContainer = new DisplayComponentV2Builder().setAccentColor(
    0x5865f2
  ); // Discord blurple

  if (trackInfo.thumbnail) {
    // Use section with accessory for thumbnail
    infoContainer.addSection(
      [
        {
          type: 10,
          content: `**Añadido a la cola**\\n${trackInfo.title}\\n${trackInfo.author} • Duración: ${durationText}`,
        },
      ],
      { type: 11, media: { url: trackInfo.thumbnail } }
    );
  } else {
    infoContainer.addText(
      `**Añadido a la cola**\\n${trackInfo.title}\\n${trackInfo.author} • Duración: ${durationText}`
    );
  }

  // Container 2: "Now playing" text + buttons + SelectMenu
  const buttonsContainer = new DisplayComponentV2Builder()
    .setAccentColor(0x608beb) // Slightly different blue
    .addText("**Ahora reproduciendo:**")
    .addText(`${trackInfo.title} - ${trackInfo.author}`);

  // Create buttons
  const likeButton = DisplayComponentV2Builder.createButton(
    isLiked ? "Te gusta" : "Like",
    isLiked ? 2 : 1,
    isLiked ? "music_unlike" : "music_like",
    { name: "❤️" }
  );

  const repeatButton = DisplayComponentV2Builder.createButton(
    "Repeat",
    1,
    "music_repeat",
    { name: "🔁" }
  );

  const shuffleButton = DisplayComponentV2Builder.createButton(
    "Shuffle",
    1,
    "music_shuffle",
    { name: "🔂" }
  );

  const autoplayButton = DisplayComponentV2Builder.createButton(
    "Autoplay",
    1,
    "music_autoplay_toggle",
    { name: "⏩" }
  );

  // Add ActionRow with buttons
  buttonsContainer.addActionRow([
    likeButton,
    repeatButton,
    shuffleButton,
    autoplayButton,
  ]);

  // Get user's playlists for SelectMenu
  const playlists = await PlaylistService.getUserPlaylists(userId, guildId);

  // Create SelectMenu options
  const selectOptions = [
    {
      label: "Crear playlist nueva",
      value: "create_new",
      emoji: { name: "🔹" },
    },
  ];

  // Add existing playlists
  playlists.forEach((playlist) => {
    selectOptions.push({
      label: playlist.name,
      value: playlist.id,
      emoji: { name: playlist.isDefault ? "❤️" : "📝" },
    });
  });

  // Create SelectMenu
  // Use only first 50 chars of trackId hash to stay under 100 char limit
  const trackIdHash = trackInfo.trackId.substring(0, 50);
  const selectMenu = DisplayComponentV2Builder.createSelectMenu(
    `music_save_select:${trackIdHash}`,
    "Guardar en playlist",
    selectOptions
  );

  // Add SelectMenu in its own ActionRow
  buttonsContainer.addActionRow([selectMenu]);

  // Return both containers
  return [infoContainer.toJSON(), buttonsContainer.toJSON()];
}

/**
 * Format duration from milliseconds to MM:SS or HH:MM:SS
 */
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
