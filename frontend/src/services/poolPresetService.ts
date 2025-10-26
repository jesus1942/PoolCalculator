import api from './api';
import { PoolPreset, CalculationResult } from '@/types';

export const poolPresetService = {
  async getAll(): Promise<PoolPreset[]> {
    const response = await api.get('/pool-presets');
    return response.data;
  },

  async getById(id: string): Promise<PoolPreset> {
    const response = await api.get(`/pool-presets/${id}`);
    return response.data;
  },

  async create(data: Partial<PoolPreset>, image?: File, additionalImages?: File[]): Promise<PoolPreset> {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (image) {
      formData.append('image', image);
    }

    if (additionalImages && additionalImages.length > 0) {
      additionalImages.forEach((file) => {
        formData.append('additionalImages', file);
      });
    }

    const response = await api.post('/pool-presets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async update(id: string, data: Partial<PoolPreset>, image?: File, additionalImages?: File[], existingImageUrls?: string[]): Promise<PoolPreset> {
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (image) {
      formData.append('image', image);
    }

    // Enviar lista de URLs existentes que queremos mantener
    if (existingImageUrls && existingImageUrls.length > 0) {
      formData.append('existingAdditionalImages', JSON.stringify(existingImageUrls));
    } else {
      // Si no hay URLs existentes, enviar array vacío para eliminar todas
      formData.append('existingAdditionalImages', JSON.stringify([]));
    }

    // Agregar nuevas imágenes
    if (additionalImages && additionalImages.length > 0) {
      additionalImages.forEach((file) => {
        formData.append('additionalImages', file);
      });
    }

    const response = await api.put(`/pool-presets/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/pool-presets/${id}`);
  },

  async calculate(id: string): Promise<CalculationResult> {
    const response = await api.get(`/pool-presets/${id}/calculate`);
    return response.data;
  },
};
