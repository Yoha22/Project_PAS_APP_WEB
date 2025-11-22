import axios from 'axios';

// En desarrollo, usar el proxy de Vite para evitar problemas de CORS
// En producción, usar la variable de entorno VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : (import.meta.env.DEV ? '/api' : 'https://project-pas-api.onrender.com/api');

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Necesario para enviar cookies (CSRF token)
});

// Interceptor para asegurar que las rutas siempre usen el baseURL
// Si la ruta comienza con '/', la convierte a relativa para que use baseURL
apiClient.interceptors.request.use(
  (config) => {
    // Si la URL comienza con '/', convertirla a relativa (sin '/')
    // Esto asegura que siempre use el baseURL configurado
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }
    
    // Construir la URL final para logging
    const finalURL = config.baseURL 
      ? `${config.baseURL}${config.url ? '/' + config.url : ''}`.replace(/\/+/g, '/').replace(':/', '://')
      : config.url;
    
    // Logging siempre para debugging (especialmente si VITE_API_URL no está definida)
    console.log(`🌐 Petición API: ${config.method?.toUpperCase()} ${finalURL}`);
    if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
      console.warn('⚠️ VITE_API_URL no está definida. Usando fallback:', config.baseURL);
    }
    
    // Agregar token a las peticiones si existe
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token agregado a la petición');
    } else {
      // Si no hay token y la ruta requiere autenticación, loguear advertencia
      const requiresAuth = !config.url.includes('/auth/check-admin') && 
                          !config.url.includes('/auth/register') && 
                          !config.url.includes('/auth/login');
      if (requiresAuth) {
        console.warn('⚠️ Petición sin token de autenticación:', config.url);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => {
    // Logging de respuestas exitosas
    console.log(`✅ Respuesta API recibida: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Logging detallado de errores
    console.error('❌ Error en interceptor de respuesta:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null,
      request: error.request ? {
        status: error.request.status,
        readyState: error.request.readyState,
        responseURL: error.request.responseURL
      } : null,
      config: error.config ? {
        method: error.config.method,
        url: error.config.url,
        baseURL: error.config.baseURL
      } : null
    });
    
    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      console.warn('🔒 Error 401: Token inválido o expirado');
      localStorage.removeItem('auth_token');
      
      // Solo redirigir si no estamos ya en la página de login
      if (!window.location.pathname.includes('login.html')) {
        console.log('🔄 Redirigiendo a login...');
        window.location.href = '/login.html';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

