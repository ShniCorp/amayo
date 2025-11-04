<template>
  <div class="command-creator">
    <div class="creator-header">
      <h2>{{ isEditing ? 'Editar Comando' : 'Crear Nuevo Comando' }}</h2>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>

    <div class="creator-content">
      <div class="form-section">
        <div class="form-group">
          <label>Tipo de Comando *</label>
          <select v-model="commandData.type">
            <option value="message">Comando por Mensaje (prefix)</option>
            <option value="slash">Comando Slash (/comando)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Nombre del Comando *</label>
          <input 
            v-model="commandData.name" 
            type="text" 
            placeholder="ping, help, user-info..."
          />
        </div>

        <div class="form-group">
          <label>Descripción *</label>
          <input 
            v-model="commandData.description" 
            type="text" 
            placeholder="Describe qué hace este comando"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Categoría</label>
            <input 
              v-model="commandData.category" 
              type="text" 
              placeholder="Utilidad, Diversión, Admin..."
            />
          </div>

          <div class="form-group">
            <label>Cooldown (segundos)</label>
            <input 
              v-model.number="commandData.cooldown" 
              type="number" 
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        <div v-if="commandData.type === 'message'" class="form-group">
          <label>Aliases (separados por coma)</label>
          <input 
            v-model="aliasesInput" 
            type="text" 
            placeholder="p, pong, latencia"
          />
        </div>

        <div v-if="commandData.type === 'message'" class="form-group">
          <label>Uso</label>
          <input 
            v-model="commandData.usage" 
            type="text" 
            placeholder="!comando [arg1] [arg2]"
          />
        </div>

        <div class="form-group">
          <label>Ruta de Guardado *</label>
          <input 
            v-model="commandData.savePath" 
            type="text" 
            :placeholder="getDefaultPath()"
          />
          <small>La ruta relativa donde se guardará el archivo .ts</small>
        </div>
      </div>

      <div class="editor-section">
        <div class="editor-header-small">
          <h3>Función run() - Lógica del Comando</h3>
        </div>
        <div class="monaco-wrapper" ref="editorContainer"></div>
      </div>
    </div>

    <div class="creator-footer">
      <button @click="$emit('close')" class="cancel-btn">Cancelar</button>
      <button @click="saveCommand" :disabled="!isValid" class="save-btn">
        {{ isEditing ? '💾 Guardar Cambios' : '➕ Crear Comando' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as monaco from 'monaco-editor';
import type { Command } from '../types/bot';

const props = defineProps<{
  initialCommand?: Command;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  'save': [command: Command, code: string, savePath: string];
  'close': [];
}>();

const commandData = ref({
  name: '',
  type: 'message' as 'message' | 'slash',
  description: '',
  category: '',
  cooldown: 0,
  usage: '',
  savePath: '',
});

const aliasesInput = ref('');
const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const isValid = computed(() => {
  return commandData.value.name.trim() !== '' && 
         commandData.value.description.trim() !== '' &&
         commandData.value.savePath.trim() !== '';
});

function getDefaultPath(): string {
  const type = commandData.value.type === 'slash' ? 'splashcmd' : 'messages';
  const category = commandData.value.category?.toLowerCase() || 'others';
  return `src/commands/${type}/${category}/${commandData.value.name}.ts`;
}

watch(() => commandData.value, () => {
  if (!commandData.value.savePath || commandData.value.savePath === '') {
    commandData.value.savePath = getDefaultPath();
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

// Watch para aliases que también actualiza el editor
watch(() => aliasesInput.value, () => {
  if (editor) {
    const currentPosition = editor.getPosition();
    const newCode = getDefaultCode();
    editor.setValue(newCode);
    if (currentPosition) {
      editor.setPosition(currentPosition);
    }
  }
});

function getDefaultCode(): string {
  if (commandData.value.type === 'slash') {
    return `import type { ChatInputCommandInteraction } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "${commandData.value.name}",
  description: "${commandData.value.description}",
  type: 'slash' as const,
  ${commandData.value.cooldown > 0 ? `cooldown: ${commandData.value.cooldown},\n  ` : ''}async run(interaction: ChatInputCommandInteraction, client: Amayo) {
    // Tu código aquí
    await interaction.reply({
      content: "¡Comando ${commandData.value.name} ejecutado!",
      ephemeral: true
    });
  }
}`;
  } else {
    return `import type { Message } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "${commandData.value.name}",
  description: "${commandData.value.description}",
  type: 'message' as const,
  ${commandData.value.category ? `category: "${commandData.value.category}",\n  ` : ''}${commandData.value.usage ? `usage: "${commandData.value.usage}",\n  ` : ''}${aliasesInput.value ? `aliases: [${aliasesInput.value.split(',').map(a => `"${a.trim()}"`).join(', ')}],\n  ` : ''}${commandData.value.cooldown > 0 ? `cooldown: ${commandData.value.cooldown},\n  ` : ''}async run(message: Message, args: string[], client: Amayo) {
    // Tu código aquí
    await message.reply("¡Comando ${commandData.value.name} ejecutado!");
  }
}`;
  }
}

function saveCommand() {
  if (!isValid.value || !editor) return;

  const code = editor.getValue();
  const aliases = aliasesInput.value
    .split(',')
    .map(a => a.trim())
    .filter(a => a !== '');

  const command: Command = {
    name: commandData.value.name,
    type: commandData.value.type,
    description: commandData.value.description,
    cooldown: commandData.value.cooldown > 0 ? commandData.value.cooldown : undefined,
    run: code,
  } as Command;

  if (commandData.value.type === 'message') {
    (command as any).category = commandData.value.category || undefined;
    (command as any).usage = commandData.value.usage || undefined;
    if (aliases.length > 0) {
      (command as any).aliases = aliases;
    }
  }

  emit('save', command, code, commandData.value.savePath);
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

    const initialCode = props.initialCommand?.run || getDefaultCode();

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

    // Configurar autocompletado para Discord.js + TypeScript snippets nativos
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
    });

    // Habilitar snippets de TypeScript nativos y Discord.js
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
              '\tconsole.error(error);',
              '\t${2:// Manejo de error}',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-catch block',
            range
          },
          {
            label: 'async-function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'async function ${1:name}(${2:params}) {',
              '\t${3:// Código asíncrono}',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Async function declaration',
            range
          },
          {
            label: 'discord-embed',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'embeds: [{',
              '\ttitle: "${1:Título}",',
              '\tdescription: "${2:Descripción}",',
              '\tcolor: 0x${3:0099ff},',
              '\tfields: [',
              '\t\t{ name: "${4:Campo}", value: "${5:Valor}", inline: ${6:true} }',
              '\t],',
              '\ttimestamp: new Date(),',
              '\tfooter: { text: "${7:Footer}" }',
              '}]'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Discord embed structure',
            range
          },
          {
            label: 'message-reply',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'await message.reply("${1:Mensaje}");',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Responder a un mensaje',
            range
          },
          {
            label: 'interaction-reply',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'await interaction.reply({ content: "${1:Mensaje}", ephemeral: ${2:true} });',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Responder a una interacción slash',
            range
          },
          {
            label: 'interaction-defer',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'await interaction.deferReply({ ephemeral: ${1:true} });',
              '${2:// Tu código largo aquí}',
              'await interaction.editReply({ content: "${3:¡Listo!}" });'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Diferir respuesta de interacción',
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
            label: 'prisma-update',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'const ${1:result} = await prisma.${2:model}.update({',
              '\twhere: { ${3:id}: ${4:value} },',
              '\tdata: {',
              '\t\t${5:field}: ${6:newValue}',
              '\t}',
              '});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Actualizar registro en Prisma',
            range
          },
          {
            label: 'check-permissions',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'if (!message.member?.permissions.has("${1:Administrator}")) {',
              '\treturn message.reply("❌ No tienes permisos.");',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Verificar permisos del usuario',
            range
          },
          {
            label: 'check-args',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'if (args.length < ${1:1}) {',
              '\treturn message.reply("❌ Uso: ${2:!comando <arg>}");',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Verificar argumentos del comando',
            range
          }
        ];

        return { suggestions };
      }
    });
  }

  // Cargar datos si está editando
  if (props.initialCommand) {
    commandData.value = {
      name: props.initialCommand.name,
      type: props.initialCommand.type,
      description: props.initialCommand.description || '',
      category: (props.initialCommand as any).category || '',
      cooldown: props.initialCommand.cooldown || 0,
      usage: (props.initialCommand as any).usage || '',
      savePath: '',
    };
    
    if (props.initialCommand.type === 'message') {
      aliasesInput.value = ((props.initialCommand as any).aliases || []).join(', ');
    }
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.command-creator {
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

.code-preview {
  margin-bottom: 24px;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  overflow: hidden;
  background-color: #1e1e1e;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

.preview-badge {
  font-size: 10px;
  padding: 3px 8px;
  background-color: #4ec9b0;
  color: #1e1e1e;
  border-radius: 3px;
  font-weight: 600;
}

.preview-code {
  margin: 0;
  padding: 12px;
  background-color: #1e1e1e;
  overflow-x: auto;
  max-height: 200px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #d4d4d4;
}

.preview-code code {
  white-space: pre;
  color: #d4d4d4;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  background-color: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #cccccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
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

/* Scrollbar */
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
