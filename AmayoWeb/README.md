# AmayoWeb - Landing Page

Landing page moderna para el bot de Discord Amayo, construida con Vue 3, Vite y diseño pixel art animado.

## 🌐 Dominios

- **Frontend:** https://docs.amayo.dev
- **Backend API:** https://api.amayo.dev

## 🚀 Características

- ✨ Fondo animado con gradientes temáticos
- 🎨 Sistema de temas (Rojo, Azul, Verde, Morado, Naranja)
- 🌍 Internacionalización (Español/English)
- 📊 Estadísticas en tiempo real del bot
- 🔐 Autenticación con Discord OAuth2
- 📱 Diseño responsive y moderno
- ⚡ Optimizado con Vite

## 📋 Prerequisitos

- Node.js 18+ 
- npm o pnpm
- Bot de Discord configurado
- Servidor backend corriendo en puerto 3001

## 🛠️ Instalación

```sh
# Clonar repositorio
cd AmayoWeb

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar tu Discord Client ID en .env
VITE_DISCORD_CLIENT_ID=tu_client_id_aqui
```

## 💻 Desarrollo

```sh
# Iniciar servidor de desarrollo (puerto 5173)
npm run dev

# Asegúrate de que el backend API esté corriendo en puerto 3001
```

## 🏗️ Compilación para Producción

```sh
# Build de producción
npm run build

# Los archivos compilados estarán en ./dist
```

## 🚀 Despliegue

Ver [NGINX_CONFIG.md](./NGINX_CONFIG.md) para instrucciones detalladas de configuración de NGINX con SSL.

### Resumen rápido:

1. Build del proyecto: `npm run build`
2. Copiar archivos a `/var/www/docs.amayo.dev`
3. Configurar NGINX para servir los archivos estáticos
4. Generar certificados SSL con certbot

```sh
# Usar el script de deploy
./deploy.sh
```

## 📁 Estructura del Proyecto

```
AmayoWeb/
├── src/
│   ├── components/       # Componentes Vue
│   │   ├── AnimatedBackground.vue
│   │   ├── IslandNavbar.vue
│   │   ├── HeroSection.vue
│   │   └── DiscordLoginButton.vue
│   ├── composables/      # Composables de Vue
│   │   └── useTheme.js
│   ├── i18n/            # Configuración i18n
│   │   ├── index.js
│   │   └── locales.js
│   ├── services/        # Servicios API
│   │   ├── auth.js
│   │   └── bot.js
│   ├── router/          # Vue Router
│   └── views/           # Vistas/Páginas
├── public/              # Archivos estáticos
└── dist/               # Build de producción (generado)
```

## 🎨 Temas Disponibles

1. **Rojo** (Predeterminado) - Energético y vibrante
2. **Azul** - Tranquilo y profesional  
3. **Verde** - Natural y relajante
4. **Morado** - Místico y elegante
5. **Naranja** - Cálido y acogedor

## 🌍 Idiomas

- 🇪🇸 Español (Predeterminado)
- 🇺🇸 English

## 🔧 Configuración

### Variables de Entorno

```env
# .env
VITE_DISCORD_CLIENT_ID=tu_client_id
VITE_API_URL=http://localhost:3001  # Desarrollo
# VITE_API_URL=https://api.amayo.dev # Producción
```

### Vite Config

El proxy está configurado para desarrollo:

```js
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

## 📚 Documentación Adicional

- [QUICKSTART.md](./QUICKSTART.md) - Guía de inicio rápido
- [NGINX_CONFIG.md](./NGINX_CONFIG.md) - Configuración de NGINX y SSL
- [SETUP.md](./SETUP.md) - Configuración detallada
- [PERSONALIZACION.md](./PERSONALIZACION.md) - Cómo personalizar el diseño

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 🆘 Soporte

Si tienes problemas, abre un issue en GitHub o contacta al equipo de desarrollo.

---

Hecho con ❤️ para la comunidad de Amayo
````
