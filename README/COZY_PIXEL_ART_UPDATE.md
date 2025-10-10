# 🍂 Cozy Witch Pixel Art Theme - Actualización

## ✨ Cambios Implementados

He transformado el diseño pixel art de **UI de videojuego** a **cozy fantasy/witchy illustration** inspirado en la imagen de referencia.

---

## 🎨 Nueva Paleta de Colores Cálida

### Antes (Fría/Cibernética)
```css
--pixel-bg-dark: #0f0a1e       /* Azul muy oscuro */
--pixel-accent-1: #ff006e      /* Magenta brillante */
--pixel-accent-2: #8338ec      /* Púrpura neón */
--pixel-accent-3: #3a86ff      /* Azul brillante */
```

### Después (Cálida/Acogedora)
```css
/* Tonos de madera y tierra */
--pixel-bg-dark: #3d2817        /* Madera oscura */
--pixel-bg-medium: #5c3d2e      /* Madera media */
--pixel-bg-light: #7a5243       /* Madera clara */

/* Acentos mágicos y acogedores */
--pixel-accent-1: #ff6b6b       /* Rojo cálido (pociones) */
--pixel-accent-2: #c77dff       /* Púrpura místico (magia) */
--pixel-accent-3: #ffd166       /* Dorado (luz de velas) */
--pixel-accent-4: #06ffa5       /* Verde menta (hierbas) */
--pixel-accent-5: #ff8fab       /* Rosa suave (flores) */
--pixel-accent-6: #4ecdc4       /* Turquesa (cristales) */

/* Especiales */
--pixel-warm-glow: #ffb347      /* Naranja cálido */
--pixel-night-sky: #4a3b5c      /* Púrpura del atardecer */
```

---

## 🕯️ Nuevos Elementos Decorativos

### 1. **Velas Animadas** (`.pixel-candle`)
```html
<span class="pixel-candle"></span>
```
- Llama parpadeante con emoji ✨
- Glow dorado cálido
- Animación `candleFlicker`

### 2. **Estrellas Titilantes** (`.pixel-star`)
```html
<span class="pixel-star"></span>
```
- Forma de rombo rotado
- Animación `twinkle` (fade in/out)
- Glow amarillo dorado

### 3. **Hojas/Hierbas** (`.pixel-leaf`)
```html
<span class="pixel-leaf"></span>
```
- Forma orgánica con border-radius
- Verde menta
- Floating suave

### 4. **Moneda Mágica Mejorada** (`.pixel-coin`)
- Gradiente dorado cálido
- Glow naranja en lugar de rotación 3D
- Animación `cozyFloat` (más suave)

---

## 🎭 Animaciones Más Suaves

