import apiClient from './api.js';

export const huellasService = {
  async register(data) {
    const response = await apiClient.post('/huellas', data);
    return response.data;
  },

  async getTemporal() {
    const response = await apiClient.get('/huellas/temporal');
    return response.data;
  },
};

