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

        <!-- OPCIONES PARA COMANDOS SLASH -->
        <div v-if="commandData.type === 'slash'" class="options-section">
          <div class="options-header">
            <label>Estructura del Comando Slash</label>
            <div class="structure-selector">
              <button 
                @click="slashStructure = 'simple'" 
                type="button" 
                :class="['structure-btn', { active: slashStructure === 'simple' }]"
              >
                🎯 Simple
              </button>
              <button 
                @click="slashStructure = 'subcommands'" 
                type="button" 
                :class="['structure-btn', { active: slashStructure === 'subcommands' }]"
              >
                📁 Subcomandos
              </button>
              <button 
                @click="slashStructure = 'groups'" 
                type="button" 
                :class="['structure-btn', { active: slashStructure === 'groups' }]"
              >
                📂 Grupos
              </button>
            </div>
          </div>

          <!-- Información sobre la estructura seleccionada -->
          <div class="structure-info">
            <div v-if="slashStructure === 'simple'">
              <strong>Comando Simple:</strong> El comando tiene opciones directas (ej: <code>/ban usuario:@user razon:texto</code>)
            </div>
            <div v-if="slashStructure === 'subcommands'">
              <strong>Subcomandos:</strong> El comando tiene múltiples subcomandos (ej: <code>/config set</code>, <code>/config view</code>)
            </div>
            <div v-if="slashStructure === 'groups'">
              <strong>Grupos de Subcomandos:</strong> Subcomandos organizados en grupos (ej: <code>/config roles add</code>, <code>/config channels remove</code>)
            </div>
          </div>

          <!-- ESTRUCTURA SIMPLE: Opciones normales -->
          <div v-if="slashStructure === 'simple'">
            <div class="section-actions">
              <button @click="addOption" type="button" class="add-option-btn">+ Agregar Opción</button>
            </div>
            
            <div v-if="slashOptions.length === 0" class="no-options">
              <span>Sin opciones. Los usuarios no podrán pasar parámetros al comando.</span>
            </div>

          <div v-for="(option, index) in slashOptions" :key="index" class="option-item">
            <div class="option-header">
              <span class="option-number">Opción {{ index + 1 }}</span>
              <button @click="removeOption(index)" type="button" class="remove-option-btn">✕</button>
            </div>

            <div class="option-fields">
              <div class="form-group">
                <label>Nombre *</label>
                <input 
                  v-model="option.name" 
                  type="text" 
                  placeholder="usuario, cantidad, mensaje..."
                />
              </div>

              <div class="form-group">
                <label>Descripción *</label>
                <input 
                  v-model="option.description" 
                  type="text" 
                  placeholder="Describe este parámetro"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Tipo *</label>
                  <select v-model="option.type">
                    <option value="STRING">STRING - Texto</option>
                    <option value="INTEGER">INTEGER - Número entero</option>
                    <option value="BOOLEAN">BOOLEAN - Verdadero/Falso</option>
                    <option value="USER">USER - Mención de usuario</option>
                    <option value="CHANNEL">CHANNEL - Canal</option>
                    <option value="ROLE">ROLE - Rol</option>
                    <option value="NUMBER">NUMBER - Número decimal</option>
                    <option value="MENTIONABLE">MENTIONABLE - Usuario o Rol</option>
                    <option value="ATTACHMENT">ATTACHMENT - Archivo</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="checkbox-label-inline">
                    <input type="checkbox" v-model="option.required" />
                    <span>Obligatorio</span>
                  </label>
                </div>
              </div>

              <!-- Choices para STRING/INTEGER/NUMBER -->
              <div v-if="['STRING', 'INTEGER', 'NUMBER'].includes(option.type)" class="choices-section">
                <label>Opciones predefinidas (opcional)</label>
                <button @click="addChoice(index)" type="button" class="add-choice-btn">+ Agregar opción</button>
                
                <div v-for="(choice, choiceIndex) in option.choices" :key="choiceIndex" class="choice-item">
                  <input 
                    v-model="choice.name" 
                    type="text" 
                    placeholder="Nombre visible"
                    class="choice-input"
                  />
                  <input 
                    v-model="choice.value" 
                    :type="option.type === 'STRING' ? 'text' : 'number'"
                    placeholder="Valor"
                    class="choice-input"
                  />
                  <button @click="removeChoice(index, choiceIndex)" type="button" class="remove-choice-btn">✕</button>
                </div>
              </div>
            </div>
          </div>
          </div>

          <!-- ESTRUCTURA SUBCOMANDOS -->
          <div v-if="slashStructure === 'subcommands'">
            <div class="section-actions">
              <button @click="addSubcommand" type="button" class="add-option-btn">+ Agregar Subcomando</button>
            </div>
            
            <div v-if="subcommands.length === 0" class="no-options">
              <span>Sin subcomandos. Agrega al menos uno (ej: add, remove, list).</span>
            </div>

            <div v-for="(subcommand, subIndex) in subcommands" :key="subIndex" class="subcommand-item">
              <div class="subcommand-header">
                <span class="subcommand-badge">📌 Subcomando {{ subIndex + 1 }}</span>
                <button @click="removeSubcommand(subIndex)" type="button" class="remove-option-btn">✕</button>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Nombre del Subcomando *</label>
                  <input 
                    v-model="subcommand.name" 
                    type="text" 
                    placeholder="add, remove, set, view..."
                  />
                </div>
                <div class="form-group">
                  <label>Descripción *</label>
                  <input 
                    v-model="subcommand.description" 
                    type="text" 
                    placeholder="Describe este subcomando"
                  />
                </div>
              </div>

              <!-- Opciones del subcomando -->
              <div class="subcommand-options">
                <div class="options-header-small">
                  <label>Opciones del subcomando</label>
                  <button @click="addSubcommandOption(subIndex)" type="button" class="add-sub-option-btn">+ Opción</button>
                </div>

                <div v-if="subcommand.options.length === 0" class="no-sub-options">
                  Sin opciones para este subcomando
                </div>

                <div v-for="(option, optIndex) in subcommand.options" :key="optIndex" class="sub-option-item">
                  <div class="sub-option-header">
                    <span>Opción {{ optIndex + 1 }}</span>
                    <button @click="removeSubcommandOption(subIndex, optIndex)" type="button" class="remove-sub-btn">✕</button>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Nombre</label>
                      <input v-model="option.name" type="text" placeholder="parametro" />
                    </div>
                    <div class="form-group">
                      <label>Tipo</label>
                      <select v-model="option.type">
                        <option value="STRING">STRING</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="USER">USER</option>
                        <option value="ROLE">ROLE</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="checkbox-label-inline small">
                        <input type="checkbox" v-model="option.required" />
                        <span>Requerido</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Descripción</label>
                    <input v-model="option.description" type="text" placeholder="Describe el parámetro" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ESTRUCTURA GRUPOS -->
          <div v-if="slashStructure === 'groups'">
            <div class="section-actions">
              <button @click="addGroup" type="button" class="add-option-btn">+ Agregar Grupo</button>
            </div>
            
            <div v-if="commandGroups.length === 0" class="no-options">
              <span>Sin grupos. Agrega grupos para organizar subcomandos.</span>
            </div>

            <div v-for="(group, groupIndex) in commandGroups" :key="groupIndex" class="group-item">
              <div class="group-header">
                <span class="group-badge">📂 Grupo {{ groupIndex + 1 }}</span>
                <button @click="removeGroup(groupIndex)" type="button" class="remove-option-btn">✕</button>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Nombre del Grupo *</label>
                  <input v-model="group.name" type="text" placeholder="roles, channels..." />
                </div>
                <div class="form-group">
                  <label>Descripción *</label>
                  <input v-model="group.description" type="text" placeholder="Describe este grupo" />
                </div>
              </div>

              <div class="group-subcommands">
                <div class="options-header-small">
                  <label>Subcomandos</label>
                  <button @click="addGroupSubcommand(groupIndex)" type="button" class="add-sub-option-btn">+ Subcomando</button>
                </div>

                <div v-if="group.subcommands.length === 0" class="no-sub-options">
                  Sin subcomandos
                </div>

                <div v-for="(subcommand, subIndex) in group.subcommands" :key="subIndex" class="group-subcommand-item">
                  <div class="sub-option-header">
                    <span>📌 {{ subcommand.name || `Subcomando ${subIndex + 1}` }}</span>
                    <button @click="removeGroupSubcommand(groupIndex, subIndex)" type="button" class="remove-sub-btn">✕</button>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Nombre</label>
                      <input v-model="subcommand.name" type="text" placeholder="add, remove..." />
                    </div>
                    <div class="form-group">
                      <label>Descripción</label>
                      <input v-model="subcommand.description" type="text" placeholder="Describe" />
                    </div>
                  </div>

                  <div class="nested-options">
                    <button @click="addGroupSubcommandOption(groupIndex, subIndex)" type="button" class="add-nested-btn">+ Opción</button>
                    
                    <div v-for="(option, optIndex) in subcommand.options" :key="optIndex" class="nested-option-item">
                      <input v-model="option.name" type="text" placeholder="nombre" class="small-input" />
                      <select v-model="option.type" class="small-input">
                        <option value="STRING">STRING</option>
                        <option value="USER">USER</option>
                        <option value="ROLE">ROLE</option>
                      </select>
                      <input v-model="option.description" type="text" placeholder="descripción" class="small-input flex-grow" />
                      <label class="checkbox-label-inline tiny">
                        <input type="checkbox" v-model="option.required" />
                      </label>
                      <button @click="removeGroupSubcommandOption(groupIndex, subIndex, optIndex)" type="button" class="remove-nested-btn">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