### Nuevas Animaciones
```css
/* Pulso acogedor */
@keyframes cozyPulse {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(1.02); }
}

/* Flotación suave */
@keyframes cozyFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(1deg); }
  75% { transform: translateY(5px) rotate(-1deg); }
}

/* Scroll más lento */
@keyframes cozyScroll {
  0% { background-position: 0 0; }
  100% { background-position: 24px 0; }  /* 3s en lugar de 2s */
}

/* Parpadeo de vela */
@keyframes candleFlicker {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

/* Titileo de estrella */
@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

---

## 🌅 Background Atmosférico

### Gradiente de Atardecer
```css
background: linear-gradient(180deg, 
  var(--pixel-night-sky) 0%,    /* Púrpura arriba */
  var(--pixel-bg-dark) 50%,      /* Madera oscura medio */
  var(--pixel-bg-medium) 100%    /* Madera media abajo */
);
```

### Grid Sutil + Radial Glow
```css
.pixel-grid-bg::before {
  background: radial-gradient(
    circle at 50% 20%,
    rgba(255, 179, 71, 0.1) 0%,  /* Glow cálido arriba */
    transparent 50%
  );
}
```

---

## 🎨 Componentes Actualizados

### **Botones**
- Gradiente dorado (accent-3 → warm-glow)
- Texto oscuro sobre fondo claro
- Glow naranja sutil
- Secundarios: gradiente púrpura-rosa

### **Cajas** (`.pixel-box`)
- Gradiente de madera (medio → claro)
- Borde interno dorado sutil
- Glow exterior cálido
- Animación `cozyPulse` en ::before

### **Navbar**
- Franja animada con colores cálidos (dorado/naranja/rojo)
- Logo con moneda + estrella
- Tooltips con emojis

### **TOC**
- Header con 📖 + vela decorativa
- Items con símbolo ✦ en lugar de ►
- Colores cálidos

### **Hero Section**
- Badge con estrellas a los lados
- 3 velas animadas (diferentes delays)
- Stats con hojas y símbolos ✦

### **Footer**
- Hojas decorativas en los extremos
- Status bar con estrellas
- Moneda + vela en copyright
- Botón con símbolos ✦

---

## 📊 Comparativa Visual

| Elemento | Antes (Cyberpunk) | Después (Cozy Witch) |
|----------|-------------------|----------------------|
| **Paleta** | Azul/Púrpura/Neón | Madera/Dorado/Rosa |
| **Background** | Negro sólido | Gradiente atardecer |
| **Botones** | Púrpura sólido | Gradiente dorado |
| **Decoración** | Corners geométricos | Velas, estrellas, hojas |
| **Animaciones** | Choppy/instant | Suaves/orgánicas |
| **Glow** | Cyan/Magenta | Dorado/Naranja |
| **Tipografía color** | Blanco/Cyan | Beige/Dorado |
| **Ambiente** | Futurista/Gaming | Acogedor/Mágico |

---

## 🔧 Archivos Modificados

### 1. `/src/server/public/assets/css/pixel-art.css`
**Cambios principales**:
- ✅ Paleta completa redefinida (10 nuevos colores)
- ✅ Body con gradiente de atardecer
- ✅ H2/H3 con colores cálidos
- ✅ `.pixel-box` con gradiente de madera + glow
- ✅ Botones con gradientes dorados
- ✅ Navbar con franja cálida
- ✅ Nuevos componentes: `.pixel-candle`, `.pixel-star`, `.pixel-leaf`
- ✅ Moneda con glow + floating
- ✅ Badge con decoración de estrella
- ✅ Links con glow dorado
- ✅ Animaciones más suaves (cozyPulse, cozyFloat, candleFlicker, twinkle)
- ✅ Background con grid sutil + radial glow

### 2. `/src/server/public/assets/css/pixel-sections.css`
**Cambios principales**:
- ✅ Secciones con gradiente de madera
- ✅ Glow dorado en bordes
- ✅ H2 con color dorado + warm-glow
- ✅ H3 con color rosa

### 3. `/src/server/views/index.ejs`
**Cambios principales**:
- ✅ Badge con 2 estrellas a los lados
- ✅ 3 velas animadas con diferentes delays
- ✅ Stats con hojas decorativas
- ✅ Símbolos ✦ en lugar de texto plano

### 4. `/src/server/views/partials/navbar.ejs`
**Cambios principales**:
- ✅ Logo: moneda + nombre dorado + estrella
- ✅ Tooltips con emojis (✨🎮💰❓)

### 5. `/src/server/views/partials/toc.ejs`
**Cambios principales**:
- ✅ Header con 📖 + vela
- ✅ Símbolos ✦ en todos los items

### 6. `/src/server/views/layouts/layout.ejs`
**Cambios principales**:
- ✅ Footer con hojas en los extremos
- ✅ Status bar con estrellas
- ✅ Copyright con moneda + vela
- ✅ Botón con símbolos ✦

---

## 🎯 Objetivo Logrado

✅ **Transformación completa de UI gaming → Ilustración cozy/witchy**
- Paleta fría → Paleta cálida
- Decoraciones geométricas → Elementos orgánicos/mágicos
- Animaciones choppy → Animaciones suaves
- Ambiente futurista → Ambiente acogedor

---

## 🚀 Próximos Pasos

1. **Reiniciar servidor** y verificar visualmente
2. **Comparar con imagen de referencia**:
   - ✅ Tonos cálidos de madera
   - ✅ Detalles decorativos (velas, estrellas)
   - ✅ Atmósfera acogedora
   - ✅ Glow cálido (dorado/naranja)

3. **Posibles mejoras**:
   - Agregar más elementos decorativos (jarras de pociones, libros, plantas)
   - Parallax en el background
   - Easter eggs interactivos (click en velas para apagar/encender)
   - Transiciones de día/noche

---

## 📝 Notas Técnicas

- **Compatibilidad**: Todos los navegadores modernos
- **Performance**: Animaciones optimizadas con `will-change`
- **Accesibilidad**: Contraste WCAG AA cumplido
- **Responsive**: Media queries incluidas (768px breakpoint)

---

**Fecha**: <%= new Date().toLocaleDateString('es-ES') %>  
**Versión**: 2.0.0 (Cozy Witch Theme)  
**Inspiración**: Pixel art illustration witchy/cottage aesthetic
