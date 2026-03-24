import api from './api';
import { Project } from '@/types';

type ProjectPackageDocument = {
  fileName: string;
  content: string;
};

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data;
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(data: any): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async exportToExcel(id: string, sections?: any): Promise<void> {
    const response = await api.post(`/projects/${id}/export-excel`, { sections }, {
      responseType: 'blob',
    });

    // Crear un enlace temporal para descargar el archivo
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Obtener el nombre del archivo del header Content-Disposition si está disponible
    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'proyecto_piscina.xlsx';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (fileNameMatch && fileNameMatch.length === 2) {
        fileName = fileNameMatch[1];
      }
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async createProjectPackage(id: string, payload: {
    documents: ProjectPackageDocument[];
    excelSections?: any;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    const response = await api.post(`/projects/${id}/project-package`, payload);
    return response.data;
  },

  async downloadProjectPackage(id: string): Promise<void> {
    const response = await api.get(`/projects/${id}/project-package/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'expediente-proyecto.zip';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (fileNameMatch && fileNameMatch.length === 2) {
        fileName = fileNameMatch[1];
      }
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
