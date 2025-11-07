<template>
  <div class="error-panel">
    <div class="panel-header">
      <h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Problemas
        <span class="error-count" v-if="totalErrors > 0">{{ totalErrors }}</span>
      </h2>
      <div class="panel-actions">
        <button @click="refreshErrors" class="btn-refresh" title="Refrescar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
          </svg>
        </button>
        <button @click="clearErrors" class="btn-clear" title="Limpiar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span :class="`icon-${tab.id}`">{{ tab.icon }}</span>
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div class="error-list">
      <div 
        v-for="error in filteredErrors" 
        :key="error.id"
        :class="['error-item', `severity-${error.severity}`]"
        @click="navigateToError(error)"
      >
        <div class="error-icon">
          <svg v-if="error.severity === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="error.severity === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>

        <div class="error-content">
          <div class="error-message">{{ error.message }}</div>
          <div class="error-meta">
            <span class="error-file">{{ error.file }}</span>
            <span class="error-location">[{{ error.line }}:{{ error.column }}]</span>
            <span v-if="error.code" class="error-code">{{ error.code }}</span>
          </div>
          <div v-if="error.suggestion" class="error-suggestion">
            💡 {{ error.suggestion }}
          </div>
        </div>

        <button class="error-action" @click.stop="quickFix(error)" v-if="error.fixable">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
        </button>
      </div>

      <div v-if="filteredErrors.length === 0" class="error-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p>No hay problemas</p>
        <span>Tu código está limpio ✨</span>
      </div>
    </div>

    <!-- Panel de Estadísticas -->
    <div class="panel-stats" v-if="totalErrors > 0">
      <div class="stat-item">
        <span class="stat-label">Errores:</span>
        <span class="stat-value error">{{ errorCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Advertencias:</span>
        <span class="stat-value warning">{{ warningCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Información:</span>
        <span class="stat-value info">{{ infoCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface DiagnosticError {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
  suggestion?: string;
  fixable?: boolean;
  source?: string;
}

const errors = ref<DiagnosticError[]>([]);
const activeTab = ref('all');

const tabs = computed(() => [
  { id: 'all', label: 'Todos', icon: '📋', count: totalErrors.value },
  { id: 'error', label: 'Errores', icon: '❌', count: errorCount.value },
  { id: 'warning', label: 'Advertencias', icon: '⚠️', count: warningCount.value },
  { id: 'info', label: 'Información', icon: 'ℹ️', count: infoCount.value },
]);

const filteredErrors = computed(() => {
  if (activeTab.value === 'all') return errors.value;
  return errors.value.filter(e => e.severity === activeTab.value);
});

const totalErrors = computed(() => errors.value.length);
const errorCount = computed(() => errors.value.filter(e => e.severity === 'error').length);
const warningCount = computed(() => errors.value.filter(e => e.severity === 'warning').length);
const infoCount = computed(() => errors.value.filter(e => e.severity === 'info').length);

const emit = defineEmits<{
  navigateToError: [error: DiagnosticError]
}>();

const navigateToError = (error: DiagnosticError) => {
  emit('navigateToError', error);
};

const quickFix = async (error: DiagnosticError) => {
  try {
    await invoke('apply_quick_fix', { error });
    // Remover error de la lista después de aplicar fix
    errors.value = errors.value.filter(e => e.id !== error.id);
  } catch (err) {
    console.error('Error aplicando quick fix:', err);
  }
};

const refreshErrors = async () => {
  try {
    const diagnostics = await invoke<DiagnosticError[]>('get_diagnostics');
    errors.value = diagnostics;
  } catch (err) {
    console.error('Error obteniendo diagnósticos:', err);
  }
};

const clearErrors = () => {
  errors.value = [];
};

// Función para añadir errores desde Monaco Editor
const addError = (error: Omit<DiagnosticError, 'id'>) => {
  const newError: DiagnosticError = {
    ...error,
    id: `${error.file}-${error.line}-${error.column}-${Date.now()}`
  };
  
  // Evitar duplicados
  const exists = errors.value.some(
    e => e.file === newError.file && 
         e.line === newError.line && 
         e.column === newError.column &&
         e.message === newError.message
  );
  
  if (!exists) {
    errors.value.push(newError);
  }
};

// Función para limpiar errores de un archivo específico
const clearFileErrors = (filePath: string) => {
  errors.value = errors.value.filter(e => e.file !== filePath);
};

onMounted(async () => {
  await refreshErrors();
  
  // Actualizar cada 5 segundos
  setInterval(refreshErrors, 5000);
});

defineExpose({ addError, clearFileErrors, refreshErrors });
</script>

<style scoped>
.error-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.error-count {
  background: #d32f2f;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  gap: 4px;
}

.btn-refresh, .btn-clear {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-refresh:hover, .btn-clear:hover {
  background: #2d2d2d;
  color: #fff;
}

.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #858585;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #d4d4d4;
  background: #2d2d2d;
  border-radius: 4px 4px 0 0;
}

.tab-btn.active {
  color: #fff;
  border-bottom-color: #007acc;
}

.tab-count {
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.error-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.error-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 4px;
  background: #252525;
  border-left: 3px solid #d32f2f;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-item:hover {
  background: #2d2d2d;
}

.error-item.severity-error {
  border-left-color: #d32f2f;
}

.error-item.severity-error .error-icon {
  color: #d32f2f;
}

.error-item.severity-warning {
  border-left-color: #ff9800;
}

.error-item.severity-warning .error-icon {
  color: #ff9800;
}

.error-item.severity-info {
  border-left-color: #2196f3;
}

.error-item.severity-info .error-icon {
  color: #2196f3;
}

.error-icon {
  flex-shrink: 0;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-message {
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.4;
}

.error-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #858585;
  flex-wrap: wrap;
}

.error-file {
  font-family: 'Consolas', monospace;
}

.error-location {
  color: #4ec9b0;
}

.error-code {
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 3px;
}

.error-suggestion {
  margin-top: 8px;
  padding: 8px;
  background: #2d2d2d;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #dcdcaa;
}

.error-action {
  background: none;
  border: 1px solid #444;
  color: #858585;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.error-action:hover {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
}

.error-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
  gap: 12px;
  text-align: center;
}

.error-empty p {
  margin: 0;
  font-size: 1.1rem;
  color: #d4d4d4;
}

.error-empty span {
  font-size: 0.9rem;
}

.panel-stats {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
  border-top: 1px solid #333;
  background: #252525;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.stat-label {
  color: #858585;
}

.stat-value {
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.stat-value.error {
  background: rgba(211, 47, 47, 0.2);
  color: #d32f2f;
}

.stat-value.warning {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.stat-value.info {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}
</style>
