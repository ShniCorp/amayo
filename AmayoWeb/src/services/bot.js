import axios from 'axios'
import { securityService, rateLimiter } from './security'

// Inicializar servicio de seguridad
await securityService.initialize().catch(err => {
  console.error('Failed to initialize security:', err)
})

// Crear instancia de axios con configuración de seguridad
const createSecureAxios = () => {
  const instance = axios.create({
    timeout: 10000,
    headers: securityService.getSecurityHeaders()
  })

  instance.interceptors.request.use(
    config => {
      config.headers = {
        ...config.headers,
        ...securityService.getSecurityHeaders()
      }
      return config
    },
    error => Promise.reject(error)
  )

  instance.interceptors.response.use(
    response => securityService.validateResponse(response),
    error => Promise.reject(error)
  )

  return instance
}

const secureAxios = createSecureAxios()

const getApiUrl = (path) => {
  try {
    const baseUrl = securityService.getApiEndpoint()
    return `${baseUrl}${path}`
  } catch (error) {
    console.error('Failed to get API URL:', error)
    throw new Error('API service unavailable')
  }
}

export const botService = {
  // Obtener estadísticas del bot
  async getStats() {
    // Rate limiting
    if (!rateLimiter.canMakeRequest('/bot/stats', 'api')) {
      console.warn('Rate limit reached for bot stats')
      return this.getCachedStats()
    }

    try {
      const response = await secureAxios.get(getApiUrl('/bot/stats'))
      
      // Cachear los resultados
      this.cacheStats(response.data)
      
      return response.data
    } catch (error) {
      console.error('Error fetching bot stats:', error)
      
      // Retornar stats cacheadas si falló la petición
      return this.getCachedStats() || {
        servers: 0,
        users: 0,
        commands: 0
      }
    }
  },

  // Obtener información del bot (nombre, avatar, etc.)
  async getBotInfo() {
    // Rate limiting
    if (!rateLimiter.canMakeRequest('/bot/info', 'api')) {
      return this.getCachedBotInfo()
    }

    try {
      const response = await secureAxios.get(getApiUrl('/bot/info'))
      
      // Cachear info del bot
      this.cacheBotInfo(response.data)
      
      return response.data
    } catch (error) {
      console.error('Error fetching bot info:', error)
      return this.getCachedBotInfo()
    }
  },

  // Sistema de caché para stats
  cacheStats(stats) {
    try {
      const cacheData = {
        data: stats,
        timestamp: Date.now(),
        expiresIn: 5 * 60 * 1000 // 5 minutos
      }
      sessionStorage.setItem('bot_stats_cache', JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to cache stats:', error)
    }
  },

  getCachedStats() {
    try {
      const cached = sessionStorage.getItem('bot_stats_cache')
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      const isExpired = Date.now() - cacheData.timestamp > cacheData.expiresIn

      if (isExpired) {
        sessionStorage.removeItem('bot_stats_cache')
        return null
      }

      return cacheData.data
    } catch (error) {
      console.error('Failed to get cached stats:', error)
      return null
    }
  },

  // Sistema de caché para bot info
  cacheBotInfo(info) {
    try {
      const cacheData = {
        data: info,
        timestamp: Date.now(),
        expiresIn: 60 * 60 * 1000 // 1 hora
      }
      sessionStorage.setItem('bot_info_cache', JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to cache bot info:', error)
    }
  },

  getCachedBotInfo() {
    try {
      const cached = sessionStorage.getItem('bot_info_cache')
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      const isExpired = Date.now() - cacheData.timestamp > cacheData.expiresIn

      if (isExpired) {
        sessionStorage.removeItem('bot_info_cache')
        return null
      }

      return cacheData.data
    } catch (error) {
      console.error('Failed to get cached bot info:', error)
      return null
    }
  },

  // Formato de números para mostrar (1200 -> 1.2K)
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }
}
