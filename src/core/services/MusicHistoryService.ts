/**
 * Music History Service
 * Hybrid Redis + Prisma approach for tracking listening history
 *
 * Redis: Hot data (last 50 songs, real-time stats)
 * Prisma: Cold storage (full history, analytics)
 */

import { redis } from "../database/redis";
import { prisma } from "../database/prisma";
import logger from "../lib/logger";

interface TrackInfo {
  trackId: string;
  title: string;
  author: string;
  duration: number;
  source?: string;
}

interface ListeningSession {
  userId: string;
  guildId: string;
  track: TrackInfo;
  startedAt: number;
}

// In-memory sessions (active songs being played)
const activeSessions = new Map<string, ListeningSession>();

export class MusicHistoryService {
  /**
   * Track cuando un usuario empieza a escuchar una canción
   */
  static async trackSongStart(
    userId: string,
    guildId: string,
    track: TrackInfo
  ): Promise<void> {
    const sessionKey = `${guildId}:${userId}`;

    const session: ListeningSession = {
      userId,
      guildId,
      track,
      startedAt: Date.now(),
    };

    activeSessions.set(sessionKey, session);

    // Agregar a Redis (lista de últimas 50 canciones)
    const redisKey = `music:history:${userId}`;
    await redis.lPush(
      redisKey,
      JSON.stringify({
        ...track,
        playedAt: session.startedAt,
        guildId,
      })
    );

    // Mantener solo las últimas 50
    await redis.lTrim(redisKey, 0, 49);

    // Expirar en 30 días
    await redis.expire(redisKey, 30 * 24 * 60 * 60);
  }

  /**
   * Track cuando una canción termina o es skippeada
   */
  static async trackSongEnd(
    userId: string,
    guildId: string,
    skipped: boolean = false,
    skipReason?: string
  ): Promise<void> {
    const sessionKey = `${guildId}:${userId}`;
    const session = activeSessions.get(sessionKey);

    if (!session) {
      logger.warn(
        { userId, guildId },
        "No active session found for trackSongEnd"
      );
      return;
    }

    const listenedMs = Date.now() - session.startedAt;
    const score = Math.min(
      100,
      Math.floor((listenedMs / session.track.duration) * 100)
    );

    // Guardar en Prisma (async, no bloqueante)
    prisma.listeningHistory
      .create({
        data: {
          userId,
          guildId,
          trackId: session.track.trackId,
          title: session.track.title,
          author: session.track.author,
          duration: session.track.duration,
          source: session.track.source || "youtube",
          playedAt: new Date(session.startedAt),
          completedAt: new Date(),
          listenedMs,
          score,
          skipped,
          skipReason,
        },
      })
      .catch((err) => {
        logger.error({ err, userId }, "Failed to save listening history to DB");
      });

    // Actualizar stats en Redis
    const statsKey = `music:stats:${userId}`;
    await redis.hIncrBy(statsKey, "totalPlays", 1);
    if (skipped) {
      await redis.hIncrBy(statsKey, "totalSkips", 1);
    }
    await redis.expire(statsKey, 30 * 24 * 60 * 60);

    // Update preferences if needed (every 10 songs)
    const playCount = await redis.hGet(statsKey, "totalPlays");
    if (playCount && parseInt(playCount) % 10 === 0) {
      this.updateUserPreferences(userId).catch((err) => {
        logger.error({ err, userId }, "Failed to update user preferences");
      });
    }

    activeSessions.delete(sessionKey);
  }

  /**
   * Obtener historial reciente de un usuario (desde Redis primero)
   */
  static async getRecentHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const redisKey = `music:history:${userId}`;
    const cached = await redis.lRange(redisKey, 0, limit - 1);

    if (cached.length > 0) {
      return cached.map((item) => JSON.parse(item));
    }

    // Fallback a Prisma si no hay cache
    const history = await prisma.listeningHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: limit,
    });

    return history;
  }

  /**
   * Actualizar preferencias del usuario basado en historial
   */
  private static async updateUserPreferences(userId: string): Promise<void> {
    // Obtener últimas 100 canciones con buen score (>70)
    const goodPlays = await prisma.listeningHistory.findMany({
      where: {
        userId,
        score: { gte: 70 },
      },
      orderBy: { playedAt: "desc" },
      take: 100,
    });

    // Calcular artistas favoritos
    const artistMap = new Map<
      string,
      { playCount: number; totalScore: number }
    >();

    for (const play of goodPlays) {
      const existing = artistMap.get(play.author) || {
        playCount: 0,
        totalScore: 0,
      };
      existing.playCount++;
      existing.totalScore += play.score;
      artistMap.set(play.author, existing);
    }

    // Top 20 artistas ordenados por playCount * avgScore
    const favoriteArtists = Array.from(artistMap.entries())
      .map(([name, stats]) => ({
        name,
        playCount: stats.playCount,
        avgScore: stats.totalScore / stats.playCount,
      }))
      .sort((a, b) => b.playCount * b.avgScore - a.playCount * a.avgScore)
      .slice(0, 20);

    // Obtener stats totales
    const statsKey = `music:stats:${userId}`;
    const totalPlays = parseInt(
      (await redis.hGet(statsKey, "totalPlays")) || "0"
    );
    const totalSkips = parseInt(
      (await redis.hGet(statsKey, "totalSkips")) || "0"
    );

    // Upsert preferences
    await prisma.userMusicPreferences.upsert({
      where: { userId },
      create: {
        userId,
        favoriteArtists,
        totalPlays,
        totalSkips,
      },
      update: {
        favoriteArtists,
        totalPlays,
        totalSkips,
        lastUpdated: new Date(),
      },
    });

    logger.info(
      { userId, topArtist: favoriteArtists[0]?.name },
      "Updated user music preferences"
    );
  }

  /**
   * Obtener preferencias de un usuario
   */
  static async getUserPreferences(userId: string): Promise<any | null> {
    return await prisma.userMusicPreferences.findUnique({
      where: { userId },
    });
  }
}
