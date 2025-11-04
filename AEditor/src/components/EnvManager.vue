<template>
  <div class="env-manager">
    <div class="env-header">
      <div class="header-left">
        <span class="env-icon">🔐</span>
        <span class="env-title">Environment Variables Manager</span>
      </div>
      <div class="header-right">
        <button @click="scanProjectVars" class="scan-btn" :disabled="scanning">
          🔍 {{ scanning ? 'Escaneando...' : 'Escanear Proyecto' }}
        </button>
        <button @click="saveEnvFile" class="save-btn" :disabled="!hasChanges">
          💾 Guardar .env
        </button>
        <button @click="$emit('close')" class="close-btn">
          ✕ Cerrar
        </button>
      </div>
    </div>

    <div class="env-content">
      <!-- Info Panel -->
      <div class="info-panel">
        <div class="info-item">
          <span class="info-label">📄 Variables en .env:</span>
          <span class="info-value">{{ Object.keys(envVariables).length }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🔍 Variables detectadas:</span>
          <span class="info-value">{{ detectedVars.length }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">⚠️ Sin definir:</span>
          <span class="info-value warning">{{ missingVars.length }}</span>
        </div>
      </div>

      <!-- Variables Form -->
      <div class="variables-section">
        <div class="section-header">
          <h3>🔧 Variables de Entorno</h3>
          <button @click="addNewVariable" class="add-var-btn">
            ➕ Agregar Variable
          </button>
        </div>

        <div v-if="Object.keys(envVariables).length === 0" class="empty-state">
          <p>📭 No hay variables definidas</p>
          <p class="empty-hint">Usa el botón "Escanear Proyecto" para detectar variables automáticamente</p>
        </div>

        <div v-else class="variables-list">
          <div 
            v-for="(value, key) in envVariables" 
            :key="key"
            class="variable-item"
            :class="{ 'detected': detectedVars.includes(key), 'manual': !detectedVars.includes(key) }"
          >
            <div class="variable-header">
              <div class="variable-badge">
                <span v-if="detectedVars.includes(key)" class="badge detected-badge">🔍 Detectada</span>
                <span v-else class="badge manual-badge">✍️ Manual</span>
              </div>
              <button @click="deleteVariable(key)" class="delete-var-btn" title="Eliminar variable">
                🗑️
              </button>
            </div>
            
            <div class="variable-field">
              <label :for="`var-${key}`" class="variable-label">
                {{ key }}
              </label>
              <div class="input-with-toggle">
                <input
                  :id="`var-${key}`"
                  :type="showValues[key] ? 'text' : 'password'"
                  :value="value"
                  @input="updateVariable(key, ($event.target as HTMLInputElement).value)"
                  class="variable-input"
                  :placeholder="`Valor para ${key}`"
                />
                <button 
                  @click="toggleShowValue(key)" 
                  class="toggle-visibility-btn"
                  :title="showValues[key] ? 'Ocultar' : 'Mostrar'"
                >
                  {{ showValues[key] ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>
            
            <!-- Detectar dónde se usa la variable -->
            <div v-if="varUsages[key] && varUsages[key].length > 0" class="variable-usage">
              <details>
                <summary>📍 Usada en {{ varUsages[key].length }} ubicación(es)</summary>
                <ul class="usage-list">
                  <li v-for="(location, idx) in varUsages[key]" :key="idx" class="usage-item">
                    <code class="usage-code">{{ location }}</code>
                  </li>
                </ul>
              </details>
            </div>
            <div v-else-if="!detectedVars.includes(key)" class="variable-usage">
              <span class="not-used-label">ℹ️ Variable manual (no detectada en el código)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Missing Variables Alert -->
      <div v-if="missingVars.length > 0" class="missing-vars-section">
        <div class="alert alert-warning">
          <div class="alert-header">
            <span class="alert-icon">⚠️</span>
            <h4>Variables sin definir encontradas en el código</h4>
          </div>
          <p class="alert-text">
            Se detectaron {{ missingVars.length }} variable(s) en el código que no están definidas en el .env:
          </p>
          <div class="missing-vars-list">
            <div v-for="varName in missingVars" :key="varName" class="missing-var-item">
              <code>{{ varName }}</code>
              <button @click="addMissingVariable(varName)" class="add-missing-btn">
                ➕ Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Raw Editor -->
      <div class="raw-editor-section">
        <div class="section-header">
          <h3>📝 Editor Raw (.env)</h3>
          <button @click="syncFromRaw" class="sync-btn">
            🔄 Sincronizar desde Raw
          </button>
        </div>
        <textarea
          v-model="rawEnvContent"
          class="raw-editor"
          spellcheck="false"
          @input="onRawChange"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// Tipo para ubicaciones de variables
interface VarLocation {
  variable: string;
  file: string;
  line: number;
  snippet: string;
}

const props = defineProps<{
  projectRoot: string;
}>();

const emit = defineEmits<{
  'close': [];
  'notify': [message: string, type?: 'success' | 'error' | 'info'];
}>();

// Estado
const envVariables = ref<Record<string, string>>({});
const detectedVars = ref<string[]>([]);
const showValues = ref<Record<string, boolean>>({});
const rawEnvContent = ref<string>('');
const hasChanges = ref(false);
const scanning = ref(false);
const varUsages = ref<Record<string, string[]>>({});
const varLocations = ref<VarLocation[]>([]); // Nueva: ubicaciones exactas
const isUpdatingRaw = ref(false); // Flag para evitar loops

// Computed
const missingVars = computed(() => {
  return detectedVars.value.filter(varName => !(varName in envVariables.value));
});

// Cargar .env al montar
onMounted(async () => {
  await loadEnvFile();
  await scanProjectVars();
});

// Watch para cambios
watch(envVariables, () => {
  if (!isUpdatingRaw.value) {
    hasChanges.value = true;
    updateRawContent();
  }
}, { deep: true });

/**
 * 📂 CARGAR ARCHIVO .ENV
 * 
 * Esta función se ejecuta al abrir el EnvManager.
 * 
 * ¿Qué hace?
 * 1. Lee el archivo .env del proyecto usando el comando Rust 'read_env_file'
 * 2. Muestra el contenido en el editor raw
 * 3. Parsea las variables KEY=VALUE al formato de objetos
 * 4. Si no existe el .env, inicia vacío para crear uno nuevo
 * 
 * Errores comunes:
 * - "No such file": El .env no existe (normal en proyectos nuevos)
 * - Permisos: El archivo está bloqueado o no tienes acceso
 */
async function loadEnvFile() {
  try {
    console.log('📂 Cargando .env desde:', props.projectRoot);
    const content = await invoke<string>('read_env_file', {
      projectRoot: props.projectRoot
    });
    
    console.log('✅ .env cargado, contenido:', content);
    rawEnvContent.value = content;
    parseEnvContent(content);
    hasChanges.value = false; // No hay cambios al cargar
    
  } catch (error: any) {
    console.error('❌ Error cargando .env:', error);
    // Si no existe, está vacío
    if (error.includes('No such file') || error.includes('no existe')) {
      emit('notify', 'ℹ️ No se encontró archivo .env, se creará uno nuevo', 'info');
      rawEnvContent.value = '';
      envVariables.value = {};
      hasChanges.value = false;
    } else {
      emit('notify', `❌ Error leyendo .env: ${error}`, 'error');
    }
  }
}

/**
 * 🔍 PARSEAR CONTENIDO .ENV
 * 
 * Convierte texto plano del .env en un objeto JavaScript.
 * 
 * ¿Qué hace?
 * 1. Divide el texto en líneas
 * 2. Ignora comentarios (líneas que empiezan con #) y líneas vacías
 * 3. Busca el patrón KEY=VALUE en cada línea
 * 4. Remueve comillas simples o dobles del valor
 * 5. Valida que las claves sean válidas (solo letras, números y guiones bajos)
 * 
 * Ejemplos de líneas válidas:
 * - DATABASE_URL=postgres://localhost:5432
 * - API_KEY="abc123"
 * - DEBUG=true
 * 
 * @param content - El texto completo del archivo .env
 * @param markAsChanged - Si es true, marca que hay cambios sin guardar
 */
function parseEnvContent(content: string, markAsChanged: boolean = false) {
  const vars: Record<string, string> = {};
  const lines = content.split('\n');
  
  console.log('🔍 Parseando .env, líneas:', lines.length);
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Ignorar comentarios y líneas vacías
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Parsear KEY=VALUE con soporte para valores vacíos
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      // Remover comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Solo aceptar claves válidas (letras, números y guiones bajos)
      if (/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        vars[key] = value;
        console.log(`  ✓ ${key}=${value}`);
      }
    }
  }
  
  console.log('✅ Variables parseadas:', Object.keys(vars).length);
  envVariables.value = vars;
  hasChanges.value = markAsChanged;
}

/**
 * 🔍 ESCANEAR PROYECTO EN BUSCA DE process.env.X
 * 
 * Busca en todo el código fuente las variables de entorno que se están usando.
 * 
 * ¿Qué hace?
 * 1. Llama al backend Rust que escanea archivos .ts, .js y .prisma
 * 2. Busca patrones como process.env.DATABASE_URL
 * 3. Devuelve las ubicaciones exactas (archivo, línea, snippet de código)
 * 4. Agrupa las ubicaciones por nombre de variable
 * 5. Auto-agrega variables detectadas que no están en el .env (con valor vacío)
 * 
 * Ejemplo de resultado:
 * - DATABASE_URL encontrada en:
 *   src/prisma.ts:5 → const url = process.env.DATABASE_URL
 *   src/config.ts:12 → database: process.env.DATABASE_URL
 * 
 * Esto te ayuda a:
 * - No olvidar ninguna variable necesaria
 * - Saber dónde se usa cada variable
 * - Eliminar variables que ya no se usan
 */
async function scanProjectVars() {
  scanning.value = true;
  try {
    // Obtener ubicaciones exactas
    const locations = await invoke<VarLocation[]>('scan_env_variables_with_locations', {
      projectRoot: props.projectRoot
    });
    
    varLocations.value = locations;
    
    // Extraer nombres únicos de variables
    const uniqueVars = new Set<string>();
    locations.forEach(loc => uniqueVars.add(loc.variable));
    detectedVars.value = Array.from(uniqueVars);
    
    // Agrupar ubicaciones por variable
    const usages: Record<string, string[]> = {};
    for (const loc of locations) {
      if (!usages[loc.variable]) {
        usages[loc.variable] = [];
      }
      usages[loc.variable].push(`${loc.file}:${loc.line} → ${loc.snippet}`);
    }
    varUsages.value = usages;
    
    emit('notify', `✅ Escaneadas ${detectedVars.value.length} variables del código`, 'success');
    
    // Auto-agregar variables faltantes con valor vacío
    let addedCount = 0;
    for (const varName of detectedVars.value) {
      if (!(varName in envVariables.value)) {
        envVariables.value[varName] = '';
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      emit('notify', `➕ Se agregaron ${addedCount} variables nuevas`, 'info');
    }
    
  } catch (error: any) {
    console.error('Error escaneando variables:', error);
    emit('notify', `❌ Error escaneando: ${error}`, 'error');
  } finally {
    scanning.value = false;
  }
}

/**
 * 📝 ACTUALIZAR CONTENIDO RAW
 * 
 * Convierte el objeto de variables en texto plano formato .env
 * 
 * ¿Qué hace?
 * 1. Recorre todas las variables en envVariables
 * 2. Formatea cada una como KEY=VALUE
 * 3. Agrega comillas si el valor contiene espacios o caracteres especiales
 * 4. Actualiza el contenido del editor raw
 * 
 * Ejemplos de formato:
 * - DATABASE_URL=postgres://localhost → DATABASE_URL=postgres://localhost
 * - API_KEY=abc 123 → API_KEY="abc 123"
 * - DEBUG=true → DEBUG=true
 */
function updateRawContent() {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(envVariables.value)) {
    // Si el valor contiene espacios o caracteres especiales, usar comillas
    const needsQuotes = value.includes(' ') || value.includes('#') || value.includes('=');
    const formattedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${formattedValue}`);
  }
  
  rawEnvContent.value = lines.join('\n');
}

/**
 * 🔄 SINCRONIZAR DESDE RAW
 * 
 * Toma el texto del editor raw y actualiza las variables del formulario.
 * 
 * ¿Qué hace?
 * 1. Activa el flag isUpdatingRaw para evitar loops infinitos
 * 2. Parsea el texto raw a variables
 * 3. Marca que hay cambios sin guardar
 * 4. Desactiva el flag después de que Vue actualice el DOM
 * 
 * ¿Por qué el flag isUpdatingRaw?
 * Sin él, se crearía un loop:
 * - Cambias raw → se parsea → actualiza envVariables
 * - El watch de envVariables → actualiza raw
 * - raw cambia → se parsea → actualiza envVariables
 * - Loop infinito 💥
 * 
 * Con el flag:
 * - Cambias raw → flag ON → se parsea → actualiza envVariables
 * - El watch ve que flag está ON → no actualiza raw
 * - flag OFF después del nextTick
 */
function syncFromRaw() {
  isUpdatingRaw.value = true;
  parseEnvContent(rawEnvContent.value, true); // Marcar como cambiado
  emit('notify', '🔄 Sincronizado desde editor raw', 'info');
  // Permitir que el siguiente cambio actualice raw
  nextTick(() => {
    isUpdatingRaw.value = false;
  });
}

/**
 * ✏️ DETECTAR CAMBIOS EN RAW
 * 
 * Se ejecuta cada vez que escribes en el editor raw.
 * Simplemente marca que hay cambios sin guardar.
 */
function onRawChange() {
  hasChanges.value = true;
}

/**
 * ➕ AGREGAR NUEVA VARIABLE
 * 
 * Permite agregar manualmente una variable que no fue detectada.
 * 
 * ¿Qué hace?
 * 1. Pide el nombre de la variable
 * 2. Convierte a mayúsculas y reemplaza caracteres inválidos
 * 3. Verifica que no exista ya
 * 4. La agrega con valor vacío
 * 
 * Validación:
 * - Solo acepta letras, números y guiones bajos
 * - Convierte automáticamente a mayúsculas
 * - Ejemplo: "mi variable" → "MI_VARIABLE"
 */
function addNewVariable() {
  const varName = prompt('Nombre de la variable (ej: DATABASE_URL):');
  if (!varName) return;
  
  // Validar nombre (solo mayúsculas, números y guiones bajos)
  const cleanName = varName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  
  if (cleanName in envVariables.value) {
    emit('notify', '⚠️ Esta variable ya existe', 'error');
    return;
  }
  
  envVariables.value[cleanName] = '';
  emit('notify', `✅ Variable ${cleanName} agregada`, 'success');
}

/**
 * ➕ AGREGAR VARIABLE FALTANTE
 * 
 * Agrega rápidamente una variable detectada que falta en el .env
 * 
 * ¿Qué hace?
 * - Agrega la variable con valor vacío
 * - No pide confirmación porque ya sabemos que se usa en el código
 * 
 * @param varName - Nombre de la variable a agregar
 */
function addMissingVariable(varName: string) {
  envVariables.value[varName] = '';
  emit('notify', `✅ Variable ${varName} agregada`, 'success');
}

/**
 * ✏️ ACTUALIZAR VARIABLE
 * 
 * Se ejecuta cada vez que cambias el valor en un input.
 * Simplemente actualiza el valor en el objeto.
 * 
 * @param key - Nombre de la variable
 * @param value - Nuevo valor
 */
function updateVariable(key: string, value: string) {
  envVariables.value[key] = value;
}

/**
 * 🗑️ ELIMINAR VARIABLE
 * 
 * Elimina una variable del .env
 * 
 * ¿Qué hace?
 * 1. Pide confirmación
 * 2. Elimina del objeto envVariables
 * 3. El watch automáticamente actualiza el raw
 * 
 * Nota: No elimina del disco hasta que guardes.
 * 
 * @param key - Nombre de la variable a eliminar
 */
function deleteVariable(key: string) {
  if (confirm(`¿Eliminar la variable ${key}?`)) {
    delete envVariables.value[key];
    emit('notify', `🗑️ Variable ${key} eliminada`, 'info');
  }
}

/**
 * 👁️ TOGGLE VISIBILIDAD DE VALOR
 * 
 * Cambia entre mostrar/ocultar el valor de una variable.
 * Útil para secrets que no quieres que se vean en pantalla.
 * 
 * @param key - Nombre de la variable
 */
function toggleShowValue(key: string) {
  showValues.value[key] = !showValues.value[key];
}

/**
 * 💾 GUARDAR ARCHIVO .ENV
 * 
 * Escribe los cambios al archivo .env en el disco.
 * 
 * ¿Qué hace?
 * 1. Sincroniza del raw por si editaste ahí
 * 2. Llama al backend Rust con el comando 'write_env_file'
 * 3. El backend escribe el archivo en el disco
 * 4. Marca que no hay cambios sin guardar
 * 
 * Errores comunes:
 * - Permiso denegado: El archivo está bloqueado o necesitas permisos de admin
 * - Ruta inválida: El projectRoot no es correcto
 * 
 * Ubicación del archivo:
 * {projectRoot}/.env
 * Ejemplo: C:/Users/Shnimlz/Documents/GitHub/amayo/.env
 */
async function saveEnvFile() {
  try {
    console.log('💾 Guardando .env...');
    console.log('Ruta del proyecto:', props.projectRoot);
    console.log('Contenido a guardar:', rawEnvContent.value);
    
    // Primero sincronizar del raw por si acaso
    isUpdatingRaw.value = true;
    parseEnvContent(rawEnvContent.value);
    await nextTick();
    isUpdatingRaw.value = false;
    
    // Guardar
    await invoke('write_env_file', {
      projectRoot: props.projectRoot,
      content: rawEnvContent.value
    });
    
    hasChanges.value = false;
    console.log('✅ Guardado exitoso');
    emit('notify', '✅ Archivo .env guardado correctamente', 'success');
    
  } catch (error: any) {
    console.error('❌ Error guardando .env:', error);
    emit('notify', `❌ Error guardando: ${error}`, 'error');
  }
}
</script>

<style scoped>
.env-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #cccccc;
}

.env-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.env-icon {
  font-size: 24px;
}

.env-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.header-right {
  display: flex;
  gap: 8px;
}

.scan-btn,
.save-btn,
.close-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.scan-btn {
  background-color: #4ec9b0;
  color: #1e1e1e;
}

.scan-btn:hover:not(:disabled) {
  background-color: #5fd4bf;
}

.save-btn {
  background-color: #0e639c;
  color: #ffffff;
}

.save-btn:hover:not(:disabled) {
  background-color: #1177bb;
}

.close-btn {
  background-color: #3e3e42;
  color: #cccccc;
}

.close-btn:hover {
  background-color: #505050;
}

.scan-btn:disabled,
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.env-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.info-panel {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background-color: #252526;
  border-radius: 6px;
  border-left: 3px solid #4ec9b0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #858585;
}

.info-value {
  font-size: 24px;
  font-weight: 700;
  color: #4ec9b0;
}

.info-value.warning {
  color: #f48771;
}

.variables-section,
.missing-vars-section,
.raw-editor-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.add-var-btn,
.sync-btn {
  padding: 6px 12px;
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.add-var-btn:hover,
.sync-btn:hover {
  background-color: #1177bb;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #858585;
}

.empty-state p {
  margin: 8px 0;
}

.empty-hint {
  font-size: 13px;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.variable-item {
  padding: 16px;
  background-color: #252526;
  border-radius: 6px;
  border-left: 3px solid #3e3e42;
}

.variable-item.detected {
  border-left-color: #4ec9b0;
}

.variable-item.manual {
  border-left-color: #c586c0;
}

.variable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.variable-badge {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
}

.detected-badge {
  background-color: rgba(78, 201, 176, 0.2);
  color: #4ec9b0;
}

.manual-badge {
  background-color: rgba(197, 134, 192, 0.2);
  color: #c586c0;
}

.delete-var-btn {
  padding: 4px 8px;
  background-color: transparent;
  color: #f48771;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.delete-var-btn:hover {
  background-color: rgba(244, 135, 113, 0.2);
}

.variable-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variable-label {
  font-size: 13px;
  font-weight: 600;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
}

.input-with-toggle {
  display: flex;
  gap: 4px;
}

.variable-input {
  flex: 1;
  padding: 8px 12px;
  background-color: #1e1e1e;
  color: #cccccc;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.variable-input:focus {
  outline: none;
  border-color: #0e639c;
}

.toggle-visibility-btn {
  padding: 8px 12px;
  background-color: #3e3e42;
  color: #cccccc;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.toggle-visibility-btn:hover {
  background-color: #505050;
}

.variable-usage {
  margin-top: 8px;
}

.variable-usage details {
  font-size: 12px;
  color: #858585;
}

.variable-usage summary {
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
  user-select: none;
}

.variable-usage summary:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.usage-list {
  list-style: none;
  padding: 8px 0 0 16px;
  margin: 0;
}

.usage-item {
  padding: 4px 0;
  font-size: 11px;
}

.usage-code {
  background-color: #2d2d30;
  padding: 2px 6px;
  border-radius: 3px;
  color: #4EC9B0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  display: inline-block;
  margin: 2px 0;
  border-left: 2px solid #0e639c;
}

.not-used-label {
  font-size: 11px;
  color: #858585;
  font-style: italic;
}

.usage-list li {
  padding: 4px 0;
}

.usage-list code {
  font-size: 11px;
  color: #4ec9b0;
  background-color: #1e1e1e;
  padding: 2px 6px;
  border-radius: 3px;
}

.alert {
  padding: 16px;
  border-radius: 6px;
  border-left: 3px solid;
}

.alert-warning {
  background-color: rgba(244, 135, 113, 0.1);
  border-left-color: #f48771;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.alert-icon {
  font-size: 20px;
}

.alert-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.alert-text {
  margin: 8px 0;
  font-size: 13px;
  color: #cccccc;
}

.missing-vars-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.missing-var-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: #252526;
  border-radius: 4px;
}

.missing-var-item code {
  font-size: 12px;
  color: #4ec9b0;
}

.add-missing-btn {
  padding: 4px 8px;
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.add-missing-btn:hover {
  background-color: #1177bb;
}

.raw-editor {
  width: 100%;
  min-height: 300px;
  padding: 12px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.raw-editor:focus {
  outline: none;
  border-color: #0e639c;
}
</style>
