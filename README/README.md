# Amayo Docs (Static)

Sitio web estático para documentar el flujo de creación de contenido dentro del bot Amayo. Incluye guías para items, mobs, áreas, niveles, logros, misiones, cofres, crafteos, mutaciones y consumibles.

## 🚀 Características

- UI moderna en una sola página con navegación responsiva.
- Plantillas JSON listas para copiar en los modales del bot.
- Resumen de servicios principales (`EconomyService`, `MinigamesService`).
- Servidor HTTP minimalista (sin dependencias externas) pensado para Heroku.

## 📦 Estructura

```
server/
├── Procfile            # Entrada para Heroku (web: npm start)
├── package.json        # Scripts y metadata del mini proyecto
├── server.js           # Servidor Node para archivos estáticos
├── public/
│   ├── index.html      # Página principal con toda la documentación
│   ├── 404.html        # Página de error
│   └── assets/
│       ├── css/styles.css
│       └── js/main.js
└── README.md           # Este archivo
```

## 🛠️ Uso local

```bash
cd server
npm install  # (opcional, no se instalan paquetes pero genera package-lock)
npm start
```

El sitio quedará disponible en `http://localhost:3000`.

## ☁️ Despliegue en Heroku

### 1. Crear una app nueva

```bash
heroku create amayo-docs
```

### 2. Empujar solo la carpeta `server`

```bash
git subtree push --prefix server heroku main
```

> Si prefieres desplegar desde otra rama, reemplaza `main` por la rama deseada.

### 3. Variables recomendadas

```bash
heroku config:set NODE_ENV=production -a amayo-docs
```

La app usará el `Procfile` incluido (`web: npm start`).

## 🔍 Validación

Para asegurarte de que el servidor arranca sin errores de sintaxis:

```bash
node --check server/server.js
```

## 🧭 Próximos pasos sugeridos

- Añadir ejemplos visuales (capturas o diagramas) en `public/assets/img/`.
- Integrar métricas básicas (por ejemplo, contador simple con Cloudflare Analytics).
- Automatizar despliegue usando GitHub Actions + Heroku API.

---

Made with ❤ para la comunidad de administradores que usan Amayo.
