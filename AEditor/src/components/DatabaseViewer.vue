<template>
  <div class="db-viewer">
    <div class="db-tabs">
      <button 
        :class="['db-tab', { active: currentTab === 'schema' }]"
        @click="currentTab = 'schema'"
      >
        📝 Schema
      </button>
      <button 
        :class="['db-tab', { active: currentTab === 'diagram' }]"
        @click="currentTab = 'diagram'"
      >
        🗺️ Diagrama
      </button>
    </div>

    <!-- Vista del Schema (Editor Monaco) - Usar v-show para mantenerlo montado -->
    <div v-show="currentTab === 'schema'" class="schema-editor">
      <div ref="schemaEditorContainer" class="monaco-container"></div>
    </div>

    <!-- Vista del Diagrama (Visual) -->
    <div v-show="currentTab === 'diagram'" class="diagram-view">
      <div class="diagram-canvas" ref="diagramCanvas">
        <div 
          v-for="table in tables" 
          :key="table.name"
          class="table-card"
        >
          <div class="table-header">
            <span class="table-icon">🗃️</span>
            <span class="table-name">{{ table.name }}</span>
          </div>
          <div class="table-fields">
            <div v-for="field in table.fields" :key="field.name" class="table-field">
              <span :class="['field-icon', { primary: field.isPrimary }]">
                {{ field.isPrimary ? '🔑' : '●' }}
              </span>
              <span class="field-name">{{ field.name }}</span>
              <span class="field-type">{{ field.type }}</span>
            </div>
          </div>
          <div v-if="table.relations.length > 0" class="table-relations">
            <div class="relations-title">🔗 Relaciones</div>
            <div v-for="rel in table.relations" :key="rel" class="relation-item">
              {{ rel }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as monaco from 'monaco-editor';

interface TableField {
  name: string;
  type: string;
  isPrimary: boolean;
}

interface Table {
  name: string;
  fields: TableField[];
  relations: string[];
  x: number;
  y: number;
}

const props = defineProps<{
  schemaContent: string;
  projectRoot: string;
}>();

const emit = defineEmits<{
  'save': [content: string];
}>();

const currentTab = ref<'schema' | 'diagram'>('schema');
const schemaEditorContainer = ref<HTMLElement | null>(null);
let schemaEditor: monaco.editor.IStandaloneCodeEditor | null = null;

const tables = ref<Table[]>([]);

// Watch para actualizar el editor cuando cambie schemaContent
watch(() => props.schemaContent, (newContent) => {
  if (schemaEditor && schemaEditor.getValue() !== newContent) {
    schemaEditor.setValue(newContent);
  }
  parseSchema();
});

// Parsear el schema de Prisma para extraer tablas
function parseSchema() {
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  const fieldRegex = /(\w+)\s+([\w\[\]?]+)(?:.*@id)?/g;
  
  const parsedTables: Table[] = [];
  let match;
  
  while ((match = modelRegex.exec(props.schemaContent)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];
    
    const fields: TableField[] = [];
    const relations: string[] = [];
    
    const fieldMatches = tableBody.matchAll(fieldRegex);
    for (const fieldMatch of fieldMatches) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isPrimary = tableBody.includes(`${fieldName}.*@id`);
      
      if (!['model', 'enum'].includes(fieldName)) {
        fields.push({
          name: fieldName,
          type: fieldType,
          isPrimary
        });
      }
    }
    
    // Buscar relaciones
    const relationMatches = tableBody.matchAll(/(\w+)\s+(\w+)(?:\[\])?/g);
    for (const relMatch of relationMatches) {
      const relType = relMatch[2];
      if (relType[0] === relType[0].toUpperCase() && relType !== 'String' && relType !== 'Int' && relType !== 'Boolean' && relType !== 'DateTime' && relType !== 'Json') {
        if (!relations.includes(relType)) {
          relations.push(relType);
        }
      }
    }
    
    parsedTables.push({
      name: tableName,
      fields: fields,
      relations,
      x: 0,
      y: 0
    });
  }
  
  tables.value = parsedTables;
}

onMounted(() => {
  // Crear editor Monaco para el schema
  if (schemaEditorContainer.value) {
    schemaEditor = monaco.editor.create(schemaEditorContainer.value, {
      value: props.schemaContent,
      language: 'prisma',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 13,
      lineNumbers: 'on',
      readOnly: false,
    });

    // Guardar con Ctrl+S
    schemaEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (schemaEditor) {
        emit('save', schemaEditor.getValue());
      }
    });
  }
  
  // Parsear el schema para el diagrama
  parseSchema();
});

onUnmounted(() => {
  if (schemaEditor) {
    schemaEditor.dispose();
  }
});
</script>

<style scoped>
.db-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
}

.db-tabs {
  display: flex;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.db-tab {
  padding: 12px 24px;
  background: none;
  border: none;
  color: #cccccc;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.db-tab:hover {
  background-color: #3e3e42;
  color: #ffffff;
}

.db-tab.active {
  color: #ffffff;
  border-bottom-color: #0e639c;
  background-color: #1e1e1e;
}

.schema-editor {
  flex: 1;
  overflow: hidden;
}

.monaco-container {
  width: 100%;
  height: 100%;
}

.diagram-view {
  flex: 1;
  overflow: auto;
  background-color: #1e1e1e;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

.diagram-canvas {
  position: relative;
  min-width: max-content;
  min-height: max-content;
  padding: 30px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-content: flex-start;
}

.table-card {
  width: 240px;
  background-color: #1f1f1f;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.2s;
  position: relative;
}

.table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  border-color: #007acc;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border-bottom: 2px solid #007acc;
}

.table-icon {
  font-size: 16px;
}

.table-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.table-fields {
  padding: 8px 0;
  max-height: none;
  overflow-y: visible;
}

.table-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  transition: background-color 0.15s;
}

.table-field:hover {
  background-color: #2d2d30;
}

.field-icon {
  font-size: 8px;
  opacity: 0.7;
  color: #858585;
}

.field-icon.primary {
  opacity: 1;
  font-size: 12px;
}

.field-name {
  flex: 1;
  color: #d4d4d4;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-type {
  color: #4ec9b0;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 500;
}

.table-relations {
  padding: 10px 12px;
  background-color: #252526;
  border-top: 1px solid #3e3e42;
  max-height: none;
  overflow-y: visible;
}

.relations-title {
  color: #d7ba7d;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
}

.relation-item {
  color: #d4d4d4;
  font-size: 11px;
  margin-bottom: 4px;
  padding: 4px 8px;
  background-color: #1e1e1e;
  border-left: 3px solid #007acc;
  border-radius: 2px;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
