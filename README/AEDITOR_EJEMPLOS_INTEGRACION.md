# 🔧 Guía de Integración Práctica

## 🎯 Integración Rápida (5 minutos)

### Paso 1: Inicializar en App.vue

```vue
<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import { onMounted } from 'vue';

// Importar nuevos componentes
import ActivityLog from './components/ActivityLog.vue';
import ErrorPanel from './components/ErrorPanel.vue';
import BackupManager from './components/BackupManager.vue';

onMounted(async () => {
  // 1. Obtener directorio de datos
  const dataDir = await appDataDir();
  
  // 2. Inicializar managers
  try {
    await invoke('init_managers', { appDataDir: dataDir });
    console.log('✅ Managers inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando managers:', error);
  }
});
</script>
```

### Paso 2: Añadir a la Navegación

```vue
<script setup lang="ts">
const currentView = ref<'editor' | 'activity' | 'errors' | 'backups'>('editor');

const menuItems = [
  { id: 'editor', icon: '📝', label: 'Editor' },
  { id: 'activity', icon: '📋', label: 'Actividad', badge: activityCount },
  { id: 'errors', icon: '🐛', label: 'Problemas', badge: errorCount },
  { id: 'backups', icon: '💾', label: 'Respaldos' },
];

// Contadores
const activityCount = ref(0);
const errorCount = ref(0);

// Actualizar contadores
watch(currentView, async (view) => {
  if (view === 'activity') {
    const logs = await invoke('get_activity_logs');
    activityCount.value = logs.length;
  } else if (view === 'errors') {
    const diagnostics = await invoke('get_diagnostics');
    errorCount.value = diagnostics.filter(d => d.severity === 'error').length;
  }
});
</script>

<template>
  <div class="app">
    <Sidebar 
      :items="menuItems"
      :current="currentView"
      @change="currentView = $event"
    />
    
    <div class="main-content">
      <MonacoEditor v-if="currentView === 'editor'" />
      <ActivityLog v-if="currentView === 'activity'" />
      <ErrorPanel v-if="currentView === 'errors'" />
      <BackupManager v-if="currentView === 'backups'" />
    </div>
  </div>
</template>
```

---

## 📋 Caso de Uso 1: Rastrear Ediciones

### En MonacoEditor.vue

```typescript
import { invoke } from '@tauri-apps/api/core';

// Referencias
const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const currentFile = ref<string>('');
const lastSaveTime = ref(0);

// Detectar cambios
editor.value?.onDidChangeModelContent(async (e) => {
  const content = editor.value!.getValue();
  const now = Date.now();
  
  // Registrar edición (debounce de 5 segundos)
  if (now - lastSaveTime.value > 5000) {
    await invoke('save_activity_log', {
      entry: {
        type: 'edit',
        action: 'Archivo modificado',
        file: currentFile.value,
        lines: content.split('\n').length,
        details: `${e.changes.length} cambios realizados`
      }
    });
    
    lastSaveTime.value = now;
  }
  
  // Analizar errores en tiempo real
  await invoke('analyze_file_diagnostics', {
    filePath: currentFile.value,
    content: content
  });
});

// Guardar archivo
const saveFile = async () => {
  const content = editor.value!.getValue();
  
  try {
    // 1. Guardar archivo
    await invoke('write_file_content', {
      filePath: currentFile.value,
      content: content
    });
    
    // 2. Registrar actividad
    await invoke('save_activity_log', {
      entry: {
        type: 'save',
        action: 'Archivo guardado',
        file: currentFile.value,
        lines: content.split('\n').length,
        details: 'Guardado exitoso'
      }
    });
    
    // 3. Limpiar errores previos
    await invoke('clear_file_diagnostics', {
      filePath: currentFile.value
    });
    
    console.log('✅ Archivo guardado y registrado');
  } catch (error) {
    console.error('❌ Error guardando:', error);
  }
};

// Abrir archivo
const openFile = async (filePath: string) => {
  try {
    const content = await invoke('read_file_content', { filePath });
    
    // Actualizar editor
    editor.value?.setValue(content);
    currentFile.value = filePath;
    
    // Registrar apertura
    await invoke('save_activity_log', {
      entry: {
        type: 'open',
        action: 'Archivo abierto',
        file: filePath,
        details: 'Abierto para edición'
      }
    });
    
    // Analizar errores iniciales
    await invoke('analyze_file_diagnostics', {
      filePath: filePath,
      content: content
    });
  } catch (error) {
    console.error('❌ Error abriendo archivo:', error);
  }
};
```

