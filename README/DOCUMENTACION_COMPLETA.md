# 🚀 Guía Completa - Amayo Bot Editor

## 📋 Resumen del Proyecto

He creado una **aplicación desktop completa** con Tauri, TypeScript y Vue que funciona como un **editor estilo VS Code** específicamente diseñado para gestionar tu bot de Discord "Amayo".

## ✨ Funcionalidades Implementadas

### 1. ✅ Creación de Comandos via GUI

La aplicación permite crear tanto **comandos de mensaje** (prefix-based) como **comandos slash** con una interfaz gráfica intuitiva:

#### Características:
- **Formulario visual** para metadatos:
  - Nombre del comando
  - Descripción
  - Tipo (message/slash)
  - Categoría
  - Cooldown
  - Aliases (para comandos de mensaje)
  - Uso/sintaxis

- **Editor Monaco integrado** con:
  - Sintaxis highlighting para TypeScript
  - Autocompletado
  - Snippets predefinidos para Discord.js
  - Shortcuts de teclado (Ctrl+S)

- **Sistema de rutas automático**:
  - Sugerencia inteligente de ruta basada en categoría y tipo
  - Guardado en las carpetas correctas del proyecto

#### Tipos de Comandos Soportados:

**Comandos de Mensaje:**
```typescript
{
  name: "ping",
  type: 'message',
  description: "Comando de latencia",
  aliases: ["p", "latencia"],
  category: "Utilidad",
  cooldown: 5,
  usage: "!ping"
}
```

**Comandos Slash:**
```typescript
{
  name: "userinfo",
  type: 'slash',
  description: "Información del usuario",
  cooldown: 10
}
```

### 2. ✅ Creación de Eventos via GUI

Soporte completo para crear y editar eventos de Discord.js:

#### Tipos de Eventos:

**A) Eventos Estándar:**
- ready
- messageCreate
- interactionCreate
- guildCreate/guildDelete
- guildMemberAdd/guildMemberRemove
- messageDelete/messageUpdate
- channelCreate/channelDelete
- Y más...

**B) Eventos Custom/Extras:**
Los eventos extras son funciones que detecta la aplicación en `src/events/extras/`. Estos son ejecutados desde eventos principales (como `messageCreate`).

Ejemplo detectado: `alliance.ts` - Función custom que maneja las alianzas del servidor.

#### Características:
- **Selector de eventos** de Discord.js
- **Editor Monaco** con snippets específicos
- **Detección automática** de eventos extras existentes
- **Validación** de nombres y rutas

### 3. ✅ Editor de Código con Monaco

El mismo editor usado en VS Code, con:

- **Tema oscuro personalizado** estilo VS Code
- **Autocompletado** de TypeScript
- **Detección de cambios** con indicador visual
- **Guardado rápido** con Ctrl+S
- **Minimap** y números de línea
- **Sintaxis highlighting** completo

### 4. ✅ Dashboard con Estadísticas

Panel lateral que muestra en tiempo real:

```
📝 Comandos Mensaje: X
⚡ Comandos Slash: Y
🎯 Eventos Estándar: Z
✨ Eventos Custom: W
━━━━━━━━━━━━━━━━━━
Total Comandos: X+Y
Total Eventos: Z+W
```

La aplicación **escanea automáticamente** tu proyecto y cuenta:
- Comandos por mensaje
- Comandos slash
- Eventos estándar (archivos .ts en `src/events/`)
- Eventos custom (archivos en `src/events/extras/`)

### 5. ✅ Explorador de Archivos

Navegación visual por todos los comandos y eventos:

**Comandos:**
- Icono 📝 para comandos de mensaje
- Icono ⚡ para comandos slash
- Organizado por categorías

**Eventos:**
- Icono 🎯 para eventos estándar
- Icono ✨ para eventos custom
- Lista alfabética

## 🏗️ Arquitectura de la Aplicación

