import { prisma } from "../database/prisma";
import { PlaylistService, TrackData } from "./PlaylistService";

export class LikeService {
  /**
   * Like a track (adds to "Me gusta" playlist and creates like record)
   */
  static async likeTrack(
    userId: string,
    guildId: string,
    trackData: TrackData
  ) {
    // Check if already liked
    const existing = await prisma.trackLike.findUnique({
      where: {
        userId_guildId_trackId: {
          userId,
          guildId,
          trackId: trackData.trackId,
        },
      },
    });

    if (existing) {
      return { liked: false, alreadyLiked: true, like: existing };
    }

    // Create like record
    const like = await prisma.trackLike.create({
      data: {
        userId,
        guildId,
        trackId: trackData.trackId,
        title: trackData.title,
        author: trackData.author,
        thumbnail: trackData.thumbnail,
      },
    });

    // Add to "Me gusta" playlist
    const playlist = await PlaylistService.getOrCreateDefaultPlaylist(
      userId,
      guildId
    );
    await PlaylistService.addTrackToPlaylist(playlist.id, trackData);

    return { liked: true, alreadyLiked: false, like };
  }

  /**
   * Unlike a track (removes from "Me gusta" playlist and deletes like record)
   */
  static async unlikeTrack(userId: string, guildId: string, trackId: string) {
    // Delete like record
    const deleted = await prisma.trackLike.deleteMany({
      where: {
        userId,
        guildId,
        trackId,
      },
    });

    // Remove from "Me gusta" playlist
    const playlist = await PlaylistService.getOrCreateDefaultPlaylist(
      userId,
      guildId
    );
    await PlaylistService.removeTrackFromPlaylist(playlist.id, trackId);

    return { unliked: deleted.count > 0 };
  }

  /**
   * Check if a track is liked by a user
   */
  static async isTrackLiked(
    userId: string,
    guildId: string,
    trackId: string
  ): Promise<boolean> {
    const like = await prisma.trackLike.findUnique({
      where: {
        userId_guildId_trackId: {
          userId,
          guildId,
          trackId,
        },
      },
    });

    return like !== null;
  }

  /**
   * Get all liked tracks for a user in a guild
   */
  static async getUserLikes(userId: string, guildId: string) {
    return await prisma.trackLike.findMany({
      where: {
        userId,
        guildId,
      },
      orderBy: { likedAt: "desc" },
    });
  }

  /**
   * Get like count for a track
   */
  static async getTrackLikeCount(trackId: string, guildId: string) {
    return await prisma.trackLike.count({
      where: {
        trackId,
        guildId,
      },
    });
  }
}
