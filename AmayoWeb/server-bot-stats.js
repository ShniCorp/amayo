/**
 * Ejemplo de integración con Discord.js para obtener estadísticas reales
 * 
 * Este archivo muestra cómo conectar tu backend Express con tu bot de Discord
 * para obtener estadísticas en tiempo real.
 * 
 * INSTALACIÓN:
 * npm install discord.js
 */

import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import cors from 'cors';

const app = express();

// Crear cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

// Login del bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Cuando el bot esté listo
client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Configuración CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://docs.amayo.dev' 
    : 'http://localhost:5173'
}));

app.use(express.json());

/**
 * Endpoint para obtener estadísticas reales del bot
 */
app.get('/api/bot/stats', async (req, res) => {
  try {
    // Verificar que el bot esté conectado
    if (!client.isReady()) {
      return res.status(503).json({ 
        error: 'Bot is not connected',
        servers: 0,
        users: 0,
        commands: 0
      });
    }

    // Obtener número de servidores
    const serverCount = client.guilds.cache.size;

    // Obtener número total de usuarios únicos
    let totalUsers = 0;
    client.guilds.cache.forEach(guild => {
      totalUsers += guild.memberCount;
    });

    // Obtener número de comandos
    // Opción 1: Si usas slash commands
    const commandCount = client.application?.commands.cache.size || 0;
    
    // Opción 2: Si tienes un registro de comandos personalizado
    // const commandCount = Object.keys(yourCommandsObject).length;

    // Responder con las estadísticas
    res.json({
      servers: serverCount,
      users: totalUsers,
      commands: commandCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching bot stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bot stats',
      servers: 0,
      users: 0,
      commands: 0
    });
  }
});

/**
 * Endpoint para información detallada del bot
 */
app.get('/api/bot/info', async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not connected' });
    }

    res.json({
      name: client.user.username,
      id: client.user.id,
      avatar: client.user.displayAvatarURL({ size: 256 }),
      discriminator: client.user.discriminator,
      tag: client.user.tag,
      createdAt: client.user.createdAt,
      uptime: process.uptime(),
      ping: client.ws.ping
    });

  } catch (error) {
    console.error('Error fetching bot info:', error);
    res.status(500).json({ error: 'Failed to fetch bot info' });
  }
});

/**
 * Endpoint para obtener el top de servidores (opcional)
 */
app.get('/api/bot/top-guilds', async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot is not connected' });
    }

    const topGuilds = client.guilds.cache
      .sort((a, b) => b.memberCount - a.memberCount)
      .first(10)
      .map(guild => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL({ size: 128 })
      }));

    res.json(topGuilds);

  } catch (error) {
    console.error('Error fetching top guilds:', error);
    res.status(500).json({ error: 'Failed to fetch top guilds' });
  }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    botConnected: client.isReady(),
    timestamp: new Date().toISOString() 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});

// Manejo de errores del bot
client.on('error', error => {
  console.error('Discord client error:', error);
});

client.on('warn', warning => {
  console.warn('Discord client warning:', warning);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('Closing bot connection...');
  client.destroy();
  process.exit(0);
});

export { client, app };
