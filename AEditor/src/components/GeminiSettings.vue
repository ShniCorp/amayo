<template>
  <div class="gemini-settings">
      <div class="settings-header">
        <h3>✨ Configuración de Gemini AI</h3>
        <p class="subtitle">Autocompletado inteligente con Google Gemini</p>
        <div class="info-box">
          <p><strong>💡 Cómo usar Gemini:</strong></p>
          <ul>
            <li><strong>Inline Suggestions:</strong> Escribe código y aparecerán sugerencias en gris. Presiona <kbd>Tab</kbd> para aceptar.</li>
            <li><strong>Modo Thinking:</strong> Activa para código complejo. El modelo "piensa" antes de sugerir (más lento pero más preciso).</li>
          </ul>
        </div>
      </div>    <div class="settings-content">
      <div class="status-badge" :class="{ active: isConfigured, inactive: !isConfigured }">
        <span class="status-dot"></span>
        {{ isConfigured ? '✓ Configurado' : '○ No configurado' }}
      </div>

      <div class="form-group">
        <label for="model">Modelo de IA</label>
        <select id="model" v-model="selectedModel" class="model-select" @change="hasChanges = true">
          <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash (Rápido)</option>
          <option value="gemini-2.5-pro">🚀 Gemini 2.5 Pro (Potente)</option>
          <option value="gemini-1.5-flash">⚡ Gemini 1.5 Flash (Legacy)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="agentMode" @change="hasChanges = true" />
          <span class="checkbox-text">
            <strong>🧠 Modo Thinking (Experimental)</strong>
            <small>El modelo razona internamente antes de sugerir código (más tokens, más lento)</small>
          </span>
        </label>
      </div>

      <div class="form-group">
        <label class="checkbox-label warning-label">
          <input type="checkbox" v-model="inlineSuggestionsEnabled" @change="hasChanges = true" />
          <span class="checkbox-text">
            <strong>⚡ Autocompletado Inline (Alto consumo de tokens)</strong>
            <small>
              <span class="warning-text">⚠️ ADVERTENCIA:</span> Genera sugerencias automáticamente mientras escribes. 
              Cada pausa de 500ms hace una llamada a la API. Puede consumir muchos tokens rápidamente.
              <br><strong>Recomendación:</strong> Usa solo los botones de acción (Fix, Explain, etc.) para ahorrar tokens.
            </small>
          </span>
        </label>
      </div>

      <div class="form-group">
        <label for="apiKey">API Key de Google</label>
        <div class="input-wrapper">
          <input id="apiKey" v-model="apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="Ingresa tu API key" class="api-key-input" @input="hasChanges = true" />
          <button class="toggle-visibility-btn" @click="showApiKey = !showApiKey" type="button">{{ showApiKey ? '👁️' : '👁️‍🗨️' }}</button>
        </div>
        <span class="helper-text">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="link">Obtén tu API key gratis aquí</a>
        </span>
      </div>

      <div class="actions">
        <button class="btn btn-primary" :disabled="!hasChanges || !apiKey" @click="saveSettings">💾 Guardar</button>
        <button v-if="isConfigured" class="btn btn-test" @click="testConnection" :disabled="testing">{{ testing ? '⏳ Probando...' : '🧪 Probar' }}</button>
      </div>

      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';

const apiKey = ref('');
const showApiKey = ref(false);
const selectedModel = ref('gemini-2.5-flash');
const agentMode = ref(false);
const inlineSuggestionsEnabled = ref(false);
const hasChanges = ref(false);
const isConfigured = ref(false);
const testing = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error' | 'info'>('info');

onMounted(async () => {
  try {
    const dataDir = await appDataDir();
    const configJson = await invoke<string>('load_gemini_config', { appDataDir: dataDir });
    const config = JSON.parse(configJson);
    if (config.api_key) {
      apiKey.value = config.api_key;
      selectedModel.value = config.model || 'gemini-2.5-flash';
      agentMode.value = config.agent_mode || false;
      inlineSuggestionsEnabled.value = config.inline_suggestions_enabled || false;
      isConfigured.value = true;
      localStorage.setItem('gemini_api_key', config.api_key);
      localStorage.setItem('gemini_model', config.model);
      localStorage.setItem('gemini_agent_mode', config.agent_mode ? 'true' : 'false');
      localStorage.setItem('gemini_inline_suggestions', config.inline_suggestions_enabled ? 'true' : 'false');
    }
  } catch (error) {
    console.log('No hay configuración previa');
  }
});

