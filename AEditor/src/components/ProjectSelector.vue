<template>
  <div class="project-selector-overlay">
    <div class="project-selector-modal">
      <div class="modal-header">
        <h2>🚀 Selecciona el Directorio del Proyecto Amayo</h2>
        <p>Elige la carpeta raíz donde está el proyecto del bot</p>
      </div>

      <div class="modal-content">
        <div v-if="errorMessage" class="error-message">
          ❌ {{ errorMessage }}
        </div>

        <div class="path-display">
          <div class="path-label">Ruta actual:</div>
          <div class="path-value">{{ currentPath || 'No seleccionada' }}</div>
        </div>

        <div class="actions">
          <button @click="selectDirectory" class="select-btn">
            📁 Seleccionar Directorio
          </button>
          <button 
            v-if="currentPath" 
            @click="validateAndSave" 
            class="save-btn"
            :disabled="validating"
          >
            {{ validating ? '⏳ Validando...' : '✅ Usar esta Ruta' }}
          </button>
        </div>

        <div class="info-box">
          <p><strong>ℹ️ Requisitos:</strong></p>
          <ul>
            <li>El directorio debe contener <code>src/commands/</code></li>
            <li>El directorio debe contener <code>src/events/</code></li>
            <li>Compatible con Windows, Linux y macOS</li>
          </ul>
        </div>

        <div v-if="savedPath" class="saved-path">
          <p><strong>📌 Última ruta guardada:</strong></p>
          <p class="saved-value">{{ savedPath }}</p>
          <button @click="useSavedPath" class="use-saved-btn">
            Usar Ruta Guardada
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const emit = defineEmits<{
  'path-selected': [path: string];
}>();

const currentPath = ref<string>('');
const savedPath = ref<string>('');
const errorMessage = ref<string>('');
const validating = ref(false);

// Cargar ruta guardada
onMounted(() => {
  const saved = localStorage.getItem('amayo-project-path');
  if (saved) {
    savedPath.value = saved;
  }
});

// Seleccionar directorio
async function selectDirectory() {
  try {
    errorMessage.value = '';
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Selecciona el directorio raíz del proyecto Amayo',
    });

    if (selected && typeof selected === 'string') {
      currentPath.value = selected;
    }
  } catch (error: any) {
    errorMessage.value = `Error al seleccionar directorio: ${error.message}`;
    console.error('Error:', error);
  }
}

// Validar y guardar
async function validateAndSave() {
  if (!currentPath.value) {
    errorMessage.value = 'Por favor selecciona un directorio primero';
    return;
  }

  validating.value = true;
  errorMessage.value = '';

  try {
    const isValid = await invoke<boolean>('validate_project_path', {
      path: currentPath.value,
    });

    if (isValid) {
      // Guardar en localStorage
      localStorage.setItem('amayo-project-path', currentPath.value);
      
      // Emitir evento
      emit('path-selected', currentPath.value);
    } else {
      errorMessage.value = 
        'El directorio seleccionado no es válido. ' +
        'Asegúrate de que contiene las carpetas src/commands/ y src/events/';
    }
  } catch (error: any) {
    errorMessage.value = `Error validando directorio: ${error}`;
    console.error('Error:', error);
  } finally {
    validating.value = false;
  }
}

// Usar ruta guardada
async function useSavedPath() {
  currentPath.value = savedPath.value;
  await validateAndSave();
}
</script>

<style scoped>
.project-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.project-selector-modal {
  background-color: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #3e3e42;
  background-color: #2d2d30;
  border-radius: 8px 8px 0 0;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #ffffff;
}

.modal-header p {
  margin: 0;
  color: #cccccc;
  font-size: 14px;
}

.modal-content {
  padding: 24px;
}

.error-message {
  padding: 12px 16px;
  background-color: #f14c4c;
  color: #ffffff;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 13px;
}

.path-display {
  background-color: #252526;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.path-label {
  font-size: 12px;
  color: #858585;
  margin-bottom: 8px;
  font-weight: 600;
}

.path-value {
  font-size: 13px;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.select-btn,
.save-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.select-btn {
  background-color: #3e3e42;
  color: #ffffff;
}

.select-btn:hover {
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
  opacity: 0.5;
  cursor: not-allowed;
}

.info-box {
  background-color: #252526;
  padding: 16px;
  border-left: 3px solid #0e639c;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-box p {
  margin: 0 0 12px 0;
  color: #ffffff;
  font-size: 13px;
}

.info-box ul {
  margin: 0;
  padding-left: 20px;
}

.info-box li {
  color: #cccccc;
  font-size: 13px;
  margin-bottom: 8px;
}

.info-box code {
  background-color: #3e3e42;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #4ec9b0;
}

.saved-path {
  background-color: #2d2d30;
  padding: 16px;
  border-radius: 4px;
  border: 1px solid #3e3e42;
}

.saved-path p {
  margin: 0 0 8px 0;
  color: #cccccc;
  font-size: 13px;
}

.saved-path p:last-of-type {
  margin-bottom: 12px;
}

.saved-value {
  color: #4ec9b0 !important;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px !important;
  word-break: break-all;
}

.use-saved-btn {
  width: 100%;
  padding: 8px 12px;
  background-color: #3e3e42;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.use-saved-btn:hover {
  background-color: #0e639c;
}
</style>