// Opciones para comandos slash
interface SlashOption {
  name: string;
  description: string;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE' | 'NUMBER' | 'MENTIONABLE' | 'ATTACHMENT';
  required: boolean;
  choices?: { name: string; value: string | number }[];
}

const slashOptions = ref<SlashOption[]>([]);

// Estructura del comando slash
const slashStructure = ref<'simple' | 'subcommands' | 'groups'>('simple');

// Subcomandos (para estructura 'subcommands')
interface Subcommand {
  name: string;
  description: string;
  options: SlashOption[];
}
const subcommands = ref<Subcommand[]>([]);

// Grupos (para estructura 'groups')
interface CommandGroup {
  name: string;
  description: string;
  subcommands: Subcommand[];
}
const commandGroups = ref<CommandGroup[]>([]);

function addOption() {
  slashOptions.value.push({
    name: '',
    description: '',
    type: 'STRING',
    required: false,
    choices: []
  });
}

function removeOption(index: number) {
  slashOptions.value.splice(index, 1);
}

function addChoice(optionIndex: number) {
  if (!slashOptions.value[optionIndex].choices) {
    slashOptions.value[optionIndex].choices = [];
  }
  slashOptions.value[optionIndex].choices!.push({
    name: '',
    value: ''
  });
}

function removeChoice(optionIndex: number, choiceIndex: number) {
  slashOptions.value[optionIndex].choices?.splice(choiceIndex, 1);
}

