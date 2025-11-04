<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="header-title">
        <h2>Amayo Bot Editor</h2>
      </div>
      <div class="header-actions">
        <button @click="emit('toggle-database')" class="icon-btn" title="Base de Datos">
          🗄️
        </button>
        <button 
          @click="emit('toggle-dev-ultra')" 
          :class="['icon-btn', 'dev-ultra-btn', { active: devUltraMode }]" 
          title="Modo Dev Ultra"
        >
          ⚡
        </button>
        <button @click="emit('change-directory')" class="icon-btn" title="Cambiar directorio">
          📁
        </button>
      </div>
    </div>
    
    <div class="project-path">
      <span class="path-label">Proyecto:</span>
      <span class="path-value">{{ truncatePath(projectRoot) }}</span>
    </div>

    <div class="actions-section">
      <button @click="emit('new-command')" class="action-btn primary">
        ➕ Nuevo Comando
      </button>
      <button @click="emit('new-event')" class="action-btn primary">
        ➕ Nuevo Evento
      </button>
      <button @click="emit('toggle-env-manager')" class="action-btn env-manager">
        🔐 Variables ENV
      </button>
      <button @click="emit('refresh')" class="action-btn secondary">
        🔄 Refrescar
      </button>
    </div>

    <div class="files-section">
      <!-- Sección de Comandos -->
      <div class="section-group">
        <div class="section-header" @click="toggleSection('commands')">
          <span class="section-icon">{{ sectionsExpanded.commands ? '📂' : '📁' }}</span>
          <h3 class="section-title">Comandos</h3>
          <span class="section-count">{{ stats.totalCommands }}</span>
        </div>
        
        <div v-if="sectionsExpanded.commands" class="section-content">
          <!-- Subsección Comandos Mensaje -->
          <div class="subsection">
            <div class="subsection-header" @click="toggleSubsection('messageCommands')">
              <span class="subsection-icon">📝</span>
              <span class="subsection-title">Comandos Mensaje</span>
              <span class="subsection-count">{{ stats.messageCommands }}</span>
            </div>
            <FileExplorer
              v-if="subsectionsExpanded.messageCommands"
              :files="props.commands.filter(c => c.commandType === 'message')"
              :selected-file="selectedFile"
              :project-root="projectRoot"
              base-path="commands"
              @select-file="(file) => emit('select-file', file)"
              @refresh="emit('refresh')"
              @notify="(msg, type) => emit('notify', msg, type)"
            />
          </div>

          <!-- Subsección Comandos Slash -->
          <div class="subsection">
            <div class="subsection-header" @click="toggleSubsection('slashCommands')">
              <span class="subsection-icon">⚡</span>
              <span class="subsection-title">Comandos Slash</span>
              <span class="subsection-count">{{ stats.slashCommands }}</span>
            </div>
            <FileExplorer
              v-if="subsectionsExpanded.slashCommands"
              :files="props.commands.filter(c => c.commandType === 'slash')"
              :selected-file="selectedFile"
              :project-root="projectRoot"
              base-path="commands"
              @select-file="(file) => emit('select-file', file)"
              @refresh="emit('refresh')"
              @notify="(msg, type) => emit('notify', msg, type)"
            />
          </div>
        </div>
      </div>

      <!-- Sección de Eventos -->
      <div class="section-group">
        <div class="section-header" @click="toggleSection('events')">
          <span class="section-icon">{{ sectionsExpanded.events ? '📂' : '📁' }}</span>
          <h3 class="section-title">Eventos</h3>
          <span class="section-count">{{ stats.totalEvents }}</span>
        </div>
        
        <div v-if="sectionsExpanded.events" class="section-content">
          <!-- Subsección Eventos Estándar -->
          <div class="subsection">
            <div class="subsection-header" @click="toggleSubsection('standardEvents')">
              <span class="subsection-icon">🎯</span>
              <span class="subsection-title">Eventos Estándar</span>
              <span class="subsection-count">{{ stats.standardEvents }}</span>
            </div>
            <FileExplorer
              v-if="subsectionsExpanded.standardEvents"
              :files="props.events.filter(e => e.eventType === 'standard')"
              :selected-file="selectedFile"
              :project-root="projectRoot"
              base-path="events"
              @select-file="(file) => emit('select-file', file)"
              @refresh="emit('refresh')"
              @notify="(msg, type) => emit('notify', msg, type)"
            />
          </div>

          <!-- Subsección Eventos Custom -->
          <div class="subsection">
            <div class="subsection-header" @click="toggleSubsection('customEvents')">
              <span class="subsection-icon">✨</span>
              <span class="subsection-title">Eventos Custom</span>
              <span class="subsection-count">{{ stats.customEvents }}</span>
            </div>
            <FileExplorer
              v-if="subsectionsExpanded.customEvents"
              :files="props.events.filter(e => e.eventType === 'extra')"
              :selected-file="selectedFile"
              :project-root="projectRoot"
              base-path="events"
              @select-file="(file) => emit('select-file', file)"
              @refresh="emit('refresh')"
              @notify="(msg, type) => emit('notify', msg, type)"
            />
          </div>
        </div>
      </div>

      <!-- Sección Ultra Mode: Todos los archivos del proyecto -->
      <div v-if="devUltraMode" class="section-group ultra-mode">
        <div class="section-header" @click="toggleSection('allFiles')">
          <span class="section-icon">{{ sectionsExpanded.allFiles ? '📂' : '📁' }}</span>
          <h3 class="section-title">⚡ Archivos del Proyecto</h3>
          <span class="section-count">{{ allFiles.length }}</span>
        </div>
        
        <FileExplorer
          v-if="sectionsExpanded.allFiles"
          :files="allFiles"
          :selected-file="selectedFile"
          :project-root="projectRoot"
          base-path=""
          @select-file="(file) => emit('select-file', file)"
          @refresh="emit('refresh')"
          @notify="(msg, type) => emit('notify', msg, type)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileExplorer from './FileExplorer.vue';
