import axios from 'axios'

const API_URL = import.meta.env.PROD 
  ? 'https://api.amayo.dev' 
  : 'http://localhost:3001'

export const botService = {
  // Obtener estadísticas del bot
  async getStats() {
    try {
      const response = await axios.get(`${API_URL}/api/bot/stats`)
      return response.data
    } catch (error) {
      console.error('Error fetching bot stats:', error)
      // Retornar valores por defecto en caso de error
      return {
        servers: 0,
        users: 0,
        commands: 0
      }
    }
  },

  // Obtener información del bot (nombre, avatar, etc.)
  async getBotInfo() {
    try {
      const response = await axios.get(`${API_URL}/api/bot/info`)
      return response.data
    } catch (error) {
      console.error('Error fetching bot info:', error)
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
