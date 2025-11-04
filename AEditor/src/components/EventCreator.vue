<template>
  <div class="event-creator">
    <div class="creator-header">
      <h2>{{ isEditing ? 'Editar Evento' : 'Crear Nuevo Evento' }}</h2>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>

    <div class="creator-content">
      <div class="form-section">
        <div class="form-group">
          <label>Tipo de Evento *</label>
          <select v-model="eventData.eventType">
            <option value="standard">Evento Estándar de Discord.js</option>
            <option value="extra">Evento Custom/Extra</option>
          </select>
        </div>

        <div v-if="eventData.eventType === 'standard'" class="form-group">
          <label>Evento de Discord *</label>
          <select v-model="eventData.discordEvent">
            <option value="">Selecciona un evento...</option>
            <option value="ready">ready - Bot está listo</option>
            <option value="messageCreate">messageCreate - Nuevo mensaje</option>
            <option value="interactionCreate">interactionCreate - Interacción recibida</option>
            <option value="guildCreate">guildCreate - Bot añadido a servidor</option>
            <option value="guildDelete">guildDelete - Bot removido de servidor</option>
            <option value="guildMemberAdd">guildMemberAdd - Miembro se une</option>
            <option value="guildMemberRemove">guildMemberRemove - Miembro sale</option>
            <option value="messageDelete">messageDelete - Mensaje eliminado</option>
            <option value="messageUpdate">messageUpdate - Mensaje editado</option>
            <option value="channelCreate">channelCreate - Canal creado</option>
            <option value="channelDelete">channelDelete - Canal eliminado</option>
          </select>
        </div>

        <div class="form-group">
          <label>Nombre del Archivo *</label>
          <input 
            v-model="eventData.fileName" 
            type="text" 
            placeholder="myCustomEvent, allianceHandler..."
          />
          <small>Nombre del archivo .ts (sin extensión)</small>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea 
            v-model="eventData.description" 
            rows="3"
            placeholder="Describe qué hace este evento..."
          ></textarea>
        </div>

        <div class="form-group">
          <label>Ruta de Guardado *</label>
          <input 
            v-model="eventData.savePath" 
            type="text" 
            :placeholder="getDefaultPath()"
          />
          <small>La ruta relativa donde se guardará el archivo .ts</small>
        </div>

        <div v-if="eventData.eventType === 'extra'" class="info-box">
          <p><strong>ℹ️ Eventos Custom/Extra:</strong></p>
          <p>Los eventos extras son funciones que se ejecutan dentro de eventos estándar (como messageCreate). 
             Deben exportar una función que será llamada desde el evento principal.</p>
        </div>
      </div>

      <div class="editor-section">
        <div class="editor-header-small">
          <h3>Código del Evento</h3>
        </div>
        <div class="monaco-wrapper" ref="editorContainer"></div>
      </div>
    </div>

    <div class="creator-footer">
      <button @click="$emit('close')" class="cancel-btn">Cancelar</button>
      <button @click="saveEvent" :disabled="!isValid" class="save-btn">
        {{ isEditing ? '💾 Guardar Cambios' : '➕ Crear Evento' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as monaco from 'monaco-editor';
import type { Event } from '../types/bot';

const props = defineProps<{
  initialEvent?: Event;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  'save': [event: Event, code: string, savePath: string];
  'close': [];
}>();

const eventData = ref({
  fileName: '',
  eventType: 'standard' as 'standard' | 'extra',
  discordEvent: '',
  description: '',
  savePath: '',
});

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const isValid = computed(() => {
  if (eventData.value.eventType === 'standard') {
    return eventData.value.fileName.trim() !== '' && 
           eventData.value.discordEvent.trim() !== '' &&
           eventData.value.savePath.trim() !== '';
  }
  return eventData.value.fileName.trim() !== '' &&
         eventData.value.savePath.trim() !== '';
});

function getDefaultPath(): string {
  if (eventData.value.eventType === 'extra') {
    return `src/events/extras/${eventData.value.fileName}.ts`;
  }
  return `src/events/${eventData.value.fileName || eventData.value.discordEvent}.ts`;
}

watch(() => eventData.value, () => {
  if (!eventData.value.savePath || eventData.value.savePath === '') {
    eventData.value.savePath = getDefaultPath();
  }
  
  // Actualizar el editor en tiempo real con los cambios del formulario
  if (editor) {
    const currentPosition = editor.getPosition();
    const newCode = getDefaultCode();
    editor.setValue(newCode);
    if (currentPosition) {
      editor.setPosition(currentPosition);
    }
  }
}, { deep: true });

function getDefaultCode(): string {
  if (eventData.value.eventType === 'extra') {
    return `import { Message } from "discord.js";
import logger from "../../core/lib/logger";

/**
 * ${eventData.value.description || 'Función custom que se ejecuta desde messageCreate'}
 */
export async function ${eventData.value.fileName || 'customHandler'}(message: Message) {
  try {
    // Verificar condiciones
    if (message.author.bot) return;
    
    // Tu lógica aquí
    logger.info(\`Evento custom ejecutado para mensaje de \${message.author.tag}\`);
    
  } catch (error) {
    logger.error({ err: error }, "Error en evento custom");
  }
}
`;
  } else {
    const eventName = eventData.value.discordEvent || 'ready';
    const templates: Record<string, string> = {
      ready: `import { bot } from "../main";
import { Events } from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.ClientReady, async (client) => {
  logger.info(\`✅ Bot iniciado como \${client.user.tag}\`);
  
  // Tu código aquí
});
`,
      messageCreate: `import { bot } from "../main";
import { Events } from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Tu código aquí
  logger.info(\`Mensaje recibido de \${message.author.tag}\`);
});
`,
      interactionCreate: `import { bot } from "../main";
import { Events } from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.InteractionCreate, async (interaction) => {
  // Tu código aquí
  if (interaction.isChatInputCommand()) {
    logger.info(\`Comando slash: \${interaction.commandName}\`);
  }
});
`,
    };
    
    return templates[eventName] || `import { bot } from "../main";
import { Events } from "discord.js";
import logger from "../core/lib/logger";

bot.on(Events.${eventName.charAt(0).toUpperCase() + eventName.slice(1)}, async (...args) => {
  // Tu código aquí
  logger.info("Evento ${eventName} ejecutado");
});
`;
  }
}

function saveEvent() {
  if (!isValid.value || !editor) return;

  const code = editor.getValue();

  const event: Event = {
    name: eventData.value.fileName,
    type: eventData.value.eventType,
    eventName: eventData.value.eventType === 'standard' ? eventData.value.discordEvent : undefined,
    path: eventData.value.savePath,
    code: code,
  };

  emit('save', event, code, eventData.value.savePath);
}

onMounted(() => {
  if (editorContainer.value) {
    monaco.editor.defineTheme('vs-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      }
    });

    const initialCode = props.initialEvent?.code || getDefaultCode();

    editor = monaco.editor.create(editorContainer.value, {
      value: initialCode,
      language: 'typescript',
      theme: 'vs-dark-custom',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      tabSize: 2,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true
      },
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
    });

    // Registrar snippets personalizados para eventos
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: monaco.languages.CompletionItem[] = [
          {
            label: 'try-catch',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'try {',
              '\t${1:// Tu código aquí}',
              '} catch (error) {',
              '\tlogger.error({ err: error }, "${2:Error en evento}");',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-catch block con logger',
            range
          },
          {
            label: 'logger-info',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'logger.info("${1:Mensaje de log}");',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Log de información',
            range
          },
          {
            label: 'logger-error',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'logger.error({ err: ${1:error} }, "${2:Mensaje de error}");',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Log de error con contexto',
            range
          },
          {
            label: 'check-bot-message',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if (message.author.bot) return;',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Ignorar mensajes de bots',
            range
          },
          {
            label: 'check-guild',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if (!message.guild) return;',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Verificar si está en un servidor',
            range
          },
          {
            label: 'check-content',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'if (!message.content || message.content.trim() === "") return;',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Verificar contenido del mensaje',
            range
          },
          {
            label: 'prisma-findUnique',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'const ${1:result} = await prisma.${2:model}.findUnique({',
              '\twhere: { ${3:id}: ${4:value} }',
              '});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Buscar registro único en Prisma',
            range
          },
          {
            label: 'prisma-create',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'const ${1:result} = await prisma.${2:model}.create({',
              '\tdata: {',
              '\t\t${3:field}: ${4:value}',
              '\t}',
              '});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Crear registro en Prisma',
            range
          },
          {
            label: 'discord-embed',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'const embed = {',
              '\ttitle: "${1:Título}",',
              '\tdescription: "${2:Descripción}",',
              '\tcolor: 0x${3:0099ff},',
              '\tfields: [',
              '\t\t{ name: "${4:Campo}", value: "${5:Valor}", inline: ${6:true} }',
              '\t],',
              '\ttimestamp: new Date(),',
              '\tfooter: { text: "${7:Footer}" }',
              '};'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Embed de Discord',
            range
          },
          {
            label: 'event-ready',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'bot.on(Events.ClientReady, async (client) => {',
              '\tlogger.info(`✅ Bot iniciado como \\${client.user.tag}`);',
              '\t${1:// Tu código aquí}',
              '});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Evento ready de Discord',
            range
          },
          {
            label: 'event-messageCreate',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'bot.on(Events.MessageCreate, async (message) => {',
              '\tif (message.author.bot) return;',
              '\t${1:// Tu código aquí}',
              '});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Evento messageCreate de Discord',
            range
          }
        ];

        return { suggestions };
      }
    });
  }

  if (props.initialEvent) {
    eventData.value = {
      fileName: props.initialEvent.name,
      eventType: props.initialEvent.type,
      discordEvent: props.initialEvent.eventName || '',
      description: '',
      savePath: props.initialEvent.path,
    };
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.event-creator {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1e1e1e;
  color: #cccccc;
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.creator-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ffffff;
}

.close-btn {
  background: none;
  border: none;
  color: #cccccc;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

.close-btn:hover {
  color: #ffffff;
  background-color: #3e3e42;
  border-radius: 4px;
}

.creator-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.form-section {
  width: 400px;
  padding: 24px;
  overflow-y: auto;
  border-right: 1px solid #3e3e42;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  background-color: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #cccccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0e639c;
  background-color: #2d2d30;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #858585;
}

.info-box {
  padding: 12px;
  background-color: #2d2d30;
  border-left: 3px solid #0e639c;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
}

.info-box p {
  margin: 0 0 8px 0;
}

.info-box p:last-child {
  margin-bottom: 0;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: #252526;
  border-bottom: 1px solid #3e3e42;
}

.editor-header-small h3 {
  margin: 0;
  font-size: 14px;
  color: #ffffff;
}

.monaco-wrapper {
  flex: 1;
  overflow: hidden;
}

.creator-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background-color: #2d2d30;
  border-top: 1px solid #3e3e42;
}

.cancel-btn,
.save-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.cancel-btn {
  background-color: #3e3e42;
  color: #cccccc;
}

.cancel-btn:hover {
  background-color: #4e4e52;
}

.save-btn {
  background-color: #0e639c;
  color: #ffffff;
}

.save-btn:hover:not(:disabled) {
  background-color: #1177bb;
}

.save-btn:disabled {
  background-color: #3e3e42;
  opacity: 0.5;
  cursor: not-allowed;
}

.form-section::-webkit-scrollbar {
  width: 10px;
}

.form-section::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.form-section::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}
</style>