### Frontend (Vue + TypeScript)

```
src/
├── components/
│   ├── Sidebar.vue           # Panel lateral con stats y navegación
│   ├── MonacoEditor.vue      # Editor de código principal
│   ├── CommandCreator.vue    # Creador de comandos
│   └── EventCreator.vue      # Creador de eventos
├── types/
│   └── bot.ts                # Tipos TypeScript del bot
├── App.vue                   # Componente principal
└── main.ts                   # Entry point
```

### Backend (Rust + Tauri)

```
src-tauri/src/
└── lib.rs                    # Comandos Rust expuestos a Vue
```

#### Comandos Tauri Implementados:

1. **`get_project_root()`**
   - Obtiene la ruta raíz del proyecto Amayo
   - Navega desde AEditor hacia arriba un nivel

2. **`scan_commands(projectRoot: String)`**
   - Escanea recursivamente `src/commands/`
   - Detecta comandos de mensaje y slash
   - Retorna lista de archivos con metadatos

3. **`scan_events(projectRoot: String)`**
   - Escanea `src/events/` (eventos estándar)
   - Escanea `src/events/extras/` (eventos custom)
   - Diferencia entre ambos tipos

4. **`get_project_stats(projectRoot: String)`**
   - Analiza todos los archivos
   - Cuenta comandos por tipo
   - Cuenta eventos por tipo
   - Lee contenido para determinar tipo exacto

5. **`read_file_content(filePath: String)`**
   - Lee archivos .ts del proyecto
   - Permite edición en el editor

6. **`write_file_content(filePath: String, content: String)`**
   - Guarda archivos modificados
   - Crea directorios si no existen
   - Mantiene estructura del proyecto

## 🎨 Interfaz de Usuario

### Diseño Estilo VS Code

La aplicación replica el look & feel de Visual Studio Code:

**Colores:**
- Background principal: `#1e1e1e`
- Paneles: `#252526`, `#2d2d30`
- Bordes: `#3e3e42`
- Texto: `#cccccc`, `#ffffff`
- Acentos: `#0e639c` (azul VS Code)
- Success: `#4ec9b0` (verde teal)

**Componentes:**
- Sidebar fijo a la izquierda
- Área principal responsive
- Headers con acciones
- Botones con hover effects
- Scrollbars personalizados

### Pantalla de Bienvenida

Cuando no hay archivo seleccionado:
```
🤖 Amayo Bot Editor
Editor estilo VS Code para tu bot de Discord

[Estadísticas grandes]
X Comandos Totales | Y Eventos Totales

[➕ Crear Comando] [➕ Crear Evento]

💡 Tip: Selecciona un archivo del panel izquierdo
```

## 📝 Flujo de Trabajo

### Crear un Comando Nuevo

1. Click en **"➕ Nuevo Comando"**
2. Se abre `CommandCreator.vue`
3. Completa el formulario:
   - Selecciona tipo (message/slash)
   - Ingresa nombre y descripción
   - Configura metadatos opcionales
4. Escribe código en Monaco Editor
5. Usa botón "📝 Insertar Snippet" si necesitas código común
6. Click en "➕ Crear Comando"
7. El archivo se guarda en la ruta correcta
8. Las estadísticas se actualizan automáticamente

### Editar un Comando Existente

1. Navega al comando en el sidebar
2. Click en el archivo
3. Se carga en `MonacoEditor.vue`
4. Edita el código
5. Guarda con Ctrl+S o botón "💾 Guardar"
6. Indicador "●" muestra cambios no guardados

### Crear un Evento Nuevo

1. Click en **"➕ Nuevo Evento"**
2. Se abre `EventCreator.vue`
3. Selecciona tipo (estándar/custom)
4. Si es estándar: elige el evento de Discord
5. Ingresa nombre de archivo
6. Escribe la lógica
7. Click en "➕ Crear Evento"
8. Se guarda en `src/events/` o `src/events/extras/`

