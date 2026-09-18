import api from './api';

export interface IntegrationConfig {
  general: { frontendUrl: string };
  google: { enabled: boolean; clientId: string; clientSecret: string | null; callbackUrl: string };
  smtp: { enabled: boolean; host: string; port: number; secure: boolean; user: string; password: string | null; from: string; adminEmail: string };
  whatsapp: { enabled: boolean; mode: 'link' | 'cloud'; phoneNumber: string; phoneNumberId: string; businessAccountId: string; apiVersion: string; accessToken: string | null; verifyToken: string | null; appSecret: string | null };
  telegram: { enabled: boolean; botToken: string | null; chatId: string; webhookSecret: string | null };
}

export type IntegrationProvider = 'google' | 'smtp' | 'whatsapp' | 'telegram';

export interface IntegrationSettings {
  config: IntegrationConfig;
  revision: number;
  secretsConfigured: Record<string, boolean>;
  storageReady: boolean;
  readiness: Record<IntegrationProvider, boolean>;
}

/** Configuración global: el servidor exige SUPERADMIN y nunca devuelve secretos. */
export const integrationSettingsService = {
  async get(): Promise<IntegrationSettings> {
    return (await api.get('/admin/integrations')).data;
  },
  async save(config: IntegrationConfig, revision: number): Promise<IntegrationSettings> {
    return (await api.put('/admin/integrations', { config, revision })).data;
  },
  async verify(provider: Exclude<IntegrationProvider, 'google'>): Promise<{ message?: string; ok?: boolean }> {
    return (await api.post(`/admin/integrations/verify/${provider}`)).data;
  },
};