---

## 🐛 Caso de Uso 2: Panel de Errores Interactivo

### En ErrorPanel.vue (uso extendido)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const errorPanelRef = ref<InstanceType<typeof ErrorPanel> | null>(null);

// Navegar al error
const handleErrorNavigation = async (error: DiagnosticError) => {
  // 1. Abrir archivo
  await openFile(error.file);
  
  // 2. Ir a la línea
  editor.value?.revealLineInCenter(error.line);
  editor.value?.setPosition({
    lineNumber: error.line,
    column: error.column
  });
  
  // 3. Seleccionar código problemático
  editor.value?.setSelection({
    startLineNumber: error.line,
    startColumn: error.column,
    endLineNumber: error.line,
    endColumn: error.column + 10
  });
  
  // 4. Foco en editor
  editor.value?.focus();
};

// Quick Fix automático
const applyQuickFix = async (error: DiagnosticError) => {
  const content = editor.value!.getValue();
  const lines = content.split('\n');
  
  if (error.code === 'no-console') {
    // Remover console.log
    lines[error.line - 1] = lines[error.line - 1].replace(/console\.log\(.*?\);?/, '');
  } else if (error.code === 'no-var') {
    // Reemplazar var por const
    lines[error.line - 1] = lines[error.line - 1].replace(/\bvar\b/, 'const');
  } else if (error.code === 'eqeqeq') {
    // Reemplazar == por ===
    lines[error.line - 1] = lines[error.line - 1].replace(/ == /, ' === ');
  }
  
  // Actualizar editor
  editor.value?.setValue(lines.join('\n'));
  
  // Remover error de la lista
  await invoke('clear_file_diagnostics', {
    filePath: error.file
  });
  
  // Re-analizar
  await invoke('analyze_file_diagnostics', {
    filePath: error.file,
    content: lines.join('\n')
  });
};

// Actualizar cada 5 segundos
onMounted(() => {
  setInterval(async () => {
    await errorPanelRef.value?.refreshErrors();
  }, 5000);
});
</script>

<template>
  <ErrorPanel 
    ref="errorPanelRef"
    @navigate-to-error="handleErrorNavigation"
    @apply-fix="applyQuickFix"
  />
</template>
```

---

## 💾 Caso de Uso 3: Sistema de Respaldo Inteligente

### Auto-respaldo en eventos críticos

```typescript
import { invoke } from '@tauri-apps/api/core';

// Crear respaldo antes de operaciones peligrosas
const refactorCommand = async () => {
  // 1. Crear respaldo de seguridad
  try {
    await invoke('create_backup', {
      name: 'Pre-refactor backup',
      description: 'Respaldo automático antes de refactorizar comandos',
      type: 'manual'
    });
    console.log('✅ Respaldo de seguridad creado');
  } catch (error) {
    console.error('❌ Error creando respaldo:', error);
    if (!confirm('No se pudo crear respaldo. ¿Continuar de todos modos?')) {
      return;
    }
  }
  
  // 2. Realizar refactorización
  await performRefactoring();
  
  // 3. Registrar actividad
  await invoke('save_activity_log', {
    entry: {
      type: 'edit',
      action: 'Refactorización completada',
      file: 'múltiples archivos',
      details: 'Refactorización de comandos exitosa'
    }
  });
};

