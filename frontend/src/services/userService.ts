import api from './api';
import type { ProjectTabId } from '@/types';

export type UserProjectAccessEntry = {
  projectId: string;
  name: string;
  clientName: string;
  status: string;
  enabled: boolean;
  canEdit: boolean;
  canViewFinancials: boolean;
  allowedTabs: ProjectTabId[];
  inheritedFromOwnership?: boolean;
};

export const userService = {
  async list() {
    const response = await api.get('/users');
    return response.data;
  },
  async create(payload: { email: string; name: string; password: string; role?: string; orgRole?: string }) {
    const response = await api.post('/users', payload);
    return response.data;
  },
  async update(id: string, payload: { name?: string; role?: string; password?: string; orgRole?: string }) {
    const response = await api.patch(`/users/${id}`, payload);
    return response.data;
  },
  async getProjectAccess(id: string): Promise<{
    user: { id: string; name: string; email: string; role: string };
    tabsCatalog: ProjectTabId[];
    projects: UserProjectAccessEntry[];
  }> {
    const response = await api.get(`/users/${id}/project-access`);
    return response.data;
  },
  async updateProjectAccess(
    id: string,
    projectId: string,
    payload: {
      enabled: boolean;
      canEdit?: boolean;
      canViewFinancials?: boolean;
      allowedTabs?: ProjectTabId[];
    },
  ) {
    const response = await api.put(`/users/${id}/project-access/${projectId}`, payload);
    return response.data;
  },
};
