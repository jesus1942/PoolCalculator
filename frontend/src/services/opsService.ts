import api from '@/services/api';

export type OpsStatus = {
  serverTime: string;
  uptimeSeconds: number;
  db: { ok: boolean; error: string | null };
  smtp: { configured: boolean };
  reminders: {
    pendingCount: number;
    dueCount: number;
    lastEmailSentAt: string | null;
    intervalMs: number;
    batchSize: number;
    lookbackMs: number;
  };
  logs: {
    last24h: Record<string, number>;
  };
};

export type OpsLog = {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  meta: Record<string, any> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
  eventId: string | null;
};

export const opsService = {
  async status(): Promise<OpsStatus> {
    const response = await api.get('/admin/ops/status');
    return response.data;
  },
  async logs(params?: { limit?: number; level?: string; category?: string }): Promise<OpsLog[]> {
    const response = await api.get('/admin/ops/logs', { params });
    return response.data.logs || [];
  },
};
