# 🤖 Amayo Bot Editor

Editor visual estilo VS Code construido con Tauri, TypeScript y Vue para gestionar comandos y eventos de tu bot de Discord.

## ✨ Características

- **📊 Dashboard con Estadísticas**: Visualiza en tiempo real:
  - Comandos de mensaje (prefix-based)
  - Comandos slash
  - Eventos estándar de Discord.js
  - Eventos custom/extras
  
- **📝 Editor de Código Integrado**: 
  - Monaco Editor (el mismo de VS Code)
  - Sintaxis highlighting para TypeScript
  - Autocompletado inteligente
  - Shortcuts de teclado (Ctrl+S para guardar)
  
- **➕ Creadores Visuales**:
  - Crear comandos slash y de mensaje con GUI
  - Crear eventos estándar y custom
  - Formularios para metadatos
  - Snippets predefinidos para Discord.js
  
- **🔍 Explorador de Archivos**:
  - Navegación intuitiva por comandos y eventos
  - Iconos diferenciados por tipo
  - Edición en tiempo real

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- Rust (para compilar Tauri)
- npm o yarn

### Pasos

1. Navega al directorio del editor:
```bash
cd AEditor
```

2. Instala las dependencias:
```bash
npm install
```

3. Ejecuta en modo desarrollo:
```bash
npm run tauri dev
```

4. Para compilar la aplicación:
```bash
npm run tauri build
```

## 📖 Uso

### Crear un Comando

1. Haz clic en **"➕ Nuevo Comando"** en el sidebar
2. Selecciona el tipo:
   - **Comando de Mensaje**: Usa prefix (ej: `!ping`)
   - **Comando Slash**: Usa `/` (ej: `/ping`)
3. Completa los metadatos:
   - Nombre del comando
   - Descripción
   - Categoría (opcional)
   - Cooldown (opcional)
   - Aliases (solo para comandos de mensaje)
4. Escribe la lógica en el editor Monaco
5. Usa el botón **"📝 Insertar Snippet"** para código común
6. Guarda con **"➕ Crear Comando"**

### Crear un Evento

1. Haz clic en **"➕ Nuevo Evento"** en el sidebar
2. Selecciona el tipo:
   - **Evento Estándar**: Eventos de Discord.js (ready, messageCreate, etc.)
   - **Evento Custom**: Funciones que se ejecutan desde otros eventos
3. Elige el evento de Discord (si es estándar)
4. Escribe el nombre del archivo
5. Implementa la lógica en el editor
6. Guarda con **"➕ Crear Evento"**

### Editar Archivos Existentes

1. En el sidebar, navega a la sección de **Comandos** o **Eventos**
2. Haz clic en el archivo que deseas editar
3. Edita el código en el editor Monaco
4. Guarda con **Ctrl+S** o el botón **"💾 Guardar"**

## 🎨 Estructura del Proyecto

```
AEditor/
├── src/
│   ├── components/
│   │   ├── Sidebar.vue           # Panel lateral con estadísticas
│   │   ├── MonacoEditor.vue      # Editor de código
│   │   ├── CommandCreator.vue    # Creador de comandos
│   │   └── EventCreator.vue      # Creador de eventos
│   ├── types/
│   │   └── bot.ts                # Tipos TypeScript
│   └── App.vue                   # Componente principal
├── src-tauri/
│   └── src/
│       └── lib.rs                # Comandos Rust/Tauri
└── package.json
```

## 🛠️ Tecnologías

- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: Monaco Editor
- **Desktop**: Tauri (Rust)
- **Estilos**: CSS personalizado (tema VS Code Dark)

## 📝 Tipos de Comandos Soportados

### Comandos de Mensaje (Message Commands)

```typescript
export default {
  name: "ping",
  type: 'message' as const,
  description: "Responde con pong",
  aliases: ["p", "latencia"],
  cooldown: 5,
  async run(message: Message, args: string[], client: Amayo) {
    await message.reply("¡Pong!");
  }
}
```

### Comandos Slash (Slash Commands)

```typescript
export default {
  name: "ping",
  description: "Responde con pong",
  type: 'slash' as const,
  cooldown: 5,
  async run(interaction: ChatInputCommandInteraction, client: Amayo) {
    await interaction.reply({
      content: "¡Pong!",
      ephemeral: true
    });
  }
}
```

## 🎯 Tipos de Eventos Soportados

### Eventos Estándar

Eventos nativos de Discord.js como `ready`, `messageCreate`, `interactionCreate`, etc.

```typescript
import { bot } from "../main";
import { Events } from "discord.js";

bot.on(Events.MessageCreate, async (message) => {
  // Tu lógica aquí
});
```

### Eventos Custom/Extras

Funciones que se ejecutan desde otros eventos (por ejemplo, desde `messageCreate`):

```typescript
import { Message } from "discord.js";

export async function alliance(message: Message) {
  // Tu lógica custom
}
```

## ⌨️ Shortcuts

- **Ctrl+S**: Guardar archivo actual
- **Ctrl+N**: Nuevo comando (cuando esté implementado)
- **F5**: Actualizar estadísticas del proyecto

## 🔧 Comandos Tauri Disponibles

- `get_project_root()`: Obtiene la ruta raíz del proyecto
- `scan_commands(projectRoot)`: Escanea todos los comandos
- `scan_events(projectRoot)`: Escanea todos los eventos
- `get_project_stats(projectRoot)`: Obtiene estadísticas del proyecto
- `read_file_content(filePath)`: Lee el contenido de un archivo
- `write_file_content(filePath, content)`: Escribe contenido a un archivo

## 🐛 Solución de Problemas

### Error al cargar el proyecto

Asegúrate de que estás ejecutando el editor desde el directorio `AEditor` y que existe la carpeta `src` con comandos y eventos en el nivel superior.

### Monaco Editor no se muestra

Verifica que Monaco Editor esté correctamente instalado:
```bash
npm list monaco-editor
```

### Errores de compilación de Rust

Asegúrate de tener Rust instalado y actualizado:
```bash
rustup update
```

## 📄 Licencia

Este proyecto es parte del bot Amayo y sigue la misma licencia del proyecto principal.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o pull request en el repositorio principal.

## 📮 Soporte

Si encuentras algún problema o tienes sugerencias, abre un issue en el repositorio de GitHub.

---

Hecho con ❤️ para la comunidad de Amayo Bot
