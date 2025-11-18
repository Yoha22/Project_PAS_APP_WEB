import apiClient from './api.js';

export const alarmasService = {
  async getAll(page = 1) {
    const response = await apiClient.get('/alarmas', {
      params: { page },
    });
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/alarmas', data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/alarmas/${id}`);
    return response.data;
  },
};

