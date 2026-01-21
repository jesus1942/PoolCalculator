import api from './api';

export const agendaReminderService = {
  async listDue() {
    const response = await api.get('/agenda/reminders');
    return response.data;
  },

  async snooze(id: string, minutes: number) {
    const response = await api.post(`/agenda/reminders/${id}/snooze`, { minutes });
    return response.data;
  },

  async dismiss(id: string) {
    const response = await api.post(`/agenda/reminders/${id}/dismiss`);
    return response.data;
  },
};
