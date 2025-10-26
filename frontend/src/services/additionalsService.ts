import api from './api';

export const additionalsService = {
  async getProjectAdditionals(projectId: string) {
    const response = await api.get(`/additionals/project/${projectId}`);
    return response.data;
  },

  async processAdditionals(projectId: string, data: any) {
    const response = await api.post(`/additionals/project/${projectId}/process`, data);
    return response.data;
  },

  async updateAdditional(id: string, data: any) {
    const response = await api.put(`/additionals/${id}`, data);
    return response.data;
  },

  async deleteAdditional(id: string) {
    const response = await api.delete(`/additionals/${id}`);
    return response.data;
  },

  async getBusinessRules() {
    const response = await api.get('/additionals/rules');
    return response.data;
  },

  async updateBusinessRule(id: string, data: any) {
    const response = await api.put(`/additionals/rules/${id}`, data);
    return response.data;
  }
};
