<template>
  <div class="file-explorer">
    <!-- Context Menu -->
    <Teleport to="body">
      <div 
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="showNewFileModal">
          <span class="menu-icon">📄</span>
          <span>Nuevo Archivo</span>
          <span class="menu-shortcut">Ctrl+N</span>
        </div>
        <div class="context-menu-item" @click="showNewFolderModal">
          <span class="menu-icon">📁</span>
          <span>Nueva Carpeta</span>
          <span class="menu-shortcut">Ctrl+Shift+N</span>
        </div>
        <div v-if="contextMenu.target" class="context-menu-divider"></div>
        <div 
          v-if="contextMenu.target" 
          class="context-menu-item"
          @click="showRenameModal"
        >
          <span class="menu-icon">✏️</span>
          <span>Renombrar</span>
          <span class="menu-shortcut">F2</span>
        </div>
        <div 
          v-if="contextMenu.target" 
          class="context-menu-item danger"
          @click="showDeleteConfirmation"
        >
          <span class="menu-icon">🗑️</span>
          <span>Eliminar</span>
          <span class="menu-shortcut">Del</span>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Nuevo Archivo/Carpeta/Renombrar -->
    <Teleport to="body">
      <div v-if="inputModal.visible" class="modal-overlay" @click="closeInputModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ inputModal.title }}</h3>
            <button class="modal-close" @click="closeInputModal">✕</button>
          </div>
          <div class="modal-body">
            <label class="input-label">{{ inputModal.label }}</label>
            <input
              ref="inputField"
              v-model="inputModal.value"
              type="text"
              class="input-field"
              :placeholder="inputModal.placeholder"
              @keydown.enter="handleInputSubmit"
              @keydown.esc="closeInputModal"
            />
            <div v-if="inputModal.error" class="input-error">
              {{ inputModal.error }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeInputModal">
              Cancelar
            </button>
            <button 
              class="btn btn-primary"
              @click="handleInputSubmit"
              :disabled="!inputModal.value.trim()"
            >
              {{ inputModal.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Confirmación de Eliminación -->
    <Teleport to="body">
      <div v-if="deleteModal.visible" class="modal-overlay" @click="closeDeleteModal">
        <div class="modal-content modal-danger" @click.stop>
          <div class="modal-header">
            <h3>⚠️ Confirmar Eliminación</h3>
            <button class="modal-close" @click="closeDeleteModal">✕</button>
          </div>
          <div class="modal-body">
            <p>¿Estás seguro de que deseas eliminar?</p>
            <div class="delete-target">
              <span class="file-icon">{{ deleteModal.isFolder ? '📁' : '📄' }}</span>
              <strong>{{ deleteModal.targetName }}</strong>
            </div>
            <p class="warning-text">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeDeleteModal">
              Cancelar
            </button>
            <button 
              class="btn btn-danger"
              @click="handleDelete"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- File Tree -->
    <div class="file-tree" @click="closeContextMenu">
      <template v-for="(files, folder) in groupedFiles" :key="folder">
        <!-- Folder Header -->
        <div 
          v-if="folder !== 'root'" 
          class="folder-item"
          @contextmenu.prevent="openContextMenu($event, null, folder)"
        >
          <div class="folder-header">
            <span class="folder-icon">📁</span>
            <span class="folder-name">{{ folder }}</span>
            <span class="file-count">{{ files.length }}</span>
          </div>
        </div>

        <!-- Files in Folder -->
        <div
          v-for="file in files"
          :key="file.path"
          :class="['file-item', { 
            active: selectedFile?.path === file.path,
            'in-folder': folder !== 'root'
          }]"
          @click="$emit('select-file', file)"
          @contextmenu.prevent="openContextMenu($event, file, folder)"
        >
          <span class="file-icon">{{ getFileIcon(file) }}</span>
          <span class="file-name">{{ file.name }}</span>
        </div>
      </template>

      <div v-if="Object.keys(groupedFiles).length === 0" class="empty-state">
        <p>Sin archivos</p>
        <p class="empty-hint">Click derecho para crear archivos</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '../types/bot';

// Props
const props = defineProps<{
  files: FileInfo[];
  selectedFile: FileInfo | null;
  projectRoot: string;
  basePath: string; // 'commands' | 'events' | '' (para root)
}>();

// Emits
const emit = defineEmits<{
  'select-file': [file: FileInfo];
  'refresh': [];
  'notify': [message: string, type: 'success' | 'error' | 'info'];
}>();

// State: Context Menu
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  target: null as FileInfo | null,
  folder: '' as string
});

// State: Input Modal (Nuevo/Renombrar)
const inputModal = ref({
  visible: false,
  type: '' as 'file' | 'folder' | 'rename',
  title: '',
  label: '',
  placeholder: '',
  confirmText: '',
  value: '',
  error: '',
  targetFile: null as FileInfo | null,
  targetFolder: ''
});

// State: Delete Modal
const deleteModal = ref({
  visible: false,
  target: null as FileInfo | null,
  targetName: '',
  isFolder: false
});

const inputField = ref<HTMLInputElement | null>(null);

