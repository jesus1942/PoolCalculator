import api from './api';
import { ConstructionMaterialPreset } from '@/types';

export const constructionMaterialService = {
  async getAll(): Promise<ConstructionMaterialPreset[]> {
    const response = await api.get('/construction-materials');
    return response.data;
  },

  async create(data: Partial<ConstructionMaterialPreset>): Promise<ConstructionMaterialPreset> {
    const response = await api.post('/construction-materials', data);
    return response.data;
  },

  async update(id: string, data: Partial<ConstructionMaterialPreset>): Promise<ConstructionMaterialPreset> {
    const response = await api.put(`/construction-materials/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/construction-materials/${id}`);
  },
};
