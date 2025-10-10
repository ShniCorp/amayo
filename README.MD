# 🤖 Amayo Bot — Guía de Comandos para Discord

<div align="center">

![Version](https://img.shields.io/badge/version-2.0-blueviolet?style=for-the-badge)
![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![AI](https://img.shields.io/badge/AI-Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

**Tu asistente definitivo para Discord con IA integrada** ⚡

[![Prefix](https://img.shields.io/badge/Prefix-!-success?style=for-the-badge)](https://github.com)

</div>

---

> 📝 **Nota importante:** Favor de leer la licencia: [LICENSE](./LICENSE)

> 📝 **Nota importante:** Para crear y editar Items, Mobs, Áreas, Niveles y Ofertas con los editores interactivos, consulta la guía: [CREACION_DE_CONTENIDO.md](./README/CREACION_DE_CONTENIDO.md)

---

## 📚 Tabla de Contenidos

- [🧠 Inteligencia Artificial](#-inteligencia-artificial)
- [🛠️ Utilidad](#️-utilidad)
- [📡 Red](#-red)
- [⚙️ Configuración](#️-configuración)
- [👑 Administración](#-administración)
- [🤝 Alianzas](#-alianzas)
  - [📦 Gestión de Bloques/Embeds](#-gestión-de-bloquesembeds)
  - [📢 Canales de Alianza](#-canales-de-alianza)
  - [🎨 Demostración](#-demostración)
- [⚡ Slash Commands](#-slash-commands)
- [💡 Consejos Rápidos](#-consejos-rápidos)
- [📋 Bloque para tu Servidor](#-bloque-para-tu-servidor)

---

## 🧠 Inteligencia Artificial

### `!ai <mensaje>`
> **Aliases:** `!chat`, `!gemini`

💬 Chatea con la IA (Gemini) directamente desde Discord. Pregunta lo que quieras, desde programación hasta consejos generales.

**Ejemplo:**
```
!ai ¿Cómo funciona JavaScript?
```

---

## 🛠️ Utilidad

### `!ayuda [comando|categoría]`
> **Aliases:** `!help`, `!comandos`, `!cmds`

📚 Muestra la lista completa de comandos y detalles por categoría. Puedes filtrar por comando específico o categoría.

**Ejemplos:**
```
!ayuda
!ayuda ai
!ayuda Alianzas
```

---

## 📡 Red

### `!ping`
> **Aliases:** `!latency`, `!pong`

🏓 Verifica la latencia del bot y confirma que está respondiendo correctamente.

---

## ⚙️ Configuración

> 🔒 **Requiere:** Permisos de Administrador

### `!configuracion`
> **Aliases:** `!config`, `!ajustes`, `!settings`

🔧 Abre el panel de configuración del servidor donde puedes personalizar el prefix y otras opciones.

---

## 👑 Administración

> 🔒 **Requiere:** Ser el propietario del bot

### `!admin-comandos`
> **Aliases:** `!cmdadmin`, `!synccommands`, `!comandos-admin`

🎛️ Panel exclusivo del dueño del bot para registrar/limpiar comandos slash y revisar el estado de memoria.

---

## 🤝 Alianzas

> 🔒 **Requiere:** Permisos de Administrador

Sistema completo de gestión de alianzas con bloques personalizados y canales configurables.

### 📦 Gestión de Bloques/Embeds

<table>
<tr>
<td width="30%"><b>Comando</b></td>
<td width="70%"><b>Descripción</b></td>
</tr>

<tr>
<td>

**`!crear-embed <nombre>`**

*Aliases:* `!embed-crear`, `!nuevo-embed`, `!blockcreatev2`

</td>
<td>

✨ Crea un bloque/embedded nuevo con editor interactivo avanzado y Display Components.

</td>
</tr>

<tr>
<td>

**`!editar-embed <nombre>`**

*Aliases:* `!embed-editar`, `!modificar-embed`, `!blockeditv2`

</td>
<td>

✏️ Edita un bloque/embedded existente con herramientas interactivas completas.

</td>
</tr>

<tr>
<td>

**`!lista-embeds`**

*Aliases:* `!embeds`, `!ver-embeds`, `!embedlist`

</td>
<td>

📋 Lista todos los bloques existentes con paginación y acciones rápidas.

</td>
</tr>

<tr>
<td>

**`!eliminar-embed`**

*Aliases:* `!embed-eliminar`, `!borrar-embed`, `!embeddelete`

</td>
<td>

🗑️ Panel interactivo para eliminar bloques de forma segura.

</td>
</tr>

</table>

### 📢 Canales de Alianza

<table>
<tr>
<td width="30%"><b>Comando</b></td>
<td width="70%"><b>Descripción</b></td>
</tr>

<tr>
<td>

**`!canal-alianza`**

*Aliases:* `!alchannel`, `!channelally`

</td>
<td>

🎯 Abre el centro de configuración para asignar un bloque a un canal de texto y activar el sistema de puntos por enlaces válidos.

</td>
</tr>

<tr>
<td>

**`!listar-canales-alianza`**

*Aliases:* `!listchannels-alliance`, `!listalchannel`, `!channelsally`, `!alliancechannels`

</td>
<td>

📊 Muestra todos los canales de alianza configurados con estado y estadísticas detalladas.

</td>
</tr>

<tr>
<td>

**`!eliminar-canal-alianza`**

*Aliases:* `!removechannel-alliance`, `!removealchannel`, `!delalchannel`

</td>
<td>

❌ Elimina la configuración de alianza de un canal seleccionado (mantiene el historial).

</td>
</tr>

</table>

### 🎨 Demostración

| Comando | Descripción |
|---------|-------------|
| **`!displaydemo`**<br>*Aliases:* `!ddemo`, `!componentsdemo` | 🎪 Demostración completa de Display Components con todos los accesorios y acciones disponibles. |
| **`!test1`** | 🧪 Mensaje de ejemplo de componentes/embeds (demo interna para pruebas). |

---

## ⚡ Slash Commands

### `/ping`
🏓 Responde con "pong!" - Prueba rápida de comandos slash.

---

## 💡 Consejos Rápidos

<details>
<summary><b>¿Olvidaste el prefix?</b></summary>

Usa `@mencionar_al_bot ayuda` o prueba `!ayuda`

</details>

<details>
<summary><b>¿Un comando no funciona?</b></summary>

- ✅ Puede requerir permisos de Administrador o ser exclusivo del dueño
- ✅ Asegúrate de usarlo en un canal de texto compatible
- ✅ Escribe `!ayuda <comando>` para ver el uso correcto

</details>

<details>
<summary><b>¿Necesitas ayuda específica?</b></summary>

Usa `!ayuda <categoría>` para filtrar por tipo de comando

**Categorías disponibles:**
- `IA`
- `Utilidad`
- `Red`
- `Configuración`
- `Administración`
- `Alianzas`

</details>

---

## 📋 Bloque para tu Servidor

Copia este bloque y pégalo en tu canal de información o bienvenida:

```
📌 Amayo Bot — Guía Rápida de Comandos
Prefix: ! (puedes cambiarlo con !configuracion)

🧠 IA
• !ai <mensaje> — Chatea con la IA (aliases: !chat, !gemini)

🛠️ Utilidad
• !ayuda [comando|categoría] — Lista y detalles de comandos

📡 Red
• !ping — Prueba de latencia

⚙️ Configuración (Admin)
• !configuracion — Panel de ajustes del servidor

🤝 Alianzas (Admin)
📦 Bloques/Embeds:
• !crear-embed <nombre> — Crear bloque interactivo
• !editar-embed <nombre> — Editar bloque
• !lista-embeds — Ver bloques
• !eliminar-embed — Eliminar bloques

📢 Canales:
• !canal-alianza — Configurar canal
• !listar-canales-alianza — Ver configurados
• !eliminar-canal-alianza — Eliminar canal de la configuración

🎨 Demo:
• !displaydemo — Demo de componentes

⚡ Slash
• /ping — Pong!

Más ayuda: !ayuda | !ayuda <comando> | !ayuda <categoría>
```

---

<div align="center">

### ⚡ Desarrollado con 💜

**Amayo Bot © 2025**

Potenciado por Discord.js & Gemini AI

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)

</div>
