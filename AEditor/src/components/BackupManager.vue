<template>
  <div class="backup-manager">
    <div class="manager-header">
      <h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Respaldos
      </h2>
      <div class="manager-actions">
        <button @click="createBackup" class="btn-backup">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Crear Respaldo
        </button>
        <button @click="autoBackupEnabled = !autoBackupEnabled" :class="['btn-auto', { active: autoBackupEnabled }]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
          </svg>
          Auto-guardar: {{ autoBackupEnabled ? 'ON' : 'OFF' }}
        </button>
      </div>
    </div>

    <div class="backup-config">
      <div class="config-item">
        <label>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Intervalo de respaldo automático
        </label>
        <select v-model="backupInterval">
          <option value="1">1 minuto</option>
          <option value="5">5 minutos</option>
          <option value="10">10 minutos</option>
          <option value="30">30 minutos</option>
        </select>
      </div>
      <div class="config-item">
        <label>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          Número máximo de respaldos
        </label>
        <input type="number" v-model="maxBackups" min="5" max="100" />
      </div>
    </div>

    <div class="backup-list">
      <div class="list-header">
        <h3>Historial de Respaldos</h3>
        <span class="backup-count">{{ backups.length }} respaldos</span>
      </div>

      <div 
        v-for="backup in sortedBackups" 
        :key="backup.id"
        :class="['backup-item', { selected: selectedBackup?.id === backup.id }]"
        @click="selectBackup(backup)"
      >
        <div class="backup-info">
          <div class="backup-title">
            <svg v-if="backup.type === 'manual'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
            </svg>
            <strong>{{ backup.name || formatDate(backup.timestamp) }}</strong>
          </div>
          <div class="backup-meta">
            <span class="backup-time">{{ formatRelativeTime(backup.timestamp) }}</span>
            <span class="backup-files">{{ backup.fileCount }} archivos</span>
            <span class="backup-size">{{ formatSize(backup.size) }}</span>
          </div>
          <div v-if="backup.description" class="backup-desc">
            {{ backup.description }}
          </div>
        </div>

        <div class="backup-actions">
          <button @click.stop="restoreBackup(backup)" class="btn-restore" title="Restaurar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
          </button>
          <button @click.stop="compareBackup(backup)" class="btn-compare" title="Comparar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
          </button>
          <button @click.stop="deleteBackup(backup)" class="btn-delete" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="backups.length === 0" class="backup-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>No hay respaldos disponibles</p>
        <span>Crea tu primer respaldo para guardar el estado actual del proyecto</span>
      </div>
    </div>

    <!-- Modal de Comparación -->
    <div v-if="showCompareModal" class="compare-modal" @click.self="showCompareModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Comparar Cambios</h3>
          <button @click="showCompareModal = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="compare-view">
            <div class="compare-pane">
              <h4>Versión Actual</h4>
              <pre>{{ currentContent }}</pre>
            </div>
            <div class="compare-pane">
              <h4>Respaldo: {{ selectedBackup?.name }}</h4>
              <pre>{{ backupContent }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface Backup {
  id: string;
  name?: string;
  description?: string;
  timestamp: number;
  type: 'manual' | 'auto';
  fileCount: number;
  size: number;
  files: Array<{
    path: string;
    content: string;
    hash: string;
  }>;
}

const backups = ref<Backup[]>([]);
const selectedBackup = ref<Backup | null>(null);
const autoBackupEnabled = ref(true);
const backupInterval = ref('5');
const maxBackups = ref(20);
const showCompareModal = ref(false);
const currentContent = ref('');
const backupContent = ref('');

let autoBackupTimer: number | null = null;

const sortedBackups = computed(() => {
  return [...backups.value].sort((a, b) => b.timestamp - a.timestamp);
});

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} días`;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const createBackup = async () => {
  const name = prompt('Nombre del respaldo (opcional):');
  const description = prompt('Descripción (opcional):');
  
  try {
    const backup = await invoke<Backup>('create_backup', {
      name: name || undefined,
      description: description || undefined,
      type: 'manual'
    });
    
    backups.value.unshift(backup);
    
    // Limitar cantidad de respaldos
    if (backups.value.length > maxBackups.value) {
      const toRemove = backups.value.slice(maxBackups.value);
      for (const b of toRemove) {
        await invoke('delete_backup', { backupId: b.id });
      }
      backups.value = backups.value.slice(0, maxBackups.value);
    }
  } catch (error) {
    console.error('Error creando respaldo:', error);
    alert('Error al crear respaldo');
  }
};

const autoBackup = async () => {
  if (!autoBackupEnabled.value) return;
  
  try {
    const backup = await invoke<Backup>('create_backup', {
      type: 'auto',
      name: `Auto-respaldo ${formatDate(Date.now())}`
    });
    
    backups.value.unshift(backup);
    
    // Limpiar respaldos automáticos viejos
    const autoBackups = backups.value.filter(b => b.type === 'auto');
    if (autoBackups.length > maxBackups.value / 2) {
      const toRemove = autoBackups.slice(Math.floor(maxBackups.value / 2));
      for (const b of toRemove) {
        await invoke('delete_backup', { backupId: b.id });
        backups.value = backups.value.filter(backup => backup.id !== b.id);
      }
    }
  } catch (error) {
    console.error('Error en auto-respaldo:', error);
  }
};

const restoreBackup = async (backup: Backup) => {
  if (!confirm(`¿Restaurar el respaldo "${backup.name || formatDate(backup.timestamp)}"?\n\nEsto sobrescribirá el contenido actual de los archivos.`)) {
    return;
  }
  
  try {
    await invoke('restore_backup', { backupId: backup.id });
    alert('Respaldo restaurado correctamente');
  } catch (error) {
    console.error('Error restaurando respaldo:', error);
    alert('Error al restaurar respaldo');
  }
};

const compareBackup = async (backup: Backup) => {
  try {
    const comparison = await invoke<{ current: string; backup: string }>('compare_backup', { 
      backupId: backup.id 
    });
    
    currentContent.value = comparison.current;
    backupContent.value = comparison.backup;
    selectedBackup.value = backup;
    showCompareModal.value = true;
  } catch (error) {
    console.error('Error comparando respaldo:', error);
  }
};

const deleteBackup = async (backup: Backup) => {
  if (!confirm(`¿Eliminar el respaldo "${backup.name || formatDate(backup.timestamp)}"?`)) {
    return;
  }
  
  try {
    await invoke('delete_backup', { backupId: backup.id });
    backups.value = backups.value.filter(b => b.id !== backup.id);
    if (selectedBackup.value?.id === backup.id) {
      selectedBackup.value = null;
    }
  } catch (error) {
    console.error('Error eliminando respaldo:', error);
  }
};

const selectBackup = (backup: Backup) => {
  selectedBackup.value = backup;
};

// Iniciar auto-respaldo
watch([autoBackupEnabled, backupInterval], ([enabled, interval]) => {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
  
  if (enabled) {
    autoBackupTimer = window.setInterval(autoBackup, parseInt(interval) * 60 * 1000);
  }
});

onMounted(async () => {
  try {
    const savedBackups = await invoke<Backup[]>('get_backups');
    backups.value = savedBackups;
  } catch (error) {
    console.error('Error cargando respaldos:', error);
  }
  
  // Iniciar auto-respaldo si está habilitado
  if (autoBackupEnabled.value) {
    autoBackupTimer = window.setInterval(autoBackup, parseInt(backupInterval.value) * 60 * 1000);
  }
});
</script>

<style scoped>
.backup-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.manager-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.2rem;
}

.manager-actions {
  display: flex;
  gap: 8px;
}

.btn-backup, .btn-auto {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-backup:hover {
  background: #007acc;
  border-color: #007acc;
}

.btn-auto {
  border-color: #666;
}

.btn-auto.active {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.backup-config {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.config-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #858585;
}

.config-item select,
.config-item input {
  padding: 8px 12px;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 0.9rem;
}

.backup-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 8px;
}

.list-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #858585;
}

.backup-count {
  font-size: 0.85rem;
  color: #858585;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px;
  margin-bottom: 8px;
  background: #252525;
  border: 1px solid #333;
  border-left: 3px solid #007acc;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.backup-item:hover {
  background: #2d2d2d;
  border-left-width: 4px;
}

.backup-item.selected {
  background: #2d2d2d;
  border-color: #007acc;
}

.backup-info {
  flex: 1;
  min-width: 0;
}

.backup-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.backup-title strong {
  color: #fff;
  font-size: 0.95rem;
}

.backup-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #858585;
  flex-wrap: wrap;
}

.backup-desc {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #a0a0a0;
  font-style: italic;
}

.backup-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-restore, .btn-compare, .btn-delete {
  background: none;
  border: 1px solid #444;
  color: #858585;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-restore:hover {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.btn-compare:hover {
  background: #2196f3;
  border-color: #2196f3;
  color: white;
}

.btn-delete:hover {
  background: #d32f2f;
  border-color: #d32f2f;
  color: white;
}

.backup-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
  gap: 16px;
  text-align: center;
  padding: 40px 20px;
}

.backup-empty p {
  margin: 0;
  font-size: 1.1rem;
  color: #d4d4d4;
}

.backup-empty span {
  font-size: 0.9rem;
  max-width: 400px;
}

/* Modal */
.compare-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 8px;
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
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
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.compare-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: 100%;
}

.compare-pane {
  display: flex;
  flex-direction: column;
  background: #252525;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
}

.compare-pane h4 {
  margin: 0;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  font-size: 0.9rem;
  color: #d4d4d4;
}

.compare-pane pre {
  flex: 1;
  margin: 0;
  padding: 16px;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #d4d4d4;
}
</style>
