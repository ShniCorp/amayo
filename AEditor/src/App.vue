<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/Sidebar.vue";
import MonacoEditor from "./components/MonacoEditor.vue";
import CommandCreator from "./components/CommandCreator.vue";
import EventCreator from "./components/EventCreator.vue";
import ProjectSelector from "./components/ProjectSelector.vue";
import CommandPalette from "./components/CommandPalette.vue";
import SkeletonLoader from "./components/SkeletonLoader.vue";
import DatabaseViewer from "./components/DatabaseViewer.vue";
import EnvManager from "./components/EnvManager.vue";
import GeminiSettings from "./components/GeminiSettings.vue";
import type { ProjectStats, FileInfo, Command, Event } from "./types/bot";

// Estado de la aplicación
const projectRoot = ref<string>("");
const showProjectSelector = ref(false);
const showCommandPalette = ref(false);
const devUltraMode = ref(false);
const initialLoading = ref(true);
const stats = ref<ProjectStats>({
  messageCommands: 0,
  slashCommands: 0,
  standardEvents: 0,
  customEvents: 0,
  totalCommands: 0,
  totalEvents: 0,
});
const commands = ref<FileInfo[]>([]);
const events = ref<FileInfo[]>([]);
const allFiles = ref<FileInfo[]>([]);
const selectedFile = ref<FileInfo | null>(null);
const fileContent = ref<string>("");
const currentView = ref<"editor" | "command-creator" | "event-creator" | "database" | "env-manager" | "gemini-settings">("editor");
const loading = ref(false);
const errorMsg = ref<string>("");
const schemaContent = ref<string>("");

// Deshabilitar F12 y habilitar Ctrl+Q
const handleF12 = (e: KeyboardEvent) => {
  if (e.key === 'F12') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
};

const handleCtrlQ = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'q') {
    e.preventDefault();
    e.stopPropagation();
    showCommandPalette.value = !showCommandPalette.value;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleF12);
  window.addEventListener('keydown', handleCtrlQ);
  
  // Inicializar Discord RPC
  initDiscordRPC();
  
  // Cargar proyecto inicial
  loadProjectData();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleF12);
  window.removeEventListener('keydown', handleCtrlQ);
  
  // Desconectar Discord RPC al cerrar
  disconnectDiscordRPC();
});

// Funciones Discord RPC
async function initDiscordRPC() {
  try {
    await invoke('init_discord_rpc');
    console.log('✅ Discord RPC inicializado');
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar Discord RPC:', error);
  }
}

async function updateDiscordRPC(details: string, state: string, fileName?: string) {
  try {
    await invoke('update_discord_rpc', { details, state, fileName });
  } catch (error) {
    console.warn('⚠️ Error actualizando Discord RPC:', error);
  }
}

async function disconnectDiscordRPC() {
  try {
    await invoke('disconnect_discord_rpc');
  } catch (error) {
    console.warn('⚠️ Error desconectando Discord RPC:', error);
  }
}

// Cargar datos del proyecto
async function loadProjectData() {
  loading.value = true;
  errorMsg.value = "";
  
  try {
    // Si no hay projectRoot, intentar cargar desde localStorage o mostrar selector
    if (!projectRoot.value) {
      const savedPath = localStorage.getItem('amayo-project-path');
      if (savedPath) {
        // Validar ruta guardada
        const isValid = await invoke<boolean>('validate_project_path', {
          path: savedPath,
        });
        
        if (isValid) {
          projectRoot.value = savedPath;
        } else {
          // Ruta inválida, mostrar selector
          showProjectSelector.value = true;
          initialLoading.value = false;
          loading.value = false;
          return;
        }
      } else {
        // No hay ruta guardada, mostrar selector
        showProjectSelector.value = true;
        initialLoading.value = false;
        loading.value = false;
        return;
      }
    }
    
    // Cargar estadísticas
    stats.value = await invoke<ProjectStats>("get_project_stats", { 
      projectRoot: projectRoot.value 
    });
    console.log("📊 Stats cargadas:", stats.value);
    
    // Cargar comandos
    commands.value = await invoke<FileInfo[]>("scan_commands", { 
      projectRoot: projectRoot.value 
    });
    console.log("💬 Comandos cargados:", commands.value.length, commands.value);
    
    // Cargar eventos
    events.value = await invoke<FileInfo[]>("scan_events", { 
      projectRoot: projectRoot.value 
    });
    console.log("📡 Eventos cargados:", events.value.length, events.value);
    
    // Cargar schema.prisma si existe
    try {
      schemaContent.value = await invoke<string>("read_file_content", {
        filePath: `${projectRoot.value}/prisma/schema.prisma`
      });
    } catch {
      schemaContent.value = "// Schema no encontrado";
    }
    
    // Actualizar Discord RPC
    updateDiscordRPC(
      "Navegando proyecto",
      `${stats.value.totalCommands} comandos | ${stats.value.totalEvents} eventos`
    );
    
  } catch (error: any) {
    errorMsg.value = `Error cargando proyecto: ${error}`;
    console.error("Error:", error);
  } finally {
    loading.value = false;
    // Pequeño delay para mostrar el skeleton
    setTimeout(() => {
      initialLoading.value = false;
    }, 800);
  }
}