import type { ProjectStats, FileInfo } from '../types/bot';

const props = defineProps<{
  stats: ProjectStats;
  commands: FileInfo[];
  events: FileInfo[];
  allFiles: FileInfo[];
  selectedFile: FileInfo | null;
  projectRoot: string;
  devUltraMode?: boolean;
}>();

const emit = defineEmits<{
  'new-command': [];
  'new-event': [];
  'refresh': [];
  'select-file': [file: FileInfo];
  'change-directory': [];
  'toggle-dev-ultra': [];
  'toggle-database': [];
  'toggle-env-manager': [];
  'notify': [message: string, type: 'success' | 'error' | 'info'];
}>();

// Estado de expansión de secciones
const sectionsExpanded = ref({
  commands: true,
  events: true,
  allFiles: false
});

const subsectionsExpanded = ref({
  messageCommands: true,
  slashCommands: true,
  standardEvents: true,
  customEvents: true
});

function toggleSection(section: 'commands' | 'events' | 'allFiles') {
  sectionsExpanded.value[section] = !sectionsExpanded.value[section];
}

function toggleSubsection(subsection: keyof typeof subsectionsExpanded.value) {
  subsectionsExpanded.value[subsection] = !subsectionsExpanded.value[subsection];
}

function truncatePath(path: string): string {
  if (!path) return 'No seleccionado';
  const parts = path.split(/[/\\]/);
  if (parts.length > 3) {
    return '.../' + parts.slice(-2).join('/');
  }
  return path;
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  background-color: #252526;
  color: #cccccc;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #3e3e42;
}

.sidebar-header {
  padding: 12px 16px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.header-title h2 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  flex: 1;
}

.icon-btn:hover {
  background-color: #4e4e52;
  transform: translateY(-1px);
}

.dev-ultra-btn {
  position: relative;
}