### Editar un Evento Existente

Similar a editar comandos, pero con eventos del sidebar.

## 🔧 Integración con el Bot

### Estructura de Comandos Generados

**Comando de Mensaje:**
```typescript
import type { Message } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "ejemplo",
  description: "Comando de ejemplo",
  type: 'message' as const,
  category: "Utilidad",
  aliases: ["ej", "test"],
  cooldown: 5,
  async run(message: Message, args: string[], client: Amayo) {
    // Código generado aquí
    await message.reply("¡Ejemplo!");
  }
}
```

**Comando Slash:**
```typescript
import type { ChatInputCommandInteraction } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "ejemplo",
  description: "Comando slash de ejemplo",
  type: 'slash' as const,
  cooldown: 5,
  async run(interaction: ChatInputCommandInteraction, client: Amayo) {
    // Código generado aquí
    await interaction.reply({
      content: "¡Ejemplo!",
      ephemeral: true
    });
  }
}
```

### Estructura de Eventos Generados

**Evento Estándar:**
```typescript
import { bot } from "../main";
import { Events } from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Tu código aquí
  logger.info(`Mensaje de ${message.author.tag}`);
});
```

**Evento Custom:**
```typescript
import { Message } from "discord.js";
import logger from "../../core/lib/logger";

export async function myCustomHandler(message: Message) {
  try {
    // Tu lógica custom
  } catch (error) {
    logger.error({ err: error }, "Error en handler custom");
  }
}
```

## 📦 Snippets Disponibles

### Para Comandos de Mensaje:

- **Basic Reply**: `await message.reply("respuesta");`
- **Embed**: Estructura completa de embed
- **Error Handling**: Try-catch con reply de error

### Para Comandos Slash:

- **Basic Reply**: Con ephemeral
- **Embed Reply**: Embed en interacción
- **Defer Reply**: Para comandos que tardan

### Para Eventos:

- **Logger**: Mensajes de log
- **Try-Catch**: Error handling
- **Message Checks**: Validaciones comunes
- **Guild Checks**: Verificar guild
- **Prisma**: Ejemplo de uso de base de datos

## 🚀 Instalación y Ejecución

### Requisitos Previos

```bash
# Node.js 18+
node --version

# Rust (para Tauri)
rustc --version

# npm o yarn
npm --version
```

### Instalación

```bash
cd AEditor
npm install
```

### Desarrollo

```bash
# Iniciar en modo desarrollo
npm run dev

# En otra terminal (si Tauri no inicia automáticamente)
npm run tauri dev
```

### Compilación

```bash
# Compilar aplicación desktop
npm run tauri build

# El ejecutable estará en:
# src-tauri/target/release/aeditor.exe (Windows)
```

## 🎯 Características Técnicas

### Monaco Editor

- **Versión**: Latest
- **Lenguaje**: TypeScript configurado
- **Tema**: Custom dark theme (basado en VS Code)
- **Features**:
  - IntelliSense
  - Error checking
  - Auto-formatting
  - Multi-cursor
  - Find/Replace
  - Command palette

### Tauri

- **Versión**: 2.x
- **Características usadas**:
  - Invoke commands (comunicación Rust ↔ Vue)
  - File system access
  - Path manipulation
  - Recursive directory scanning

### Vue 3

- **Composition API** con `<script setup>`
- **TypeScript** strict mode
- **Reactive state** con `ref()`
- **Lifecycle hooks** (onMounted, onUnmounted)
- **Props & Emits** tipados

## 🔍 Detección de Comandos y Eventos

### Cómo Detecta los Comandos

1. Escanea recursivamente `src/commands/messages/**` y `src/commands/splashcmd/**`
2. Busca archivos `.ts`
3. Lee el contenido
4. Detecta el tipo buscando `type: 'message'` o `type: 'slash'`
5. Extrae metadatos del código

