import api from './api';

export interface DocsListResponse {
  docs: string[];
}

export interface DocContentResponse {
  name: string;
  content: string;
}

export const docsService = {
  async listDocs() {
    const response = await api.get<DocsListResponse>('/docs');
    return response.data.docs;
  },
  async getDoc(name: string) {
    const response = await api.get<DocContentResponse>(`/docs/${encodeURIComponent(name)}`);
    return response.data;
  },
  async updateDoc(name: string, content: string) {
    const response = await api.put(`/docs/${encodeURIComponent(name)}`, { content });
    return response.data;
  }
};