// Seleccionar archivo
async function selectFile(file: FileInfo) {
  try {
    selectedFile.value = file;
    fileContent.value = await invoke<string>("read_file_content", { 
      filePath: file.path 
    });
    currentView.value = "editor";
    
    // Actualizar Discord RPC
    const fileType = file.commandType 
      ? `Comando ${file.commandType}` 
      : file.eventType 
        ? `Evento ${file.eventType}` 
        : "Archivo";
    updateDiscordRPC(`Editando ${fileType}`, file.name);
  } catch (error: any) {
    errorMsg.value = `Error leyendo archivo: ${error}`;
    console.error("Error:", error);
  }
}

// Guardar archivo
async function saveFile(content: string) {
  if (!selectedFile.value) return;
  
  try {
    await invoke("write_file_content", { 
      filePath: selectedFile.value.path,
      content: content
    });
    
    // Mostrar notificación de éxito
    showNotification("✅ Archivo guardado correctamente");
    
    // Recargar estadísticas
    await loadProjectData();
  } catch (error: any) {
    errorMsg.value = `Error guardando archivo: ${error}`;
    console.error("Error:", error);
  }
}

// Crear nuevo comando
function showCommandCreator() {
  currentView.value = "command-creator";
  updateDiscordRPC("Creando comando nuevo", "En el wizard de comandos");
}

// Crear nuevo evento
function showEventCreator() {
  currentView.value = "event-creator";
  updateDiscordRPC("Creando evento nuevo", "En el wizard de eventos");
}

// Guardar nuevo comando
async function saveCommand(_command: Command, code: string, savePath: string) {
  try {
    const fullPath = `${projectRoot.value}/${savePath}`;
    await invoke("write_file_content", { 
      filePath: fullPath,
      content: code
    });
    
    showNotification("✅ Comando creado correctamente");
    currentView.value = "editor";
    await loadProjectData();
    
  } catch (error: any) {
    errorMsg.value = `Error creando comando: ${error}`;
    console.error("Error:", error);
  }
}

// Guardar nuevo evento
async function saveEvent(_event: Event, code: string, savePath: string) {
  try {
    const fullPath = `${projectRoot.value}/${savePath}`;
    await invoke("write_file_content", { 
      filePath: fullPath,
      content: code
    });
    
    showNotification("✅ Evento creado correctamente");
    currentView.value = "editor";
    await loadProjectData();
    
  } catch (error: any) {
    errorMsg.value = `Error creando evento: ${error}`;
    console.error("Error:", error);
  }
}

// Cerrar creadores
function closeCreator() {
  currentView.value = "editor";
}

// Mostrar notificación temporal
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Manejar selección de proyecto
function handleProjectPathSelected(path: string) {
  projectRoot.value = path;
  showProjectSelector.value = false;
  loadProjectData();
}

// Cambiar directorio del proyecto
function changeProjectDirectory() {
  showProjectSelector.value = true;
}

// Toggle modo Dev Ultra
async function toggleDevUltra() {
  devUltraMode.value = !devUltraMode.value;
  if (devUltraMode.value) {
    showNotification("⚡ Modo Dev Ultra Activado - Cargando archivos...");
    // Cargar todos los archivos del proyecto
    try {
      allFiles.value = await invoke<FileInfo[]>("scan_all_files", { 
        projectRoot: projectRoot.value 
      });
    } catch (error: any) {
      errorMsg.value = `Error cargando archivos: ${error}`;
      console.error("Error:", error);
    }
  } else {
    showNotification("🔒 Modo Dev Ultra Desactivado");
    allFiles.value = [];
  }
}

// Toggle Database Viewer
function toggleDatabase() {
  if (currentView.value === 'database') {
    currentView.value = 'editor';
    updateDiscordRPC("Navegando proyecto", "En el editor");
  } else {
    currentView.value = 'database';
    updateDiscordRPC("Editando base de datos", "Visualizando schema.prisma");
  }
}

