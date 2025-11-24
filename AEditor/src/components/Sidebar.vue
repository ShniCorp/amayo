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
  'toggle-gemini-settings': [];
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
  background: linear-gradient(180deg, #252526 0%, #1e1e1e 100%);
  color: #cccccc;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #3e3e42;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
}

.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}

.sidebar-header {
  padding: 16px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border-bottom: 1px solid #3e3e42;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-title h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #4ec9b0 0%, #0e639c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: linear-gradient(135deg, #3c3c3c 0%, #2d2d30 100%);
  border: 1px solid #3e3e42;
  font-size: 16px;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.icon-btn:hover {
  background: linear-gradient(135deg, #4e4e52 0%, #3c3c3c 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.dev-ultra-btn {
  position: relative;
}

.dev-ultra-btn.active {
  background: linear-gradient(135deg, #0e639c 0%, #1177bb 100%);
  border-color: #1177bb;
  box-shadow: 0 0 15px rgba(14, 99, 156, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(14, 99, 156, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 25px rgba(14, 99, 156, 0.9), 0 6px 12px rgba(0, 0, 0, 0.4);
  }
}

.project-path {
  padding: 12px 16px;
  background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
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
  background: linear-gradient(180deg, #252526 0%, #1e1e1e 100%);
  border-bottom: 1px solid #3e3e42;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.action-btn.primary {
  background: linear-gradient(135deg, #0e639c 0%, #1177bb 100%);
  color: #ffffff;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #1177bb 0%, #1a8dd4 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(14, 99, 156, 0.4);
}

.action-btn.secondary {
  background: linear-gradient(135deg, #3c3c3c 0%, #2d2d30 100%);
  color: #cccccc;
  border: 1px solid #3e3e42;
}

.action-btn.secondary:hover {
  background: linear-gradient(135deg, #4e4e52 0%, #3c3c3c 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(60, 60, 60, 0.4);
}

.action-btn.env-manager {
  background: linear-gradient(135deg, #4ec9b0 0%, #5fd4bf 100%);
  color: #1e1e1e;
  font-weight: 600;
}

.action-btn.env-manager:hover {
  background: linear-gradient(135deg, #5fd4bf 0%, #70dfc9 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(78, 201, 176, 0.4);
}

.action-btn.gemini {
  background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc04 75%, #ea4335 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
}

.action-btn.gemini:hover {
  background: linear-gradient(135deg, #5a9dff 0%, #46ba65 50%, #ffc825 75%, #f55a4e 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.5);
}

.files-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.files-section::-webkit-scrollbar {
  width: 8px;
}

.files-section::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 4px;
}

.files-section::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #4ec9b0 0%, #3a9b88 100%);
  border-radius: 4px;
}

.files-section::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #5fd4bf 0%, #4ec9b0 100%);
}

.section-group {
  margin-bottom: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: linear-gradient(90deg, transparent 0%, rgba(78, 201, 176, 0.05) 100%);
  border-left: 3px solid transparent;
  border-radius: 4px 0 0 4px;
}

.section-header:hover {
  background: linear-gradient(90deg, rgba(78, 201, 176, 0.1) 0%, rgba(78, 201, 176, 0.15) 100%);
  border-left-color: #4ec9b0;
  padding-left: 13px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
  background: linear-gradient(135deg, #4ec9b0 0%, #3a9b88 100%);
  color: #1e1e1e;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(78, 201, 176, 0.3);
  letter-spacing: 0.3px;
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
  gap: 10px;
  padding: 10px 16px 10px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: linear-gradient(90deg, transparent 0%, rgba(14, 99, 156, 0.05) 100%);
  border-left: 2px solid transparent;
  border-radius: 4px 0 0 4px;
}

.subsection-header:hover {
  background: linear-gradient(90deg, rgba(14, 99, 156, 0.1) 0%, rgba(14, 99, 156, 0.15) 100%);
  border-left-color: #1177bb;
  padding-left: 18px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.subsection-icon {
  font-size: 14px;
  color: #858585;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.subsection-header:hover .subsection-icon {
  color: #1177bb;
}

.subsection-title {
  flex: 1;
  font-size: 13px;
  color: #cccccc;
  font-weight: 500;
}

.subsection-count {
  background: linear-gradient(135deg, #3c3c3c 0%, #2d2d30 100%);
  color: #cccccc;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.file-list {
  padding-left: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 2px solid transparent;
  border-radius: 4px 0 0 4px;
  position: relative;
}

.file-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: linear-gradient(90deg, rgba(78, 201, 176, 0.2) 0%, transparent 100%);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-item:hover {
  background: linear-gradient(90deg, rgba(45, 45, 48, 0.5) 0%, rgba(30, 30, 30, 0.3) 100%);
  padding-left: 22px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.file-item:hover::before {
  width: 3px;
}

.file-item.active {
  background: linear-gradient(90deg, rgba(14, 99, 156, 0.2) 0%, rgba(14, 99, 156, 0.1) 100%);
  border-left-color: #0e639c;
  box-shadow: 0 2px 6px rgba(14, 99, 156, 0.3);
}

.file-item.active::before {
  width: 3px;
  background: linear-gradient(90deg, rgba(14, 99, 156, 0.5) 0%, transparent 100%);
}

.file-icon {
  font-size: 14px;
  opacity: 0.8;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-item:hover .file-icon {
  opacity: 1;
  transform: scale(1.1);
}

.file-item.active .file-icon {
  color: #4ec9b0;
  opacity: 1;
}

.file-name {
  font-size: 12px;
  color: #cccccc;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-weight: 500;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-item:hover .file-name {
  color: #ffffff;
}

.file-item.active .file-name {
  color: #4ec9b0;
  font-weight: 600;
}

.file-path {
  font-size: 10px;
  color: #858585;
  font-family: 'Consolas', 'Monaco', monospace;
  margin-left: auto;
  padding-left: 8px;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-item:hover .file-path {
  color: #a0a0a0;
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
