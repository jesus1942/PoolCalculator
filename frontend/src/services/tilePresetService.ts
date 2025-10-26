import api from './api';
import { TilePreset } from '@/types';

export const tilePresetService = {
  async getAll(): Promise<TilePreset[]> {
    const response = await api.get('/tile-presets');
    return response.data;
  },

  async create(data: Partial<TilePreset>): Promise<TilePreset> {
    const response = await api.post('/tile-presets', data);
    return response.data;
  },

  async update(id: string, data: Partial<TilePreset>): Promise<TilePreset> {
    const response = await api.put(`/tile-presets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tile-presets/${id}`);
  },
};