### Cómo Detecta los Eventos

1. **Eventos Estándar**:
   - Busca archivos `.ts` directamente en `src/events/`
   - Excluye carpeta `extras/`
   - Cada archivo es un evento estándar

2. **Eventos Custom**:
   - Busca archivos `.ts` en `src/events/extras/`
   - Detecta funciones exportadas
   - Marca como evento custom

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `App.vue`:

```css
--bg-primary: #1e1e1e;
--bg-secondary: #252526;
--border-color: #3e3e42;
--text-primary: #cccccc;
--accent-color: #0e639c;
```

### Agregar Más Snippets

En `CommandCreator.vue` o `EventCreator.vue`, edita el objeto `snippets`:

```typescript
const snippets = {
  mySnippet: `// Tu código aquí`,
};
```

### Agregar Más Eventos de Discord

En `EventCreator.vue`, agrega opciones al select:

```html
<option value="voiceStateUpdate">voiceStateUpdate</option>
```

## 🐛 Solución de Problemas

### "No se encontró el directorio de comandos"

**Causa**: La aplicación no encuentra `src/commands/`

**Solución**: 
1. Verifica que ejecutas desde `AEditor/`
2. Confirma que existe `../src/commands/` relativo a AEditor
3. Revisa la ruta en `get_project_root()` en `lib.rs`

### Monaco Editor no carga

**Causa**: Dependencias no instaladas

**Solución**:
```bash
npm install monaco-editor @vueuse/core
```

### Errores de compilación de Rust

**Causa**: Rust no está instalado o desactualizado

**Solución**:
```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Actualizar Rust
rustup update
```

### No se guardan los archivos

**Causa**: Permisos de escritura

**Solución**:
1. Ejecuta la app con permisos adecuados
2. Verifica que no hay archivos bloqueados
3. Confirma que las rutas son correctas

## 📚 Recursos Adicionales

### Discord.js
- [Documentación oficial](https://discord.js.org/)
- [Guía de Discord.js](https://discordjs.guide/)

### Tauri
- [Documentación de Tauri](https://tauri.app/)
- [API Reference](https://tauri.app/reference/)

### Monaco Editor
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/docs.html)
- [Playground](https://microsoft.github.io/monaco-editor/playground.html)

### Vue 3
- [Documentación oficial](https://vuejs.org/)
- [Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

## 🤝 Próximas Mejoras Sugeridas

1. **Validación de código**:
   - Lint en tiempo real
   - Verificación de sintaxis antes de guardar

2. **Git Integration**:
   - Ver cambios
   - Commit desde la app
   - Historial de versiones

3. **Testing**:
   - Ejecutar comandos en sandbox
   - Ver output en tiempo real

4. **Temas personalizables**:
   - Light theme
   - Más variantes de dark theme

5. **Multi-tab**:
   - Abrir múltiples archivos
   - Tabs estilo VS Code

6. **Search & Replace**:
   - Buscar en todos los archivos
   - Reemplazar en batch

7. **Terminal integrado**:
   - Ejecutar npm/node commands
   - Ver logs del bot

8. **Autocompletado mejorado**:
   - Sugerencias de Discord.js
   - IntelliSense de tu bot (client, prisma, etc.)

## 📄 Licencia

Este proyecto forma parte de Amayo Bot. Consulta la licencia del proyecto principal.

---

## 🎉 ¡Listo para Usar!

Tu editor está completamente funcional con todas las características solicitadas:

✅ Creación de comandos con GUI + Editor  
✅ Creación de eventos con GUI + Editor  
✅ Detección de eventos extras customizados  
✅ Contador de comandos mensaje/slash  
✅ Contador de eventos estándar/custom  
✅ Editor Monaco con snippets  
✅ Interfaz estilo VS Code  
✅ Sistema de guardado completo  

**¡Disfruta de tu nuevo editor visual para Amayo Bot! 🚀**
