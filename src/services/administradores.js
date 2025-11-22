import apiClient from './api.js';

export const administradoresService = {
  async getAll() {
    const response = await apiClient.get('/administradores');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/administradores/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/administradores', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.put(`/administradores/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/administradores/${id}`);
    return response.data;
  },
};

