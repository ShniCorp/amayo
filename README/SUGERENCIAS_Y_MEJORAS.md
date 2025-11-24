# 🎯 Análisis Completo y Sugerencias de Mejora

## 📊 Análisis del Proyecto

Después de analizar todo tu código, he identificado que tienes un **excelente sistema base** con:

✅ Sistema de economía robusto (items, wallet, inventario)
✅ Sistema de minijuegos completo (mina, pesca, pelea, granja)
✅ Sistema de combate con equipamiento y stats
✅ Sistema de crafteo y fundición
✅ Sistema de mutaciones para items
✅ DisplayComponents avanzado con editor visual
✅ Sistema de cooldowns y progresión
✅ Sistema de alianzas con leaderboards

---

## 🚀 Sugerencias de Nuevas Funcionalidades

### 1. 🏆 **Sistema de Logros/Achievements** ⭐⭐⭐⭐⭐

**Por qué es importante:** Los logros mantienen a los jugadores enganchados con objetivos claros.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model Achievement {
  id          String   @id @default(cuid())
  key         String   // "first_mine", "craft_10_items", "defeat_100_mobs"
  name        String
  description String
  icon        String?
  category    String   // "mining", "crafting", "combat", "economy"

  // Requisitos para desbloquear (JSON flexible)
  requirements Json    // { type: "mine_count", value: 100 }

  // Recompensas al desbloquear
  rewards      Json?   // { coins: 500, items: [...], title: "..." }

  guildId      String?
  guild        Guild?  @relation(fields: [guildId], references: [id])

  // Logros desbloqueados por usuarios
  unlocked     PlayerAchievement[]

  hidden       Boolean @default(false) // logros secretos

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([guildId, key])
}

model PlayerAchievement {
  id            String   @id @default(cuid())
  userId        String
  guildId       String
  achievementId String

  user        User        @relation(fields: [userId], references: [id])
  guild       Guild       @relation(fields: [guildId], references: [id])
  achievement Achievement @relation(fields: [achievementId], references: [id])

  unlockedAt DateTime @default(now())
  metadata   Json?     // datos extra como progreso

  @@unique([userId, guildId, achievementId])
  @@index([userId, guildId])
}
```

**Comandos sugeridos:**
- `!logros` - Ver tus logros desbloqueados y progreso
- `!logros @usuario` - Ver logros de otro usuario
- `!logro-crear <key>` - Crear nuevo logro (admin)
- `!ranking-logros` - Ver quién tiene más logros

**Ejemplos de logros:**
- 🎖️ **Primera Mina**: Mina por primera vez
- ⛏️ **Minero Novato**: Mina 50 veces
- ⛏️ **Minero Veterano**: Mina 500 veces
- 🎣 **Pescador Experto**: Pesca 100 veces
- ⚔️ **Cazador de Monstruos**: Derrota 100 mobs
- 💰 **Millonario**: Acumula 1,000,000 monedas
- 🛠️ **Maestro Craftero**: Craftea 100 items
- 📦 **Coleccionista**: Ten 50 items únicos
- 🗡️ **Arsenal Completo**: Equipa arma, armadura y capa legendarias

---

### 2. 📊 **Sistema de Estadísticas Detalladas** ⭐⭐⭐⭐

**Por qué es importante:** A los jugadores les gusta ver su progreso en números.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model PlayerStats {
  id      String @id @default(cuid())
  userId  String
  guildId String

  // Stats de minijuegos
  minesCompleted      Int @default(0)
  fishingCompleted    Int @default(0)
  fightsCompleted     Int @default(0)
  farmsCompleted      Int @default(0)

  // Stats de combate
  mobsDefeated        Int @default(0)
  damageDealt         Int @default(0)
  damageTaken         Int @default(0)

  // Stats de economía
  totalCoinsEarned    Int @default(0)
  totalCoinsSpent     Int @default(0)
  itemsCrafted        Int @default(0)
  itemsSmelted        Int @default(0)

  // Stats de items
  chestsOpened        Int @default(0)
  itemsConsumed       Int @default(0)

  // Récords personales
  highestDamageDealt  Int @default(0)
  longestWinStreak    Int @default(0)

  user  User  @relation(fields: [userId], references: [id])
  guild Guild @relation(fields: [guildId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, guildId])
}
```

