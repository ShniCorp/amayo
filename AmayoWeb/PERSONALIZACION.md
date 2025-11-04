# 🎨 Guía de Personalización - AmayoWeb

## 📝 Pasos Esenciales de Configuración

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz de `AmayoWeb/`:

```env
# Discord OAuth2
VITE_DISCORD_CLIENT_ID=TU_CLIENT_ID_AQUI

# API URL (opcional si tienes backend)
VITE_API_URL=https://docs.amayo.dev/api
```

### 2. Cambiar Avatar del Bot

Edita `src/components/IslandNavbar.vue` (línea 36):

```javascript
// Antes
const botLogo = ref('https://cdn.discordapp.com/avatars/1234567890/avatar.png')

// Después - Usa tu avatar real
const botLogo = ref('https://cdn.discordapp.com/avatars/TU_BOT_ID/TU_AVATAR_HASH.png')
```

### 3. Actualizar Nombre del Bot

En el mismo archivo `IslandNavbar.vue` (línea 37):

```javascript
// Cambia 'Amayo' por el nombre de tu bot si es diferente
const botName = ref('TuBotName')
```

### 4. Personalizar Textos del Hero

Edita `src/i18n/locales.js`:

```javascript
// Español
hero: {
  subtitle: 'Tu descripción personalizada aquí',
  // ... más textos
}

// Inglés
hero: {
  subtitle: 'Your custom description here',
  // ... more texts
}
```

### 5. Ajustar Estadísticas

Edita `src/components/HeroSection.vue` (línea 42):

```javascript
const stats = ref({
  servers: '1.2K',    // Cambia por tus números reales
  users: '50K',       // Cambia por tus números reales
  commands: '150'     // Cambia por tus números reales
})
```

### 6. Configurar URL de Invitación

Edita `src/components/HeroSection.vue` (línea 115):

```javascript
const inviteBot = () => {
  // Reemplaza YOUR_CLIENT_ID con tu Discord Client ID real
  window.open('https://discord.com/api/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands', '_blank')
}
```

## 🎨 Personalización de Colores

### Cambiar el Tema por Defecto

Edita `src/composables/useTheme.js` (línea 36):

```javascript
// Cambia 'red' por: 'blue', 'green', 'purple', 'orange'
const currentTheme = ref('red')
```

### Agregar un Nuevo Tema

En `src/composables/useTheme.js`, añade al objeto `themes`:

```javascript
const themes = {
  // ... temas existentes
  cyan: {
    primary: '#00bcd4',
    secondary: '#0097a7',
    accent: '#00e5ff',
    gradient: 'linear-gradient(135deg, #00bcd4, #0097a7)',
  },
}
```

Luego en `src/components/IslandNavbar.vue`, añade el tema al array:

```javascript
const themes = [
  // ... temas existentes
  { name: 'cyan', gradient: 'linear-gradient(135deg, #00bcd4, #0097a7)' },
]
```

### Personalizar Colores del Fondo

Edita `src/components/AnimatedBackground.vue`:

```css
.layer-1 {
  /* Cambia los colores del gradiente */
  background: radial-gradient(circle at 30% 50%, #TU_COLOR 0%, transparent 50%);
}
```

## 🌐 Añadir Más Idiomas

### 1. Actualizar configuración de i18n

Edita `src/i18n/locales.js`:

```javascript
export default {
  es: { /* ... */ },
  en: { /* ... */ },
  // Nuevo idioma
  pt: {
    navbar: {
      getStarted: 'Começar',
      dashboard: 'Painel',
    },
    // ... más traducciones
  }
}
```

### 2. Actualizar selector de idioma

Edita `src/components/IslandNavbar.vue`:

```javascript
const toggleLanguage = () => {
  const langs = ['es', 'en', 'pt']
  const currentIndex = langs.indexOf(locale.value)
  const nextIndex = (currentIndex + 1) % langs.length
  locale.value = langs[nextIndex]
  localStorage.setItem('language', locale.value)
}
```

