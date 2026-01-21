import React, { useEffect, useState } from 'react';
import { Carousel } from '@/components/ui/Carousel';
import { MapPin, Calendar, Waves } from 'lucide-react';
import { projectService } from '@/services/projectService';
import { getImageUrl } from '@/utils/imageUtils';

interface Project {
  id: string;
  name: string;
  clientName: string;
  location?: string;
  status: string;
  poolPreset: {
    name: string;
    imageUrl?: string;
    length: number;
    width: number;
  };
  createdAt: string;
}

export const ProjectsCarousel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Obtener proyectos públicos o en progreso (sin autenticación)
      const response = await projectService.getAll();
      // Filtrar solo proyectos activos/en progreso
      const activeProjects = response.filter((p: Project) =>
        p.status === 'IN_PROGRESS' || p.status === 'APPROVED'
      ).slice(0, 10); // Mostrar máximo 10

      setProjects(activeProjects);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      // Si falla, mostrar proyectos de ejemplo
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      IN_PROGRESS: { label: 'En Construcción', color: 'bg-blue-500' },
      APPROVED: { label: 'Aprobado', color: 'bg-green-500' },
      BUDGETED: { label: 'Presupuestado', color: 'bg-yellow-500' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };
    return (
      <span className={`${config.color} text-white text-xs px-2 py-1 rounded-full font-medium`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Cargando proyectos...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="h-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Waves className="w-16 h-16 text-blue-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Próximamente mostraremos proyectos activos</p>
        </div>
      </div>
    );
  }

  return (
    <Carousel autoPlay interval={6000} className="h-96">
      {projects.map((project) => (
        <div
          key={project.id}
          className="relative h-96 bg-cover bg-center"
          style={{
            backgroundImage: project.poolPreset.imageUrl
              ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${getImageUrl(project.poolPreset.imageUrl)})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
            <div className="mb-4">
              {getStatusBadge(project.status)}
            </div>
            <h3 className="text-3xl font-bold mb-2">{project.name}</h3>
            <p className="text-xl mb-4">Cliente: {project.clientName}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              {project.location && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span>{project.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Waves className="w-4 h-4" />
                <span>{project.poolPreset.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                <span>{new Date(project.createdAt).toLocaleDateString('es-AR')}</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-blue-200">
              Dimensiones: {project.poolPreset.length}m x {project.poolPreset.width}m
            </div>
          </div>
        </div>
      ))}
    </Carousel>
  );
};
