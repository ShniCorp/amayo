import { prisma } from "../database/prisma";

export interface TrackData {
  trackId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail?: string;
  url?: string;
}

export class PlaylistService {
  /**
   * Get or create the default "Me gusta" playlist for a user
   */
  static async getOrCreateDefaultPlaylist(userId: string, guildId: string) {
    const existing = await prisma.musicPlaylist.findFirst({
      where: {
        userId,
        guildId,
        isDefault: true,
      },
      include: {
        tracks: {
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.musicPlaylist.create({
      data: {
        userId,
        guildId,
        name: "Me gusta",
        description: "Tus canciones favoritas",
        isDefault: true,
      },
      include: {
        tracks: true,
      },
    });
  }

  /**
   * Create a new playlist
   */
  static async createPlaylist(
    userId: string,
    guildId: string,
    name: string,
    description?: string
  ) {
    return await prisma.musicPlaylist.create({
      data: {
        userId,
        guildId,
        name,
        description,
      },
      include: {
        tracks: true,
      },
    });
  }

  /**
   * Get all playlists for a user in a guild
   */
  static async getUserPlaylists(userId: string, guildId: string) {
    return await prisma.musicPlaylist.findMany({
      where: {
        userId,
        guildId,
      },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get a specific playlist by ID
   */
  static async getPlaylist(playlistId: string) {
    return await prisma.musicPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          orderBy: { addedAt: "desc" },
        },
      },
    });
  }

  /**
   * Add a track to a playlist
   */
  static async addTrackToPlaylist(playlistId: string, trackData: TrackData) {
    // Check if track already exists in playlist
    const existing = await prisma.playlistTrack.findFirst({
      where: {
        playlistId,
        trackId: trackData.trackId,
      },
    });

    if (existing) {
      return { added: false, track: existing };
    }

    const track = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId: trackData.trackId,
        title: trackData.title,
        author: trackData.author,
        duration: trackData.duration,
        thumbnail: trackData.thumbnail,
        url: trackData.url,
      },
    });

    return { added: true, track };
  }

  /**
   * Remove a track from a playlist
   */
  static async removeTrackFromPlaylist(playlistId: string, trackId: string) {
    return await prisma.playlistTrack.deleteMany({
      where: {
        playlistId,
        trackId,
      },
    });
  }

  /**
   * Delete a playlist
   */
  static async deletePlaylist(playlistId: string) {
    return await prisma.musicPlaylist.delete({
      where: { id: playlistId },
    });
  }

  /**
   * Check if a track exists in a playlist
   */
  static async isTrackInPlaylist(playlistId: string, trackId: string) {
    const track = await prisma.playlistTrack.findFirst({
      where: {
        playlistId,
        trackId,
      },
    });

    return track !== null;
  }
}