// Funciones para subcomandos
function addSubcommand() {
  subcommands.value.push({
    name: '',
    description: '',
    options: []
  });
}

function removeSubcommand(index: number) {
  subcommands.value.splice(index, 1);
}

function addSubcommandOption(subIndex: number) {
  subcommands.value[subIndex].options.push({
    name: '',
    description: '',
    type: 'STRING',
    required: false
  });
}

function removeSubcommandOption(subIndex: number, optIndex: number) {
  subcommands.value[subIndex].options.splice(optIndex, 1);
}

// Funciones para grupos
function addGroup() {
  commandGroups.value.push({
    name: '',
    description: '',
    subcommands: []
  });
}

function removeGroup(index: number) {
  commandGroups.value.splice(index, 1);
}

function addGroupSubcommand(groupIndex: number) {
  commandGroups.value[groupIndex].subcommands.push({
    name: '',
    description: '',
    options: []
  });
}

function removeGroupSubcommand(groupIndex: number, subIndex: number) {
  commandGroups.value[groupIndex].subcommands.splice(subIndex, 1);
}

function addGroupSubcommandOption(groupIndex: number, subIndex: number) {
  commandGroups.value[groupIndex].subcommands[subIndex].options.push({
    name: '',
    description: '',
    type: 'STRING',
    required: false
  });
}

