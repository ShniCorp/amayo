<template>
  <div v-if="isOpen" class="palette-overlay" @click="close">
    <div class="palette-container" @click.stop>
      <div class="palette-header">
        <input 
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Buscar comandos (Ctrl+Q)..."
          class="palette-search"
          @keydown.down.prevent="navigateDown"
          @keydown.up.prevent="navigateUp"
          @keydown.enter.prevent="executeSelected"
          @keydown.esc="close"
        />
      </div>
      
      <div class="palette-results">
        <div 
          v-for="(cmd, index) in filteredCommands" 
          :key="cmd.id"
          :class="['palette-item', { active: index === selectedIndex }]"
          @click="execute(cmd)"
          @mouseenter="selectedIndex = index"
        >
          <span class="palette-icon">{{ cmd.icon }}</span>
          <div class="palette-info">
            <div class="palette-name">{{ cmd.name }}</div>
            <div class="palette-desc">{{ cmd.description }}</div>
          </div>
          <kbd v-if="cmd.shortcut" class="palette-shortcut">{{ cmd.shortcut }}</kbd>
        </div>
        
        <div v-if="filteredCommands.length === 0" class="palette-empty">
          No se encontraron comandos
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

interface PaletteCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  'close': [];
  'command': [commandId: string];
}>();

const searchQuery = ref('');
const selectedIndex = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);

// Comandos disponibles (se pasarán desde App.vue)
const commands = ref<PaletteCommand[]>([
  {
    id: 'new-command',
    name: 'Crear Nuevo Comando',
    description: 'Crear un comando de mensaje o slash',
    icon: '➕',
    action: () => emit('command', 'new-command')
  },
  {
    id: 'new-event',
    name: 'Crear Nuevo Evento',
    description: 'Crear un manejador de eventos',
    icon: '⚡',
    action: () => emit('command', 'new-event')
  },
  {
    id: 'refresh',
    name: 'Actualizar Proyecto',
    description: 'Recargar estadísticas y archivos',
    icon: '🔄',
    shortcut: 'Ctrl+R',
    action: () => emit('command', 'refresh')
  },
  {
    id: 'change-project',
    name: 'Cambiar Proyecto',
    description: 'Seleccionar otro directorio',
    icon: '📁',
    action: () => emit('command', 'change-project')
  },
  {
    id: 'database',
    name: 'Ver Base de Datos',
    description: 'Abrir visor de Prisma schema',
    icon: '🗄️',
    action: () => emit('command', 'database')
  },
  {
    id: 'toggle-dev-ultra',
    name: 'Modo Dev Ultra',
    description: 'Habilitar edición completa del src/',
    icon: '⚡',
    action: () => emit('command', 'toggle-dev-ultra')
  },
  {
    id: 'save',
    name: 'Guardar Archivo',
    description: 'Guardar el archivo actual',
    icon: '💾',
    shortcut: 'Ctrl+S',
    action: () => emit('command', 'save')
  },
]);

const filteredCommands = computed(() => {
  if (!searchQuery.value) return commands.value;
  
  const query = searchQuery.value.toLowerCase();
  return commands.value.filter(cmd => 
    cmd.name.toLowerCase().includes(query) ||
    cmd.description.toLowerCase().includes(query)
  );
});

function navigateDown() {
  if (selectedIndex.value < filteredCommands.value.length - 1) {
    selectedIndex.value++;
  }
}

function navigateUp() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
}

function executeSelected() {
  const cmd = filteredCommands.value[selectedIndex.value];
  if (cmd) {
    execute(cmd);
  }
}

function execute(cmd: PaletteCommand) {
  cmd.action();
  close();
}

function close() {
  emit('close');
  searchQuery.value = '';
  selectedIndex.value = 0;
}

// Focus en el input cuando se abre
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    searchInput.value?.focus();
  }
});

onMounted(() => {
  // Atajos de teclado globales
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      if (props.isOpen) {
        close();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 10000;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.palette-container {
  width: 600px;
  max-height: 500px;
  background-color: #252526;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.palette-header {
  padding: 12px;
  border-bottom: 1px solid #3e3e42;
}

.palette-search {
  width: 100%;
  padding: 10px 14px;
  background-color: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #cccccc;
  font-size: 15px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
}

.palette-search:focus {
  border-color: #0e639c;
  background-color: #2d2d30;
}

.palette-results {
  max-height: 400px;
  overflow-y: auto;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #2d2d30;
  transition: background-color 0.1s;
}

.palette-item:hover,
.palette-item.active {
  background-color: #2d2d30;
}

.palette-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}

.palette-info {
  flex: 1;
}

.palette-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.palette-desc {
  color: #858585;
  font-size: 12px;
}

.palette-shortcut {
  background-color: #3c3c3c;
  color: #cccccc;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  border: 1px solid #4e4e52;
}

.palette-empty {
  padding: 40px 20px;
  text-align: center;
  color: #858585;
  font-size: 14px;
}

.palette-results::-webkit-scrollbar {
  width: 10px;
}

.palette-results::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.palette-results::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}
</style>
