import axios from 'axios'

const API_URL = import.meta.env.PROD 
  ? 'https://api.amayo.dev/api' 
  : 'http://localhost:3000/api'

export const authService = {
  // Redirigir al usuario a Discord OAuth2
  loginWithDiscord() {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    const redirectUri = import.meta.env.PROD 
      ? 'https://docs.amayo.dev/auth/callback' 
      : 'http://localhost:5173/auth/callback'
    
    const scope = 'identify guilds'
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`
    
    window.location.href = authUrl
  },

  // Intercambiar código por token
  async handleCallback(code) {
    try {
      const response = await axios.post(`${API_URL}/auth/discord/callback`, { code })
      const { token, user } = response.data
      
      // Guardar token en localStorage
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return { token, user }
    } catch (error) {
      console.error('Error during authentication:', error)
      throw error
    }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const token = localStorage.getItem('authToken')
    if (!token) return null

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching user:', error)
      this.logout()
      return null
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/'
  },

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('authToken')
  },

  // Obtener token
  getToken() {
    return localStorage.getItem('authToken')
  }
}
