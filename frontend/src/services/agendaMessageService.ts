import api from './api';

export const agendaMessageService = {
  async list(eventId: string) {
    const response = await api.get(`/agenda/${eventId}/messages`);
    return response.data;
  },

  async create(
    eventId: string,
    body: string,
    visibility?: 'ALL' | 'ADMIN_ONLY',
    images?: File[]
  ) {
    if (images && images.length > 0) {
      const formData = new FormData();
      formData.append('body', body);
      if (visibility) formData.append('visibility', visibility);
      images.forEach((file) => formData.append('images', file));
      const response = await api.post(`/agenda/${eventId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await api.post(`/agenda/${eventId}/messages`, { body, visibility });
    return response.data;
  },
};
