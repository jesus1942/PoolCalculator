import React from 'react';
import { Project } from '@/types';
import { ProjectTimeline } from './ProjectTimeline';

interface ProjectStatusProps {
  project: Project;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  DRAFT:       { label: 'Borrador',      dot: 'bg-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
  BUDGETED:    { label: 'Presupuestado', dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  APPROVED:    { label: 'Aprobado',      dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  IN_PROGRESS: { label: 'En Progreso',   dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  COMPLETED:   { label: 'Completado',    dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  CANCELLED:   { label: 'Cancelado',     dot: 'bg-rose-400',    badge: 'bg-rose-400/10 text-rose-300 border-rose-400/20' },
};

const TASK_STATUS_COLORS: Record<string, string> = {
  completed:   'border-l-emerald-400',
  in_progress: 'border-l-amber-400',
  pending:     'border-l-zinc-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  excavation: 'Excavación',
  hydraulic:  'Hidráulica',
  electrical: 'Eléctrica',
  floor:      'Solado',
  tiles:      'Losetas',
  finishes:   'Terminaciones',
  additionals: 'Adicionales',
  other:      'Otros',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ProjectStatus: React.FC<ProjectStatusProps> = ({ project }) => {
  const tasks = project.tasks as any;
  const hasTasks = tasks && Object.keys(tasks).length > 0;

  const taskStats = React.useMemo(() => {
    let total = 0, pending = 0, inProgress = 0, completed = 0, totalHours = 0;
    if (hasTasks) {
      Object.values(tasks).forEach((catTasks: any) => {
        const arr = Array.isArray(catTasks) ? catTasks : (catTasks ? [catTasks] : []);
        arr.forEach((t: any) => {
          total++;
          totalHours += t.estimatedHours || 0;
          if (t.status === 'pending') pending++;
          else if (t.status === 'in_progress') inProgress++;
          else if (t.status === 'completed') completed++;
        });
      });
    }
    return { total, pending, inProgress, completed, totalHours, progress: total > 0 ? (completed / total) * 100 : 0 };
  }, [tasks, hasTasks]);

  const materials      = project.materials as any;
  const hasMaterials   = materials && Object.keys(materials).length > 0;
  const plumbing       = project.plumbingConfig as any;
  const hasPlumbing    = plumbing?.selectedItems?.length > 0;
  const electrical     = project.electricalConfig as any;
  const hasElectrical  = electrical?.items?.length > 0;

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.DRAFT;
  const daysSince = Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86_400_000);

  const checklist = [
    { label: 'Materiales',         ok: hasMaterials },
    { label: 'Hidráulica',         ok: hasPlumbing },
    { label: 'Eléctrica',          ok: hasElectrical },
    { label: `Tareas (${taskStats.total})`, ok: hasTasks && taskStats.total > 0 },
  ];

  return (
    <div className="space-y-4">

      {/* ── Estado + Fechas ── */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Estado del proyecto</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1 ${statusCfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 rounded-lg p-3 border border-white/6">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Creado</p>
            <p className="text-sm font-medium text-white">{formatDate(project.createdAt)}</p>
            <p className="text-xs text-zinc-500">{daysSince} días</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3 border border-white/6">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Actualizado</p>
            <p className="text-sm font-medium text-white">{formatDate(project.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* ── Progreso de Tareas ── */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Progreso de tareas</p>

        {hasTasks && taskStats.total > 0 ? (
          <>
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>{taskStats.completed} completadas</span>
                <span className="font-semibold text-white">{taskStats.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${taskStats.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Total',       value: taskStats.total,       color: 'text-white' },
                { label: 'Pendientes',  value: taskStats.pending,     color: 'text-zinc-400' },
                { label: 'En progreso', value: taskStats.inProgress,  color: 'text-amber-400' },
                { label: 'Completadas', value: taskStats.completed,   color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/3 rounded-lg p-3 border border-white/6 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500 py-2">Sin tareas registradas</p>
        )}
      </div>

      {/* ── Detalle por Categoría ── */}
      {hasTasks && taskStats.total > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Detalle por categoría</p>
          {Object.entries(tasks).map(([cat, catTasks]: [string, any]) => {
            const arr = Array.isArray(catTasks) ? catTasks : (catTasks ? [catTasks] : []);
            if (arr.length === 0) return null;
            const done = arr.filter((t: any) => t.status === 'completed').length;
            const pct  = (done / arr.length) * 100;

            return (
              <div key={cat} className="bg-white/3 rounded-lg border border-white/6 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-sm font-medium text-white">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <p className="text-xs text-zinc-400">{done}/{arr.length}</p>
                </div>
                <div className="h-1 bg-zinc-800">
                  <div className="h-1 bg-emerald-400/70 transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="divide-y divide-white/5">
                  {arr.map((task: any, i: number) => (
                    <div
                      key={task.id ?? i}
                      className={`flex items-start justify-between px-3 py-2.5 border-l-2 ${TASK_STATUS_COLORS[task.status] ?? 'border-l-zinc-700'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug">{task.name}</p>
                        {task.description && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.description}</p>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 ml-3 shrink-0">{task.estimatedHours}h</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Checklist de Configuración ── */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Configuración del proyecto</p>
        {checklist.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-3 py-1">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-400/15' : 'bg-zinc-800'}`}>
              {ok
                ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              }
            </div>
            <p className={`text-sm ${ok ? 'text-white' : 'text-zinc-500'}`}>{label}</p>
            <p className={`text-xs ml-auto ${ok ? 'text-emerald-400' : 'text-zinc-600'}`}>{ok ? '✓' : 'Pendiente'}</p>
          </div>
        ))}
      </div>

      {/* ── Timeline ── */}
      <ProjectTimeline
        projectId={project.id}
        projectName={project.name}
        clientName={project.clientName}
      />
    </div>
  );
};