async function saveSettings() {
  if (!apiKey.value) {
    showMessage('Por favor ingresa una API key', 'error');
    return;
  }
  try {
    const dataDir = await appDataDir();
    await invoke('save_gemini_config', { 
      apiKey: apiKey.value, 
      model: selectedModel.value, 
      appDataDir: dataDir,
      agentMode: agentMode.value,
      inlineSuggestionsEnabled: inlineSuggestionsEnabled.value
    });
    localStorage.setItem('gemini_api_key', apiKey.value);
    localStorage.setItem('gemini_model', selectedModel.value);
    localStorage.setItem('gemini_agent_mode', agentMode.value ? 'true' : 'false');
    localStorage.setItem('gemini_inline_suggestions', inlineSuggestionsEnabled.value ? 'true' : 'false');
    isConfigured.value = true;
    hasChanges.value = false;
    showMessage('✅ Configuración guardada', 'success');
  } catch (error) {
    showMessage(`❌ Error: ${error}`, 'error');
  }
}

async function testConnection() {
  if (!apiKey.value) return;
  testing.value = true;
  showMessage('🔍 Probando conexión...', 'info');
  try {
    const result = await invoke<string[]>('get_gemini_completion', { 
      text: 'function hello() {\n  ', 
      cursorPosition: 21, 
      language: 'javascript', 
      filePath: 'test.js', 
      apiKey: apiKey.value, 
      model: selectedModel.value,
      agentMode: false // Siempre desactivar thinking en el test para que sea rápido
    });
    if (result && result.length > 0) {
      showMessage(`✅ Funciona! Sugerencia: "${result[0].substring(0, 30)}..."`, 'success');
    } else {
      showMessage('⚠️ Sin respuesta. Verifica tu API key o aumenta max_output_tokens', 'error');
    }
  } catch (error) {
    showMessage(`❌ Error: ${error}`, 'error');
  } finally {
    testing.value = false;
  }
}

function showMessage(msg: string, type: 'success' | 'error' | 'info') {
  message.value = msg;
  messageType.value = type;
  if (type === 'success') setTimeout(() => message.value = '', 5000);
}
</script>

<style scoped>
.gemini-settings {
  padding: 30px;
  max-width: 700px;
  margin: 0 auto;
  color: #e0e0e0;
  background: linear-gradient(135deg, #1e1e1e 0%, #252526 50%, #1e1e1e 100%);
  min-height: 100vh;
}

.settings-header {
  margin-bottom: 30px;
  border-bottom: 2px solid transparent;
  background: linear-gradient(90deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3)) bottom / 100% 2px no-repeat;
  padding-bottom: 20px;
  animation: border-glow 3s ease-in-out infinite;
}

@keyframes border-glow {
  0%, 100% {
    background-position: 0% 100%;
  }
  50% {
    background-position: 100% 100%;
  }
}

