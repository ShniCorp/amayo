# Sistema de Gestión de Puntos del Leaderboard

## 📋 Descripción

Se ha implementado un sistema completo de gestión de puntos administrativos para el comando `leaderboard`. Los administradores ahora pueden modificar los puntos de cualquier usuario directamente desde el leaderboard.

## 🎯 Características Implementadas

### 1. **Botón de Gestión de Puntos** (Solo para Administradores)
- Aparece únicamente para usuarios con permiso `ManageGuild`
- Se muestra junto al botón "Refrescar" en el leaderboard
- Emoji: ⚙️
- Label: "Gestionar Puntos"

### 2. **Select Menu de Usuarios**
- Muestra hasta 25 usuarios con más puntos en el servidor
- Cada opción muestra:
  - Nombre del usuario
  - Puntos totales, semanales y mensuales actuales
- Ordenado por puntos totales (descendente)

### 3. **Modal de Modificación de Puntos**
- Tres campos de entrada opcionales:
  - **Puntos Totales**
  - **Puntos Semanales**
  - **Puntos Mensuales**

#### Sintaxis de Modificación:
- `+50` → Añade 50 puntos
- `-25` → Quita 25 puntos
- `=100` → Establece exactamente 100 puntos
- `100` → Establece exactamente 100 puntos (sin símbolo)

### 4. **Confirmación Visual**
- Embed con código de color verde
- Muestra los valores antes y después del cambio
- Incluye timestamp y nombre del administrador que hizo el cambio
- Mensaje efímero (solo visible para el administrador)

## 📁 Archivos Creados

```
src/components/
├── buttons/
│   ├── ldManagePoints.ts       ← Botón principal de gestión
│   └── ldRefresh.ts            ← Actualizado para mostrar botón admin
├── selectmenus/
│   └── ldSelectUser.ts         ← Select menu para elegir usuario
└── modals/
    └── ldPointsModal.ts        ← Modal para modificar puntos
```

## 🔒 Seguridad

### Verificaciones de Permisos:
1. **En el leaderboard**: Solo muestra el botón si el usuario tiene `ManageGuild`
2. **En el botón**: Verifica permisos antes de mostrar el select menu
3. **En el modal**: Verifica permisos antes de modificar la base de datos

### Validaciones:
- Los puntos no pueden ser negativos (mínimo: 0)
- Se requiere al menos un campo con valor para procesar
- Manejo de errores en todas las etapas
- Logs detallados de errores

## 🚀 Cómo Usar

### Para Administradores:

1. **Ejecuta el comando leaderboard:**
   ```
   !leaderboard
   ```
   o
   ```
   !ld
   ```

2. **Verás el botón "⚙️ Gestionar Puntos"**
   - Click en el botón

3. **Selecciona el usuario del menú desplegable**
   - Muestra nombre y estadísticas actuales

4. **Ingresa los cambios en el modal:**
   - Ejemplos:
     - Puntos Totales: `+100` (añade 100)
     - Puntos Semanales: `-50` (quita 50)
     - Puntos Mensuales: `=75` (establece a 75)

5. **Confirma el cambio**
   - Verás un embed con los valores actualizados
   - El leaderboard se puede refrescar para ver los cambios

### Para Usuarios Normales:
- Solo verán el botón "Refrescar"
- No tienen acceso a la gestión de puntos

## 🔄 Flujo del Sistema

```
Usuario Admin presiona "Gestionar Puntos"
    ↓
Sistema verifica permisos
    ↓
Muestra lista de usuarios con puntos (Select Menu)
    ↓
Admin selecciona un usuario
    ↓
Se abre modal con 3 campos de entrada
    ↓
Admin ingresa modificaciones (+/-/=)
    ↓
Sistema actualiza la base de datos
    ↓
Muestra embed de confirmación
    ↓
Admin puede refrescar el leaderboard para ver cambios
```

## 💾 Cambios en Base de Datos

### Modelo `PartnershipStats`:
- Se modifica directamente el registro existente
- Si no existe, se crea uno nuevo con valores base en 0
- Campos modificables:
  - `totalPoints`
  - `weeklyPoints`
  - `monthlyPoints`

## 📊 Ejemplo de Uso

### Caso 1: Añadir puntos de bonificación
```
Usuario: "Juan"
Puntos actuales: 150
Acción: +50 en Puntos Totales
Resultado: 200 puntos totales
```

### Caso 2: Corregir error de conteo
```
Usuario: "María"
Puntos semanales: 85
Acción: =80 en Puntos Semanales
Resultado: 80 puntos semanales
```

### Caso 3: Penalización
```
Usuario: "Pedro"
Puntos mensuales: 120
Acción: -30 en Puntos Mensuales
Resultado: 90 puntos mensuales
```

## ⚠️ Notas Importantes

1. **Los cambios son inmediatos** y afectan todas las tablas del leaderboard
2. **No hay sistema de deshacer** - confirma antes de aplicar cambios
3. **Los puntos mínimos son 0** - no pueden ser negativos
4. **Límite de 25 usuarios** en el select menu (limitación de Discord)
5. **Todos los mensajes son efímeros** - solo el admin los ve

## 🧪 Testing

Para probar el sistema:
1. Asegúrate de tener permisos de `ManageGuild`
2. Ejecuta `!leaderboard`
3. Verifica que aparezca el botón de gestión
4. Prueba modificar puntos de un usuario de prueba
5. Refresca el leaderboard para ver los cambios

## 🐛 Troubleshooting

**Problema:** No veo el botón de gestión
- **Solución:** Verifica que tengas permisos de administrador del servidor

**Problema:** El select menu está vacío
- **Solución:** Asegúrate de que haya al menos un usuario con puntos en el servidor

**Problema:** Los cambios no se reflejan
- **Solución:** Presiona el botón "Refrescar" para actualizar el leaderboard

## 📝 Logs

Todos los errores se registran con:
```typescript
logger.error({ err: e }, 'Descripción del error')
```

Los logs incluyen:
- Errores al cargar usuarios
- Errores al procesar selecciones
- Errores al actualizar puntos en la base de datos

