# 📋 Guía Paso a Paso: Crear Colección Guild Cache en Appwrite

## Paso 1: Acceder a tu Database

1. Ve a [Appwrite Console](https://cloud.appwrite.io) (o tu instancia)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **Databases**
4. Selecciona tu database (el que tienes en `APPWRITE_DATABASE_ID`)

## Paso 2: Crear la Colección

1. Haz clic en **Create Collection**
2. **Collection Name**: `guild_cache`
3. **Collection ID**: Déjalo autogenerar o usa `guild_cache`
4. Haz clic en **Create**

## Paso 3: Agregar Atributos

En la colección que acabas de crear, ve a la pestaña **Attributes** y crea estos 4 atributos:

### Atributo 1: guildId
- Haz clic en **Create Attribute** → **String**
- **Attribute Key**: `guildId`
- **Size**: `32`
- **Required**: ✅ Sí (marcado)
- **Array**: ❌ No
- Haz clic en **Create**

### Atributo 2: name
- Haz clic en **Create Attribute** → **String**
- **Attribute Key**: `name`
- **Size**: `100`
- **Required**: ✅ Sí (marcado)
- **Array**: ❌ No
- Haz clic en **Create**

### Atributo 3: prefix
- Haz clic en **Create Attribute** → **String**
- **Attribute Key**: `prefix`
- **Size**: `10`
- **Required**: ❌ No (desmarcado)
- **Default value**: (déjalo vacío)
- **Array**: ❌ No
- Haz clic en **Create**

### Atributo 4: expiresAt
- Haz clic en **Create Attribute** → **DateTime**
- **Attribute Key**: `expiresAt`
- **Required**: ✅ Sí (marcado)
- **Array**: ❌ No
- Haz clic en **Create**

⏳ **IMPORTANTE**: Espera unos segundos a que todos los atributos estén en estado **Available** antes de continuar.

## Paso 4: Crear Índices

Ve a la pestaña **Indexes** y crea estos 2 índices:

### Índice 1: guildId (único)
- Haz clic en **Create Index**
- **Index Key**: `idx_guildId`
- **Index Type**: **Unique**
- **Attributes**: Selecciona `guildId`
- **Order**: ASC
- Haz clic en **Create**

### Índice 2: expiresAt
- Haz clic en **Create Index**
- **Index Key**: `idx_expiresAt`
- **Index Type**: **Key**
- **Attributes**: Selecciona `expiresAt`
- **Order**: ASC
- Haz clic en **Create**

## Paso 5: Configurar Permisos

Ve a la pestaña **Settings** → **Permissions**:

1. Por defecto debería estar configurado como "API Key"
2. Si no, agrega estos permisos:
   - **Role**: `Any`
   - **Permissions**: Read, Create, Update, Delete (todas marcadas)

## Paso 6: Copiar el Collection ID

1. En la parte superior de la colección, verás el **Collection ID**
2. Cópialo (algo como `67xxxxxx` o `guild_cache` si lo personalizaste)

## Paso 7: Actualizar Variables de Entorno

Agrega a tu `.env` (o Config Vars en Heroku):

```env
APPWRITE_COLLECTION_GUILD_CACHE_ID=el_collection_id_que_copiaste
```

## Paso 8: Verificar

Para verificar que todo está bien:

1. Ve a la colección
2. Pestaña **Attributes**: Deberías ver 4 atributos (guildId, name, prefix, expiresAt)
3. Pestaña **Indexes**: Deberías ver 2 índices (idx_guildId, idx_expiresAt)

## Paso 9: Redeploy el Bot

```bash
# Si es local
npm run build
npm start

# Si es Heroku
git add .
git commit -m "chore: agregar APPWRITE_COLLECTION_GUILD_CACHE_ID"
git push heroku main
```

## ✅ Listo!

Después del redeploy, busca en los logs:
```
✅ Guild config guardada en caché (Appwrite)
```

---

## 🐛 Solución de Problemas

### Error: "Attribute already exists"
- El atributo ya existe, pasa al siguiente

### Error: "Index already exists"  
- El índice ya existe, pasa al siguiente

### Error: "Collection not found"
- Verifica que el `APPWRITE_COLLECTION_GUILD_CACHE_ID` sea correcto

### No veo mensajes de caché en los logs
- Verifica que todas las variables de Appwrite estén configuradas
- Revisa que el Collection ID sea correcto
- Comprueba que la colección tenga los permisos correctos
