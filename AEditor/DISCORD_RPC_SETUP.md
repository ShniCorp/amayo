# 🎮 Configuración Discord Rich Presence

## Paso 1: Crear Aplicación en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Haz clic en **"New Application"**
3. Nombre: `Amayo Bot Editor`
4. Acepta los términos y crea la aplicación

## Paso 2: Obtener Application ID

1. En la página de tu aplicación, ve a **"OAuth2" → "General"**
2. Copia el **APPLICATION ID** (número largo)
3. Pégalo en `src-tauri/src/lib.rs` línea 169:
   ```rust
   let client_id = "TU_APPLICATION_ID_AQUI";
   ```

## Paso 3: Subir Imágenes (Assets)

1. En tu aplicación, ve a **"Rich Presence" → "Art Assets"**
2. Sube las siguientes imágenes:

### Imagen Principal: `amayo_logo`
- Tamaño recomendado: 1024x1024 píxeles
- Logo del editor Amayo
- Aparecerá como imagen grande en Discord

### Imagen Secundaria: `code`
- Tamaño recomendado: 512x512 píxeles
- Icono de código </> o similar
- Aparecerá como imagen pequeña en Discord

3. **IMPORTANTE**: El nombre debe ser **exactamente** `amayo_logo` y `code` (minúsculas, sin espacios)

## Paso 4: ¿Qué mostrará Discord?

### Cuando abres el editor:
```
🎮 Jugando a Amayo Bot Editor
📝 Editando bot de Discord
🕐 En el menú principal
   [Desde: hace 5 minutos]
```

### Cuando editas un archivo:
```
🎮 Jugando a Amayo Bot Editor
📝 Editando Comando slash
📄 ping.ts
   [Desde: hace 10 minutos]
```

### Cuando creas un comando:
```
🎮 Jugando a Amayo Bot Editor
🆕 Creando comando nuevo
🔧 En el wizard de comandos
   [Desde: hace 2 minutos]
```

### Cuando editas la base de datos:
```
🎮 Jugando a Amayo Bot Editor
🗄️ Editando base de datos
📊 Visualizando schema.prisma
   [Desde: hace 15 minutos]
```

## Paso 5: Estados Implementados

El RPC se actualiza automáticamente cuando:

- ✅ Abres el editor → "Editando bot de Discord"
- ✅ Navegas el proyecto → "X comandos | Y eventos"
- ✅ Seleccionas un archivo → "Editando [tipo]" + nombre
- ✅ Creas comando → "Creando comando nuevo"
- ✅ Creas evento → "Creando evento nuevo"
- ✅ Abres database → "Visualizando schema.prisma"

## Paso 6: Crear Imágenes Sugeridas

### Para `amayo_logo`:
Puedes usar cualquier herramienta de diseño o generador de logos:
- [Logo.com](https://logo.com)
- [Canva](https://canva.com)
- [Photopea](https://photopea.com) (Photoshop gratis)

Sugerencia: Logo con letra "A" estilizada o nombre "Amayo" con colores modernos

### Para `code`:
Busca iconos gratuitos de código:
- [Flaticon](https://flaticon.com) → buscar "code icon"
- [Icons8](https://icons8.com) → buscar "coding icon"
- Emoji de código: </> o {}

## Paso 7: Compilar y Probar

```powershell
cd AEditor
npm run tauri dev
```

Si Discord está abierto, deberías ver el Rich Presence actualizado!

## Troubleshooting

### ❌ No aparece en Discord
- Verifica que Discord esté abierto
- Revisa que el Application ID sea correcto
- Asegúrate que las imágenes tengan los nombres exactos
- En Discord → Configuración → Actividad → Habilitar "Mostrar actividad actual"

### ❌ Error de conexión
```
Error conectando a Discord: Connection refused
```
Solución: Reinicia Discord completamente

### ❌ Imágenes no aparecen
- Las imágenes tardan 5-10 minutos en activarse después de subirlas
- Deben llamarse **exactamente** `amayo_logo` y `code`
- Formato: PNG, JPG o GIF

## Personalización Avanzada

Puedes modificar los mensajes en `src/App.vue`:

```typescript
// Ejemplo: cambiar el mensaje al editar
updateDiscordRPC(
  "🔥 Hackeando el mainframe",  // Details
  `Archivo: ${file.name}`         // State
);
```

O en `src-tauri/src/lib.rs` para cambiar las imágenes:

```rust
.assets(activity::Assets::new()
    .large_image("tu_imagen_custom")
    .large_text("Tu texto custom")
    .small_image("otra_imagen")
    .small_text("Otro texto")
)
```

---

🎉 **¡Listo!** Tu editor ahora muestra lo que estás haciendo en Discord.