// Toggle Env Manager
function toggleEnvManager() {
  if (currentView.value === 'env-manager') {
    currentView.value = 'editor';
    updateDiscordRPC("Navegando proyecto", "En el editor");
  } else {
    currentView.value = 'env-manager';
    updateDiscordRPC("Configurando variables", "Gestionando .env");
  }
}

// Toggle Gemini Settings
function toggleGeminiSettings() {
  if (currentView.value === 'gemini-settings') {
    currentView.value = 'editor';
    updateDiscordRPC("Navegando proyecto", "En el editor");
  } else {
    currentView.value = 'gemini-settings';
    updateDiscordRPC("Configurando Gemini AI", "Google Gemini Assistant");
  }
}

// Guardar schema de base de datos
async function saveSchema(content: string) {
  try {
    await invoke("write_file_content", { 
      filePath: `${projectRoot.value}/prisma/schema.prisma`,
      content: content
    });
    schemaContent.value = content;
    showNotification("✅ Schema guardado correctamente");
  } catch (error: any) {
    errorMsg.value = `Error guardando schema: ${error}`;
    console.error("Error:", error);
  }
}

// Manejar comandos del palette
function handlePaletteCommand(commandId: string) {
  switch (commandId) {
    case 'new-command':
      showCommandCreator();
      break;
    case 'new-event':
      showEventCreator();
      break;
    case 'refresh':
      loadProjectData();
      break;
    case 'change-project':
      changeProjectDirectory();
      break;
    case 'database':
      toggleDatabase();
      break;
    case 'env-manager':
      toggleEnvManager();
      break;
    case 'toggle-dev-ultra':
      toggleDevUltra();
      break;
    case 'save':
      if (selectedFile.value && fileContent.value) {
        saveFile(fileContent.value);
      }
      break;
  }
}
</script>

<template>
  <div class="app-container">
    <!-- Skeleton Loader -->
    <SkeletonLoader v-if="initialLoading" />

    <!-- Command Palette -->
    <CommandPalette 
      :isOpen="showCommandPalette"
      @close="showCommandPalette = false"
      @command="handlePaletteCommand"
    />

    <!-- Selector de proyecto -->
    <ProjectSelector 
      v-if="showProjectSelector && !initialLoading"
      @path-selected="handleProjectPathSelected"
    />

    <template v-if="!showProjectSelector && !initialLoading">
      <Sidebar 
        :stats="stats"
        :commands="commands"
        :events="events"
        :allFiles="allFiles"
        :selectedFile="selectedFile"
        :projectRoot="projectRoot"
        :devUltraMode="devUltraMode"
        @new-command="showCommandCreator"
        @new-event="showEventCreator"
        @refresh="loadProjectData"
        @select-file="selectFile"
        @change-directory="changeProjectDirectory"
        @toggle-dev-ultra="toggleDevUltra"
        @toggle-database="toggleDatabase"
        @toggle-env-manager="toggleEnvManager"
        @toggle-gemini-settings="toggleGeminiSettings"
        @notify="showNotification"
      />
      
      <div class="main-content">
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">⏳ Cargando proyecto...</div>
        </div>
        
        <div v-else-if="errorMsg" class="error-banner">
          ❌ {{ errorMsg }}
          <button @click="errorMsg = ''" class="close-error">✕</button>
        </div>
        
        <!-- Editor Monaco -->
        <MonacoEditor 
          v-if="currentView === 'editor' && selectedFile"
          :fileInfo="selectedFile"
          :content="fileContent"
          @save="saveFile"
        />
        
        <!-- Command Creator -->
        <CommandCreator 
          v-if="currentView === 'command-creator'"
          @save="saveCommand"
          @close="closeCreator"
        />
        
        <!-- Event Creator -->
        <EventCreator 
          v-if="currentView === 'event-creator'"
          @save="saveEvent"
          @close="closeCreator"
        />
        
        <!-- Database Viewer -->
        <DatabaseViewer 
          v-if="currentView === 'database'"
          :schemaContent="schemaContent"
          :projectRoot="projectRoot"
          @save="saveSchema"
        />
        
        <!-- Environment Manager -->
        <EnvManager 
          v-if="currentView === 'env-manager'"
          :projectRoot="projectRoot"
          @close="() => currentView = 'editor'"
          @notify="showNotification"
        />
        
        <!-- Gemini Settings -->
        <GeminiSettings 
          v-if="currentView === 'gemini-settings'"
        />
        
        <!-- Welcome Screen -->
        <div v-if="currentView === 'editor' && !selectedFile" class="welcome-screen">
          <div class="welcome-content">
            <h1>🤖 Amayo Bot Editor</h1>
            <p>Editor estilo VS Code para tu bot de Discord</p>
            <div class="welcome-stats">
              <div class="welcome-stat">
                <div class="stat-number">{{ stats.totalCommands }}</div>
                <div class="stat-label">Comandos Totales</div>
              </div>
              <div class="welcome-stat">
                <div class="stat-number">{{ stats.totalEvents }}</div>
                <div class="stat-label">Eventos Totales</div>
              </div>
            </div>
            <div class="welcome-actions">
              <button @click="showCommandCreator" class="welcome-btn primary">
                ➕ Crear Comando
              </button>
              <button @click="showEventCreator" class="welcome-btn primary">
                ➕ Crear Evento
              </button>
            </div>
            <p class="welcome-hint">
              💡 <strong>Tip:</strong> Selecciona un archivo del panel izquierdo para editarlo
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #1e1e1e;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(30, 30, 30, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  color: #ffffff;
  font-size: 18px;
  font-weight: 500;
}

