import React from 'react';
import { Card } from '@/components/ui/Card';
import { Project } from '@/types';
import { CheckCircle2, Circle, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { ProjectTimeline } from './ProjectTimeline';
import { calculateProjectFinancials } from '@/utils/projectCosting';

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
    let totalHours = 0;

    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            total++;
            totalHours += task.estimatedHours || 0;
            if (task.status === 'pending') pending++;
            else if (task.status === 'in_progress') inProgress++;
            else if (task.status === 'completed') completed++;
          });
        } else if (categoryTasks && typeof categoryTasks === 'object') {
          total++;
          totalHours += categoryTasks.estimatedHours || 0;
          if (categoryTasks.status === 'pending') pending++;
          else if (categoryTasks.status === 'in_progress') inProgress++;
          else if (categoryTasks.status === 'completed') completed++;
        }
      });
    }

    const progress = total > 0 ? (completed / total) * 100 : 0;

    return { total, pending, inProgress, completed, progress, totalHours };
  }, [tasks, hasTasks]);

  const categoryLabels: Record<string, string> = {
    excavation: 'Excavación',
    hydraulic: 'Instalación Hidráulica',
    electrical: 'Instalación Eléctrica',
    floor: 'Solado y Cama',
    tiles: 'Colocación de Losetas',
    finishes: 'Terminaciones',
    additionals: 'Adicionales',
    other: 'Otros',
  };

  // Calcular progreso de materiales
  const materials = project.materials as any;
  const hasMaterials = materials && Object.keys(materials).length > 0;

  // Calcular progreso de instalaciones
  const plumbingConfig = project.plumbingConfig as any;
  const hasPlumbing = plumbingConfig && plumbingConfig.selectedItems && plumbingConfig.selectedItems.length > 0;

  const electricalConfig = project.electricalConfig as any;
  const hasElectrical = electricalConfig && electricalConfig.items && electricalConfig.items.length > 0;

  const financialSummary = React.useMemo(() => {
    const { totalMaterialCost, totalLaborCost } = calculateProjectFinancials(project);

    return {
      materialCost: totalMaterialCost,
      laborCost: totalLaborCost,
      totalCost: totalMaterialCost + totalLaborCost,
    };
  }, [project]);

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
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <h3 className="text-xl font-semibold text-white mb-4">Estado General del Proyecto</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
            <StatusIcon size={32} className="text-zinc-100" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{statusInfo.label}</p>
            <p className="text-zinc-400 text-base">Estado actual</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-zinc-300" />
              <p className="text-base text-zinc-300">Creado</p>
            </div>
            <p className="font-semibold text-lg text-white">{createdDate}</p>
            <p className="text-sm text-zinc-500">{daysSinceCreation} días atrás</p>
          </div>

          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-zinc-300" />
              <p className="text-base text-zinc-300">Última actualización</p>
            </div>
            <p className="font-semibold text-lg text-white">{updatedDate}</p>
          </div>

          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-zinc-300" />
              <p className="text-base text-zinc-300">Progreso</p>
            </div>
            <p className="font-semibold text-lg text-white">{taskStats.progress.toFixed(0)}%</p>
            <p className="text-sm text-zinc-500">{taskStats.completed}/{taskStats.total} tareas</p>
          </div>
        </div>
      </Card>

      {/* Progreso de Tareas */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <h3 className="text-xl font-semibold text-white mb-4">Progreso de Tareas</h3>

        {hasTasks && taskStats.total > 0 ? (
          <>
            {/* Barra de progreso */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-base font-medium text-zinc-200">Completadas</span>
                <span className="text-base font-medium text-zinc-100">{taskStats.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-4">
                <div
                  className="bg-zinc-200 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${taskStats.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Estadísticas de tareas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Circle size={20} className="text-zinc-300" />
                  <p className="text-base text-zinc-300">Total</p>
                </div>
                <p className="text-2xl font-bold text-white">{taskStats.total}</p>
              </div>

              <div className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-zinc-300" />
                  <p className="text-base text-zinc-300">Pendientes</p>
                </div>
                <p className="text-2xl font-bold text-white">{taskStats.pending}</p>
              </div>

              <div className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-zinc-300" />
                  <p className="text-base text-zinc-300">En Progreso</p>
                </div>
                <p className="text-2xl font-bold text-white">{taskStats.inProgress}</p>
              </div>

              <div className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 size={20} className="text-zinc-300" />
                  <p className="text-base text-zinc-300">Completadas</p>
                </div>
                <p className="text-2xl font-bold text-white">{taskStats.completed}</p>
              </div>

              <div className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-zinc-300" />
                  <p className="text-base text-zinc-300">Horas Totales</p>
                </div>
                <p className="text-2xl font-bold text-white">{taskStats.totalHours}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-400">
            <Clock size={48} className="mx-auto mb-4 text-zinc-500" />
            <p>No hay tareas registradas en este proyecto</p>
          </div>
        )}
      </Card>

      {hasTasks && taskStats.total > 0 && (
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
          <h3 className="text-xl font-semibold text-white mb-4">Detalle de Tareas</h3>
          <div className="space-y-4">
            {Object.entries(tasks).map(([category, categoryTasks]: [string, any]) => {
              if (!Array.isArray(categoryTasks) || categoryTasks.length === 0) return null;

              const categoryStats = categoryTasks.reduce((acc: any, task: any) => {
                acc.total++;
                if (task.status === 'completed') acc.completed++;
                else if (task.status === 'in_progress') acc.inProgress++;
                else acc.pending++;
                acc.hours += task.estimatedHours || 0;
                return acc;
              }, { total: 0, completed: 0, inProgress: 0, pending: 0, hours: 0 });

              const categoryProgress = categoryStats.total > 0
                ? (categoryStats.completed / categoryStats.total) * 100
                : 0;

              return (
                <div key={category} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">{categoryLabels[category] || category}</h4>
                    <div className="flex items-center gap-3 text-base">
                      <span className="text-zinc-400">{categoryStats.completed}/{categoryStats.total} tareas</span>
                      <span className="font-bold text-zinc-200">{categoryProgress.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                    <div
                      className="bg-zinc-300 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${categoryProgress}%` }}
                    ></div>
                  </div>

                  <div className="space-y-2">
                    {categoryTasks.map((task: any, index: number) => (
                      <div
                        key={task.id || index}
                        className={`p-3 rounded-lg border-l-4 ${
                          task.status === 'completed'
                            ? 'bg-zinc-950 border-zinc-300'
                            : task.status === 'in_progress'
                            ? 'bg-zinc-950 border-zinc-400'
                            : 'bg-zinc-950 border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {task.status === 'completed' ? (
                                <CheckCircle2 size={18} className="text-zinc-200" />
                              ) : task.status === 'in_progress' ? (
                                <Clock size={18} className="text-zinc-300" />
                              ) : (
                                <Circle size={18} className="text-zinc-500" />
                              )}
                              <p className="font-medium text-base text-white">{task.name}</p>
                            </div>
                            {task.description && (
                              <p className="text-sm text-zinc-300 ml-6">{task.description}</p>
                            )}
                            {(task.assignedRole || task.suggestedRoleType) && (
                              <span className="inline-block ml-6 mt-1 px-3 py-1 text-sm rounded-full bg-zinc-900 text-zinc-100 border border-zinc-700">
                                {task.assignedRole || task.suggestedRoleType}
                              </span>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-base font-semibold text-zinc-50">
                              {task.estimatedHours}hs
                            </p>
                            {task.laborCost > 0 && (
                              <p className="text-sm text-zinc-300">
                                ${task.laborCost.toLocaleString('es-AR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Checklist de Configuración */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <h3 className="text-xl font-semibold text-white mb-4">Checklist de Configuración</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            {hasMaterials ? (
              <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-zinc-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-white">Materiales de Construcción</p>
              <p className="text-sm text-zinc-400">
                {hasMaterials ? 'Materiales calculados y configurados' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            {hasPlumbing ? (
              <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-zinc-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-white">Instalación Hidráulica</p>
              <p className="text-sm text-zinc-400">
                {hasPlumbing ? 'Instalación configurada' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            {hasElectrical ? (
              <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-zinc-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-white">Instalación Eléctrica</p>
              <p className="text-sm text-zinc-400">
                {hasElectrical ? 'Instalación configurada' : 'Pendiente de configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            {hasTasks && taskStats.total > 0 ? (
              <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-zinc-500 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-white">Tareas del Proyecto</p>
              <p className="text-sm text-zinc-400">
                {hasTasks && taskStats.total > 0 ? `${taskStats.total} tareas registradas` : 'Pendiente de configuración'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumen Financiero */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <h3 className="text-xl font-semibold text-white mb-4">Resumen Financiero</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-sm text-zinc-400 mb-1">Materiales</p>
            <p className="text-2xl font-bold text-white">${financialSummary.materialCost.toLocaleString('es-AR')}</p>
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-sm text-zinc-400 mb-1">Mano de Obra</p>
            <p className="text-2xl font-bold text-white">${financialSummary.laborCost.toLocaleString('es-AR')}</p>
          </div>

          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-700">
            <p className="text-sm text-zinc-400 mb-1">Total Proyecto</p>
            <p className="text-2xl font-bold text-white">${financialSummary.totalCost.toLocaleString('es-AR')}</p>
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
