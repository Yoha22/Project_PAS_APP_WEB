import apiClient from './api.js';

export const authService = {
  async checkAdmin() {
    try {
      const response = await apiClient.get('/auth/check-admin');
      return response.data;
    } catch (error) {
      console.error('Error verificando administrador:', error);
      throw error;
    }
  },

  async register(data) {
    try {
      const response = await apiClient.post('/auth/register', data);
      if (response.data.success && response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token);
      }
      return response.data;
    } catch (error) {
      // Propagar el error para que login.html pueda manejarlo
      throw error;
    }
  },

  async login(data) {
    try {
      console.log('🔐 Iniciando login con datos:', { correo: data.correo, password: '***' });
      const response = await apiClient.post('/auth/login', data);
      console.log('✅ Respuesta de login recibida:', response);
      console.log('📦 Datos de respuesta:', response.data);
      
      // Verificar y guardar el token
      if (response.data && response.data.success && response.data.data && response.data.data.token) {
        const token = response.data.data.token;
        localStorage.setItem('auth_token', token);
        console.log('🔑 Token guardado en localStorage');
        console.log('🔑 Token verificado después de guardar:', !!localStorage.getItem('auth_token'));
        console.log('🔑 Primeros 20 caracteres del token:', token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ La respuesta no contiene el formato esperado:', response.data);
        console.warn('⚠️ Estructura de respuesta:', {
          hasData: !!response.data,
          hasSuccess: !!response.data?.success,
          hasDataData: !!response.data?.data,
          hasToken: !!response.data?.data?.token
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error en authService.login:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config
      });
      // Propagar el error para que login.html pueda manejarlo
      throw error;
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      localStorage.removeItem('auth_token');
      // Usar ruta completa para asegurar que funcione en cualquier contexto
      window.location.replace(window.location.origin + '/login.html');
    }
  },

  async me() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      // Si falla la autenticación, limpiar token
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
      }
      throw error;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  clearToken() {
    localStorage.removeItem('auth_token');
  },
};