// Respaldo automático cada 5 minutos
let backupTimer: number | null = null;

const startAutoBackup = () => {
  backupTimer = window.setInterval(async () => {
    try {
      await invoke('create_backup', {
        name: `Auto-backup ${new Date().toLocaleTimeString()}`,
        type: 'auto'
      });
      console.log('✅ Auto-backup creado');
    } catch (error) {
      console.error('❌ Error en auto-backup:', error);
    }
  }, 5 * 60 * 1000); // 5 minutos
};

const stopAutoBackup = () => {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
};

// Restaurar desde respaldo
const restoreFromBackup = async (backupId: string) => {
  if (!confirm('¿Estás seguro? Esto sobrescribirá el código actual.')) {
    return;
  }
  
  try {
    // 1. Crear respaldo del estado actual antes de restaurar
    await invoke('create_backup', {
      name: 'Pre-restore backup',
      description: 'Estado antes de restaurar desde respaldo',
      type: 'manual'
    });
    
    // 2. Restaurar
    await invoke('restore_backup', { backupId });
    
    // 3. Recargar proyecto
    await reloadProject();
    
    alert('✅ Proyecto restaurado exitosamente');
  } catch (error) {
    console.error('❌ Error restaurando:', error);
    alert('Error al restaurar respaldo');
  }
};
```

---

## 🔄 Caso de Uso 4: Comparación de Versiones

### En BackupManager.vue

```typescript
const compareWithBackup = async (backupId: string) => {
  try {
    const { current, backup } = await invoke('compare_backup', { backupId });
    
    // Crear vista de comparación
    showComparisonModal.value = true;
    currentContent.value = current;
    backupContent.value = backup;
    
    // Calcular diferencias
    const diff = calculateDiff(current, backup);
    
    // Mostrar estadísticas
    console.log(`
      📊 Estadísticas de cambios:
      - Líneas añadidas: ${diff.added}
      - Líneas eliminadas: ${diff.removed}
      - Líneas modificadas: ${diff.modified}
    `);
  } catch (error) {
    console.error('❌ Error comparando:', error);
  }
};

// Función para calcular diff simple
const calculateDiff = (current: string, backup: string) => {
  const currentLines = current.split('\n');
  const backupLines = backup.split('\n');
  
  let added = 0;
  let removed = 0;
  let modified = 0;
  
  const maxLength = Math.max(currentLines.length, backupLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (!backupLines[i]) {
      added++;
    } else if (!currentLines[i]) {
      removed++;
    } else if (currentLines[i] !== backupLines[i]) {
      modified++;
    }
  }
  
  return { added, removed, modified };
};
```

---

## 🎨 Caso de Uso 5: Notificaciones y Feedback

### Sistema de notificaciones

```typescript
// Crear componente de notificación
const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
  const notification = {
    id: Date.now(),
    type,
    message,
    timestamp: Date.now()
  };
  
  notifications.value.push(notification);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== notification.id);
  }, 3000);
};

// Usar en operaciones
const saveWithNotification = async () => {
  try {
    await saveFile();
    await invoke('save_activity_log', { entry: {...} });
    showNotification('success', '✅ Archivo guardado correctamente');
  } catch (error) {
    showNotification('error', '❌ Error guardando archivo');
  }
};

const backupWithNotification = async () => {
  try {
    await invoke('create_backup', { type: 'manual' });
    showNotification('success', '✅ Respaldo creado exitosamente');
  } catch (error) {
    showNotification('error', '❌ Error creando respaldo');
  }
};
```

---

## 🔍 Caso de Uso 6: Búsqueda en Activity Log

### Filtrado avanzado

```typescript
// En ActivityLog.vue
const searchTerm = ref('');
const dateRange = ref<[Date, Date] | null>(null);
const selectedTypes = ref<string[]>(['all']);

