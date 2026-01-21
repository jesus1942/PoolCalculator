import api from './api';

export const agendaService = {
  async list(params?: Record<string, any>) {
    const response = await api.get('/agenda', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/agenda/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/agenda', data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/agenda/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/agenda/${id}`);
    return response.data;
  },
};