**Comando sugerido:**
```
!stats [@usuario]
```

Muestra:
- Total de actividades realizadas
- Mobs derrotados
- Monedas ganadas/gastadas
- Items crafteados
- Récords personales

---

### 3. 🎁 **Sistema de Misiones Diarias/Semanales** ⭐⭐⭐⭐⭐

**Por qué es importante:** Mantiene a los jugadores volviendo cada día.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model Quest {
  id          String   @id @default(cuid())
  key         String
  name        String
  description String
  icon        String?

  // Tipo de misión
  type        String   // "daily", "weekly", "event"
  category    String   // "mining", "combat", "economy"

  // Requisitos
  requirements Json    // { type: "mine", count: 10 }

  // Recompensas
  rewards      Json    // { coins: 500, items: [...], xp: 100 }

  // Disponibilidad
  startAt     DateTime?
  endAt       DateTime?

  guildId     String?
  guild       Guild?   @relation(fields: [guildId], references: [id])

  progress    QuestProgress[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([guildId, key])
}

model QuestProgress {
  id       String @id @default(cuid())
  userId   String
  guildId  String
  questId  String

  progress   Int     @default(0) // progreso actual
  completed  Boolean @default(false)
  claimed    Boolean @default(false) // si ya reclamó recompensa

  user   User  @relation(fields: [userId], references: [id])
  guild  Guild @relation(fields: [guildId], references: [id])
  quest  Quest @relation(fields: [questId], references: [id])

  completedAt DateTime?
  claimedAt   DateTime?
  expiresAt   DateTime? // para misiones diarias/semanales

  @@unique([userId, guildId, questId])
  @@index([userId, guildId])
}
```

**Comandos sugeridos:**
- `!misiones` - Ver misiones disponibles y progreso
- `!mision-reclamar <id>` - Reclamar recompensa de misión completada
- `!mision-crear <key>` - Crear nueva misión (admin)

**Ejemplos de misiones diarias:**
- ⛏️ Mina 10 veces (Recompensa: 500 monedas)
- 🎣 Pesca 5 veces (Recompensa: 3 cañas)
- ⚔️ Derrota 15 mobs (Recompensa: poción de vida)
- 🛒 Compra 3 items de la tienda (Recompensa: 10% descuento)
- 🛠️ Craftea 5 items (Recompensa: materiales extra)

---

### 4. 🏪 **Comando de Tienda Mejorado** ⭐⭐⭐⭐⭐

**Lo que falta actualmente:**
- Solo tienes `!comprar <offerId>` que requiere saber el ID
- No hay forma visual de ver la tienda
- No hay categorías ni filtros
- No hay vista previa de items

**Voy a crear un comando completo con DisplayComponents** ⬇️

---

### 5. 🎲 **Sistema de Eventos Temporales** ⭐⭐⭐⭐

**Por qué es importante:** Crea urgencia y mantiene el contenido fresco.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model Event {
  id          String   @id @default(cuid())
  key         String
  name        String
  description String
  icon        String?

  // Configuración del evento
  config      Json?    // multiplicadores, drops especiales, etc.

  // Items/áreas/mobs específicos del evento
  specialItems String[] // keys de items que solo aparecen en evento

  // Fechas
  startAt     DateTime
  endAt       DateTime

  guildId     String?
  guild       Guild?   @relation(fields: [guildId], references: [id])

  active      Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([guildId, key])
}
```

**Ejemplos de eventos:**
- 🎃 **Halloween:** Mobs especiales, items de Halloween, drops x2
- 🎄 **Navidad:** Cofres navideños, items temáticos, monedas x1.5
- 🐰 **Pascua:** Huevos de Pascua escondidos, mobs conejos
- 💘 **San Valentín:** Items de amor, crafteos especiales

**Comando sugerido:**
```
!eventos
```
Muestra eventos activos con tiempo restante y recompensas especiales.

---

### 6. 🔄 **Sistema de Intercambio entre Jugadores** ⭐⭐⭐⭐

**Por qué es importante:** Fomenta la economía entre jugadores.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model Trade {
  id String @id @default(cuid())

  // Jugador que inicia el trade
  initiatorId String
  initiator   User   @relation("TradeInitiator", fields: [initiatorId], references: [id])

  // Jugador que recibe la oferta
  targetId    String
  target      User   @relation("TradeTarget", fields: [targetId], references: [id])

  guildId     String
  guild       Guild  @relation(fields: [guildId], references: [id])

  // Ofertas de ambos jugadores (JSON)
  initiatorOffer Json // { coins: 100, items: [{ key, qty }] }
  targetOffer    Json // { coins: 50, items: [{ key, qty }] }

  status String // "pending", "accepted", "rejected", "expired", "completed"

  createdAt  DateTime @default(now())
  expiresAt  DateTime
  completedAt DateTime?

  @@index([initiatorId, targetId, guildId])
}
```

**Comandos sugeridos:**
- `!tradear @usuario` - Iniciar intercambio
- `!trade-ofrecer <coins|item:key:qty>` - Añadir a tu oferta
- `!trade-aceptar` - Aceptar intercambio
- `!trade-cancelar` - Cancelar intercambio

---

### 7. 🏘️ **Sistema de Guilds/Clanes** ⭐⭐⭐⭐⭐

**Por qué es importante:** Fomenta el trabajo en equipo y competencia.

**Implementación sugerida:**

```typescript
// prisma/schema.prisma
model PlayerGuild {
  id          String   @id @default(cuid())
  name        String
  tag         String   // [TAG]
  description String?
  icon        String?

  leaderId    String
  leader      User     @relation(fields: [leaderId], references: [id])

  guildId     String   // Discord guild
  discordGuild Guild  @relation(fields: [guildId], references: [id])

  // Stats del clan
  level       Int      @default(1)
  xp          Int      @default(0)

  // Recursos del clan
  treasury    Int      @default(0) // monedas compartidas

  members     PlayerGuildMember[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([guildId, tag])
}

model PlayerGuildMember {
  id            String @id @default(cuid())
  userId        String
  playerGuildId String

  user         User        @relation(fields: [userId], references: [id])
  playerGuild  PlayerGuild @relation(fields: [playerGuildId], references: [id])

  rank         String      @default("member") // "leader", "officer", "member"
  contribution Int         @default(0) // contribución total

  joinedAt     DateTime    @default(now())

  @@unique([userId, playerGuildId])
}
```

**Comandos sugeridos:**
- `!clan-crear <nombre> <tag>` - Crear clan
- `!clan-info [@clan]` - Ver info del clan
- `!clan-invitar @usuario` - Invitar a clan
- `!clan-donar <cantidad>` - Donar al tesoro
- `!clan-ranking` - Ver ranking de clanes
- `!clan-buffs` - Buffs activos del clan

**Beneficios de clanes:**
- Buffs compartidos (XP+10%, drops+5%, etc.)
- Almacén compartido
- Misiones de clan con recompensas grupales
- Guerras entre clanes
- Ranking de clanes

---

### 8. 🎰 **Sistema de Ruleta/Lotería** ⭐⭐⭐

**Por qué es importante:** Da emoción y oportunidades de ganar grande.

**Comando sugerido:**
```
!ruleta <apuesta>
```

- Cuesta monedas
- Puede dar: monedas x2, x5, x10, items raros, o perder todo
- Cooldown de 1 hora

---

### 9. 🏠 **Sistema de Viviendas/Bases** ⭐⭐⭐⭐

**Por qué es importante:** Personalización y progresión a largo plazo.

**Características:**
- Cada jugador puede tener una casa
- Mejoras de casa (nivel 1-10)
- Almacén extra por nivel
- Decoraciones
- Buffs pasivos (+5% XP, -10% cooldowns, etc.)
- Costo de mantenimiento semanal

---

### 10. 🔥 **Sistema de Racha (Streaks)** ⭐⭐⭐⭐

**Por qué es importante:** Incentiva jugar todos los días.

**Implementación:**
```typescript
model PlayerStreak {
  id       String @id @default(cuid())
  userId   String
  guildId  String

  currentStreak  Int @default(0)
  longestStreak  Int @default(0)
  lastActiveDate DateTime

  user  User  @relation(fields: [userId], references: [id])
  guild Guild @relation(fields: [guildId], references: [id])

  @@unique([userId, guildId])
}
```

**Recompensas por racha:**
- Día 1: 100 monedas
- Día 3: 300 monedas + cofre básico
- Día 7: 1000 monedas + cofre raro
- Día 14: 3000 monedas + cofre épico
- Día 30: 10000 monedas + item legendario

---

## 🐛 Bugs y Mejoras Técnicas Detectadas

### 1. **Sistema de Cooldowns**
**Problema:** Los cooldowns están dispersos por actividad.
**Mejora:** Centralizar en una función helper que muestre todos los cooldowns activos de un usuario.

```typescript
// src/game/cooldowns/service.ts
export async function getUserActiveCooldowns(userId: string, guildId: string) {
  const cds = await prisma.actionCooldown.findMany({
    where: { userId, guildId, until: { gt: new Date() } },
    orderBy: { until: 'asc' }
  });

  return cds.map(cd => ({
    key: cd.key,
    remaining: Math.ceil((cd.until.getTime() - Date.now()) / 1000),
    expiresAt: cd.until
  }));
}
```

### 2. **Validación de Props en Items**
**Mejora:** Añadir validación TypeScript más estricta para props de items.

```typescript
// src/game/economy/validators.ts
export function validateItemProps(props: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (props.tool) {
    if (!['pickaxe', 'rod', 'sword', 'bow', 'halberd', 'net'].includes(props.tool.type)) {
      errors.push(`Invalid tool type: ${props.tool.type}`);
    }
    if (props.tool.tier && (props.tool.tier < 1 || props.tool.tier > 10)) {
      errors.push(`Tool tier must be between 1-10`);
    }
  }

  if (props.damage && props.damage < 0) {
    errors.push(`Damage cannot be negative`);
  }

  // ... más validaciones

  return { valid: errors.length === 0, errors };
}
```

### 3. **Sistema de Paginación Mejorado**
**Mejora:** Crear componente reutilizable para paginación en todos los comandos.

```typescript
// src/core/lib/pagination.ts
export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  const end = start + perPage;

  return {
    items: items.slice(start, end),
    page: safePage,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    total: items.length
  };
}
```

### 4. **Logs y Auditoría**
**Mejora:** Añadir sistema de logs para operaciones importantes.

```typescript
// prisma/schema.prisma
model AuditLog {
  id       String   @id @default(cuid())
  userId   String
  guildId  String
  action   String   // "buy", "craft", "trade", "equip", etc.
  target   String?  // ID del item/mob/área afectado
  details  Json?    // detalles adicionales

  user   User   @relation(fields: [userId], references: [id])
  guild  Guild  @relation(fields: [guildId], references: [id])

  createdAt DateTime @default(now())

  @@index([userId, guildId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 📝 Prioridades Recomendadas

### Alta Prioridad (Implementar Ya)
1. ✅ **Comando de Tienda con DisplayComponents** (lo voy a crear)
2. 🏆 **Sistema de Logros**
3. 🎁 **Misiones Diarias**
4. 🔥 **Sistema de Rachas**

### Media Prioridad (Próximos Sprints)
5. 📊 **Estadísticas Detalladas**
6. 🏘️ **Sistema de Clanes**
7. 🎲 **Eventos Temporales**

### Baja Prioridad (Largo Plazo)
8. 🔄 **Intercambio entre Jugadores**
9. 🏠 **Sistema de Viviendas**
10. 🎰 **Ruleta/Lotería**

---

## 🎨 Mejoras de UX/UI

### 1. Mensajes más Visuales
Usar más DisplayComponents en lugar de texto plano:
- `!inventario` → DisplayComponents con imágenes
- `!player` → DisplayComponents con stats visuales
- `!tienda` → DisplayComponents con preview de items

### 2. Botones Interactivos
Añadir botones en lugar de comandos:
- `!mina` → Añadir botones "Minar Otra Vez", "Ver Inventario"
- `!pelear` → Añadir botones "Pelear de Nuevo", "Equipar Mejor Arma"
- `!tienda` → Añadir botones de compra directa

### 3. Confirmaciones
Añadir confirmaciones para acciones importantes:
- Comprar items caros
- Fundir items
- Eliminar items

---

## 🎯 Conclusión

Tu bot tiene una **base excelente y muy completa**. Las sugerencias principales son:

1. **Más engagement:** Logros, misiones, rachas
2. **Más social:** Clanes, trades, rankings
3. **Más visual:** DisplayComponents en todos lados
4. **Más feedback:** Stats, logs, notificaciones

---

## 🛠️ Comandos Sugeridos para Implementar

### Comandos de Sistema de Logros
```typescript
// src/commands/messages/game/logros.ts
export const command: CommandMessage = {
  name: 'logros',
  aliases: ['achievements', 'logro'],
  description: 'Ver tus logros y progreso',
  usage: 'logros [@usuario]',
  // ... implementación
};

// src/commands/messages/admin/logro-crear.ts
export const command: CommandMessage = {
  name: 'logro-crear',
  description: 'Crear un nuevo logro',
  usage: 'logro-crear <key>',
  // Usar editor interactivo similar a areaCreate.ts
};
```

### Comandos de Misiones
```typescript
// src/commands/messages/game/misiones.ts
export const command: CommandMessage = {
  name: 'misiones',
  aliases: ['quests', 'mision'],
  description: 'Ver misiones disponibles y tu progreso',
  usage: 'misiones [categoria]',
  // Usar DisplayComponents para mostrar misiones visuales
};

// src/commands/messages/game/mision-reclamar.ts
export const command: CommandMessage = {
  name: 'mision-reclamar',
  aliases: ['claim-quest'],
  description: 'Reclamar recompensa de misión completada',
  usage: 'mision-reclamar <questId>',
};
```

### Comandos de Estadísticas
```typescript
// src/commands/messages/game/stats.ts
export const command: CommandMessage = {
  name: 'stats',
  aliases: ['estadisticas', 'statistics'],
  description: 'Ver estadísticas detalladas de un jugador',
  usage: 'stats [@usuario]',
  // Mostrar con DisplayComponents estilo tarjeta
};

// src/commands/messages/game/ranking-stats.ts
export const command: CommandMessage = {
  name: 'ranking-stats',
  aliases: ['top-stats'],
  description: 'Ver ranking de jugadores por estadísticas',
  usage: 'ranking-stats [categoria]',
  // Categorías: minas, pesca, combate, monedas, etc.
};
```

### Comandos de Tienda Mejorada
```typescript
// src/commands/messages/game/tienda.ts
export const command: CommandMessage = {
  name: 'tienda',
  aliases: ['shop', 'store'],
  description: 'Ver la tienda del servidor con interfaz visual',
  usage: 'tienda [categoria] [pagina]',
  // Usar DisplayComponents con:
  // - Categorías en botones
  // - Paginación
  // - Botones de compra rápida
  // - Preview de items con stats
};
```

### Comandos de Rachas
```typescript
// src/commands/messages/game/racha.ts
export const command: CommandMessage = {
  name: 'racha',
  aliases: ['streak', 'daily'],
  description: 'Ver tu racha diaria y reclamar recompensa',
  usage: 'racha',
  // Auto-incrementa si jugaste hoy
  // Muestra recompensa del día
};
```

### Comandos de Cooldowns
```typescript
// src/commands/messages/game/cooldowns.ts
export const command: CommandMessage = {
  name: 'cooldowns',
  aliases: ['cds', 'tiempos'],
  description: 'Ver todos tus cooldowns activos',
  usage: 'cooldowns',
  // Lista todos los cooldowns con tiempo restante
};
```

---

## 🔧 Servicios a Crear

### 1. Achievement Service
```typescript
// src/game/achievements/service.ts

export async function checkAchievements(
  userId: string, 
  guildId: string, 
  trigger: string
) {
  // Verificar logros desbloqueables basados en el trigger
  // Triggers: "mine", "fish", "combat", "craft", etc.
  // Retornar array de logros nuevos desbloqueados
}

export async function unlockAchievement(
  userId: string,
  guildId: string,
  achievementKey: string
) {
  // Desbloquear logro
  // Dar recompensas
  // Crear notificación
}

export async function getAchievementProgress(
  userId: string,
  guildId: string,
  achievementKey: string
) {
  // Calcular progreso actual del logro
  // Retornar porcentaje y valores
}
```

### 2. Quest Service
```typescript
// src/game/quests/service.ts

export async function generateDailyQuests(guildId: string) {
  // Generar misiones diarias aleatorias
  // Llamar cada día a medianoche
}

export async function updateQuestProgress(
  userId: string,
  guildId: string,
  questType: string,
  increment: number = 1
) {
  // Actualizar progreso de misiones activas
  // Completar automáticamente si alcanza el objetivo
}

export async function claimQuestReward(
  userId: string,
  guildId: string,
  questId: string
) {
  // Verificar que esté completada
  // Dar recompensas
  // Marcar como reclamada
}
```

### 3. Stats Service
```typescript
// src/game/stats/service.ts

export async function updateStats(
  userId: string,
  guildId: string,
  updates: Partial<PlayerStats>
) {
  // Actualizar stats del jugador
  // Verificar récords
  // Llamar desde otros servicios
}

export async function getLeaderboard(
  guildId: string,
  category: string,
  limit: number = 10
) {
  // Obtener top jugadores en una categoría
  // Categorías: totalMines, mobsDefeated, coinsEarned, etc.
}
```

### 4. Streak Service
```typescript
// src/game/streaks/service.ts

export async function updateStreak(
  userId: string,
  guildId: string
) {
  // Actualizar racha diaria
  // Resetear si pasó más de 1 día
  // Retornar recompensa del día
}

export async function getStreakReward(day: number) {
  // Calcular recompensa según el día de racha
  // Escalar recompensas por día
}
```

---

## 📊 Mejoras al Código Existente

### 1. Centralizar Manejo de Recompensas
```typescript
// src/game/rewards/service.ts

export interface Reward {
  coins?: number;
  items?: Array<{ key: string; quantity: number }>;
  xp?: number;
  title?: string;
}

export async function giveRewards(
  userId: string,
  guildId: string,
  rewards: Reward,
  source: string // "achievement", "quest", "streak", etc.
) {
  const results = [];
  
  if (rewards.coins) {
    await adjustCoins(userId, guildId, rewards.coins);
    results.push(`💰 ${rewards.coins} monedas`);
  }
  
  if (rewards.items) {
    for (const item of rewards.items) {
      await addItemByKey(userId, guildId, item.key, item.quantity);
      results.push(`📦 ${item.quantity}x ${item.key}`);
    }
  }
  
  // Log para auditoría
  await prisma.auditLog.create({
    data: {
      userId,
      guildId,
      action: 'reward_given',
      target: source,
      details: rewards
    }
  });
  
  return results;
}
```

### 2. Mejorar Sistema de Notificaciones
```typescript
// src/core/lib/notifications.ts

export async function notifyAchievement(
  user: User,
  guild: Guild,
  achievement: Achievement
) {
  // Enviar DM al usuario
  // O mensaje en canal específico
  // Con DisplayComponents mostrando el logro
}

export async function notifyQuestComplete(
  user: User,
  guild: Guild,
  quest: Quest
) {
  // Notificar que puede reclamar recompensa
}
```

### 3. Helpers para DisplayComponents
```typescript
// src/core/lib/display-helpers.ts

export function createItemCard(item: EconomyItem): DisplayComponent {
  return {
    type: 'container',
    layout: 'vertical',
    components: [
      {
        type: 'image',
        url: item.iconUrl || 'default-item.png',
        alt: item.name
      },
      {
        type: 'text',
        content: `**${item.name}**\n${item.description}`,
        style: 'bold'
      },
      {
        type: 'text',
        content: `💰 ${item.basePrice} monedas`,
        style: 'muted'
      }
    ]
  };
}

export function createProgressBar(
  current: number,
  total: number,
  width: number = 10
): string {
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${current}/${total}`;
}

export function createStatCard(
  title: string,
  stats: Record<string, number>
): DisplayComponent {
  return {
    type: 'embed',
    title: title,
    fields: Object.entries(stats).map(([key, value]) => ({
      name: key,
      value: value.toString(),
      inline: true
    }))
  };
}
```

---

## 🎮 Integración con Sistema Existente

### Hooks en Comandos Existentes

Añadir estas llamadas a los comandos que ya tienes:

```typescript
// En src/commands/messages/game/mina.ts
import { updateStats } from '../../../game/stats/service';
import { updateQuestProgress } from '../../../game/quests/service';
import { checkAchievements } from '../../../game/achievements/service';

// Después de minar exitosamente:
await updateStats(userId, guildId, { minesCompleted: 1 });
await updateQuestProgress(userId, guildId, 'mine', 1);
const newAchievements = await checkAchievements(userId, guildId, 'mine');

// Similar en pescar.ts, pelear.ts, craftear.ts, etc.
```

### Cron Jobs para Sistema de Misiones

```typescript
// src/core/cron/daily-reset.ts
import cron from 'node-cron';

export function setupDailyReset() {
  // Ejecutar cada día a medianoche (hora del servidor)
  cron.schedule('0 0 * * *', async () => {
    const guilds = await prisma.guild.findMany();
    
    for (const guild of guilds) {
      // Generar nuevas misiones diarias
      await generateDailyQuests(guild.id);
      
      // Limpiar misiones expiradas
      await cleanExpiredQuests(guild.id);
      
      // Actualizar rachas
      // (se actualizan automáticamente al usar comandos)
    }
  });
}
```

---

## 📈 Métricas y Analytics

### Tracking de Uso
```typescript
// src/core/analytics/tracker.ts

export async function trackCommand(
  userId: string,
  guildId: string,
  commandName: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      guildId,
      action: 'command_used',
      target: commandName,
      details: { timestamp: new Date() }
    }
  });
}

