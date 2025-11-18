import apiClient from './api.js';

export const dispositivosService = {
  async getAll() {
    const response = await apiClient.get('/dispositivos');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/dispositivos/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/dispositivos', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.put(`/dispositivos/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/dispositivos/${id}`);
    return response.data;
  },

  async generateRegistrationCode() {
    const response = await apiClient.post('/dispositivos/generate-code');
    return response.data;
  },

  async revokeToken(id) {
    const response = await apiClient.post(`/dispositivos/${id}/revoke-token`);
    return response.data;
  },
};

