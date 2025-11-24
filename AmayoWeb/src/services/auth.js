import axios from 'axios'
import { securityService, rateLimiter } from './security'

// Inicializar servicio de seguridad
await securityService.initialize().catch(err => {
  console.error('Failed to initialize security:', err)
})

// Crear instancia de axios con configuración de seguridad
const createSecureAxios = () => {
  const instance = axios.create({
    timeout: 10000, // 10 segundos timeout
    headers: securityService.getSecurityHeaders()
  })

  // Interceptor para agregar headers de seguridad
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

  // Interceptor para validar respuestas
  instance.interceptors.response.use(
    response => securityService.validateResponse(response),
    error => {
      // Manejar errores de forma segura
      if (error.response?.status === 429) {
        console.error('Rate limit exceeded')
      }
      return Promise.reject(error)
    }
  )

  return instance
}

const secureAxios = createSecureAxios()

// No exponer la URL directamente - usar el servicio de seguridad
const getApiUrl = (path) => {
  try {
    const baseUrl = securityService.getApiEndpoint()
    return `${baseUrl}${path}`
  } catch (error) {
    console.error('Failed to get API URL:', error)
    throw new Error('API service unavailable')
  }
}

export const authService = {
  // Redirigir al usuario a Discord OAuth2
  loginWithDiscord() {
    // Rate limiting para prevenir abuso
    if (!rateLimiter.canMakeRequest('/auth/discord', 'auth')) {
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime('/auth/discord', 'auth') / 1000)
      throw new Error(`Too many login attempts. Please wait ${remainingTime} seconds.`)
    }

    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    if (!clientId) {
      throw new Error('Discord client ID not configured')
    }

    const redirectUri = import.meta.env.PROD 
      ? window.location.origin + '/auth/callback'
      : 'http://localhost:5173/auth/callback'
    
    const scope = 'identify guilds'
    const state = securityService.generateSessionToken() // CSRF protection
    
    // Guardar state para validación
    sessionStorage.setItem('oauth_state', state)
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`
    
    window.location.href = authUrl
  },

  // Intercambiar código por token
  async handleCallback(code, state) {
    // Validar state para prevenir CSRF
    const savedState = sessionStorage.getItem('oauth_state')
    if (state !== savedState) {
      throw new Error('Invalid OAuth state - possible CSRF attack')
    }
    sessionStorage.removeItem('oauth_state')

    // Rate limiting
    if (!rateLimiter.canMakeRequest('/auth/callback', 'auth')) {
      throw new Error('Too many authentication attempts')
    }

    try {
      const response = await secureAxios.post(
        getApiUrl('/auth/discord/callback'),
        { code, state }
      )
      
      const { token, user } = response.data
      
      if (!token || !user) {
        throw new Error('Invalid authentication response')
      }
      
      // Guardar token de forma segura
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return { token, user }
    } catch (error) {
      console.error('Authentication error:', error)
      throw new Error('Authentication failed')
    }
  },

  // Obtener usuario actual
  async getCurrentUser() {
    const token = localStorage.getItem('authToken')
    if (!token) return null

    // Rate limiting
    if (!rateLimiter.canMakeRequest('/auth/me', 'api')) {
      throw new Error('Too many requests')
    }

    try {
      const response = await secureAxios.get(getApiUrl('/auth/me'))
      return response.data
    } catch (error) {
      console.error('Error fetching user:', error)
      
      // Si el token es inválido, hacer logout
      if (error.response?.status === 401) {
        this.logout()
      }
      
      return null
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    securityService.clearSensitiveData()
    window.location.href = '/'
  },

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const token = localStorage.getItem('authToken')
    if (!token) return false

    // Validar que el token no esté expirado (básico)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp && payload.exp * 1000 < Date.now()
      
      if (isExpired) {
        this.logout()
        return false
      }
      
      return true
    } catch {
      return !!token // Fallback si no se puede decodificar
    }
  },

  // Obtener token
  getToken() {
    return localStorage.getItem('authToken')
  }
}
