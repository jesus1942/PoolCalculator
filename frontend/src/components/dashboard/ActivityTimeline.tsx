import React from 'react';
import { FolderOpen, Waves, CheckCircle2, Clock, Plus, Edit } from 'lucide-react';
import { Project, PoolPreset } from '@/types';

interface ActivityTimelineProps {
  projects: Project[];
  presets: PoolPreset[];
}

interface Activity {
  id: string;
  type: 'project' | 'preset' | 'status';
  title: string;
  description: string;
  time: Date;
  icon: React.ReactNode;
  color: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ projects, presets }) => {
  const generateActivities = (): Activity[] => {
    const activities: Activity[] = [];

    // Agregar proyectos recientes
    projects.slice(0, 5).forEach(project => {
      activities.push({
        id: `project-${project.id}`,
        type: 'project',
        title: 'Nuevo Proyecto Creado',
        description: `${project.name} - ${project.clientName}`,
        time: new Date(project.createdAt),
        icon: <FolderOpen className="w-4 h-4" />,
        color: 'from-blue-600 to-cyan-600'
      });

      if (project.status === 'COMPLETED') {
        activities.push({
          id: `completed-${project.id}`,
          type: 'status',
          title: 'Proyecto Completado',
          description: project.name,
          time: new Date(project.updatedAt),
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: 'from-emerald-600 to-green-600'
        });
      } else if (project.status === 'IN_PROGRESS') {
        activities.push({
          id: `progress-${project.id}`,
          type: 'status',
          title: 'Proyecto En Progreso',
          description: project.name,
          time: new Date(project.updatedAt),
          icon: <Clock className="w-4 h-4" />,
          color: 'from-amber-600 to-orange-600'
        });
      }
    });

    // Agregar modelos recientes (solo los 2 más nuevos)
    presets.slice(0, 2).forEach(preset => {
      activities.push({
        id: `preset-${preset.id}`,
        type: 'preset',
        title: 'Nuevo Modelo Agregado',
        description: `${preset.name} - ${preset.length}x${preset.width}m`,
        time: new Date(preset.createdAt),
        icon: <Waves className="w-4 h-4" />,
        color: 'from-cyan-600 to-teal-600'
      });
    });

    // Ordenar por fecha (más reciente primero)
    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 8); // Mostrar solo las 8 actividades más recientes
  };

  const activities = generateActivities();

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

      <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

        <div className="relative p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl blur-md opacity-50"></div>
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/50">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-light text-white tracking-wide">Actividad Reciente</h2>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center">
                <Clock className="h-8 w-8 text-zinc-700" />
              </div>
              <p className="text-zinc-500 font-light">No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50 pr-2">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="group/item relative"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s backwards`
                  }}
                >
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-200">
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <div className={`absolute inset-0 bg-gradient-to-br ${activity.color} rounded-xl blur-sm opacity-50`}></div>
                      <div className={`relative p-2.5 rounded-xl bg-gradient-to-br ${activity.color} shadow-lg`}>
                        {activity.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-light text-white text-sm">{activity.title}</h4>
                        <span className="text-xs text-zinc-500 font-light whitespace-nowrap">
                          {formatTimeAgo(activity.time)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 font-light truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {index < activities.length - 1 && (
                    <div className="ml-[26px] h-4 w-px bg-gradient-to-b from-zinc-700 to-transparent"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
