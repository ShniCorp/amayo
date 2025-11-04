# 🎯 Guía Práctica: Usando las Nuevas Funciones

## 📋 Tabla de Contenidos

1. [Usar EnvManager](#1-usar-envmanager)
2. [Eliminar Archivos Correctamente](#2-eliminar-archivos)
3. [Interpretar Logs de Debugging](#3-logs-de-debugging)
4. [Prevenir Errores Comunes](#4-prevenir-errores)

---

## 1. Usar EnvManager

### Paso 1: Abrir el Manager

1. Click en el botón **"🔐 Variables ENV"** en el sidebar izquierdo
2. Se abrirá el panel del EnvManager

### Paso 2: Escanear Variables

1. Click en **"🔍 Escanear Proyecto"**
2. Espera a que termine (aparecerá notificación)
3. Verás algo como:

```
✅ Escaneadas 5 variables del código
➕ Se agregaron 3 variables nuevas
```

### Paso 3: Ver Ubicaciones

Cada variable mostrará dónde se usa:

```
DATABASE_URL
📍 Usada en 2 ubicación(es) ▼
  ├─ src\core\prisma.ts:12 → const client = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  └─ src\commands\admin\setup.ts:8 → if (!process.env.DATABASE_URL) throw new Error('Missing DB')
```

**Explicación:**
- `src\core\prisma.ts:12` = Archivo y número de línea
- `→ const client = ...` = Código exacto donde se usa

### Paso 4: Editar Variables

**Opción A: Formulario (Recomendado)**
1. Busca la variable en la lista
2. Escribe el valor en el input
3. Click en 👁️ para mostrar/ocultar valores sensibles
4. Click en **"💾 Guardar .env"**

**Opción B: Editor Raw**
1. Scroll hasta **"📝 Editor Raw (.env)"**
2. Edita el texto directamente:
   ```env
   DATABASE_URL=postgres://localhost:5432/mydb
   API_KEY=sk_test_123456789
   DEBUG=true
   ```
3. Click en **"🔄 Sincronizar desde Raw"**
4. Click en **"💾 Guardar .env"**

### Paso 5: Agregar Variable Manual

Si necesitas una variable que no está en el código:

1. Click en **"➕ Agregar Variable"**
2. Escribe el nombre (ej: `MY_SECRET_KEY`)
3. Se convierte automáticamente a mayúsculas: `MY_SECRET_KEY`
4. Escribe el valor
5. Guarda

### Paso 6: Eliminar Variable

1. Busca la variable en la lista
2. Click en el botón **"🗑️"**
3. Confirma la eliminación
4. La variable desaparece del formulario Y del editor raw
5. Click en **"💾 Guardar .env"** para aplicar

---

## 2. Eliminar Archivos

### Problema: "Permiso Denegado"

**Síntoma:**
```
❌ Error eliminando: Permiso denegado para eliminar: src/test.ts
   Ejecuta el editor como administrador
```

**Solución Windows:**

**Método 1: Ejecutar como Admin**
1. Cierra la aplicación
2. Click derecho en el ejecutable
3. "Ejecutar como administrador"
4. Intenta eliminar de nuevo

**Método 2: PowerShell Elevado**
```powershell
# Abrir PowerShell como Admin
Start-Process -FilePath "C:\ruta\a\tu\editor.exe" -Verb RunAs
```

**Método 3: Cambiar Permisos**
1. Click derecho en la carpeta del proyecto
2. Propiedades → Seguridad → Editar
3. Tu usuario → Control total ✅
4. Aplicar → OK

### Problema: "Archivo no Encontrado"

**Síntoma:**
```
❌ Archivo no encontrado: src/deleted.ts
```

**Causa:** Otro programa ya eliminó el archivo (Git, otro editor, etc.)

**Solución:** Refresca el árbol de archivos (F5 o click en "🔄 Refrescar")

### Problema: "No es un Archivo"

**Síntoma:**
```
❌ La ruta no es un archivo: src/commands
```

**Causa:** Intentaste eliminar una carpeta con el botón de eliminar archivo

**Solución:** Usa el botón de eliminar carpeta (usualmente click derecho → Eliminar carpeta)

---

## 3. Logs de Debugging

### Dónde Ver los Logs

**Opción 1: Consola del Navegador (Desarrollo)**
1. Presiona **F12**
2. Tab "Console"
3. Verás todos los logs

**Opción 2: Archivo de Log (Producción)**
- Windows: `C:\Users\TuUsuario\AppData\Local\amayo-editor\logs\`
- Linux: `~/.local/share/amayo-editor/logs/`
- Mac: `~/Library/Application Support/amayo-editor/logs/`

### Logs del EnvManager

#### Carga Exitosa
```
📂 Cargando .env desde: C:/Users/Shnimlz/Documents/GitHub/amayo
✅ .env cargado, contenido: DATABASE_URL=postgres://localhost
PORT=3000
API_KEY=sk_test_123
🔍 Parseando .env, líneas: 3
  ✓ DATABASE_URL=postgres://localhost
  ✓ PORT=3000
  ✓ API_KEY=sk_test_123
✅ Variables parseadas: 3
```

**Interpretación:**
- ✅ Todo bien
- Se cargaron 3 variables correctamente

#### Archivo No Existe
```
📂 Cargando .env desde: C:/Users/Shnimlz/Documents/GitHub/amayo
❌ Error cargando .env: No such file or directory
ℹ️ No se encontró archivo .env, se creará uno nuevo
```

**Interpretación:**
- ⚠️ Normal en proyectos nuevos
- El archivo se creará cuando guardes

#### Error de Parseo
```
🔍 Parseando .env, líneas: 5
  ✓ DATABASE_URL=postgres://localhost
  ✗ Línea inválida: "INVALID LINE WITHOUT EQUALS"
  ✓ API_KEY=sk_test_123
✅ Variables parseadas: 2
```

**Interpretación:**
- ⚠️ Una línea no tiene formato válido
- Se ignoró y se cargaron las demás

### Logs del Guardado

#### Guardado Exitoso
```
💾 Guardando .env...
Ruta del proyecto: C:/Users/Shnimlz/Documents/GitHub/amayo
Contenido a guardar: DATABASE_URL=postgres://localhost
PORT=3000
✅ Guardado exitoso
```

**Interpretación:**
- ✅ Archivo escrito en el disco
- Ubicación: `{projectRoot}/.env`

#### Error de Permisos
```
💾 Guardando .env...
❌ Error guardando .env: Permission denied (os error 13)
```

**Solución:** Ejecutar como administrador

---

## 4. Prevenir Errores Comunes

### Error 1: Variables No Se Guardan

**Síntoma:** Editas variables pero al reabrir están en blanco

**Causa:** No hiciste click en "💾 Guardar .env"

**Prevención:**
1. Siempre busca el botón verde "💾 Guardar .env"
2. Debe estar habilitado (no gris)
3. Click y espera la notificación: "✅ Archivo .env guardado correctamente"

### Error 2: Editor Raw y Formulario Desincronizados

**Síntoma:** El formulario muestra valores diferentes al editor raw

**Causa:** Editaste en raw pero no sincronizaste

**Prevención:**
1. Si editas en raw, SIEMPRE click en "🔄 Sincronizar desde Raw"
2. Espera la notificación: "🔄 Sincronizado desde editor raw"
3. Verifica que el formulario se actualizó
4. Ahora sí, guarda

### Error 3: Loop Infinito (Navegador Colgado)

**Síntoma:** El navegador se congela al editar variables

**Causa:** Bug en el código (ya arreglado con `isUpdatingRaw`)

**Si pasa:**
1. Cierra la aplicación
2. Actualiza a la última versión
3. El flag `isUpdatingRaw` previene este problema

### Error 4: Variables Detectadas pero No en el .env

**Síntoma:** "⚠️ Sin definir: 3" pero no aparecen en la lista

**Causa:** No se auto-agregaron

**Solución:**
1. Scroll hasta "⚠️ Variables sin definir encontradas en el código"
2. Click en "➕ Agregar" en cada variable faltante
3. O click en "🔍 Escanear Proyecto" de nuevo

### Error 5: Ubicaciones No Aparecen

**Síntoma:** Las variables no muestran "📍 Usada en X ubicación(es)"

**Causa:** Versión vieja del backend

**Solución:**
1. Verifica que `AEditor/src-tauri/src/lib.rs` tenga la función `scan_env_variables_with_locations`
2. Recompila el backend Rust:
   ```bash
   cd AEditor
   npm run tauri build
   ```
3. Reinicia la aplicación

---

## 5. Ejemplos de Casos de Uso

### Caso 1: Proyecto Nuevo

**Escenario:** Acabas de clonar un repo, no tiene .env

**Pasos:**
1. Abre EnvManager
2. Click "🔍 Escanear Proyecto"
3. Se detectan automáticamente todas las variables del código
4. Completa los valores:
   ```env
   DATABASE_URL=postgres://localhost:5432/mydb
   JWT_SECRET=supersecret123
   API_KEY=sk_live_...
   ```
5. Guarda
6. ¡Listo! Ya tienes tu .env

### Caso 2: Migración de Variables

**Escenario:** Renombraste una variable en el código

**Pasos:**
1. Cambia en el código:
   ```typescript
   // Antes
   const url = process.env.DATABASE_URL;
   
   // Después
   const url = process.env.DB_CONNECTION_STRING;
   ```
2. Abre EnvManager
3. Click "🔍 Escanear Proyecto"
4. Verás:
   - ✅ `DB_CONNECTION_STRING` detectada
   - ⚠️ `DATABASE_URL` ya no se usa
5. Elimina `DATABASE_URL`
6. Agrega valor a `DB_CONNECTION_STRING`
7. Guarda

### Caso 3: Debugging de Variable Faltante

**Escenario:** Tu app dice "Missing environment variable: API_KEY"

**Pasos:**
1. Abre EnvManager
2. Click "🔍 Escanear Proyecto"
3. Busca `API_KEY` en la lista
4. Mira "📍 Usada en X ubicación(es)" para ver dónde se requiere:
   ```
   src\server\api.ts:15 → headers: { 'Authorization': process.env.API_KEY }
   ```
5. Agrega el valor correcto
6. Guarda
7. Reinicia la app

### Caso 4: Compartir .env.example

**Escenario:** Quieres compartir un template del .env sin valores sensibles

**Pasos:**
1. Abre EnvManager
2. Copia el contenido del editor raw
3. Crea archivo `.env.example`
4. Pega y reemplaza valores:
   ```env
   DATABASE_URL=postgres://localhost:5432/your_db_name
   JWT_SECRET=your_secret_here
   API_KEY=your_api_key_here
   ```
5. Commit `.env.example` a Git
6. **NO** comitees `.env` (debe estar en `.gitignore`)

---

## 6. Atajos de Teclado

| Acción | Atajo |
|--------|-------|
| Guardar .env | `Ctrl+S` (cuando el botón está habilitado) |
| Abrir DevTools | `F12` |
| Refrescar | `F5` |
| Buscar en raw | `Ctrl+F` (dentro del textarea) |
| Seleccionar todo raw | `Ctrl+A` (dentro del textarea) |

---

## 7. Checklist de Verificación

Antes de cerrar EnvManager, verifica:

- [ ] Todas las variables tienen valores (no vacías)
- [ ] No hay "⚠️ Sin definir" (o las agregaste intencionalmente)
- [ ] Guardaste los cambios (botón "💾 Guardar .env" presionado)
- [ ] Viste la notificación: "✅ Archivo .env guardado correctamente"
- [ ] Si editaste en raw, sincronizaste primero

---

## 8. Troubleshooting Rápido

| Problema | Solución Rápida |
|----------|-----------------|
| No guarda cambios | ¿Hiciste click en "💾 Guardar .env"? |
| Permiso denegado | Ejecutar como administrador |
| Variables no aparecen | Click en "🔍 Escanear Proyecto" |
| Raw y formulario diferentes | Click en "🔄 Sincronizar desde Raw" |
| Ubicaciones no aparecen | Recompila el backend Rust |
| App se congela | Actualiza a última versión (tiene fix) |

---

## 9. Preguntas Frecuentes

**P: ¿Dónde se guarda el .env?**
R: En la raíz del proyecto: `{projectRoot}/.env`

**P: ¿Puedo editar el .env manualmente en otro editor?**
R: Sí, pero después haz "🔄 Refrescar" en el EnvManager para recargar

**P: ¿Las ubicaciones se actualizan en tiempo real?**
R: No, tienes que hacer "🔍 Escanear Proyecto" para actualizar

**P: ¿Puedo agregar comentarios en el .env?**
R: Sí, líneas que empiezan con `#` son comentarios

**P: ¿Qué pasa si elimino una variable que se usa en el código?**
R: El código fallará en runtime. Verifica las ubicaciones antes de eliminar.

**P: ¿Puedo tener múltiples .env?**
R: Sí, pero el EnvManager solo maneja `.env`. Para `.env.local`, `.env.production`, etc., edítalos manualmente.

---

¡Eso es todo! Ahora eres un experto en usar el nuevo EnvManager 🎉
