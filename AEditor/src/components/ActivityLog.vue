<template>
  <div class="activity-log">
    <div class="log-header">
      <h2>📋 Registro de Actividad</h2>
      <div class="log-actions">
        <button @click="clearLog" class="btn-clear">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Limpiar
        </button>
        <button @click="exportLog" class="btn-export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Exportar
        </button>
      </div>
    </div>

    <div class="log-filters">
      <button 
        v-for="type in actionTypes" 
        :key="type.id"
        :class="['filter-btn', { active: activeFilter === type.id }]"
        @click="activeFilter = type.id"
      >
        {{ type.icon }} {{ type.label }}
      </button>
    </div>

    <div class="log-timeline">
      <div 
        v-for="entry in filteredLogs" 
        :key="entry.id"
        :class="['log-entry', `log-${entry.type}`]"
        @click="showDetails(entry)"
      >
        <div class="log-icon">
          <span>{{ getIcon(entry.type) }}</span>
        </div>
        <div class="log-content">
          <div class="log-title">
            <strong>{{ entry.action }}</strong>
            <span class="log-file">{{ entry.file }}</span>
          </div>
          <div class="log-meta">
            <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
            <span v-if="entry.lines" class="log-lines">{{ entry.lines }} líneas</span>
          </div>
          <div v-if="entry.details" class="log-details">
            {{ entry.details }}
          </div>
        </div>
        <button class="log-expand" @click.stop="toggleExpand(entry.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div v-if="filteredLogs.length === 0" class="log-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p>No hay actividad registrada</p>
      </div>
    </div>

    <!-- Modal de Detalles -->
    <div v-if="selectedEntry" class="log-modal" @click.self="selectedEntry = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedEntry.action }}</h3>
          <button @click="selectedEntry = null" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <label>Archivo:</label>
            <code>{{ selectedEntry.file }}</code>
          </div>
          <div class="detail-row">
            <label>Fecha:</label>
            <span>{{ new Date(selectedEntry.timestamp).toLocaleString() }}</span>
          </div>
          <div v-if="selectedEntry.user" class="detail-row">
            <label>Usuario:</label>
            <span>{{ selectedEntry.user }}</span>
          </div>
          <div v-if="selectedEntry.diff" class="detail-row diff-view">
            <label>Cambios:</label>
            <pre>{{ selectedEntry.diff }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface LogEntry {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'save' | 'open';
  action: string;
  file: string;
  timestamp: number;
  lines?: number;
  details?: string;
  user?: string;
  diff?: string;
}

const logs = ref<LogEntry[]>([]);
const activeFilter = ref('all');
const selectedEntry = ref<LogEntry | null>(null);
const expandedIds = ref<Set<string>>(new Set());

const actionTypes = [
  { id: 'all', label: 'Todos', icon: '📋' },
  { id: 'create', label: 'Crear', icon: '➕' },
  { id: 'edit', label: 'Editar', icon: '✏️' },
  { id: 'save', label: 'Guardar', icon: '💾' },
  { id: 'delete', label: 'Eliminar', icon: '🗑️' },
  { id: 'open', label: 'Abrir', icon: '📂' },
];

const filteredLogs = computed(() => {
  if (activeFilter.value === 'all') return logs.value;
  return logs.value.filter(log => log.type === activeFilter.value);
});

const getIcon = (type: string): string => {
  const icons: Record<string, string> = {
    create: '➕',
    edit: '✏️',
    save: '💾',
    delete: '🗑️',
    open: '📂'
  };
  return icons[type] || '📄';
};

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Hace un momento';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return new Date(timestamp).toLocaleDateString();
};

const showDetails = (entry: LogEntry) => {
  selectedEntry.value = entry;
};

const toggleExpand = (id: string) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
};

const clearLog = async () => {
  if (confirm('¿Estás seguro de que quieres limpiar el registro?')) {
    logs.value = [];
    await invoke('clear_activity_log');
  }
};

const exportLog = async () => {
  const data = JSON.stringify(logs.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Función para añadir nueva entrada (llamada desde otros componentes)
const addLogEntry = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
  const newEntry: LogEntry = {
    ...entry,
    id: Date.now().toString(),
    timestamp: Date.now()
  };
  logs.value.unshift(newEntry);
  
  // Guardar en Tauri backend
  invoke('save_activity_log', { entry: newEntry });
};

// Cargar logs existentes
onMounted(async () => {
  try {
    const savedLogs = await invoke<LogEntry[]>('get_activity_logs');
    logs.value = savedLogs;
  } catch (error) {
    console.error('Error cargando logs:', error);
  }
});

// Exponer función para que otros componentes puedan añadir logs
defineExpose({ addLogEntry });
</script>

<style scoped>
.activity-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.log-header h2 {
  font-size: 1.2rem;
  margin: 0;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.btn-clear, .btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #d32f2f;
  border-color: #d32f2f;
}

.btn-export:hover {
  background: #1976d2;
  border-color: #1976d2;
}

.log-filters {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid #333;
  overflow-x: auto;
}

.filter-btn {
  padding: 6px 14px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 16px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #3d3d3d;
}

.filter-btn.active {
  background: #007acc;
  border-color: #007acc;
  color: white;
}

.log-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: #252525;
  border: 1px solid #333;
  border-left: 3px solid #007acc;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.log-entry:hover {
  background: #2d2d2d;
  border-left-width: 4px;
}

.log-entry.log-create { border-left-color: #4caf50; }
.log-entry.log-edit { border-left-color: #ff9800; }
.log-entry.log-delete { border-left-color: #f44336; }
.log-entry.log-save { border-left-color: #2196f3; }

.log-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-title strong {
  color: #fff;
}

.log-file {
  color: #858585;
  font-size: 0.85rem;
  font-family: 'Consolas', monospace;
}

.log-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #858585;
}

.log-details {
  margin-top: 8px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #a0a0a0;
}

.log-expand {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.log-expand:hover {
  background: #3d3d3d;
  color: #fff;
}

.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
  gap: 16px;
}

/* Modal */
.log-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #252525;
  border: 1px solid #444;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
}

.btn-close {
  background: none;
  border: none;
  color: #858585;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #3d3d3d;
  color: #fff;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-row label {
  display: block;
  color: #858585;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.detail-row code {
  background: #1e1e1e;
  padding: 8px 12px;
  border-radius: 4px;
  display: inline-block;
  color: #4ec9b0;
  font-family: 'Consolas', monospace;
}

.diff-view pre {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}
</style>
