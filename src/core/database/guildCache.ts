import {
  getDatabases,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_GUILD_CACHE_ID,
  isGuildCacheConfigured,
} from "../api/appwrite";
import type { PrismaClient } from "@prisma/client";
import logger from "../lib/logger";
import { Query } from "node-appwrite";

const GUILD_CACHE_TTL = 300; // 5 minutos en segundos

export interface GuildConfig {
  id: string;
  name: string;
  prefix: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Obtiene la configuración de un guild desde caché o base de datos
 */
export async function getGuildConfig(
  guildId: string,
  guildName: string,
  prisma: PrismaClient
): Promise<GuildConfig> {
  try {
    // Intentar obtener desde Appwrite
    if (isGuildCacheConfigured()) {
      const databases = getDatabases();
      if (databases) {
        try {
          const doc = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_GUILD_CACHE_ID,
            guildId
          );

          // Verificar si el documento ha expirado
          const expiresAt = new Date(doc.expiresAt);
          if (expiresAt > new Date()) {
            logger.debug(
              { guildId },
              "✅ Guild config obtenida desde caché (Appwrite)"
            );
            return {
              id: doc.guildId,
              name: doc.name,
              prefix: doc.prefix || null,
            };
          } else {
            // Documento expirado, eliminarlo
            await databases.deleteDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_COLLECTION_GUILD_CACHE_ID,
              guildId
            );
            logger.debug(
              { guildId },
              "🗑️  Caché expirada eliminada de Appwrite"
            );
          }
        } catch (error: any) {
          // Si es 404, el documento no existe, continuar
          if (error?.code !== 404) {
            logger.error(
              { error, guildId },
              "❌ Error al leer caché de guild en Appwrite"
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error({ error, guildId }, "❌ Error al acceder a Appwrite");
  }

  // Si no está en caché, hacer upsert en la base de datos
  try {
    const guild = await prisma.guild.upsert({
      where: { id: guildId },
      create: {
        id: guildId,
        name: guildName,
      },
      update: {},
    });

    const config: GuildConfig = {
      id: guild.id,
      name: guild.name,
      prefix: guild.prefix,
    };

    // Guardar en caché de Appwrite
    try {
      if (isGuildCacheConfigured()) {
        const databases = getDatabases();
        if (databases) {
          const expiresAt = new Date(Date.now() + GUILD_CACHE_TTL * 1000);

          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_GUILD_CACHE_ID,
            guildId, // usar guildId como document ID para que sea único
            {
              guildId: guild.id,
              name: guild.name,
              prefix: guild.prefix || "",
              expiresAt: expiresAt.toISOString(),
            }
          );

          logger.debug(
            { guildId },
            "✅ Guild config guardada en caché (Appwrite)"
          );
        }
      }
    } catch (error: any) {
      // Si el documento ya existe (409), actualizarlo
      if (error?.code === 409) {
        try {
          const databases = getDatabases();
          if (databases) {
            const expiresAt = new Date(Date.now() + GUILD_CACHE_TTL * 1000);

            await databases.updateDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_COLLECTION_GUILD_CACHE_ID,
              guildId,
              {
                name: guild.name,
                prefix: guild.prefix || "",
                expiresAt: expiresAt.toISOString(),
              }
            );

            logger.debug(
              { guildId },
              "♻️  Guild config actualizada en caché (Appwrite)"
            );
          }
        } catch (updateError) {
          logger.error(
            { error: updateError, guildId },
            "❌ Error al actualizar caché en Appwrite"
          );
        }
      } else {
        logger.error(
          { error, guildId },
          "❌ Error al guardar caché en Appwrite"
        );
      }
    }

    return config;
  } catch (error) {
    logger.error({ error, guildId }, "❌ Error al hacer upsert de guild");

    // Retornar configuración por defecto en caso de error
    return {
      id: guildId,
      name: guildName,
      prefix: null,
    };
  }
}

/**
 * Invalida el caché de un guild (llamar cuando se actualice la configuración)
 */
export async function invalidateGuildCache(guildId: string): Promise<void> {
  try {
    if (isGuildCacheConfigured()) {
      const databases = getDatabases();
      if (databases) {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_GUILD_CACHE_ID,
          guildId
        );
        logger.debug({ guildId }, "🗑️  Caché de guild invalidada (Appwrite)");
      }
    }
  } catch (error: any) {
    // Si es 404, el documento ya no existe
    if (error?.code !== 404) {
      logger.error(
        { error, guildId },
        "❌ Error al invalidar caché de guild en Appwrite"
      );
    }
  }
}

/**
 * Actualiza directamente el caché de un guild (útil después de updates)
 */
export async function updateGuildCache(config: GuildConfig): Promise<void> {
  try {
    if (isGuildCacheConfigured()) {
      const databases = getDatabases();
      if (databases) {
        const expiresAt = new Date(Date.now() + GUILD_CACHE_TTL * 1000);

        try {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_GUILD_CACHE_ID,
            config.id,
            {
              name: config.name,
              prefix: config.prefix || "",
              expiresAt: expiresAt.toISOString(),
            }
          );
          logger.debug(
            { guildId: config.id },
            "♻️  Caché de guild actualizada (Appwrite)"
          );
        } catch (error: any) {
          // Si no existe (404), crearlo
          if (error?.code === 404) {
            await databases.createDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_COLLECTION_GUILD_CACHE_ID,
              config.id,
              {
                guildId: config.id,
                name: config.name,
                prefix: config.prefix || "",
                expiresAt: expiresAt.toISOString(),
              }
            );
            logger.debug(
              { guildId: config.id },
              "✅ Caché de guild creada (Appwrite)"
            );
          } else {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    logger.error(
      { error, guildId: config.id },
      "❌ Error al actualizar caché de guild en Appwrite"
    );
  }
}

/**
 * Limpia documentos expirados de la caché (ejecutar periódicamente)
 */
export async function cleanExpiredGuildCache(): Promise<void> {
  try {
    if (isGuildCacheConfigured()) {
      const databases = getDatabases();
      if (databases) {
        const now = new Date().toISOString();

        // Buscar documentos que hayan expirado
        const expired = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_GUILD_CACHE_ID,
          [
            Query.lessThan("expiresAt", now),
            Query.limit(100), // Límite para evitar sobrecarga
          ]
        );

        // Eliminar documentos expirados
        for (const doc of expired.documents) {
          try {
            await databases.deleteDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_COLLECTION_GUILD_CACHE_ID,
              doc.$id
            );
          } catch (error) {
            logger.error(
              { error, docId: doc.$id },
              "❌ Error al eliminar documento expirado"
            );
          }
        }

        if (expired.documents.length > 0) {
          logger.info(
            { count: expired.documents.length },
            "🧹 Documentos expirados eliminados de caché"
          );
        }
      }
    }
  } catch (error) {
    logger.error({ error }, "❌ Error al limpiar caché expirada en Appwrite");
  }
}
