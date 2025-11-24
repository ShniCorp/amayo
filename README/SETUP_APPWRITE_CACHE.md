# 🚀 Guía Rápida: Configurar Caché de Guilds con Appwrite

## ¿Por qué Appwrite en vez de Redis?

- ✅ Redis: Solo 30MB disponibles (ya usando 8%)
- ✅ Appwrite: Sin límites estrictos, incluido en plan gratis
- ✅ Ahorra ~2.4MB de Redis para otros usos

## Configuración (5 minutos)

### Opción Recomendada: Manual (Consola de Appwrite) 📝

**Por qué manual**: La API Key de tu proyecto requiere permisos elevados para crear colecciones. Es más rápido hacerlo desde la consola web.

📋 **[Sigue esta guía paso a paso](./GUIA_MANUAL_APPWRITE.md)** ← Click aquí

**Resumen rápido:**
1. Crea colección `guild_cache` en Appwrite Console
2. Agrega 4 atributos: `guildId`, `name`, `prefix`, `expiresAt`
3. Crea 2 índices en `guildId` y `expiresAt`
4. Copia el Collection ID
5. Agrégalo a `.env` como `APPWRITE_COLLECTION_GUILD_CACHE_ID`

### Opción Alternativa: Script Automático 🤖

⚠️ **Requiere API Key con permisos completos** (databases.write, collections.write, etc.)

```bash
# Si tienes una API Key con permisos suficientes:
node scripts/setupGuildCacheCollection.js

# Luego agrega el ID a .env
APPWRITE_COLLECTION_GUILD_CACHE_ID=el_id_generado
```

## Variables de Entorno Necesarias

Asegúrate de tener en tu `.env` (o Config Vars de Heroku):

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=tu_project_id
APPWRITE_API_KEY=tu_api_key
APPWRITE_DATABASE_ID=tu_database_id
APPWRITE_COLLECTION_GUILD_CACHE_ID=tu_collection_id_nuevo
```

## Verificación

Después de desplegar, busca en los logs:

```
✅ Guild config obtenida desde caché (Appwrite)
✅ Guild config guardada en caché (Appwrite)
🧹 Documentos expirados eliminados de caché
```

## ¿Qué hace esto?

- **Antes**: Cada mensaje → consulta a PostgreSQL (miles por minuto)
- **Ahora**: Cada mensaje → consulta a Appwrite caché (1 vez cada 5 min por servidor)
- **Resultado**: 99.8% menos carga en PostgreSQL

## Más Información

Lee la documentación completa en:
- [README/MIGRACION_CACHE_APPWRITE.md](./MIGRACION_CACHE_APPWRITE.md)
- [README/FIX_OUT_OF_MEMORY.md](./FIX_OUT_OF_MEMORY.md)