.settings-header h3 {
  margin: 0 0 8px 0;
  font-size: 32px;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc04 75%, #ea4335 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(66, 133, 244, 0.3);
}
.subtitle { margin: 0 0 15px 0; color: #b0b0b0; font-size: 15px; }
.info-box {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.1) 100%);
  border: 2px solid rgba(66, 133, 244, 0.4);
  border-radius: 12px;
  padding: 20px;
  margin-top: 15px;
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-box:hover {
  border-color: rgba(66, 133, 244, 0.6);
  box-shadow: 0 6px 20px rgba(66, 133, 244, 0.3);
  transform: translateY(-2px);
}
.info-box p { margin: 0 0 10px 0; color: #fff; font-size: 14px; }
.info-box ul { margin: 0; padding-left: 20px; list-style: none; }
.info-box li { margin: 8px 0; color: #e0e0e0; font-size: 13px; line-height: 1.6; position: relative; padding-left: 8px; }
.info-box li::before { content: "•"; position: absolute; left: -12px; color: #4285f4; font-weight: bold; }
.info-box kbd { background: #2d2d30; padding: 2px 6px; border-radius: 4px; border: 1px solid #3e3e42; font-family: monospace; font-size: 12px; color: #4285f4; }
.settings-content { display: flex; flex-direction: column; gap: 20px; }
.status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; width: fit-content; border: 2px solid; }
.status-badge.active { background: rgba(52, 168, 83, 0.25); color: #34a853; border-color: rgba(52, 168, 83, 0.5); }
.status-badge.inactive { background: rgba(158, 158, 158, 0.15); color: #ccc; border-color: rgba(158, 158, 158, 0.3); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px; }
.checkbox-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 12px; background: #2d2d30; border-radius: 8px; border: 2px solid #3e3e42; transition: all 0.2s; }
.checkbox-label:hover { border-color: #4285f4; background: #353538; }
.checkbox-label.warning-label { border-color: #fbbc04; background: rgba(251, 188, 4, 0.05); }
.checkbox-label.warning-label:hover { border-color: #ffc928; background: rgba(251, 188, 4, 0.1); }
.checkbox-label input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; accent-color: #4285f4; margin-top: 2px; }
.checkbox-text { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.checkbox-text strong { color: #fff; font-size: 14px; }
.checkbox-text small { color: #b0b0b0; font-size: 12px; line-height: 1.4; }
.checkbox-text .warning-text { color: #fbbc04; font-weight: 500; }
.checkbox-text .warning-text::before { content: "⚠️ "; }
.model-select, .api-key-input { padding: 12px 16px; background: #2d2d30; color: #e0e0e0; border: 2px solid #3e3e42; border-radius: 6px; font-size: 14px; transition: all 0.2s; }
.model-select:focus, .api-key-input:focus { outline: none; border-color: #4285f4; box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1); }
.input-wrapper { display: flex; gap: 10px; }
.api-key-input { flex: 1; font-family: 'Consolas', monospace; }
.toggle-visibility-btn { padding: 12px 16px; background: #3e3e42; color: #e0e0e0; border: 2px solid #3e3e42; border-radius: 6px; cursor: pointer; font-size: 18px; transition: all 0.2s; }
.toggle-visibility-btn:hover { background: #4e4e52; border-color: #4285f4; transform: scale(1.05); }
.helper-text { font-size: 13px; color: #b0b0b0; }
.link { color: #4285f4; text-decoration: none; font-weight: 500; }
.link:hover { color: #5a9dff; text-decoration: underline; }
.actions { display: flex; gap: 12px; margin-top: 10px; }
.btn { padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-primary:hover::before {
  width: 300px;
  height: 300px;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a9dff 0%, #46ba65 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
}
.btn-test { background: #2d2d30; color: #e0e0e0; border: 2px solid #4285f4; }
.btn-test:hover:not(:disabled) { background: #3e3e42; transform: translateY(-2px); }
.message { padding: 14px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; border: 2px solid; animation: slideIn 0.3s ease; }
.message.success { background: rgba(52, 168, 83, 0.2); color: #34a853; border-color: rgba(52, 168, 83, 0.5); }
.message.error { background: rgba(234, 67, 53, 0.2); color: #ea4335; border-color: rgba(234, 67, 53, 0.5); }
.message.info { background: rgba(66, 133, 244, 0.2); color: #4285f4; border-color: rgba(66, 133, 244, 0.5); }
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* Responsive Design */
@media (max-width: 768px) {
  .gemini-settings { padding: 20px; max-width: 100%; }
  .settings-header h3 { font-size: 24px; }
  .subtitle { font-size: 14px; }
  .info-box { padding: 12px; }
  .info-box p { font-size: 13px; }
  .info-box li { font-size: 12px; }
  .actions { flex-direction: column; }
  .btn { width: 100%; }
  .input-wrapper { flex-direction: column; }
  .toggle-visibility-btn { width: 100%; }
}

@media (min-width: 1920px) {
  .gemini-settings { max-width: 900px; padding: 40px; }
  .settings-header h3 { font-size: 32px; }
  .subtitle { font-size: 17px; }
}
</style>
