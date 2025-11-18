import apiClient from './api.js';

export const usuariosService = {
  async getAll(page = 1, perPage = 5) {
    const response = await apiClient.get('/usuarios', {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/usuarios/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/usuarios', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.put(`/usuarios/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/usuarios/${id}`);
    return response.data;
  },
};

