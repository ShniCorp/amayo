# 🎮 Rediseño Pixel Art - Documentación Web

## 📋 Resumen de Cambios

Se ha transformado completamente el diseño de la documentación web (`src/server/views/**`) desde un estilo moderno con glassmorphism y gradientes a un **diseño pixel art retro** inspirado en RPGs de 8/16 bits.

---

## 🎨 Cambios Visuales Implementados

### **1. Sistema de Fuentes**
- **Primary**: `'Press Start 2P'` (Google Fonts) - Para títulos y UI importante
- **Secondary**: `'VT323'` (Google Fonts) - Para texto general y código
- Aplicado `image-rendering: pixelated` globalmente

### **2. Paleta de Colores Retro**
```css
--pixel-bg-dark: #0f0a1e       /* Fondo oscuro principal */
--pixel-bg-medium: #1a1433     /* Contenedores */
--pixel-bg-light: #2d2347      /* Cards y cajas */
--pixel-accent-1: #ff006e      /* Rosa/Magenta (misiones) */
--pixel-accent-2: #8338ec      /* Púrpura (IA) */
--pixel-accent-3: #3a86ff      /* Azul (minijuegos) */
--pixel-accent-4: #06ffa5      /* Verde/Cyan (economía) */
```

### **3. Elementos UI Pixel Art**

#### **Botones** (`.pixel-btn`)
- Bordes de 4px con efecto 3D
- Box-shadow con desplazamiento al hover
- Fuente Press Start 2P
- Transiciones instantáneas (0.1s)

#### **Cajas/Contenedores** (`.pixel-box`)
- Bordes cuadrados (border-radius: 0)
- Box-shadow con offset de 8px
- Borde doble con `::before` pseudo-element
- Animación de pulso sutil

#### **Navbar Pixel** (`.pixel-navbar`)
- Borde inferior de 4px
- Franja animada con degradado en la parte inferior
- Logo con moneda pixelada animada

#### **Badges** (`.pixel-badge`)
- Fuente pequeña (10px) Press Start 2P
- Animación de rebote (`pixelBounce`)
- Box-shadow 3D

#### **Tablas**
- `border-spacing: 4px` para separación visual
- Headers con fondo morado y fuente pixel
- Hover con glow verde

#### **Scrollbar Personalizado**
- Track oscuro con bordes
- Thumb con color accent-2
- Efecto inset 3D

---

## 📁 Archivos Creados/Modificados

### **Archivos CSS Nuevos**

#### 1. `/src/server/public/assets/css/pixel-art.css`
**Propósito**: Estilos base pixel art y componentes reutilizables

**Contenido principal**:
- Variables CSS globales
- Reset con pixelated rendering
- Componentes: `.pixel-btn`, `.pixel-box`, `.pixel-badge`, `.pixel-navbar`
- Animaciones: `pixelGlow`, `pixelPulse`, `pixelScroll`, `pixelBounce`, `pixelShake`
- Elementos decorativos: `.pixel-heart`, `.pixel-coin`, `.pixel-hp-bar`
- Tooltips pixel art
- Scrollbar custom

**Líneas clave**:
```css
/* Fuentes */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

/* Background grid */
.pixel-grid-bg {
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

#### 2. `/src/server/public/assets/css/pixel-sections.css`
**Propósito**: Sobrescribir estilos de secciones individuales

**Contenido principal**:
- Estilos para `<section>` con bordes pixel
- Títulos H2/H3/H4 con fuentes pixel
- Listas con bullets custom (`■`)
- Code blocks con borde de acento
- Tablas responsive
- Forms con estilo retro

**Sobrescrituras importantes**:
```css
section {
  background: var(--pixel-bg-medium) !important;
  border: 4px solid var(--pixel-border) !important;
  box-shadow: 8px 8px 0 0 rgba(0, 0, 0, 0.5) !important;
}

section h2 {
  font-family: 'Press Start 2P', cursive !important;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8), 0 0 20px var(--pixel-accent-4) !important;
}
```

---

### **Archivos EJS Modificados**

#### 1. `/src/server/views/layouts/layout.ejs`
**Cambios**:
- ✅ Eliminado config de Tailwind con animaciones smooth
- ✅ Incluido `pixel-art.css` y `pixel-sections.css`
- ✅ Cambiado body class: `pixel-grid-bg` en lugar de gradiente
- ✅ Eliminado los 3 blobs animados (`animate-float`)
- ✅ Footer rediseñado con `.pixel-box` y `.pixel-status-bar`

**Antes**:
```html
<body class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
  <!-- Blobs animados -->
  <div class="absolute ... bg-purple-500/20 ... animate-float"></div>
```

**Después**:
```html
<body class="min-h-screen pixel-grid-bg pt-14">
  <!-- Sin blobs, solo grid background -->
