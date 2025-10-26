import api from './api';

export interface CalculationSettings {
  id: string;
  adhesiveKgPerM2: number;
  sidewalkBaseThicknessCm: number;
  cementKgPerM3: number;
  sandM3PerM3: number;
  gravelM3PerM3: number;
  groutJointWidthMm: number;
  whiteCementKgPerLinealM: number;
  marmolinaKgPerLinealM: number;
  wireMeshM2PerM2: number;
  waterproofingKgPerM2: number;
  waterproofingCoats: number;
}

export const calculationSettingsService = {
  async get(): Promise<CalculationSettings> {
    const response = await api.get('/calculation-settings');
    return response.data;
  },

  async update(data: Partial<CalculationSettings>): Promise<CalculationSettings> {
    const response = await api.put('/calculation-settings', data);
    return response.data;
  },
};
