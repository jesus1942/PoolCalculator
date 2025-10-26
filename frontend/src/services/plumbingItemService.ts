import api from './api';

export interface PlumbingItem {
  id: string;
  name: string;
  category: 'PIPE' | 'FITTING' | 'VALVE' | 'ACCESSORY';
  type: 'PVC' | 'FUSION_FUSION' | 'FUSION_ROSCA' | 'POLIPROPILENO' | 'COBRE' | 'OTHER';
  diameter?: string;
  length?: number;
  unit: string;
  pricePerUnit: number;
  brand?: string;
  description?: string;
}

export const plumbingItemService = {
  async getAll(params?: { search?: string; category?: string; type?: string }): Promise<PlumbingItem[]> {
    const response = await api.get('/plumbing-items', { params });
    return response.data;
  },

  async create(data: Partial<PlumbingItem>): Promise<PlumbingItem> {
    const response = await api.post('/plumbing-items', data);
    return response.data;
  },

  async update(id: string, data: Partial<PlumbingItem>): Promise<PlumbingItem> {
    const response = await api.put(`/plumbing-items/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/plumbing-items/${id}`);
  },
};
