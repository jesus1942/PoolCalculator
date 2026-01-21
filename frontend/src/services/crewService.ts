import api from './api';

export const crewService = {
  async list() {
    const response = await api.get('/crews');
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/crews', data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/crews/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/crews/${id}`);
    return response.data;
  },

  async addMember(id: string, userId: string) {
    const response = await api.post(`/crews/${id}/members`, { userId });
    return response.data;
  },

  async removeMember(id: string, memberId: string) {
    const response = await api.delete(`/crews/${id}/members/${memberId}`);
    return response.data;
  },
};