.error-banner {
  background-color: #f14c4c;
  color: #ffffff;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
}

.close-error {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

.close-error:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1e1e1e;
}

.welcome-content {
  text-align: center;
  max-width: 600px;
  padding: 40px;
}

.welcome-content h1 {
  color: #ffffff;
  font-size: 48px;
  margin: 0 0 16px 0;
  font-weight: 700;
}

.welcome-content > p {
  color: #cccccc;
  font-size: 18px;
  margin: 0 0 40px 0;
}

.welcome-stats {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 40px;
}

.welcome-stat {
  text-align: center;
}

.stat-number {
  font-size: 48px;
  font-weight: 700;
  color: #4ec9b0;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #cccccc;
  font-weight: 500;
}

.welcome-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 40px;
}

.welcome-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
}

.welcome-btn.primary {
  background-color: #0e639c;
  color: #ffffff;
}

.welcome-btn.primary:hover {
  background-color: #1177bb;
  transform: translateY(-2px);
}

.welcome-hint {
  color: #858585;
  font-size: 14px;
  margin: 0;
  padding: 16px;
  background-color: #252526;
  border-radius: 6px;
  border-left: 3px solid #0e639c;
}

.welcome-hint strong {
  color: #4ec9b0;
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Notificaciones */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  animation: slideIn 0.3s ease-out;
}

.notification-success {
  background-color: #4ec9b0;
}

.notification-error {
  background-color: #f48771;
}

.notification-info {
  background-color: #007acc;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ============================================
   RESPONSIVE DESIGN - Media Queries
   ============================================ */

/* Pantallas grandes (1920px+) */
@media (min-width: 1920px) {
  .welcome-content h1 {
    font-size: 64px;
  }
  
  .welcome-content > p {
    font-size: 22px;
  }
  
  .stat-number {
    font-size: 56px;
  }
  
  .stat-label {
    font-size: 16px;
  }
}

/* Pantallas medianas-grandes (1366px - 1919px) */
@media (min-width: 1366px) and (max-width: 1919px) {
  .welcome-content h1 {
    font-size: 52px;
  }
  
  .welcome-stats {
    gap: 32px;
  }
}

/* Tabletas y pantallas pequeñas (768px - 1365px) */
@media (max-width: 1365px) {
  .app-container {
    flex-direction: column;
  }
  
  .welcome-content h1 {
    font-size: 40px;
  }
  
  .welcome-content > p {
    font-size: 16px;
  }
  
  .welcome-stats {
    flex-direction: column;
    gap: 20px;
  }
  
  .stat-number {
    font-size: 40px;
  }
}

/* Móviles y pantallas muy pequeñas (< 768px) */
@media (max-width: 767px) {
  .app-container {
    flex-direction: column;
  }
  
  .welcome-content {
    padding: 20px;
  }
  
  .welcome-content h1 {
    font-size: 32px;
  }
  
  .welcome-content > p {
    font-size: 14px;
    margin-bottom: 24px;
  }
  
  .stat-number {
    font-size: 32px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    font-size: 13px;
    padding: 10px 16px;
  }
  
  .error-banner {
    font-size: 12px;
    padding: 10px 16px;
  }
}

/* Ajustes para pantallas ultra-wide (2560px+) */
@media (min-width: 2560px) {
  .welcome-content {
    max-width: 800px;
  }
  
  .welcome-content h1 {
    font-size: 72px;
  }
  
  .welcome-content > p {
    font-size: 24px;
  }
}

/* Ajustes de altura para pantallas cortas */
@media (max-height: 700px) {
  .welcome-content {
    padding: 20px;
  }
  
  .welcome-content h1 {
    font-size: 36px;
    margin-bottom: 12px;
  }
  
  .welcome-content > p {
    font-size: 16px;
    margin-bottom: 24px;
  }
  
  .welcome-stats {
    margin-bottom: 24px;
  }
}
</style>