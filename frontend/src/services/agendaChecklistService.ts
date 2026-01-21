import api from './api';

export const agendaChecklistService = {
  async list(eventId: string) {
    const response = await api.get(`/agenda/${eventId}/checklist`);
    return response.data;
  },

  async add(eventId: string, label: string) {
    const response = await api.post(`/agenda/${eventId}/checklist`, { label });
    return response.data;
  },

  async update(eventId: string, itemId: string, data: { label?: string; done?: boolean }) {
    const response = await api.patch(`/agenda/${eventId}/checklist/${itemId}`, data);
    return response.data;
  },

  async remove(eventId: string, itemId: string) {
    const response = await api.delete(`/agenda/${eventId}/checklist/${itemId}`);
    return response.data;
  },
};
