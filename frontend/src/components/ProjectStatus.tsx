import React from 'react';
import { Card } from '@/components/ui/Card';
import { Project } from '@/types';
import { CheckCircle2, Circle, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { ProjectTimeline } from './ProjectTimeline';

interface ProjectStatusProps {
  project: Project;
}

export const ProjectStatus: React.FC<ProjectStatusProps> = ({ project }) => {
  const tasks = project.tasks as any;
  const hasTasks = tasks && Object.keys(tasks).length > 0;

  // Calcular estadísticas de tareas
  const taskStats = React.useMemo(() => {
    let total = 0;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            total++;
            if (task.status === 'pending') pending++;
            else if (task.status === 'in_progress') inProgress++;
            else if (task.status === 'completed') completed++;
          });
        } else if (categoryTasks && typeof categoryTasks === 'object') {
          total++;
          if (categoryTasks.status === 'pending') pending++;
          else if (categoryTasks.status === 'in_progress') inProgress++;
          else if (categoryTasks.status === 'completed') completed++;
        }
      });
    }

    const progress = total > 0 ? (completed / total) * 100 : 0;

    return { total, pending, inProgress, completed, progress };
  }, [tasks, hasTasks]);

  // Calcular progreso de materiales
  const materials = project.materials as any;
  const hasMaterials = materials && Object.keys(materials).length > 0;

  // Calcular progreso de instalaciones
  const plumbingConfig = project.plumbingConfig as any;
  const hasPlumbing = plumbingConfig && plumbingConfig.selectedItems && plumbingConfig.selectedItems.length > 0;

  const electricalConfig = project.electricalConfig as any;
  const hasElectrical = electricalConfig && electricalConfig.items && electricalConfig.items.length > 0;

  // Estado general del proyecto
  const getProjectStatusInfo = () => {
    switch (project.status) {
      case 'DRAFT':
        return { label: 'Borrador', color: 'gray', icon: Circle };
      case 'BUDGETED':
        return { label: 'Presupuestado', color: 'blue', icon: Clock };
      case 'APPROVED':
        return { label: 'Aprobado', color: 'green', icon: CheckCircle2 };
      case 'IN_PROGRESS':
        return { label: 'En Progreso', color: 'yellow', icon: TrendingUp };
      case 'COMPLETED':
        return { label: 'Completado', color: 'green', icon: CheckCircle2 };
      case 'CANCELLED':
        return { label: 'Cancelado', color: 'red', icon: AlertCircle };
      default:
        return { label: project.status, color: 'gray', icon: Circle };
    }
  };

  const statusInfo = getProjectStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Calcular fechas
  const createdDate = new Date(project.createdAt).toLocaleDateString('es-AR');
  const updatedDate = new Date(project.updatedAt).toLocaleDateString('es-AR');
  const daysSinceCreation = Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Estado General */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Estado General del Proyecto</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-full bg-${statusInfo.color}-100`}>
            <StatusIcon size={32} className={`text-${statusInfo.color}-600`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{statusInfo.label}</p>
            <p className="text-gray-600">Estado actual</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-gray-600" />
              <p className="text-sm text-gray-600">Creado</p>
            </div>
            <p className="font-semibold">{createdDate}</p>
            <p className="text-xs text-gray-500">{daysSinceCreation} días atrás</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-gray-600" />
              <p className="text-sm text-gray-600">Última actualización</p>
            </div>
            <p className="font-semibold">{updatedDate}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-gray-600" />
              <p className="text-sm text-gray-600">Progreso</p>
            </div>
            <p className="font-semibold">{taskStats.progress.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">{taskStats.completed}/{taskStats.total} tareas</p>
          </div>
        </div>
      </Card>

      {/* Progreso de Tareas */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Progreso de Tareas</h3>

        {hasTasks && taskStats.total > 0 ? (
          <>
            {/* Barra de progreso */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Completadas</span>
                <span className="text-sm font-medium">{taskStats.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${taskStats.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Estadísticas de tareas */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Circle size={20} className="text-gray-600" />
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>

              <div className="text-center p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-gray-600" />
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
                <p className="text-2xl font-bold">{taskStats.pending}</p>
              </div>

              <div className="text-center p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  <p className="text-sm text-blue-700">En Progreso</p>
                </div>
                <p className="text-2xl font-bold text-blue-800">{taskStats.inProgress}</p>
              </div>

              <div className="text-center p-4 bg-green-100 rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <p className="text-sm text-green-700">Completadas</p>
                </div>
                <p className="text-2xl font-bold text-green-800">{taskStats.completed}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-400" />
            <p>No hay tareas registradas en este proyecto</p>
          </div>
        )}
      </Card>

      {/* Checklist de Configuración */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Checklist de Configuración</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {hasMaterials ? (
              <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">Materiales de Construcción</p>
              <p className="text-sm text-gray-600">
                {hasMaterials ? 'Materiales calculados y configurados' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {hasPlumbing ? (
              <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">Instalación Hidráulica</p>
              <p className="text-sm text-gray-600">
                {hasPlumbing ? 'Instalación configurada' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {hasElectrical ? (
              <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">Instalación Eléctrica</p>
              <p className="text-sm text-gray-600">
                {hasElectrical ? 'Instalación configurada' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {hasTasks && taskStats.total > 0 ? (
              <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">Tareas del Proyecto</p>
              <p className="text-sm text-gray-600">
                {hasTasks && taskStats.total > 0 ? `${taskStats.total} tareas registradas` : 'Pendiente de configuración'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumen Financiero */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Resumen Financiero</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Materiales</p>
            <p className="text-2xl font-bold text-blue-900">${project.materialCost.toLocaleString('es-AR')}</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 mb-1">Mano de Obra</p>
            <p className="text-2xl font-bold text-green-900">${project.laborCost.toLocaleString('es-AR')}</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
            <p className="text-sm text-purple-700 mb-1">Total Proyecto</p>
            <p className="text-2xl font-bold text-purple-900">${project.totalCost.toLocaleString('es-AR')}</p>
          </div>
        </div>
      </Card>

      {/* Timeline del Proyecto */}
      <ProjectTimeline
        projectId={project.id}
        projectName={project.name}
        clientName={project.clientName}
      />
    </div>
  );
};
