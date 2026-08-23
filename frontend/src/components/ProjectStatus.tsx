import React from 'react';
import { Project } from '@/types';
import api from '@/services/api';
import { ProjectTimeline } from './ProjectTimeline';
import {
  AutomaticProgressTimelineItem,
  calculateAutomaticProjectProgress,
} from '@/utils/automaticProjectProgress';

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

const CATEGORY_LABELS: Record<string, string> = {
  excavation: 'Excavación',
  hydraulic: 'Hidráulica',
  electrical: 'Eléctrica',
  floor: 'Solado y colocación',
  tiles: 'Losetas',
  finishes: 'Terminaciones',
  additionals: 'Adicionales',
  other: 'Otros',
};

const CATEGORY_ORDER = ['excavation', 'floor', 'hydraulic', 'electrical', 'tiles', 'finishes', 'additionals', 'other'];

const categoryIndex = (cat: string) => {
  const idx = CATEGORY_ORDER.indexOf(cat);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
};

const stageBorderClass = (state?: string) => {
  if (state === 'completed') return 'border-l-emerald-400';
  if (state === 'in_progress') return 'border-l-amber-400';
  return 'border-l-zinc-700';
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ProjectStatus: React.FC<ProjectStatusProps> = ({ project }) => {
  const tasks = (project.tasks && typeof project.tasks === 'object' ? project.tasks : {}) as Record<string, any>;
  const hasTasks = Object.keys(tasks).length > 0;
  const [timelineItems, setTimelineItems] = React.useState<AutomaticProgressTimelineItem[]>([]);
  const [progressLoading, setProgressLoading] = React.useState(true);

  const taskCount = React.useMemo(() => {
    return Object.values(tasks).reduce((sum: number, categoryTasks: any) => {
      if (Array.isArray(categoryTasks)) return sum + categoryTasks.length;
      return categoryTasks ? sum + 1 : sum;
    }, 0);
  }, [tasks]);

  const refreshAutomaticProgress = React.useCallback(async () => {
    try {
      setProgressLoading(true);
      const response = await api.get(`/project-updates/project/${project.id}/timeline`);
      setTimelineItems(Array.isArray(response.data?.timeline) ? response.data.timeline : []);
    } catch (error) {
      console.error('Error al calcular avance automático:', error);
      setTimelineItems([]);
    } finally {
      setProgressLoading(false);
    }
  }, [project.id]);

  React.useEffect(() => {
    void refreshAutomaticProgress();
    const refreshOnFocus = () => void refreshAutomaticProgress();
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [refreshAutomaticProgress]);

  const automaticProgress = React.useMemo(
    () => calculateAutomaticProjectProgress(project as any, timelineItems),
    [project, timelineItems]
  );

  const materials = project.materials as any;
  const hasMaterials = materials && Object.keys(materials).length > 0;
  const plumbing = project.plumbingConfig as any;
  const hasPlumbing = plumbing?.selectedItems?.length > 0;
  const electrical = project.electricalConfig as any;
  const hasElectrical = electrical?.items?.length > 0;

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.DRAFT;
  const daysSince = Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86_400_000);

  const checklist = [
    { label: 'Materiales', ok: hasMaterials },
    { label: 'Hidráulica', ok: hasPlumbing },
    { label: 'Eléctrica', ok: hasElectrical },
    { label: `Tareas base (${taskCount})`, ok: hasTasks && taskCount > 0 },
  ];

  const orderedTaskCategories = hasTasks
    ? Object.entries(tasks)
        .map(([cat, catTasks]: [string, any]) => ({
          cat,
          arr: Array.isArray(catTasks) ? catTasks : (catTasks ? [catTasks] : []),
        }))
        .filter(({ arr }) => arr.length > 0)
        .sort((a, b) => categoryIndex(a.cat) - categoryIndex(b.cat))
    : [];

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-white/8 bg-white/3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Creado: <span className="text-zinc-300">{formatDate(project.createdAt)}</span> · {daysSince} días</span>
            <span>Actualizado: <span className="text-zinc-300">{formatDate(project.updatedAt)}</span></span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Avance automático</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Se calcula con hitos del Timeline, eventos de Agenda y la secuencia real de la obra. Nadie carga el porcentaje manualmente.
              </p>
            </div>
            <span className="shrink-0 text-xl font-semibold text-white">
              {progressLoading ? '—' : `${automaticProgress.percent.toFixed(0)}%`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progressLoading ? 0 : automaticProgress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {progressLoading
              ? 'Buscando evidencias de avance…'
              : automaticProgress.evidenceCount > 0
                ? `${automaticProgress.evidenceCount} evidencia(s) detectada(s) automáticamente.`
                : 'Todavía no hay hitos o eventos confirmados que acrediten avance físico.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ProjectTimeline
          projectId={project.id}
          projectName={project.name}
          clientName={project.clientName}
          onTimelineChanged={refreshAutomaticProgress}
        />

        <div className="space-y-4">
          {orderedTaskCategories.length > 0 && (
            <div className="space-y-3 rounded-xl border border-white/8 bg-white/3 p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Avance automático por etapa</p>
                <p className="mt-1 text-[11px] text-zinc-600">Las etapas se actualizan con la actividad real registrada en la aplicación.</p>
              </div>

              {orderedTaskCategories.map(({ cat, arr }) => {
                const stage = automaticProgress.stageByCategory[cat];
                const pct = stage?.percent || 0;
                const state = stage?.state || 'pending';

                return (
                  <details key={cat} className="group overflow-hidden rounded-lg border border-white/6 bg-white/3">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                          <span className="text-xs font-semibold text-zinc-600">{categoryIndex(cat) + 1}</span>
                          <span className="truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                        </p>
                        <p className="shrink-0 text-xs font-semibold text-zinc-400">{pct.toFixed(0)}%</p>
                      </div>
                      <div className="h-1 bg-zinc-800">
                        <div className="h-1 bg-emerald-400/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </summary>

                    <div className="divide-y divide-white/5">
                      {stage?.evidence?.length ? (
                        <div className="px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
                          {stage.evidence.slice(0, 2).join(' · ')}
                        </div>
                      ) : null}

                      {arr.map((task: any, i: number) => (
                        <div
                          key={task.id ?? i}
                          className={`flex items-start justify-between border-l-2 px-3 py-2.5 ${stageBorderClass(state)}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-white">{task.name}</p>
                            {task.description && (
                              <p className="mt-0.5 truncate text-xs text-zinc-500">{task.description}</p>
                            )}
                          </div>
                          <p className="ml-3 shrink-0 text-xs text-zinc-400">{task.estimatedHours || 0}h</p>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Configuración del proyecto</p>
            {checklist.map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-3 py-1">
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-400/15' : 'bg-zinc-800'}`}>
                  {ok
                    ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>
                    : <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />}
                </div>
                <p className={`text-sm ${ok ? 'text-white' : 'text-zinc-500'}`}>{label}</p>
                <p className={`ml-auto text-xs ${ok ? 'text-emerald-400' : 'text-zinc-600'}`}>{ok ? 'Listo' : 'Pendiente'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