## 📱 Ajustes Responsive

### Cambiar Breakpoints

Edita el CSS en los componentes:

```css
/* Cambiar de 768px a tu preferencia */
@media (max-width: 768px) {
  /* Estilos móviles */
}

/* Agregar nuevos breakpoints */
@media (max-width: 1024px) and (min-width: 769px) {
  /* Estilos tablet */
}
```

## 🔗 Configurar Links del Navbar

Edita `src/components/IslandNavbar.vue`:

```html
<template>
  <!-- Cambia los hrefs -->
  <a href="#tus-secciones" class="nav-btn primary">
    {{ t('navbar.getStarted') }}
  </a>
  <a href="/tu-dashboard" class="nav-btn secondary">
    {{ t('navbar.dashboard') }}
  </a>
</template>
```

## 🎯 Personalizar Animaciones

### Velocidad del Typewriter

Edita `src/components/HeroSection.vue` (línea 62):

```javascript
const typewriterEffect = () => {
  // Ajusta las velocidades (en milisegundos)
  const speed = isDeleting.value ? 50 : 100  // Cambia estos valores
}
```

### Velocidad de Animación del Fondo

Edita `src/components/AnimatedBackground.vue`:

```css
.layer-1 {
  animation: slide1 15s infinite;  /* Cambia 15s a tu preferencia */
}
```

## 🖼️ Añadir Más Características al Hero

Edita `src/components/HeroSection.vue`:

```html
<div class="hero-visual">
  <!-- Añade más tarjetas flotantes -->
  <div class="floating-card card-4">
    <div class="card-icon">⚡</div>
    <div class="card-text">Nueva Característica</div>
  </div>
</div>
```

```css
.card-4 {
  top: 150px;
  right: 50px;
  animation: float 6s ease-in-out infinite 6s;
}
```

## 📊 Backend Discord OAuth2

### Configurar el Backend

1. Copia `server-example.js` a tu carpeta de backend
2. Instala dependencias:
```bash
npm install express axios cors dotenv jsonwebtoken
```

3. Crea `.env` en tu backend:
```env
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
JWT_SECRET=tu_secret_super_seguro
NODE_ENV=production
PORT=3000
```

4. Ejecuta con PM2:
```bash
pm2 start server-example.js --name "amayo-auth"
pm2 save
```

## 🔒 Configurar Discord Developer Portal

1. Ve a https://discord.com/developers/applications
2. Crea una nueva aplicación o selecciona la existente
3. Ve a OAuth2 > General
4. Añade Redirect URIs:
   - Desarrollo: `http://localhost:5173/auth/callback`
   - Producción: `https://docs.amayo.dev/auth/callback`
5. Copia el Client ID y Client Secret
6. Ve a Bot y copia el Token del bot (si lo necesitas)

## 🚀 Optimizaciones de Producción

### Lazy Loading de Componentes

En `src/router/index.js`:

```javascript
{
  path: '/dashboard',
  component: () => import('../views/Dashboard.vue')  // Carga perezosa
}
```

### Preload de Fuentes

En `index.html`:

```html
<head>
  <link rel="preload" href="/fonts/tu-fuente.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

## 📈 Analytics (Opcional)

### Añadir Google Analytics

En `index.html`:

```html
<head>
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=TU_ID"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'TU_ID');
  </script>
</head>
```

## 🎨 Fuentes Personalizadas

### Importar Google Fonts

En `src/App.vue` o `index.html`:

```html
<style>
@import url('https://fonts.googleapis.com/css2?family=TuFuente:wght@400;600;700&display=swap');
</style>
```

Luego en el CSS:

```css
body {
  font-family: 'TuFuente', sans-serif;
}
```

## 🔔 Notificaciones (Próximamente)

Placeholder para cuando quieras añadir notificaciones:

```javascript
// Instalar: npm install vue-toastification
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

app.use(Toast, {
  position: "top-right",
  timeout: 3000
});
```

---

¡Con estas personalizaciones tendrás tu landing page única! 🎉