// Computed: Agrupar archivos por carpeta
const groupedFiles = computed(() => {
  const grouped: Record<string, FileInfo[]> = {};
  
  console.log(`🗂️ FileExplorer recibió ${props.files.length} archivos para basePath="${props.basePath}"`);
  
  props.files.forEach(file => {
    const folder = file.folder || 'root';
    if (!grouped[folder]) {
      grouped[folder] = [];
    }
    grouped[folder].push(file);
  });
  
  console.log("📁 Grupos creados:", Object.keys(grouped), grouped);
  
  return grouped;
});

// Context Menu
function openContextMenu(event: MouseEvent, file: FileInfo | null, folder: string) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    target: file,
    folder: folder
  };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

// Cerrar context menu al hacer click fuera
watch(() => contextMenu.value.visible, (visible) => {
  if (visible) {
    const handleClickOutside = () => {
      closeContextMenu();
      document.removeEventListener('click', handleClickOutside);
    };
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  }
});

// Modales: Nuevo Archivo
function showNewFileModal() {
  inputModal.value = {
    visible: true,
    type: 'file',
    title: '📄 Nuevo Archivo',
    label: 'Nombre del archivo:',
    placeholder: 'ejemplo.ts',
    confirmText: 'Crear',
    value: '',
    error: '',
    targetFile: null,
    targetFolder: contextMenu.value.folder
  };
  closeContextMenu();
  nextTick(() => inputField.value?.focus());
}

// Modales: Nueva Carpeta
function showNewFolderModal() {
  inputModal.value = {
    visible: true,
    type: 'folder',
    title: '📁 Nueva Carpeta',
    label: 'Nombre de la carpeta:',
    placeholder: 'mi-carpeta',
    confirmText: 'Crear',
    value: '',
    error: '',
    targetFile: null,
    targetFolder: contextMenu.value.folder
  };
  closeContextMenu();
  nextTick(() => inputField.value?.focus());
}

// Modales: Renombrar
function showRenameModal() {
  const target = contextMenu.value.target;
  if (!target) return;

  inputModal.value = {
    visible: true,
    type: 'rename',
    title: '✏️ Renombrar',
    label: 'Nuevo nombre:',
    placeholder: target.name,
    confirmText: 'Renombrar',
    value: target.name,
    error: '',
    targetFile: target,
    targetFolder: contextMenu.value.folder
  };
  closeContextMenu();
  nextTick(() => {
    if (inputField.value) {
      inputField.value.focus();
      // Seleccionar el nombre sin la extensión
      const dotIndex = inputModal.value.value.lastIndexOf('.');
      if (dotIndex > 0) {
        inputField.value.setSelectionRange(0, dotIndex);
      } else {
        inputField.value.select();
      }
    }
  });
}

function closeInputModal() {
  inputModal.value.visible = false;
  inputModal.value.value = '';
  inputModal.value.error = '';
}

// Modales: Eliminar
function showDeleteConfirmation() {
  const target = contextMenu.value.target;
  if (!target) return;

  console.log('🗑️ Preparando eliminación de:', target);
  console.log('   name:', target.name);
  console.log('   path:', target.path);
  console.log('   relativePath:', target.relativePath);

  deleteModal.value = {
    visible: true,
    target: target,
    targetName: target.name,
    isFolder: false // TODO: Detectar si es carpeta
  };
  closeContextMenu();
}

function closeDeleteModal() {
  deleteModal.value.visible = false;
}

// Handlers: Crear/Renombrar
async function handleInputSubmit() {
  const { type, value, targetFile, targetFolder } = inputModal.value;
  
  if (!value.trim()) {
    inputModal.value.error = 'El nombre no puede estar vacío';
    return;
  }

  // Validar caracteres inválidos
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(value)) {
    inputModal.value.error = 'Nombre contiene caracteres inválidos';
    return;
  }

  try {
    if (type === 'file') {
      await handleCreateFile(value, targetFolder);
    } else if (type === 'folder') {
      await handleCreateFolder(value, targetFolder);
    } else if (type === 'rename' && targetFile) {
      await handleRename(targetFile, value);
    }
    
    closeInputModal();
  } catch (error: any) {
    inputModal.value.error = error.toString();
  }
}

// Backend Calls
async function handleCreateFile(filename: string, folder: string) {
  try {
    // Construir la ruta completa
    let fullPath = props.projectRoot;
    if (props.basePath) {
      fullPath += '/' + props.basePath;
    }
    if (folder !== 'root') {
      fullPath += '/' + folder;
    }
    fullPath += '/' + filename;

    await invoke('create_file', { filePath: fullPath });
    
    emit('notify', `✅ Archivo "${filename}" creado correctamente`, 'success');
    emit('refresh');
  } catch (error: any) {
    emit('notify', `❌ Error creando archivo: ${error}`, 'error');
    throw error;
  }
}