export async function getCommandStats(guildId: string, days: number = 7) {
  // Obtener comandos más usados
  // Usuarios más activos
  // Horas pico de uso
}
```

---

## 🚀 Plan de Implementación Sugerido

### Fase 1: Engagement Básico (Sprint 1-2)
1. ✅ Implementar `PlayerStats` y servicio
2. ✅ Añadir tracking en comandos existentes
3. ✅ Crear comando `!stats`
4. ✅ Crear comando `!cooldowns`

### Fase 2: Sistema de Logros (Sprint 3-4)
1. ✅ Implementar Achievement Service
2. ✅ Crear logros básicos (10-15)
3. ✅ Integrar checks en comandos
4. ✅ Crear comando `!logros`
5. ✅ Sistema de notificaciones

### Fase 3: Misiones Diarias (Sprint 5-6)
1. ✅ Implementar Quest System
2. ✅ Crear misiones diarias/semanales
3. ✅ Cron job para reset diario
4. ✅ Comandos de misiones
5. ✅ UI con DisplayComponents

### Fase 4: Rachas y Recompensas (Sprint 7)
1. ✅ Implementar Streak System
2. ✅ Comando `!racha` con recompensas
3. ✅ Integrar con sistema de recompensas

### Fase 5: Tienda Mejorada (Sprint 8)
1. ✅ Refactorizar comando tienda
2. ✅ DisplayComponents avanzados
3. ✅ Categorías y filtros
4. ✅ Compra rápida con botones

### Fase 6: Rankings y Social (Sprint 9-10)
1. ✅ Rankings por categorías
2. ✅ Leaderboards globales
3. ✅ Sistema de menciones/comparación

---

## 🎨 Ejemplos Visuales de DisplayComponents

### Logro Desbloqueado
```typescript
{
  type: 'embed',
  color: 0xFFD700, // Dorado
  title: '🏆 ¡Logro Desbloqueado!',
  description: '**Primera Mina**\nHas minado por primera vez',
  thumbnail: 'achievement-first-mine.png',
  fields: [
    {
      name: '💰 Recompensa',
      value: '500 monedas',
      inline: true
    },
    {
      name: '📊 Progreso',
      value: '1/100 logros',
      inline: true
    }
  ],
  footer: 'Usa !logros para ver todos tus logros'
}
```

### Misión Completada
```typescript
{
  type: 'embed',
  color: 0x00FF00, // Verde
  title: '✅ Misión Completada!',
  description: '**Minero Diario**\nMina 10 veces',
  fields: [
    {
      name: '📦 Recompensas',
      value: '• 1000 monedas\n• 3x Pico de Hierro\n• 50 XP',
      inline: false
    }
  ],
  components: [
    {
      type: 'button',
      label: 'Reclamar',
      style: 'success',
      customId: 'claim_quest_123'
    }
  ]
}
```

### Stats del Jugador
```typescript
{
  type: 'embed',
  color: 0x5865F2, // Discord Blurple
  title: '📊 Estadísticas de @Usuario',
  thumbnail: 'user-avatar.png',
  fields: [
    { name: '⛏️ Minas', value: '234', inline: true },
    { name: '🎣 Pesca', value: '156', inline: true },
    { name: '⚔️ Combates', value: '89', inline: true },
    { name: '💰 Monedas Ganadas', value: '456,789', inline: true },
    { name: '🛠️ Items Crafteados', value: '67', inline: true },
    { name: '👾 Mobs Derrotados', value: '423', inline: true },
    { name: '🏆 Logros', value: '23/100', inline: true },
    { name: '🔥 Racha Actual', value: '12 días', inline: true },
    { name: '⭐ Nivel', value: '15', inline: true }
  ],
  footer: 'Jugando desde: 15 Ene 2024'
}
```

---

## 💡 Tips de Optimización

### 1. Caché para Queries Frecuentes
```typescript
import { Cache } from 'node-cache';

