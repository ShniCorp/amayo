# Guía Rápida de Inicio - AmayoWeb

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
cd AmayoWeb
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
VITE_DISCORD_CLIENT_ID=tu_discord_client_id
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

Visita: http://localhost:5173

### 4. Build para producción
```bash
npm run build
```

### 5. Deploy a VPS (Windows)
```powershell
.\deploy.ps1 -Server "user@tu-vps.com"
```

## 🎨 Características Principales

✅ **Fondo animado** con gradientes rojos deslizantes  
✅ **Navbar island style** flotante  
✅ **Hero con efecto typewriter**  
✅ **Sistema de temas** (5 degradados diferentes)  
✅ **Internacionalización** ES/EN  
✅ **Autenticación Discord OAuth2**  

## 📚 Documentación Completa

- **SETUP.md** - Guía completa de instalación y configuración
- **NGINX_SETUP.md** - Configuración de Nginx en VPS
- **server-example.js** - Ejemplo de backend para Discord OAuth2

## 🔧 Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
```

## 🌐 URLs Importantes

- **Local**: http://localhost:5173
- **Producción**: https://docs.amayo.dev
- **Discord Developer Portal**: https://discord.com/developers/applications

## ❓ Necesitas ayuda?

Consulta los archivos de documentación o abre un issue en GitHub.
