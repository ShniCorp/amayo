# Amayo Bot — Guía de Comandos para Discord

> Nota: Para crear y editar Items, Mobs, Áreas, Niveles y Ofertas con los editores interactivos, consulta la guía: [CREACION_DE_CONTENIDO.md](./CREACION_DE_CONTENIDO.md)

Bienvenido/a. Aquí tienes una guía lista para pegar en tu servidor de Discord con todos los comandos disponibles y lo que hacen.

- Prefix por defecto: `!` (puede cambiarse con `!configuracion`)
- Ayuda en Discord: `!ayuda`, `!ayuda <comando>`, `!ayuda <categoría>`
- Algunos comandos requieren permisos de Administrador; están marcados.

## Comandos por categoría

### IA
- `!ai <mensaje>`
  - Aliases: `!chat`, `!gemini`
  - Qué hace: Chatea con la IA (Gemini) directamente desde Discord.
  - Ejemplo: `!ai ¿Cómo funciona JavaScript?`

### Utilidad
- `!ayuda [comando|categoría]`
  - Aliases: `!help`, `!comandos`, `!cmds`
  - Qué hace: Muestra la lista de comandos y detalles por categoría. Si pasas un nombre de comando o categoría, filtra el resultado.

### Red
- `!ping`
  - Aliases: `!latency`, `!pong`
  - Qué hace: Verifica la latencia y que el bot esté respondiendo.

### Configuración (Admin)
- `!configuracion`
  - Aliases: `!config`, `!ajustes`, `!settings`
  - Qué hace: Abre el panel de configuración del servidor (por ejemplo, cambiar el prefix).
  - Permisos: Requiere Administrador.

### Administración (Owner)
- `!admin-comandos`
  - Aliases: `!cmdadmin`, `!synccommands`, `!comandos-admin`
  - Qué hace: Panel del dueño para registrar/limpiar comandos slash y revisar memoria.
  - Permisos: Solo propietario del bot.

### Alianzas (Gestión de bloques y canales) — Admin
Bloques (presentaciones/embeds avanzados con Display Components):
- `!crear-embed <nombre>`
  - Aliases: `!embed-crear`, `!nuevo-embed`, `!blockcreatev2`
  - Qué hace: Crea un bloque/embedded nuevo con editor interactivo.
  - Permisos: Administrador.
- `!editar-embed <nombre>`
  - Aliases: `!embed-editar`, `!modificar-embed`, `!blockeditv2`
  - Qué hace: Edita un bloque/embedded existente con herramientas interactivas.
  - Permisos: Administrador.
- `!lista-embeds`
  - Aliases: `!embeds`, `!ver-embeds`, `!embedlist`
  - Qué hace: Lista los bloques existentes con paginación y acciones rápidas.
  - Permisos: Administrador.
- `!eliminar-embed`
  - Aliases: `!embed-eliminar`, `!borrar-embed`, `!embeddelete`
  - Qué hace: Panel interactivo para eliminar bloques de forma segura.
  - Permisos: Administrador.

Canales de alianza (puntos por enlaces válidos, etc.):
- `!canal-alianza`
  - Aliases: `!alchannel`, `!channelally`
  - Qué hace: Abre el centro de configuración para asignar un bloque a un canal de texto y activarlo.
  - Permisos: Administrador.
- `!listar-canales-alianza`
  - Aliases: `!listchannels-alliance`, `!listalchannel`, `!channelsally`, `!alliancechannels`
  - Qué hace: Muestra los canales de alianza configurados con estado y estadísticas.
  - Permisos: Administrador recomendado.
- `!eliminar-canal-alianza`
  - Aliases: `!removechannel-alliance`, `!removealchannel`, `!delalchannel`
  - Qué hace: Elimina la configuración de alianza de un canal seleccionado (mantiene historial).
  - Permisos: Administrador.

Demostración/ejemplos:
- `!displaydemo`
  - Aliases: `!ddemo`, `!componentsdemo`
  - Qué hace: Demostración de Display Components con accesorios y acciones.
  - Permisos: Administrador.
- `!test1`
  - Qué hace: Mensaje de ejemplo de componentes/embeds (demo interna).

### Slash commands
- `/ping`
  - Qué hace: Responde con “pong!” (prueba rápida de slash).

## Consejos rápidos
  - Puede requerir permisos de Administrador o ser solo del dueño.
  - Asegúrate de usarlo en un canal de texto compatible.
  - Escribe `!ayuda <comando>` para ver el uso correcto.

## Bloque listo para copiar y pegar en tu server

