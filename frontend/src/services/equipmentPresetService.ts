import api from './api';
import { EquipmentPreset } from '@/types';

export const equipmentPresetService = {
  async getAll(): Promise<EquipmentPreset[]> {
    const response = await api.get('/equipment-presets');
    return response.data;
  },

  async create(data: Partial<EquipmentPreset>): Promise<EquipmentPreset> {
    const response = await api.post('/equipment-presets', data);
    return response.data;
  },

  async update(id: string, data: Partial<EquipmentPreset>): Promise<EquipmentPreset> {
    const response = await api.put(`/equipment-presets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/equipment-presets/${id}`);
  },
};
