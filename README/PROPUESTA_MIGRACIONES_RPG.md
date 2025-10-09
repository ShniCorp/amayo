# Propuesta de Migraciones Futuras del Sistema RPG

Estado base: el esquema actual cubre economía, minijuegos, efectos de estado, rachas, logros, quests y death log. Para la siguiente fase (robustecer balance, trazabilidad y escalabilidad en tiempo real) se plantean las siguientes migraciones y extensiones.

## 1. Logging y Telemetría de Equipo / Herramientas

### 1.1 Tabla ToolBreakLog

Motivación: hoy el log de ruptura de instancias de herramientas está sólo en memoria.

```prisma
model ToolBreakLog {
  id        String   @id @default(cuid())
  userId    String
  guildId   String
  itemKey   String // referencia lógica; no necesitamos FK dura a EconomyItem para evitar cascadas.
  instance  Int?    // índice o identificador lógico de la instancia rota (si aplica)
  maxDurability Int?
  remainingDurability Int? // antes de romper (o 0)
  totalInstancesRemaining Int?
  reason    String? // "durability_zero" | "manual_discard" | etc
  metadata  Json?
  createdAt DateTime @default(now())

  // Índices para consultas analíticas
  @@index([userId, guildId])
  @@index([itemKey])
  @@index([createdAt])
}
```

### 1.2 Tabla CombatEncounter (Normalizada)

Motivación: `MinigameRun.result` mezcla recompensas y combate en JSON opaco. Extraer una capa estructurada permite queries analíticas (DPS promedio, distribución de rondas, etc.).

```prisma
model CombatEncounter {
  id          String   @id @default(cuid())
  runId       String   @unique // FK 1-1 con MinigameRun
  userId      String
  guildId     String
  areaId      String?
  level       Int?
  victory     Boolean
  mobsDefeated Int     @default(0)
  totalDamageDealt  Int @default(0)
  totalDamageTaken  Int @default(0)
  autoDefeatNoWeapon Boolean @default(false)
  deathGoldLost      Int @default(0)
  deathPercentApplied Float @default(0)
  fatigueMagnitude   Float? // replicado para analíticas rápidas
  durationMs   Int? // futuro: tiempo total (si medimos timestamps por ronda)
  createdAt    DateTime @default(now())

  // Índices clave
  @@index([userId, guildId])
  @@index([areaId])
  @@index([createdAt])
}
```

### 1.3 Tabla CombatRound / CombatMobLog (detallado opcional)

Sólo si se necesita analítica profunda.

```prisma
model CombatMobLog {
  id          String  @id @default(cuid())
  encounterId String
  mobKey      String
  maxHp       Int
  defeated    Boolean
  totalDamageDealt Int @default(0)
  totalDamageTakenFromMob Int @default(0)
  rounds Json // [{ round, playerDamageDealt, playerDamageTaken, mobRemainingHp }]
  createdAt DateTime @default(now())

  @@index([encounterId])
  @@index([mobKey])
}
```

(Alternativa: normalizar rounds en tabla `CombatRound` con FK a `CombatMobLog` si se requiere agregación muy granular.)

## 2. Efectos de Estado Avanzados

### 2.1 Cambios en PlayerStatusEffect

- Eliminar `@@unique([userId, guildId, type])` para permitir stacking OR introducir campo `stackGroup`.
- Añadir campos:

```prisma
  source       String? // itemKey, abilityId, areaEffect
  stackingRule String? // "STACK", "REFRESH_DURATION", "IGNORE" (evaluado en servicio)
  maxStacks    Int?    // para limitar acumulación
  currentStack Int?    // si se maneja colapsado
```

### 2.2 Tabla EffectApplicationLog (opcional)

Auditar quién/qué aplicó o purgó efectos.

```prisma
model EffectApplicationLog {
  id        String  @id @default(cuid())
  userId    String
  guildId   String
  type      String
  action    String // apply|refresh|expire|purge
  source    String? // itemKey|system|deathPenalty
  magnitude Float?
  durationMinutes Int?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, guildId])
  @@index([type])
  @@index([createdAt])
}
```

## 3. Economía y Balance

### 3.1 Soft References para Drops/Mobs

Actualmente `Mob.drops` es JSON. Futuro: tabla `MobDrop` con pesos para consultar/ajustar sin actualizar JSON masivo.

```prisma
model MobDrop {
  id      String @id @default(cuid())
  mobId   String
  itemKey String
  weight  Int @default(1)
  minQty  Int @default(1)
  maxQty  Int @default(1)
  metadata Json?

  mob Mob @relation(fields: [mobId], references: [id])
  @@index([mobId])
  @@index([itemKey])
}
```

