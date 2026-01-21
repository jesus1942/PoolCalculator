import api from './api';

export interface OrganizationItem {
  id: string;
  name: string;
  slug?: string | null;
  role: string;
}

export interface OrganizationListResponse {
  currentOrgId: string | null;
  organizations: OrganizationItem[];
}

export interface SwitchOrganizationResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    currentOrgId?: string | null;
  };
}

export interface OrganizationAdminItem {
  id: string;
  name: string;
  slug?: string | null;
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  membersCount: number;
  createdAt: string;
}

export const organizationService = {
  async list() {
    const response = await api.get<OrganizationListResponse>('/organizations');
    return response.data;
  },
  async switchOrganization(organizationId: string) {
    const response = await api.post<SwitchOrganizationResponse>('/organizations/switch', {
      organizationId,
    });
    return response.data;
  },
  async listAll() {
    const response = await api.get<OrganizationAdminItem[]>('/organizations/admin');
    return response.data;
  },
  async create(payload: {
    name: string;
    slug?: string;
    ownerEmail?: string;
    ownerName?: string;
    ownerPassword?: string;
  }) {
    const response = await api.post('/organizations', payload);
    return response.data;
  },
  async update(id: string, payload: { name?: string; slug?: string; ownerEmail?: string }) {
    const response = await api.patch(`/organizations/${id}`, payload);
    return response.data;
  },
};