Copia todo este bloque y pégalo en tu canal de información o bienvenida.

```
## Sistema RPG (Beta)

El bot incluye un sistema RPG ligero con progreso persistente y combate simplificado.

### Conceptos Clave
- **HP Persistente:** Tu vida (HP) se mantiene entre actividades. Si llegas a 0 en combate, resurges automáticamente al 50% de tu máximo (regeneración de seguridad) y se incrementa `Veces Derrotado`.
- **Rachas de Victoria:** Cada 3 victorias consecutivas obtienes +1% de daño (hasta +30%). Al perder, la racha se reinicia.
- **Herramientas con Durabilidad por Instancia:** Las herramientas no apilables crean instancias independientes; cada uso consume durabilidad de una instancia. Al agotarse una instancia, desaparece solo esa (si quedan otras, se siguen usando). Cuando la última instancia se rompe, el ítem queda completamente agotado.
- **Origen de Herramienta:** El sistema selecciona herramienta en este orden: (1) la que pases directamente (argumento), (2) la equipada (slot apropiado), (3) la mejor del inventario. El comando mostrará su procedencia (`toolSource`).
- **Combate Simplificado:** Se simulan rondas contra mobs; se registra daño infligido/recibido, mobs derrotados y resultado (Victoria/Derrota).
- **Resumen Visual:** Corazones (❤/♡) y barra de durabilidad reflejan estado tras cada acción.

### Comandos RPG Principales
- `!mina [nivel] [toolKey]` — Minar (usa pico).
- `!pescar [nivel] [toolKey]` — Pescar (usa caña).
- `!pelear [nivel] [toolKey]` — Combatir (usa espada).
- `!combate-historial [n]` — Últimos combates resumidos.
- `!tool-breaks [n]` — Rupturas recientes de herramientas (memoria).
- (Opcional futuro) `!tool-info <toolKey>` — Ver instancias y durabilidad.

### Estadísticas (PlayerStats)
Se actualizan automáticamente:
- Actividades: `minesCompleted`, `fishingCompleted`, `fightsCompleted`.
- Combate: `mobsDefeated`, `damageDealt`, `damageTaken`, `timesDefeated`, `currentWinStreak`, `longestWinStreak`.

### Estructura de Resultados
Cada minijuego produce un `RunResult` con bloque `tool` (incluye `toolSource`, `brokenInstance`, `instancesRemaining`) y, si aplica, `combat` con:
- `playerStartHp`, `playerEndHp`, `outcome`, `damageDealt`, `damageTaken`, `mobsDefeated`.

### Próximas Mejoras Planeadas
- Tabla persistente de rupturas (`ToolBreakLog`).
- Definiciones avanzadas de mobs (stats dinámicos, efectos críticos, resistencias).
- Efectos de equipo: críticos, sangrado, bloqueo, robo de vida.
- Consumo de pociones en combate y estados alterados.
- Eventos programados (ataques globales de mobs) vía funciones externas (Appwrite / cron).

### Notas Técnicas
- HP y maxHp: `PlayerState` + bonificaciones de equipo.
- Racha: cálculo en `getEffectiveStats()` (1% cada 3 victorias, tope 30%).
- Durabilidad: lógica por instancia en `reduceToolDurability` (remueve instancia agotada).
- Combate: loop interno en servicio de minijuegos actualiza daño y resultado, persistiendo HP final.
- Logs: Rupturas se guardan en memoria (buffer circular) para inspección rápida.

> Esta sección está en evolución: puede cambiar estructura interna para soportar mobs declarativos y balance más profundo.

📌 Amayo Bot — Guía Rápida de Comandos
Prefix: ! (puedes cambiarlo con !configuracion)

IA
• !ai <mensaje> — Chatea con la IA (aliases: !chat, !gemini)

Utilidad
• !ayuda [comando|categoría] — Lista y detalles de comandos

Red
• !ping — Prueba de latencia

Configuración (Admin)
• !configuracion — Panel de ajustes del servidor

Alianzas (Admin)
• !crear-embed <nombre> — Crear bloque interactivo
• !editar-embed <nombre> — Editar bloque
• !lista-embeds — Ver bloques
• !eliminar-embed — Eliminar bloques
• !canal-alianza — Configurar canal
• !listar-canales-alianza — Ver configurados
• !eliminar-canal-alianza — Eliminar canal de la configuración
• !displaydemo — Demo de componentes

Slash
• /ping — Pong!

Más ayuda: !ayuda | !ayuda <comando> | !ayuda <categoría>
```
