import api from './api';
import { AccessoryPreset } from '@/types';

export const accessoryPresetService = {
  async getAll(): Promise<AccessoryPreset[]> {
    const response = await api.get('/accessory-presets');
    return response.data;
  },

  async create(data: Partial<AccessoryPreset>): Promise<AccessoryPreset> {
    const response = await api.post('/accessory-presets', data);
    return response.data;
  },

  async update(id: string, data: Partial<AccessoryPreset>): Promise<AccessoryPreset> {
    const response = await api.put(`/accessory-presets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/accessory-presets/${id}`);
  },
};