```

#### 2. `/src/server/views/index.ejs`
**Cambios**:
- ✅ Badge con `.pixel-badge` en lugar de gradientes
- ✅ Títulos H1/H2 sin `bg-clip-text` (texto sólido)
- ✅ HP bar decorativo con corazones pixel
- ✅ Descripción dentro de `.pixel-box`
- ✅ Botones con `.pixel-btn` y `.pixel-btn-secondary`
- ✅ Stats footer con `.pixel-box` individuales

**Antes**:
```html
<div class="inline-flex ... bg-gradient-to-r from-indigo-500/10 ...">
  <span class="animate-ping ..."></span>
  <span class="bg-clip-text text-transparent bg-gradient-to-r ...">
    <%= appName %> • v<%= version %>
  </span>
</div>
```

**Después**:
```html
<div class="inline-block">
  <div class="pixel-badge">
    <%= appName %> • v<%= version %>
  </div>
</div>
```

#### 3. `/src/server/views/partials/navbar.ejs`
**Cambios**:
- ✅ Clase principal: `.pixel-navbar`
- ✅ Logo con `.pixel-coin` animado
- ✅ Links con `.pixel-tooltip` (hover muestra info)
- ✅ Fuente Press Start 2P para el nombre del bot

**Antes**:
```html
<nav class="fixed ... bg-slate-950/70 backdrop-blur">
  <a href="#" class="text-white font-bold"><%= appName %></a>
```

**Después**:
```html
<nav class="fixed ... pixel-navbar">
  <a href="#" class="flex items-center gap-2">
    <div class="pixel-coin" style="width: 20px; height: 20px;"></div>
    <span class="font-['Press_Start_2P'] text-sm"><%= appName %></span>
  </a>
```

#### 4. `/src/server/views/partials/toc.ejs`
**Cambios**:
- ✅ Contenedor: `.pixel-box`
- ✅ Título con `.pixel-corner` decorativo
- ✅ Links con símbolo `►` en lugar de emojis
- ✅ Navegación simplificada con fuente pixel

**Antes**:
```html
<nav class="... bg-slate-900/80 backdrop-blur-xl border ...">
  <ul>
    <li><a href="#primeros-pasos">🚀 Primeros Pasos</a></li>
```

**Después**:
```html
<nav class="... pixel-box ...">
  <div class="font-['Press_Start_2P'] ... pixel-corner">
    ≡ Índice
  </div>
  <ul>
    <li><a href="#primeros-pasos">► Primeros Pasos</a></li>
```

---

## 🎭 Componentes Pixel Art Disponibles

### **Clase `.pixel-btn`**
Botón principal con efecto 3D
```html
<a href="#" class="pixel-btn">► Comenzar ahora</a>
```

### **Clase `.pixel-btn-secondary`**
Botón secundario con colores alternativos
```html
<button class="pixel-btn pixel-btn-secondary">☰ Ver comandos</button>
```

### **Clase `.pixel-box`**
Contenedor con borde pixel y sombra
```html
<div class="pixel-box">
  <p>Contenido aquí</p>
</div>
```

### **Clase `.pixel-badge`**
Badge animado con rebote
```html
<div class="pixel-badge">NEW!</div>
```

### **Clase `.pixel-navbar`**
Navbar con franja animada inferior
```html
<nav class="pixel-navbar">...</nav>
```

### **Clase `.pixel-tooltip`**
Tooltip que aparece al hover
```html
<a href="#" class="pixel-tooltip" data-tooltip="Info aquí">Link</a>
```

### **Clase `.pixel-corner`**
Decoración de esquinas tipo RPG
```html
<div class="pixel-corner">
  <h3>Título</h3>
</div>
```

### **Clase `.pixel-hp-bar`**
Barra de corazones decorativa
```html
<div class="pixel-hp-bar">
  <div class="pixel-heart"></div>
  <div class="pixel-heart"></div>
  <div class="pixel-heart"></div>
</div>
```

### **Clase `.pixel-status-bar`**
Barra de estado con fuente pixel
```html
<div class="pixel-status-bar">
  <span>VER 1.0.0</span>
  <span>•</span>
  <span>LVL 50</span>