async function handleCreateFolder(folderName: string, parentFolder: string) {
  try {
    // Construir la ruta completa
    let fullPath = props.projectRoot;
    if (props.basePath) {
      fullPath += '/' + props.basePath;
    }
    if (parentFolder !== 'root') {
      fullPath += '/' + parentFolder;
    }
    fullPath += '/' + folderName;

    await invoke('create_folder', { folderPath: fullPath });
    
    emit('notify', `✅ Carpeta "${folderName}" creada correctamente`, 'success');
    emit('refresh');
  } catch (error: any) {
    emit('notify', `❌ Error creando carpeta: ${error}`, 'error');
    throw error;
  }
}

async function handleRename(file: FileInfo, newName: string) {
  try {
    // Usar el path completo directamente
    const oldPath = file.path;
    
    // Extraer el directorio del path completo
    const lastSlash = oldPath.lastIndexOf('/') !== -1 ? oldPath.lastIndexOf('/') : oldPath.lastIndexOf('\\');
    const dirPath = oldPath.substring(0, lastSlash);
    const newPath = `${dirPath}/${newName}`;

    console.log('📝 Renombrando:', oldPath, '→', newPath);

    await invoke('rename_file', { oldPath, newPath });
    
    emit('notify', `✅ Renombrado a "${newName}" correctamente`, 'success');
    emit('refresh');
  } catch (error: any) {
    emit('notify', `❌ Error renombrando: ${error}`, 'error');
    throw error;
  }
}

async function handleDelete() {
  const target = deleteModal.value.target;
  if (!target) return;

  try {
    // Construir la ruta completa
    // El path ya es la ruta completa desde Rust
    let fullPath: string = target.path;
    
    console.log('🗑️ Eliminando archivo:', fullPath);
    console.log('   Target completo:', JSON.stringify(target, null, 2));
    console.log('   basePath:', props.basePath);
    console.log('   projectRoot:', props.projectRoot);
    
    if (deleteModal.value.isFolder) {
      await invoke('delete_folder', { folderPath: fullPath });
    } else {
      await invoke('delete_file', { filePath: fullPath });
    }
    
    emit('notify', `✅ Eliminado correctamente: ${target.name}`, 'success');
    emit('refresh');
    closeDeleteModal();
  } catch (error: any) {
    console.error('❌ Error eliminando:', error);
    emit('notify', `❌ Error eliminando: ${error}`, 'error');
  }
}

// Utilidades
function getFileIcon(file: FileInfo): string {
  if (file.commandType === 'message') return '💬';
  if (file.commandType === 'slash') return '⚡';
  if (file.eventType === 'standard') return '📡';
  if (file.eventType === 'extra') return '🎯';
  
  // Por extensión
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': return '🔷';
    case 'js': return '🟨';
    case 'json': return '📋';
    case 'md': return '📝';
    default: return '📄';
  }
}
</script>

<style scoped>
.file-explorer {
  position: relative;
  width: 100%;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  padding: 4px;
  min-width: 220px;
  z-index: 10000;
  animation: contextMenuSlideIn 0.15s ease-out;
}

@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #cccccc;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: #37373d;
  color: #ffffff;
}

.context-menu-item.danger:hover {
  background: #5a1d1d;
  color: #f48771;
}

.menu-icon {
  font-size: 14px;
}

.menu-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #858585;
}

.context-menu-divider {
  height: 1px;
  background: #3e3e42;
  margin: 4px 0;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  width: 450px;
  max-width: 90vw;
  animation: modalSlideUp 0.25s ease-out;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-danger {
  border-color: #be1100;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #3e3e42;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #ffffff;
}

.modal-close {
  background: none;
  border: none;
  color: #858585;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.modal-close:hover {
  background: #37373d;
  color: #ffffff;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 16px 0;
  color: #cccccc;
  font-size: 14px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.input-error {
  margin-top: 8px;
  color: #f48771;
  font-size: 12px;
}

.delete-target {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #1e1e1e;
  border: 1px solid #be1100;
  border-radius: 4px;
  margin: 12px 0;
}

.delete-target strong {
  color: #f48771;
  font-size: 14px;
}

.warning-text {
  color: #f48771;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #3e3e42;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #0e639c;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #1177bb;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #3e3e42;
}

.btn-secondary:hover {
  background: #4e4e52;
}

.btn-danger {
  background: #be1100;
  color: #ffffff;
}

.btn-danger:hover {
  background: #f14c2e;
  transform: translateY(-1px);
}

/* File Tree */
.file-tree {
  display: flex;
  flex-direction: column;
}

.folder-item {
  margin: 8px 0;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #252526;
  border-left: 3px solid #007acc;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.folder-header:hover {
  background: #2a2d2e;
}

.folder-icon {
  font-size: 14px;
}

.folder-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #4fc3f7;
}

.file-count {
  font-size: 11px;
  color: #858585;
  background: #1e1e1e;
  padding: 2px 6px;
  border-radius: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
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

.file-item.in-folder {
  margin-left: 20px;
  border-left: 2px solid #3e3e42;
  padding-left: 12px;
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #858585;
}

.empty-state p {
  margin: 8px 0;
  font-size: 13px;
}

.empty-hint {
  font-size: 11px;
  color: #6a6a6a;
}
</style>
