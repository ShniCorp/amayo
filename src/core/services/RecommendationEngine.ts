/**
 * Recommendation Engine for Music Autoplay
 * Smart algorithm that learns from user listening history
 */

import { MusicHistoryService } from "../services/MusicHistoryService";
import logger from "../lib/logger";

interface TrackRecommendation {
  query: string;
  reason: string;
  confidence: number;
}

export class RecommendationEngine {
  /**
   * Get a smart autoplay recommendation based on user history
   *
   * @param userId - Discord user ID
   * @param lastTrack - Last track that was played
   * @param isNewUser - Whether user has <10 songs in history
   * @returns Search query for next song
   */
  static async getAutoplaySuggestion(
    userId: string,
    lastTrack: { title: string; author: string },
    isNewUser: boolean = false
  ): Promise<TrackRecommendation> {
    // For new users or users with little history: similar theme
    if (isNewUser) {
      return this.getSimilarThemeSuggestion(lastTrack);
    }

    // For experienced users: use their history
    const preferences = await MusicHistoryService.getUserPreferences(userId);
    const recentHistory = await MusicHistoryService.getRecentHistory(
      userId,
      30
    );

    if (!preferences || !recentHistory.length) {
      return this.getSimilarThemeSuggestion(lastTrack);
    }

    // Every 5 songs, introduce genre variety
    const playCount = preferences.totalPlays || 0;
    const shouldVaryGenre = playCount % 5 === 0;

    if (shouldVaryGenre) {
      return this.getGenreVarietySuggestion(preferences, lastTrack);
    }

    // Default: recommend from favorite artists
    return this.getFavoriteArtistSuggestion(
      preferences,
      recentHistory,
      lastTrack
    );
  }

  /**
   * For new users: suggest similar songs (same artist or theme)
   */
  private static getSimilarThemeSuggestion(lastTrack: {
    title: string;
    author: string;
  }): TrackRecommendation {
    // 70% same artist, 30% similar theme
    const sameArtist = Math.random() < 0.7;

    if (sameArtist) {
      return {
        query: `${lastTrack.author} popular songs`,
        reason: "del mismo artista",
        confidence: 0.8,
      };
    } else {
      return {
        query: `${lastTrack.title} similar songs`,
        reason: "tema similar",
        confidence: 0.7,
      };
    }
  }

  /**
   * Every 5 songs: introduce variety from similar genres
   */
  private static getGenreVarietySuggestion(
    preferences: any,
    lastTrack: { title: string; author: string }
  ): TrackRecommendation {
    const favoriteArtists = (preferences.favoriteArtists || []) as Array<{
      name: string;
      playCount: number;
    }>;

    if (favoriteArtists.length > 0) {
      // Pick a random artist from top 10 favorites
      const topArtists = favoriteArtists.slice(
        0,
        Math.min(10, favoriteArtists.length)
      );
      const randomArtist =
        topArtists[Math.floor(Math.random() * topArtists.length)];

      return {
        query: `${randomArtist.name} ${lastTrack.author} mix`,
        reason: `mezclando ${randomArtist.name} (uno de tus favoritos)`,
        confidence: 0.75,
      };
    }

    // Fallback to similar theme
    return this.getSimilarThemeSuggestion(lastTrack);
  }

  /**
   * Default recommendation: from favorite artists, avoiding recent repeats
   */
  private static getFavoriteArtistSuggestion(
    preferences: any,
    recentHistory: any[],
    lastTrack: { title: string; author: string }
  ): TrackRecommendation {
    const favoriteArtists = (preferences.favoriteArtists || []) as Array<{
      name: string;
      playCount: number;
    }>;

    if (favoriteArtists.length === 0) {
      return this.getSimilarThemeSuggestion(lastTrack);
    }

    // Get artists from last 20 songs to avoid immediate repeats
    const recentArtists = new Set(
      recentHistory.slice(0, 20).map((h) => (h as any).author)
    );

    // Find favorite artist not recently played
    const availableArtist = favoriteArtists.find(
      (artist) => !recentArtists.has(artist.name)
    );

    if (availableArtist) {
      return {
        query: `${availableArtist.name} top songs`,
        reason: `de ${availableArtist.name} (tu artista favorito)`,
        confidence: 0.85,
      };
    }

    // All favorites were recent, pick from top 5 randomly
    const topFavorite =
      favoriteArtists[
        Math.floor(Math.random() * Math.min(5, favoriteArtists.length))
      ];

    return {
      query: `${topFavorite.name} latest songs`,
      reason: `de ${topFavorite.name}`,
      confidence: 0.75,
    };
  }

  /**
   * Check if user is considered "new" (less than 10 songs in history)
   */
  static async isNewUser(userId: string): Promise<boolean> {
    const history = await MusicHistoryService.getRecentHistory(userId, 10);
    return history.length < 10;
  }
}