.dev-ultra-btn.active {
  background-color: #0e639c;
  border-color: #1177bb;
  box-shadow: 0 0 10px rgba(14, 99, 156, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(14, 99, 156, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(14, 99, 156, 0.8);
  }
}

.project-path {
  padding: 8px 16px;
  background-color: #1e1e1e;
  border-bottom: 1px solid #3e3e42;
  font-size: 11px;
}

.path-label {
  color: #858585;
  margin-right: 6px;
}

.path-value {
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
}

.actions-section {
  padding: 12px;
  background-color: #1e1e1e;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  text-align: left;
}

.action-btn.primary {
  background-color: #0e639c;
  color: #ffffff;
}

.action-btn.primary:hover {
  background-color: #1177bb;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background-color: #3c3c3c;
  color: #cccccc;
  border: 1px solid #3e3e42;
}

.action-btn.secondary:hover {
  background-color: #4e4e52;
}

.action-btn.env-manager {
  background-color: #4ec9b0;
  color: #1e1e1e;
}

.action-btn.env-manager:hover {
  background-color: #5fd4bf;
  transform: translateY(-1px);
}

.files-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section-group {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.section-header:hover {
  background-color: #2d2d30;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.section-count {
  background-color: #3c3c3c;
  color: #cccccc;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.section-content {
  padding-left: 8px;
}

.subsection {
  margin-bottom: 4px;
}

.subsection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.subsection-header:hover {
  background-color: #2d2d30;
}

.subsection-icon {
  font-size: 14px;
}

.subsection-title {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  font-weight: 500;
}

.subsection-count {
  background-color: #3c3c3c;
  color: #858585;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

.file-list {
  padding-left: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 2px solid transparent;
}

.file-item:hover {
  background-color: #2d2d30;
}

.file-item.active {
  background-color: #3e3e42;
  border-left-color: #0e639c;
}

.file-icon {
  font-size: 13px;
  opacity: 0.8;
}

.file-name {
  font-size: 12px;
  color: #cccccc;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.file-path {
  font-size: 10px;
  color: #858585;
  font-family: 'Consolas', 'Monaco', monospace;
  margin-left: auto;
  padding-left: 8px;
}

.ultra-mode {
  border: 2px solid #0e639c;
  border-radius: 8px;
  margin-top: 8px;
  background: linear-gradient(135deg, rgba(14, 99, 156, 0.1) 0%, rgba(14, 99, 156, 0.05) 100%);
}

.ultra-mode .section-header {
  background-color: rgba(14, 99, 156, 0.2);
}

.empty-list {
  padding: 8px 16px;
  font-size: 11px;
  color: #858585;
  font-style: italic;
}

.sidebar::-webkit-scrollbar {
  width: 10px;
}

.sidebar::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
.sidebar .section-title {
  background-color: #2d2d30;
  font-weight: 600;
  color: #4ec9b0;
}

.stat-label {
  color: #cccccc;
}

.stat-value {
  color: #4ec9b0;
  font-weight: 600;
}

.stat-divider {
  height: 1px;
  background-color: #3e3e42;
  margin: 8px 0;
}

.actions-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid #3e3e42;
}

.action-btn {
  padding: 8px 12px;
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #1177bb;
}

.action-btn.secondary {
  background-color: #3e3e42;
}

.action-btn.secondary:hover {
  background-color: #4e4e52;
}

.files-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section-title {
  padding: 8px 16px;
  position: sticky;
  top: 0;
  background-color: #252526;
  z-index: 1;
}

.section-title h3 {
  margin: 0;
  font-size: 13px;
  color: #cccccc;
  font-weight: 600;
}

.file-list {
  padding: 0 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 2px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #2a2d2e;
}

.file-item.active {
  background-color: #37373d;
  color: #ffffff;
}

.file-icon {
  margin-right: 8px;
  font-size: 14px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Estilos para carpetas jerárquicas */
.folder-group {
  margin: 8px 0;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #cccccc;
  background-color: #252526;
  border-left: 3px solid #007acc;
  border-radius: 3px;
}

.file-item.in-folder {
  margin-left: 20px;
  border-left: 2px solid #3e3e42;
  padding-left: 12px;
}

.file-item.in-folder:hover {
  border-left-color: #007acc;
}

/* Scrollbar personalizado */
.sidebar::-webkit-scrollbar,
.files-section::-webkit-scrollbar {
  width: 10px;
}

.sidebar::-webkit-scrollbar-track,
.files-section::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.sidebar::-webkit-scrollbar-thumb,
.files-section::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.files-section::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}
</style>
