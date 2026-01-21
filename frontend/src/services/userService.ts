import api from './api';

export const userService = {
  async list() {
    const response = await api.get('/users');
    return response.data;
  },
  async create(payload: { email: string; name: string; password: string; role?: string; orgRole?: string }) {
    const response = await api.post('/users', payload);
    return response.data;
  },
  async update(id: string, payload: { name?: string; role?: string; password?: string; orgRole?: string }) {
    const response = await api.patch(`/users/${id}`, payload);
    return response.data;
  },
};
