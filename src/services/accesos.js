import apiClient from './api.js';

export const accesosService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/accesos', { params });
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/accesos', data);
    return response.data;
  },

  async getStats(mes = null) {
    const params = mes ? { mes } : {};
    const response = await apiClient.get('/accesos/stats', { params });
    return response.data;
  },
};

