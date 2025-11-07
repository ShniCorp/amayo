# 🏗️ Arquitectura de las Nuevas Funcionalidades

```
┌─────────────────────────────────────────────────────────────────┐
│                         AEDITOR - UI Layer                      │
│                         (Vue 3 + TypeScript)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  ActivityLog    │  │   ErrorPanel    │  │BackupManager │  │
│  │     .vue        │  │      .vue       │  │    .vue      │  │
│  │                 │  │                 │  │              │  │
│  │  📋 Timeline    │  │  🐛 Diagnostics │  │  💾 Snapshots│  │
│  │  📊 Filters     │  │  ⚠️ Severities  │  │  🔄 Auto-save│  │
│  │  📤 Export      │  │  🔧 Quick Fixes │  │  🔍 Compare  │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘  │
│           │                    │                   │           │
└───────────┼────────────────────┼───────────────────┼───────────┘
            │                    │                   │
            │   Tauri IPC        │                   │
            │   invoke()         │                   │
            ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TAURI COMMANDS (lib.rs)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  init_managers()           get_diagnostics()    create_backup() │
│  save_activity_log()       analyze_file()       restore_backup()│
│  get_activity_logs()       clear_file_errors()  compare_backup()│
│  clear_activity_log()      apply_quick_fix()    delete_backup() │
│                                                  get_backups()   │
└───────────┬────────────────────┬───────────────────┬────────────┘
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ activity_log.rs │  │ diagnostics.rs  │  │   backup.rs      │
├─────────────────┤  ├─────────────────┤  ├──────────────────┤
│                 │  │                 │  │                  │
│ struct:         │  │ struct:         │  │ struct:          │
│ - ActivityLog   │  │ - Diagnostics   │  │ - BackupManager  │
│ - LogEntry      │  │   Manager       │  │ - Backup         │
│                 │  │ - Diagnostic    │  │ - BackupFile     │
│ methods:        │  │   Error         │  │                  │
│ - add_entry()   │  │                 │  │ methods:         │
│ - get_entries() │  │ methods:        │  │ - create_backup()│
│ - clear()       │  │ - analyze_file()│  │ - restore()      │
│ - save()        │  │ - add_error()   │  │ - compare()      │
│                 │  │ - clear_file()  │  │ - delete()       │
└────────┬────────┘  └────────┬────────┘  └─────────┬────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FILE SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  C:\Users\[USER]\AppData\Local\AEditor\                        │
│  │                                                              │
│  ├── activity_log.json           ← Activity Log Storage        │
│  │   {                                                          │
│  │     "id": "log_123",                                         │
│  │     "type": "edit",                                          │
│  │     "file": "src/main.ts",                                   │
│  │     "timestamp": 1699234567890                               │
│  │   }                                                          │
│  │                                                              │
│  └── backups/                     ← Backup Storage             │
│      ├── backup_1699234567890.json                             │
│      │   {                                                      │
│      │     "id": "backup_123",                                  │
│      │     "name": "v1.0",                                      │
│      │     "files": [                                           │
│      │       {                                                  │
│      │         "path": "src/main.ts",                           │
│      │         "content": "...",                                │
│      │         "hash": "sha256..."                              │
│      │       }                                                  │
│      │     ]                                                    │
│      │   }                                                      │
│      └── backup_1699234568000.json                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Datos

### 1️⃣ Activity Log Flow

```
Usuario edita archivo
    ↓
MonacoEditor.vue detecta cambio
    ↓
invoke('save_activity_log', { entry: {...} })
    ↓
lib.rs → save_activity_log()
    ↓
activity_log.rs → add_entry()
    ↓
JSON serializado y guardado
    ↓
activity_log.json actualizado
```

### 2️⃣ Error Detection Flow

```
Usuario escribe código
    ↓
MonacoEditor.vue → onChange
    ↓
invoke('analyze_file_diagnostics', { filePath, content })
    ↓
lib.rs → analyze_file_diagnostics()
    ↓
diagnostics.rs → analyze_file()
    ↓
Aplica reglas:
  - no-console
  - no-var
  - eqeqeq
  - semi
    ↓
Genera DiagnosticError[]
    ↓
invoke('get_diagnostics')
    ↓
ErrorPanel.vue muestra errores
    ↓