### 3.2 Tabla AreaMob (override de tabla de mobs a nivel área+nivel)

Si se requiere override dinámico sin editar JSON en `GameAreaLevel.mobs`.

```prisma
model AreaMob {
  id       String @id @default(cuid())
  areaId   String
  level    Int
  mobKey   String
  weight   Int @default(1)
  metadata Json?

  area GameArea @relation(fields: [areaId], references: [id])
  @@index([areaId, level])
  @@index([mobKey])
}
```

## 4. Escalado y Eventos en Tiempo Real (Appwrite / Realtime)

### 4.1 Propuesta Appwrite Functions

- Scheduler para procesar `ScheduledMobAttack` (trigger cada minuto). Migrar lógica actual Node a función aislada.
- Function para purgar efectos expirados (scan `PlayerStatusEffect.expiresAt < now()`), evitando hacerlo on-demand.

### 4.2 Realtime Streams

- Canal: `deathlog.{guildId}` -> push entradas nuevas de `DeathLog`.
- Canal: `effects.{userId}.{guildId}` -> cambios en efectos (aplicación / expiración / purga).
Requiere wrapper que escuche events (webhook o poll) y publique a Appwrite Realtime.

## 5. Índices de Performance Recomendados

| Área | Tabla | Índice sugerido | Motivo |
| ---- | ----- | --------------- | ------ |
| Combate | DeathLog | (guildId, createdAt DESC) | Listados recientes por servidor |
| Economía | InventoryEntry | (guildId, userId) ya existe, añadir (itemId) | Búsquedas de stock masivas |
| Efectos | PlayerStatusEffect | (expiresAt) ya existe, añadir (guildId, expiresAt) | Sweep eficiente por servidor |
| Runs | MinigameRun | (guildId, areaId, startedAt DESC) | Historial filtrado por área |

## 6. Estrategia Evolutiva de Migraciones

Orden sugerido (minimiza locking y pasos de refactor):

1. ToolBreakLog (aditivo, sin tocar lógica actual) => empezar a registrar.
2. CombatEncounter + (opcional) CombatMobLog: poblar en paralelo mientras se mantiene JSON original (doble escritura). Periodo sombra 1-2 semanas.
3. PlayerStatusEffect flexibilizar stacking (quitar unique) + campos extra. Hacer migración en ventana corta; script que colapsa duplicados previos.
4. MobDrop / AreaMob (sólo si se requiere UI de balance). Inicialmente poblar desde JSON existente via script.
5. EffectApplicationLog (si se necesita auditoría de buffs/debuffs).
6. Limpieza: remover campos redundantes del JSON `MinigameRun.result.combat` cuando dashboards confirmen que CombatEncounter cubre todas las consultas.

## 7. Retro-llenado (Backfill) y Scripts

- Backfill CombatEncounter: recorrer últimas N (ej. 30k) filas de `MinigameRun` y extraer métricas simples.
- Backfill ToolBreakLog: NO retroactivo (aceptable) — iniciar desde migración.
- Backfill MobDrop / AreaMob: script que lee `GameAreaLevel.mobs` y crea registros.

## 8. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| Doble escritura inconsistente (MinigameRun vs CombatEncounter) | Datos divergentes | Wrap en transacción; test de integridad periódico |
| Explosión filas CombatMobLog | Coste almacenamiento | Gate: habilitar sólo en áreas high-value; TTL archivado |
| Contención en barridos de expiración efectos | Latencia | Índice compuesto (guildId, expiresAt) y paginación |
| Cambios stacking efectos rompen lógica actual | Buffs perdidos o duplicados | Feature flag: mantener unique hasta terminar servicio stacking |

## 9. Campos / Cambios Pequeños Inmediatos (Fast Wins)

- Añadir `PlayerStatusEffect.source` para trazabilidad rápida (sin romper unique aún).
- Añadir índice `DeathLog (guildId, createdAt)` compuesto (sólo `createdAt` existe). Actualmente ya hay `@@index([createdAt])` y `@@index([userId, guildId])`; considerar `@@index([guildId, createdAt])` para consultas por servidor.

## 10. Roadmap Resumido

T0 (ahora): Aprobar diseño.
T1 (24-48h): ToolBreakLog + índice DeathLog compuesto.
T2 (Semana 1): CombatEncounter sombra + script backfill parcial.
T3 (Semana 2): Stacking efectos (remover unique + nuevos campos) bajo flag.
T4 (Semana 3): MobDrop / AreaMob si se confirma necesidad de balance fino.
T5 (Semana 4): Limpieza JSON y dashboards.

---

Cualquier punto se puede profundizar; este documento sirve como guía de implementación incremental evitando big-bang.
