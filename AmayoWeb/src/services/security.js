// Security Configuration Service
// Este servicio maneja la configuración de seguridad del cliente
// y protege el acceso al backend

class SecurityService {
  constructor() {
    this.initialized = false;
    this.sessionToken = null;
    this.apiEndpoint = null;
  }

  // Inicializar configuración de seguridad
  async initialize() {
    if (this.initialized) return;

    try {
      // En producción, obtener configuración del servidor de forma segura
      // Esto evita hardcodear URLs en el código del cliente
      if (import.meta.env.PROD) {
        // Obtener configuración inicial del servidor mediante un endpoint público
        // que solo devuelve información necesaria sin revelar detalles del backend
        const config = await this.fetchSecureConfig();
        this.apiEndpoint = config.endpoint;
      } else {
        // En desarrollo, usar localhost
        this.apiEndpoint = 'http://localhost:3000/api';
      }

      // Generar un token de sesión único
      this.sessionToken = this.generateSessionToken();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      throw error;
    }
  }

  // Obtener configuración segura del servidor
  async fetchSecureConfig() {
    // Este endpoint debe estar protegido con Cloudflare y rate limiting
    // y solo devolver el endpoint de API sin revelar la IP del servidor
    const response = await fetch('/.well-known/api-config.json', {
      headers: {
        'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API configuration');
    }

    return await response.json();
  }

  // Generar token de sesión único
  generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Obtener el endpoint de la API de forma segura
  getApiEndpoint() {
    if (!this.initialized) {
      throw new Error('Security service not initialized');
    }
    return this.apiEndpoint;
  }

  // Obtener headers de seguridad para requests
  getSecurityHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Token': this.sessionToken,
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Agregar timestamp para prevenir replay attacks
    headers['X-Timestamp'] = Date.now().toString();

    // Agregar auth token si existe
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
  }

  // Validar respuesta del servidor
  validateResponse(response) {
    // Verificar headers de seguridad en la respuesta
    const serverToken = response.headers.get('X-Server-Token');
    if (!serverToken) {
      console.warn('Missing server security token');
    }

    return response;
  }

  // Limpiar datos sensibles
  clearSensitiveData() {
    this.sessionToken = null;
    this.apiEndpoint = null;
    this.initialized = false;
  }
}

// Exportar instancia singleton
export const securityService = new SecurityService();

// Rate limiting client-side
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      default: { maxRequests: 10, windowMs: 60000 }, // 10 requests por minuto
      auth: { maxRequests: 3, windowMs: 60000 }, // 3 intentos de login por minuto
      api: { maxRequests: 30, windowMs: 60000 }, // 30 API calls por minuto
    };
  }

  canMakeRequest(endpoint, type = 'default') {
    const now = Date.now();
    const key = `${type}:${endpoint}`;
    const limit = this.limits[type] || this.limits.default;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key);
    
    // Limpiar requests antiguos
    const validRequests = requests.filter(
      timestamp => now - timestamp < limit.windowMs
    );

    this.requests.set(key, validRequests);

    // Verificar si se puede hacer el request
    if (validRequests.length >= limit.maxRequests) {
      return false;
    }

    // Registrar nuevo request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  getRemainingTime(endpoint, type = 'default') {
    const key = `${type}:${endpoint}`;
    const requests = this.requests.get(key) || [];
    
    if (requests.length === 0) return 0;

    const limit = this.limits[type] || this.limits.default;
    const oldestRequest = Math.min(...requests);
    const timeUntilReset = limit.windowMs - (Date.now() - oldestRequest);

    return Math.max(0, timeUntilReset);
  }
}

export const rateLimiter = new RateLimiter();