</div>
```

### **Clase `.pixel-coin`**
Moneda giratoria animada
```html
<span class="pixel-coin"></span>
```

---

## 🎬 Animaciones Implementadas

### **@keyframes pixelGlow**
```css
/* Uso: títulos H1 */
animation: pixelGlow 2s ease-in-out infinite;
```
Efecto de brillo pulsante en texto

### **@keyframes pixelPulse**
```css
/* Uso: backgrounds de .pixel-box::before */
animation: pixelPulse 3s ease-in-out infinite;
```
Opacidad que varía de 0.1 a 0.3

### **@keyframes pixelScroll**
```css
/* Uso: franja inferior de .pixel-navbar::after */
animation: pixelScroll 2s linear infinite;
```
Desplazamiento horizontal de colores

### **@keyframes pixelBounce**
```css
/* Uso: .pixel-badge */
animation: pixelBounce 1s ease-in-out infinite;
```
Rebote vertical de -4px

### **@keyframes pixelShake**
```css
/* Uso: errores o alertas */
animation: pixelShake 0.5s;
```
Shake horizontal de ±2px

### **@keyframes pixelRotate**
```css
/* Uso: .pixel-coin */
animation: pixelRotate 3s linear infinite;
```
Rotación 3D en eje Y

### **@keyframes pixelBarScroll**
```css
/* Uso: .pixel-status-bar-fill::after */
animation: pixelBarScroll 1s linear infinite;
```
Patrón de líneas en movimiento

---

## 📊 Comparativa Antes/Después

| Elemento | Antes (Glassmorphism) | Después (Pixel Art) |
|----------|----------------------|---------------------|
| **Fuente principal** | Default sans-serif | Press Start 2P |
| **Fuente código** | Monospace | VT323 |
| **Bordes** | `border-radius: 24px` | `border-radius: 0` |
| **Sombras** | Smooth blur | Hard offset (8px 8px) |
| **Colores** | Gradientes suaves | Paleta limitada (5 colores) |
| **Animaciones** | Smooth (0.3s ease) | Instantáneas (0.1s) |
| **Background** | 3 blobs animados | Grid pixel estático |
| **Botones** | Hover scale + gradiente | 3D push effect |
| **Navbar** | Backdrop blur | Borde con franja animada |
| **Tables** | Bordes colapsados | Border-spacing 4px |
| **Scrollbar** | Default | Custom pixel art |

---

## 🔧 Cómo Usar los Componentes

### **Crear una sección nueva**
```html
<section id="mi-seccion" class="pixel-box">
  <h2>🎮 Mi Sección</h2>
  <p>Descripción aquí</p>
  
  <div class="pixel-corner">
    <h3>Subsección</h3>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </div>
  
  <a href="#" class="pixel-btn">Acción</a>
</section>
```

### **Agregar tooltips**
```html
<span class="pixel-tooltip" data-tooltip="HP: 100/100">
  ♥ Salud
</span>
```

### **Crear barra de progreso**
```html
<div class="pixel-status-bar">
  <span>EXP:</span>
  <div class="pixel-status-bar-fill" style="width: 75%"></div>
  <span>750/1000</span>
</div>
```

### **Mostrar código pixel art**
```html
<pre><code class="language-bash">!minar
!pescar
!pelear</code></pre>
```

---

## 🚀 Próximos Pasos Sugeridos

### **1. Agregar Iconos Pixel Art Custom**
Crear sprites para reemplazar emojis:
- ⚔️ → Espada pixel (16x16)
- 🛡️ → Escudo pixel (16x16)
- 💎 → Diamante pixel (16x16)

### **2. Loading States**
```css
.pixel-loading {
  animation: pixelBounce 0.6s infinite;
}
```

### **3. Notificaciones/Toasts**
```html
<div class="pixel-box" style="position: fixed; top: 20px; right: 20px;">
  <p>✓ Guardado exitoso</p>
</div>
```

### **4. Modo Oscuro/Claro**
Agregar toggle para cambiar paleta:
```css
[data-theme="light"] {
  --pixel-bg-dark: #f0f0f0;
  --pixel-text: #1a1433;
}
```

### **5. Sound Effects**
Agregar sonidos 8-bit en botones (requiere JS):
```javascript
document.querySelectorAll('.pixel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    new Audio('/assets/sounds/click.wav').play();
  });
});
```

---

## 🐛 Troubleshooting

### **Las fuentes no cargan**
**Solución**: Verificar que Google Fonts está accesible. Backup:
```css
@font-face {
  font-family: 'Press Start 2P';
  src: url('/assets/fonts/PressStart2P.woff2') format('woff2');
}
```

### **Los estilos no se aplican**
**Solución**: Verificar orden de carga de CSS:
```html
<link rel="stylesheet" href="/assets/css/pixel-art.css">
<link rel="stylesheet" href="/assets/css/pixel-sections.css">
<link rel="stylesheet" href="/assets/css/styles.css"> <!-- Este último -->
```

### **Las animaciones van lentas**
**Solución**: Reducir box-shadows complejos en elementos grandes. Usar `will-change`:
```css
.pixel-btn {
  will-change: transform, box-shadow;
}
```

### **Scrollbar custom no funciona en Firefox**
**Solución**: Agregar soporte Firefox:
```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--pixel-accent-2) var(--pixel-bg-dark);
}
```

---

## 📝 Notas Finales

- ✅ Backup creado en: `src/server/views.backup`
- ✅ Todos los archivos EJS mantienen la misma estructura de contenido
- ✅ Solo cambió la capa visual (CSS)
- ✅ Compatible con dispositivos móviles (responsive)
- ✅ Accesibilidad: todos los colores tienen contraste suficiente (WCAG AA)

---

## 🔗 Referencias

- [Press Start 2P Font](https://fonts.google.com/specimen/Press+Start+2P)
- [VT323 Font](https://fonts.google.com/specimen/VT323)
- [CSS Pixel Art Techniques](https://css-tricks.com/snippets/css/pixel-art-box-shadow/)
- [8-bit Color Palettes](https://lospec.com/palette-list)

---

**Última actualización**: <%= new Date().toLocaleDateString('es-ES') %>  
**Versión diseño**: 1.0.0 (Pixel Art RPG)
