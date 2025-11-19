import apiClient from './api.js';

export const authService = {
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
      
      if (response.data && response.data.success && response.data.data && response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token);
        console.log('🔑 Token guardado en localStorage');
      } else {
        console.warn('⚠️ La respuesta no contiene el formato esperado:', response.data);
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
      window.location.href = '/login.html';
    }
  },

  async me() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },
};