const filteredLogs = computed(() => {
  let result = logs.value;
  
  // Filtrar por tipo
  if (!selectedTypes.value.includes('all')) {
    result = result.filter(log => selectedTypes.value.includes(log.type));
  }
  
  // Filtrar por búsqueda
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(log => 
      log.action.toLowerCase().includes(term) ||
      log.file.toLowerCase().includes(term) ||
      log.details?.toLowerCase().includes(term)
    );
  }
  
  // Filtrar por rango de fechas
  if (dateRange.value) {
    const [start, end] = dateRange.value;
    result = result.filter(log => {
      const date = new Date(log.timestamp);
      return date >= start && date <= end;
    });
  }
  
  return result;
});
```

---

## 📊 Caso de Uso 7: Dashboard de Estadísticas

### Crear vista de resumen

```vue
<script setup lang="ts">
const stats = ref({
  totalEdits: 0,
  totalSaves: 0,
  totalErrors: 0,
  totalBackups: 0,
  mostEditedFiles: [] as Array<{ file: string; count: number }>,
  errorDistribution: {} as Record<string, number>
});

const updateStats = async () => {
  // Obtener logs
  const logs = await invoke('get_activity_logs');
  
  // Contar por tipo
  stats.value.totalEdits = logs.filter(l => l.type === 'edit').length;
  stats.value.totalSaves = logs.filter(l => l.type === 'save').length;
  
  // Archivos más editados
  const fileCount: Record<string, number> = {};
  logs.forEach(log => {
    fileCount[log.file] = (fileCount[log.file] || 0) + 1;
  });
  
  stats.value.mostEditedFiles = Object.entries(fileCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, count]) => ({ file, count }));
  
  // Obtener errores
  const errors = await invoke('get_diagnostics');
  stats.value.totalErrors = errors.length;
  
  // Distribución de errores
  errors.forEach(error => {
    const code = error.code || 'unknown';
    stats.value.errorDistribution[code] = 
      (stats.value.errorDistribution[code] || 0) + 1;
  });
  
  // Obtener respaldos
  const backups = await invoke('get_backups');
  stats.value.totalBackups = backups.length;
};

onMounted(() => {
  updateStats();
  // Actualizar cada minuto
  setInterval(updateStats, 60000);
});
</script>

<template>
  <div class="dashboard">
    <h2>📊 Estadísticas de Desarrollo</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">✏️</span>
        <span class="stat-value">{{ stats.totalEdits }}</span>
        <span class="stat-label">Ediciones</span>
      </div>
      
      <div class="stat-card">
        <span class="stat-icon">💾</span>
        <span class="stat-value">{{ stats.totalSaves }}</span>
        <span class="stat-label">Guardados</span>
      </div>
      
      <div class="stat-card">
        <span class="stat-icon">🐛</span>
        <span class="stat-value">{{ stats.totalErrors }}</span>
        <span class="stat-label">Errores</span>
      </div>
      
      <div class="stat-card">
        <span class="stat-icon">💾</span>
        <span class="stat-value">{{ stats.totalBackups }}</span>
        <span class="stat-label">Respaldos</span>
      </div>
    </div>
    
    <div class="most-edited">
      <h3>🔥 Archivos Más Editados</h3>
      <ul>
        <li v-for="item in stats.mostEditedFiles" :key="item.file">
          {{ item.file }} <span class="count">({{ item.count }} ediciones)</span>
        </li>
      </ul>
    </div>
  </div>
</template>
```

---

## ✅ Checklist de Implementación

- [ ] Inicializar managers en App.vue
- [ ] Añadir componentes al router/navigation
- [ ] Integrar activity log en MonacoEditor
- [ ] Configurar análisis de errores en tiempo real
- [ ] Activar auto-respaldo cada 5 minutos
- [ ] Añadir notificaciones de feedback
- [ ] Crear atajos de teclado
- [ ] Probar restauración de respaldos
- [ ] Verificar rendimiento con proyecto grande
- [ ] Documentar configuración personalizada

---

**¡Listo para implementar! 🚀**
