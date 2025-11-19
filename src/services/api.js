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
    
    // Agregar token a las peticiones
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login.html';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

