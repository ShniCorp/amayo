# 📁 Estructura de Views - Amayo Bot

## 🗂️ Organización de Archivos

```
src/server/views/
├── layouts/
│   └── layout.ejs          # Layout principal (HTML wrapper)
├── pages/
│   └── index.ejs           # ✅ Contenido de la página (usado por servidor)
└── partials/
    ├── navbar.ejs          # Barra de navegación
    ├── toc.ejs             # Tabla de contenidos
    └── sections/           # Secciones de contenido
        ├── primeros-pasos.ejs
        ├── comandos-basicos.ejs
        └── ...
```

---

## ✅ Archivo Correcto

### `/src/server/views/pages/index.ejs`

Este es el archivo **que se está usando**. El servidor lo busca aquí:

```typescript
// En server.ts
const pageFile = path.join(viewsDir, "pages", `${template}.ejs`);
```

**Contenido:**
- Solo el contenido del `<body>`
- Sin etiquetas `<html>`, `<head>`, etc.
- Sin llamadas a `layout()`
- Directamente renderizado dentro de `layout.ejs`

---

## ❌ Archivo Eliminado

### ~~`/src/server/views/index.ejs`~~ (ELIMINADO)

Este archivo estaba duplicado y **NO se estaba usando**. Causaba confusión porque:
- Tenía el sistema antiguo de layout con `<% layout('layouts/layout') %>`
- No era consultado por el servidor
- Los cambios no se reflejaban en la web

---

## 🔄 Flujo de Renderizado

### 1. Usuario solicita `/`
```
http://localhost:3000/
```

### 2. Servidor renderiza
```typescript
await renderTemplate(req, res, "index", {
  appName: "Amayo Bot",
  version: "2.0.0",
  djsVersion: "15.0.0-dev",
  currentDateHuman: "octubre 2025"
});
```

### 3. Proceso de renderizado
```
1. Lee: views/pages/index.ejs
   ↓ (renderiza con variables)
2. Resultado → pageBody
   ↓
3. Lee: views/layouts/layout.ejs
   ↓ (inserta pageBody en <%= body %>)
4. HTML completo → navegador
```

---

## 📝 Cómo Editar

### Para cambiar el contenido de la página:
✅ **Edita**: `/src/server/views/pages/index.ejs`

### Para cambiar el layout (HTML, head, scripts):
✅ **Edita**: `/src/server/views/layouts/layout.ejs`

### Para cambiar navbar o footer:
✅ **Edita**: 
- `/src/server/views/partials/navbar.ejs`
- Footer está en `layout.ejs` (líneas 45-75)

### Para agregar/editar secciones:
✅ **Edita**: `/src/server/views/partials/sections/*.ejs`

---

## 🎨 CSS y Assets

### Archivos CSS cargados (en layout.ejs):
```html
<link rel="stylesheet" href="/assets/css/modern-pixel.css?v=2.0.0">
<link rel="stylesheet" href="/assets/css/modern-sections.css?v=2.0.0">
<link rel="stylesheet" href="/assets/css/styles.css?v=2.0.0">
```

### Ubicación física:
```
src/server/public/assets/css/
├── modern-pixel.css      # ✅ Componentes modernos
├── modern-sections.css   # ✅ Estilos de secciones
├── styles.css            # Original
├── pixel-art.css         # ❌ Ya no se usa
└── pixel-sections.css    # ❌ Ya no se usa
```

---

## 🚀 Flujo de Trabajo

### Para hacer cambios visuales:

1. **Editar contenido:**
   ```bash
   vim src/server/views/pages/index.ejs
   ```

2. **Editar estilos:**
   ```bash
   vim src/server/public/assets/css/modern-pixel.css
   ```

3. **Reiniciar servidor:**
   ```bash
   npm run server
   ```

4. **Limpiar caché del navegador:**
   - `Ctrl + Shift + R` (hard reload)
   - O modo incógnito: `Ctrl + Shift + N`

---

## ⚠️ Notas Importantes

### Parámetros de Versión
Los archivos CSS tienen `?v=2.0.0` para forzar recargas:
```html
href="/assets/css/modern-pixel.css?v=2.0.0"
```

### Sistema de Caché
El servidor usa **ETags** para caché. Si haces cambios y no se ven:
1. Reinicia el servidor (nuevo ETag)
2. Hard reload en navegador (`Ctrl + Shift + R`)

### Await en Includes
Los partials usan `await include()`:
```ejs
<%- await include('../partials/navbar') %>
```

Esto es necesario para el renderizado asíncrono de EJS.

---

## 📋 Checklist de Edición

Antes de editar, verifica:
- [ ] ¿Estás editando `/pages/index.ejs`? (no el antiguo `/views/index.ejs`)
- [ ] ¿Los cambios CSS están en `modern-pixel.css`? (no en `pixel-art.css`)
- [ ] ¿El layout carga los CSS correctos?
- [ ] ¿Reiniciaste el servidor después de cambios?

---

**Fecha**: Octubre 2025  
**Autor**: Amayo Dev Team  
**Estado**: ✅ Estructura actualizada y optimizada
