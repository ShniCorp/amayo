/**
 * Servidor Express para manejar la autenticación de Discord OAuth2
 * 
 * INSTALACIÓN:
 * npm install express axios cors dotenv jsonwebtoken
 * 
 * CONFIGURACIÓN:
 * Crear archivo .env con:
 * DISCORD_CLIENT_ID=tu_client_id
 * DISCORD_CLIENT_SECRET=tu_client_secret
 * JWT_SECRET=tu_secret_para_jwt
 * PORT=3000
 */

import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://docs.amayo.dev' 
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://docs.amayo.dev/auth/callback'
  : 'http://localhost:5173/auth/callback';

/**
 * Endpoint para intercambiar código OAuth2 por token
 */
app.post('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // 1. Intercambiar código por access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // 2. Obtener información del usuario
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const discordUser = userResponse.data;

    // 3. Obtener guilds del usuario (servidores)
    const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const guilds = guildsResponse.data;

    // 4. Crear JWT token para tu aplicación
    const user = {
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.avatar,
      email: discordUser.email,
      guilds: guilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        permissions: g.permissions
      }))
    };

    const token = jwt.sign(
      { userId: discordUser.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Aquí puedes guardar el usuario en tu base de datos
    // await saveUserToDatabase(user);

    res.json({
      token,
      user,
      discord: {
        access_token,
        refresh_token,
        expires_in
      }
    });

  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.response?.data?.error_description || error.message
    });
  }
});

/**
 * Endpoint para obtener usuario actual (protegido)
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Aquí puedes obtener el usuario de tu base de datos
    // const user = await getUserFromDatabase(req.userId);
    
    res.json({
      id: req.userId,
      // ...otros datos del usuario
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Endpoint para refrescar el token de Discord
 */
app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const response = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Middleware para autenticar requests con JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Endpoint para obtener estadísticas del bot
 * Conecta con tu cliente de Discord para obtener datos reales
 */
app.get('/api/bot/stats', async (req, res) => {
  try {
    // AQUÍ debes conectar con tu bot de Discord
    // Ejemplo usando discord.js client:
    // const client = getDiscordClient(); // Tu función para obtener el cliente
    
    // Por ahora retornamos valores de ejemplo
    // Reemplaza esto con los valores reales de tu bot
    const stats = {
      servers: 1234,        // client.guilds.cache.size
      users: 50000,         // client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)
      commands: 150         // número de comandos registrados
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching bot stats:', error);
    res.status(500).json({ error: 'Failed to fetch bot stats' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Redirect URI: ${REDIRECT_URI}`);
});

export default app;