Usuario hace click en Quick Fix
    ↓
invoke('apply_quick_fix', { error })
    ↓
Código corregido automáticamente
```

### 3️⃣ Backup Flow

```
Timer activado (cada 5 min)
    ↓
invoke('create_backup', { type: 'auto' })
    ↓
lib.rs → create_backup()
    ↓
backup.rs → create_backup()
    ↓
Escanea proyecto recursivamente
    ↓
Excluye node_modules, dist, etc.
    ↓
Lee contenido de archivos
    ↓
Calcula SHA-256 hash
    ↓
Serializa a JSON
    ↓
Guarda en backups/backup_[timestamp].json
    ↓
BackupManager.vue muestra nuevo backup
```

## 📊 Estructura de Datos

### LogEntry

```typescript
interface LogEntry {
  id: string;              // "log_1699234567890"
  type: string;            // "create" | "edit" | "save" | "delete" | "open"
  action: string;          // "Archivo guardado"
  file: string;            // "src/commands/help.ts"
  timestamp: number;       // 1699234567890
  lines?: number;          // 45
  details?: string;        // "Actualizada descripción"
  user?: string;           // "usuario@email.com"
  diff?: string;           // Git-like diff
}
```

### DiagnosticError

```typescript
interface DiagnosticError {
  id: string;              // "error_1699234567890"
  severity: string;        // "error" | "warning" | "info"
  message: string;         // "Variable 'x' no definida"
  file: string;            // "src/main.ts"
  line: number;            // 45
  column: number;          // 10
  code?: string;           // "no-undef"
  suggestion?: string;     // "Declara la variable"
  fixable?: boolean;       // true
  source?: string;         // "aeditor"
}
```

### Backup

```typescript
interface Backup {
  id: string;              // "backup_1699234567890"
  name?: string;           // "Versión estable v1.0"
  description?: string;    // "Antes de refactorizar"
  timestamp: number;       // 1699234567890
  type: string;            // "manual" | "auto"
  fileCount: number;       // 45
  size: number;            // 1234567 (bytes)
  files: BackupFile[];     // Array de archivos
}

interface BackupFile {
  path: string;            // "src/main.ts"
  content: string;         // Contenido del archivo
  hash: string;            // "sha256:abc123..."
}
```

## 🔐 Seguridad

- ✅ Todos los archivos se almacenan **localmente**
- ✅ No hay transmisión de datos a servidores externos
- ✅ Hashes SHA-256 para verificar integridad
- ✅ Respaldos encriptables (futuro)

## ⚡ Rendimiento

- ✅ Respaldos ejecutados en **threads separados**
- ✅ Análisis de errores con **debounce** (500ms)
- ✅ Logs limitados a **1000 entradas**
- ✅ Respaldos automáticos limitados a **50% del máximo**

## 🧪 Testing

```bash
# Probar Activity Log
curl -X POST http://localhost:1420/invoke/save_activity_log

# Probar Diagnostics
curl -X POST http://localhost:1420/invoke/analyze_file_diagnostics

# Probar Backups
curl -X POST http://localhost:1420/invoke/create_backup
```

## 📈 Métricas

- **Activity Log**: ~10KB por 100 entradas
- **Diagnostic Error**: ~500 bytes por error
- **Backup**: Variable según tamaño del proyecto
  - Proyecto pequeño (50 archivos): ~500KB
  - Proyecto mediano (200 archivos): ~2MB
  - Proyecto grande (500 archivos): ~5MB

## 🔮 Futuras Mejoras

### Activity Log
- [ ] Filtrar por rango de fechas
- [ ] Ver diff de cambios
- [ ] Exportar a CSV/PDF
- [ ] Sincronización con Git

### Diagnostics
- [ ] Integración con ESLint
- [ ] Integración con TSC (TypeScript)
- [ ] Reglas personalizables
- [ ] Quick fixes avanzados

### Backups
- [ ] Compresión gzip
- [ ] Respaldo incremental
- [ ] Sincronización con nube
- [ ] Encriptación AES-256

---

**Arquitectura diseñada para ser:** 
- 🚀 **Rápida** - Operaciones asíncronas
- 🛡️ **Segura** - Todo local, sin servidores
- 📦 **Modular** - Fácil de extender
- 🎨 **Elegante** - Tema VS Code consistente