function removeGroupSubcommandOption(groupIndex: number, subIndex: number, optIndex: number) {
  commandGroups.value[groupIndex].subcommands[subIndex].options.splice(optIndex, 1);
}

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

// Watch para opciones de slash
watch(() => slashOptions.value, () => {
  if (editor && commandData.value.type === 'slash') {
    const currentPosition = editor.getPosition();
    const newCode = getDefaultCode();
    editor.setValue(newCode);
    if (currentPosition) {
      editor.setPosition(currentPosition);
    }
  }
}, { deep: true });

function getDefaultCode(): string {
  if (commandData.value.type === 'slash') {
    // Generar código de opciones para slash commands
    let optionsCode = '';
    if (slashOptions.value.length > 0) {
      const optionsArray = slashOptions.value.map(opt => {
        let optCode = `    {\n      name: "${opt.name}",\n      description: "${opt.description}",\n      type: ApplicationCommandOptionType.${opt.type},\n      required: ${opt.required}`;
        
        // Agregar choices si existen
        if (opt.choices && opt.choices.length > 0) {
          const choicesStr = opt.choices
            .filter(c => c.name && c.value)
            .map(c => `        { name: "${c.name}", value: ${typeof c.value === 'string' ? `"${c.value}"` : c.value} }`)
            .join(',\n');
          if (choicesStr) {
            optCode += `,\n      choices: [\n${choicesStr}\n      ]`;
          }
        }
        
        optCode += '\n    }';
        return optCode;
      }).join(',\n');
      
      optionsCode = `  options: [\n${optionsArray}\n  ],\n  `;
    }

    return `import type { ChatInputCommandInteraction } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import type Amayo from "../../core/client";

export default {
  name: "${commandData.value.name}",
  description: "${commandData.value.description}",
  type: 'slash' as const,
  ${optionsCode}${commandData.value.cooldown > 0 ? `cooldown: ${commandData.value.cooldown},\n  ` : ''}async run(interaction: ChatInputCommandInteraction, client: Amayo) {
    // Obtener opciones${slashOptions.value.length > 0 ? '\n    ' + slashOptions.value.map(opt => {
      const varName = opt.name.replace(/-/g, '_');
      if (opt.type === 'STRING') return `const ${varName} = interaction.options.getString("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'INTEGER' || opt.type === 'NUMBER') return `const ${varName} = interaction.options.getNumber("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'BOOLEAN') return `const ${varName} = interaction.options.getBoolean("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'USER') return `const ${varName} = interaction.options.getUser("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'CHANNEL') return `const ${varName} = interaction.options.getChannel("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'ROLE') return `const ${varName} = interaction.options.getRole("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'MENTIONABLE') return `const ${varName} = interaction.options.getMentionable("${opt.name}")${opt.required ? '!' : ''};`;
      if (opt.type === 'ATTACHMENT') return `const ${varName} = interaction.options.getAttachment("${opt.name}")${opt.required ? '!' : ''};`;
      return '';
    }).join('\n    ') : ''}

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

.checkbox-label-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  background-color: #2d2d30;
  border-radius: 4px;
  border: 1px solid #3e3e42;
  transition: all 0.2s;
  margin-top: 8px;
}

.checkbox-label-inline:hover {
  border-color: #4ec9b0;
  background-color: #353538;
}

.checkbox-label-inline input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4ec9b0;
}

.checkbox-label-inline span {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

/* Sección de Opciones para Slash Commands */
.options-section {
  margin: 24px 0;
  padding: 20px;
  background: linear-gradient(135deg, rgba(78, 201, 176, 0.05) 0%, rgba(14, 99, 156, 0.05) 100%);
  border: 2px solid rgba(78, 201, 176, 0.2);
  border-radius: 8px;
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.options-header label {
  font-size: 14px;
  font-weight: 600;
  color: #4ec9b0;
  margin: 0;
}

.add-option-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #4ec9b0 0%, #5fd4bf 100%);
  color: #1e1e1e;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(78, 201, 176, 0.3);
}

.add-option-btn:hover {
  background: linear-gradient(135deg, #5fd4bf 0%, #70dfc9 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(78, 201, 176, 0.4);
}

.no-options {
  padding: 20px;
  text-align: center;
  color: #858585;
  font-style: italic;
  font-size: 13px;
  background-color: #2d2d30;
  border-radius: 6px;
  border: 1px dashed #3e3e42;
}

.option-item {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.option-item:hover {
  border-color: #4ec9b0;
  box-shadow: 0 4px 12px rgba(78, 201, 176, 0.2);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3e3e42;
}

.option-number {
  font-size: 12px;
  font-weight: 700;
  color: #4ec9b0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.remove-option-btn {
  background: #ea4335;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-option-btn:hover {
  background: #f55a4e;
  transform: scale(1.1);
}

.option-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Choices Section */
.choices-section {
  margin-top: 12px;
  padding: 12px;
  background: rgba(14, 99, 156, 0.1);
  border: 1px solid rgba(14, 99, 156, 0.3);
  border-radius: 6px;
}

.choices-section label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1177bb;
}

.add-choice-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #0e639c 0%, #1177bb 100%);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(14, 99, 156, 0.3);
}

.add-choice-btn:hover {
  background: linear-gradient(135deg, #1177bb 0%, #1a8dd4 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(14, 99, 156, 0.4);
}

.choice-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.choice-input {
  flex: 1;
  padding: 6px 10px;
  background-color: #2d2d30;
  border: 1px solid #3e3e42;
  color: #cccccc;
  border-radius: 4px;
  font-size: 12px;
}

.choice-input:focus {
  outline: none;
  border-color: #1177bb;
  background-color: #252526;
}

.remove-choice-btn {
  background: #858585;
  color: #ffffff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-choice-btn:hover {
  background: #ea4335;
  transform: scale(1.1);
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

/* === ESTILOS PARA ESTRUCTURA DE COMANDOS SLASH === */
.structure-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.structure-btn {
  padding: 10px 18px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  color: #cccccc;
  border: 2px solid #3e3e42;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
}

.structure-btn:hover {
  border-color: #4ec9b0;
  background: linear-gradient(135deg, #353538 0%, #2d2d30 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.structure-btn.active {
  background: linear-gradient(135deg, #4ec9b0 0%, #5fd4bf 100%);
  color: #1e1e1e;
  border-color: #4ec9b0;
  box-shadow: 0 4px 12px rgba(78, 201, 176, 0.4);
  transform: translateY(-1px);
}

.structure-info {
  margin: 16px 0;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(14, 99, 156, 0.15) 0%, rgba(78, 201, 176, 0.08) 100%);
  border-left: 4px solid #4ec9b0;
  border-radius: 8px;
  font-size: 13px;
  color: #e0e0e0;
  line-height: 1.7;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.structure-info strong {
  color: #4ec9b0;
  font-weight: 700;
  font-size: 14px;
}

.structure-info code {
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #1177bb;
  border: 1px solid #3e3e42;
  white-space: nowrap;
}

.section-actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

/* === SUBCOMANDOS === */
.subcommand-item {
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border: 2px solid rgba(17, 119, 187, 0.4);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.subcommand-item:hover {
  border-color: rgba(17, 119, 187, 0.6);
  box-shadow: 0 6px 20px rgba(17, 119, 187, 0.3);
  transform: translateY(-2px);
}

.subcommand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(17, 119, 187, 0.3);
}

.subcommand-badge {
  font-size: 14px;
  font-weight: 700;
  color: #1177bb;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: linear-gradient(135deg, rgba(17, 119, 187, 0.25) 0%, rgba(14, 99, 156, 0.15) 100%);
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(17, 119, 187, 0.2);
}

.subcommand-options {
  margin-top: 20px;
  padding: 20px;
  background: rgba(30, 30, 30, 0.6);
  border-radius: 10px;
  border: 1px solid #3e3e42;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

.options-header-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.options-header-small label {
  font-size: 13px;
  font-weight: 600;
  color: #4ec9b0;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-sub-option-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #0e639c 0%, #1177bb 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(17, 119, 187, 0.3);
}

.add-sub-option-btn:hover {
  background: linear-gradient(135deg, #1177bb 0%, #1a8dd4 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(17, 119, 187, 0.4);
}

.no-sub-options {
  padding: 20px;
  text-align: center;
  color: #858585;
  font-style: italic;
  font-size: 13px;
  background: linear-gradient(135deg, #252526 0%, #1e1e1e 100%);
  border-radius: 8px;
  border: 2px dashed #3e3e42;
}

.sub-option-item {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sub-option-item:hover {
  border-color: #1177bb;
  box-shadow: 0 4px 10px rgba(17, 119, 187, 0.2);
}

.sub-option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #1177bb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.remove-sub-btn {
  background: linear-gradient(135deg, #858585 0%, #6a6a6a 100%);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.remove-sub-btn:hover {
  background: linear-gradient(135deg, #ea4335 0%, #f55a4e 100%);
  transform: scale(1.15);
  box-shadow: 0 3px 8px rgba(234, 67, 53, 0.4);
}

.checkbox-label-inline.small {
  padding: 8px 12px;
  margin-top: 0;
  font-size: 12px;
}

.checkbox-label-inline.tiny {
  padding: 6px 8px;
  margin: 0;
  min-width: auto;
}

/* === GRUPOS === */
.group-item {
  margin-bottom: 28px;
  padding: 28px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border: 2px solid rgba(255, 152, 0, 0.4);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-item:hover {
  border-color: rgba(255, 152, 0, 0.6);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
  transform: translateY(-2px);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(255, 152, 0, 0.3);
}

.group-badge {
  font-size: 14px;
  font-weight: 700;
  color: #ff9800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 152, 0, 0.15) 100%);
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.2);
}

.group-subcommands {
  margin-top: 20px;
  padding: 20px;
  background: rgba(30, 30, 30, 0.6);
  border-radius: 10px;
  border: 1px solid rgba(255, 152, 0, 0.2);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
}

.group-subcommand-item {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-subcommand-item:hover {
  border-color: #ff9800;
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.2);
}

/* === OPCIONES ANIDADAS === */
.nested-options {
  margin-top: 16px;
  padding: 16px;
  background: rgba(14, 99, 156, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(14, 99, 156, 0.3);
}

.add-nested-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #0e639c 0%, #1177bb 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(14, 99, 156, 0.3);
}

.add-nested-btn:hover {
  background: linear-gradient(135deg, #1177bb 0%, #1a8dd4 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(14, 99, 156, 0.4);
}

.nested-option-item {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
  padding: 8px;
  background: rgba(45, 45, 48, 0.5);
  border-radius: 6px;
  border: 1px solid #3e3e42;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nested-option-item:hover {
  border-color: #1177bb;
  background: rgba(45, 45, 48, 0.8);
}

.small-input {
  padding: 8px 10px;
  background: linear-gradient(135deg, #252526 0%, #1e1e1e 100%);
  border: 1px solid #3e3e42;
  color: #cccccc;
  border-radius: 6px;
  font-size: 12px;
  min-width: 90px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.small-input:focus {
  outline: none;
  border-color: #1177bb;
  background: #252526;
  box-shadow: 0 0 0 2px rgba(17, 119, 187, 0.2);
}

.small-input.flex-grow {
  flex: 1;
}

.remove-nested-btn {
  background: linear-gradient(135deg, #858585 0%, #6a6a6a 100%);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.remove-nested-btn:hover {
  background: linear-gradient(135deg, #ea4335 0%, #f55a4e 100%);
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(234, 67, 53, 0.4);
}
</style>