const leaderboardCache = new Cache({ stdTTL: 300 }); // 5 minutos

export async function getCachedLeaderboard(guildId: string, category: string) {
  const cacheKey = `leaderboard:${guildId}:${category}`;
  
  let data = leaderboardCache.get(cacheKey);
  if (data) return data;
  
  data = await getLeaderboard(guildId, category);
  leaderboardCache.set(cacheKey, data);
  
  return data;
}
```

### 2. Batch Updates para Stats
```typescript
// En lugar de actualizar cada stat individualmente
// Acumular y hacer update único al final del comando

const statsUpdates = {
  minesCompleted: 1,
  totalCoinsEarned: reward
};

await updateStats(userId, guildId, statsUpdates);
```

### 3. Índices en Prisma
Ya los tienes definidos, asegúrate de que estén aplicados:
```bash
npx prisma migrate dev
```

---

## 🎯 Checklist de Implementación

### Antes de Empezar
- [ ] Backup de la base de datos
- [ ] Branch nueva en Git
- [ ] Revisar modelos de Prisma actuales
- [ ] Planificar migraciones

### Durante Implementación
- [ ] Tests unitarios para servicios nuevos
- [ ] Documentar APIs internas
- [ ] Validación de inputs
- [ ] Manejo de errores
- [ ] Logs apropiados

### Después de Implementar
- [ ] Pruebas en servidor de desarrollo
- [ ] Code review
- [ ] Actualizar documentación de usuario
- [ ] Deploy gradual
- [ ] Monitorear métricas

---

## 📚 Recursos Adicionales

### Documentación Útil
- [Discord.js Guide](https://discordjs.guide/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Discord Interactions](https://discord.com/developers/docs/interactions/overview)

### Herramientas Recomendadas
- **Bull/BullMQ**: Para cron jobs y queues
- **node-cache**: Para caché en memoria
- **zod**: Para validación de schemas
- **winston**: Para logging avanzado

---

## ✨ Conclusión Final

Tu proyecto **Amayo** es impresionante y tiene todos los componentes base necesarios. Con estas mejoras sugeridas, puedes convertirlo en un bot de economía y RPG de nivel profesional que mantenga a los usuarios enganchados por meses.

Las prioridades recomendadas son:

**Inmediato (Semana 1-2):**
- Sistema de Stats completo
- Comando cooldowns
- Mejorar comando tienda

**Corto Plazo (Mes 1):**
- Sistema de logros básico
- Misiones diarias
- Sistema de rachas

**Mediano Plazo (Mes 2-3):**
- Sistema de clanes
- Eventos temporales
- Trading entre jugadores

¡Mucho éxito con el desarrollo! 🚀
