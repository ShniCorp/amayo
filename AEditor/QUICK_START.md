# 🚀 Quick Start - Amayo Bot Editor

## Inicio Rápido en 3 Pasos

### 1️⃣ Instalar Dependencias

```bash
cd AEditor
npm install
```

### 2️⃣ Ejecutar Aplicación

```bash
npm run dev
```

La aplicación se abrirá automáticamente en una ventana desktop.

### 3️⃣ ¡Empieza a Crear!

- Click en **"➕ Nuevo Comando"** para crear un comando
- Click en **"➕ Nuevo Evento"** para crear un evento
- Click en cualquier archivo del sidebar para editarlo

---

## 🎯 ¿Qué Puedo Hacer?

### Crear un Comando de Mensaje

1. Click en "➕ Nuevo Comando"
2. Tipo: **Comando por Mensaje**
3. Nombre: `test`
4. Descripción: `Comando de prueba`
5. Escribe en el editor:
   ```typescript
   await message.reply("¡Funciona!");
   ```
6. Click en "➕ Crear Comando"

✅ Archivo guardado en: `src/commands/messages/others/test.ts`

### Crear un Comando Slash

1. Click en "➕ Nuevo Comando"
2. Tipo: **Comando Slash**
3. Nombre: `info`
4. Descripción: `Información del bot`
5. Escribe en el editor:
   ```typescript
   await interaction.reply({
     content: "Bot Amayo v1.0",
     ephemeral: true
   });
   ```
6. Click en "➕ Crear Comando"

✅ Archivo guardado en: `src/commands/splashcmd/others/info.ts`

### Crear un Evento Estándar

1. Click en "➕ Nuevo Evento"
2. Tipo: **Evento Estándar**
3. Evento: **ready**
4. Nombre: `startup`
5. Escribe en el editor:
   ```typescript
   logger.info("¡Bot iniciado correctamente!");
   ```
6. Click en "➕ Crear Evento"

✅ Archivo guardado en: `src/events/startup.ts`

### Crear un Evento Custom

1. Click en "➕ Nuevo Evento"
2. Tipo: **Evento Custom**
3. Nombre: `myHandler`
4. Escribe en el editor:
   ```typescript
   if (message.content.includes("hola")) {
     await message.reply("¡Hola!");
   }
   ```
5. Click en "➕ Crear Evento"

✅ Archivo guardado en: `src/events/extras/myHandler.ts`

---

## 📊 Panel de Estadísticas

El sidebar muestra en tiempo real:

- 📝 **Comandos Mensaje**: Comandos con prefix (!ping)
- ⚡ **Comandos Slash**: Comandos con / (/ping)
- 🎯 **Eventos Estándar**: Eventos de Discord.js
- ✨ **Eventos Custom**: Tus eventos personalizados

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + S` | Guardar archivo actual |
| `Ctrl + F` | Buscar en el editor |
| `Ctrl + H` | Buscar y reemplazar |
| `F1` | Command palette de Monaco |

---

## 🎨 Snippets Disponibles

En el editor, click en **"📝 Insertar Snippet"** para:

### Para Comandos

- **Reply básico**: Respuesta simple
- **Embed**: Mensaje con embed
- **Error handling**: Try-catch con manejo de errores

### Para Eventos

- **Logger**: Mensaje de log
- **Message check**: Validar mensaje
- **Prisma query**: Ejemplo de base de datos

---

## 🔄 Editar Archivos Existentes

1. En el sidebar, busca tu archivo
2. Click en él
3. Edita en el editor Monaco
4. Guarda con `Ctrl + S`

El indicador **●** muestra si hay cambios sin guardar.

---

## 🐛 Problemas Comunes

### No se ve ningún comando/evento

**Solución**: Verifica que existe la carpeta `../src/` relativa a AEditor.

### Error al guardar

**Solución**: Confirma que tienes permisos de escritura en el proyecto.

### Monaco Editor no carga

**Solución**: 
```bash
npm install monaco-editor @vueuse/core
```

---

## 📚 Más Información

- **README_EDITOR.md**: Guía detallada de uso
- **DOCUMENTACION_COMPLETA.md**: Documentación técnica completa
- **RESUMEN_PROYECTO.md**: Resumen de todo lo implementado

---

## 🎉 ¡Listo!

Ya tienes todo lo necesario para empezar a crear comandos y eventos de forma visual.

**¡Feliz coding! 🚀**
