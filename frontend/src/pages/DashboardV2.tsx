import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useReminders } from '@/context/RemindersContext';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import {
  weatherService,
  WeatherData,
  getWeatherDescription,
  isGoodWorkingWeather,
} from '@/services/weatherService';
import { agendaService } from '@/services/agendaService';
import type { Project, PoolPreset } from '@/types';
import {
  HdActivity,
  HdAlertTriangle,
  HdBell,
  HdCalendar,
  HdCheck,
  HdChevronRight,
  HdClock,
  HdDroplet,
  HdFolderOpen,
  HdMessageBubble,
  HdPlus,
  HdWaves,
  HdWind,
} from '@/components/ui/HandDrawnIcons';

type DashboardDataState = {
  projects: Project[];
  presets: PoolPreset[];
  weather: WeatherData | null;
  agenda: any[];
};

const STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  APPROVED: 1,
  BUDGETED: 2,
  DRAFT: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  BUDGETED: 'Presupuestado',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const statusTone = (status: string) => {
  if (status === 'COMPLETED') return 'var(--good)';
  if (status === 'IN_PROGRESS' || status === 'APPROVED') return 'var(--accent)';
  if (status === 'CANCELLED') return 'var(--bad)';
  return 'var(--warm)';
};

const dateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatEventTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const getProjectModelLabel = (project: Project) => {
  const preset = project.poolPreset;
  if (!preset) return 'Modelo sin definir';
  return `${preset.name} · ${preset.length} × ${preset.width} m`;
};

const DashboardSkeleton: React.FC = () => (
  <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <div className="mb-6 h-28 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
      ))}
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="h-96 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
      <div className="h-96 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
    </div>
  </div>
);

export const DashboardV2: React.FC = () => {
  const { user } = useAuth();
  const { reminders } = useReminders();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardDataState>({
    projects: [],
    presets: [],
    weather: null,
    agenda: [],
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);

      const results = await Promise.allSettled([
        projectService.getAll(),
        poolPresetService.getAll(),
        weatherService.getWeather(),
        agendaService.list({ start: start.toISOString(), end: end.toISOString() }),
      ]);

      if (!mounted) return;

      const [projectsResult, presetsResult, weatherResult, agendaResult] = results;
      setData({
        projects: projectsResult.status === 'fulfilled' ? projectsResult.value : [],
        presets: presetsResult.status === 'fulfilled' ? presetsResult.value : [],
        weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
        agenda: agendaResult.status === 'fulfilled' ? agendaResult.value : [],
      });
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const activeProjects = useMemo(
    () =>
      [...data.projects]
        .filter((project) => project.status !== 'COMPLETED' && project.status !== 'CANCELLED')
        .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)),
    [data.projects],
  );

  const todayEvents = useMemo(() => {
    const todayKey = dateKey(new Date());
    return data.agenda
      .filter((event) => dateKey(new Date(event.startAt)) === todayKey)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [data.agenda]);

  const nextEvents = useMemo(
    () =>
      data.agenda
        .filter((event) => new Date(event.startAt).getTime() >= Date.now())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 4),
    [data.agenda],
  );

  const completedProjects = data.projects.filter((project) => project.status === 'COMPLETED').length;
  const inProgressProjects = data.projects.filter((project) => project.status === 'IN_PROGRESS').length;
  const weatherIsWorkable = data.weather
    ? isGoodWorkingWeather(data.weather.current.weatherCode, data.weather.current.windSpeed, 0)
    : null;

  const attentionCount = reminders.length + data.projects.filter((project) => project.status === 'BUDGETED').length;

  if (loading) return <DashboardSkeleton />;

  return (
    <main className="dashboard-v2 mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="mb-5 sm:mb-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}
            >
              Panel de trabajo
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--ink)' }}>
              {user?.name ? `Hola, ${user.name}` : 'Pool Installer'}
            </h1>
            <p className="mt-1 text-sm capitalize" style={{ color: 'var(--ink-soft)' }}>
              {today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <Link
            to="/agenda"
            className="rough-panel rough-panel--soft relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center px-3"
            aria-label="Ver recordatorios y agenda"
          >
            <HdBell size={19} style={{ color: attentionCount > 0 ? 'var(--warm)' : 'var(--ink-soft)' }} />
            {attentionCount > 0 && (
              <span
                className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ backgroundColor: 'var(--warm)', color: 'var(--paper)' }}
              >
                {Math.min(attentionCount, 99)}
              </span>
            )}
          </Link>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Obras activas', value: activeProjects.length, icon: HdFolderOpen, tone: 'var(--accent)' },
          { label: 'En ejecución', value: inProgressProjects, icon: HdClock, tone: 'var(--warm)' },
          { label: 'Completadas', value: completedProjects, icon: HdCheck, tone: 'var(--good)' },
          { label: 'Modelos', value: data.presets.length, icon: HdWaves, tone: 'var(--ink-soft)' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rough-panel p-3.5 sm:p-4">
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--ink)' }}>{item.value}</p>
                </div>
                <Icon size={20} style={{ color: item.tone }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="rough-panel rough-panel--accent min-h-16 p-4 text-left"
        >
          <span className="relative flex items-center gap-3">
            <HdPlus size={20} style={{ color: 'var(--accent)' }} />
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Nueva obra</span>
              <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Crear o abrir proyecto</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/agenda')}
          className="rough-panel min-h-16 p-4 text-left"
        >
          <span className="relative flex items-center gap-3">
            <HdCalendar size={20} style={{ color: 'var(--accent)' }} />
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Planificar</span>
              <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{todayEvents.length} evento(s) hoy</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="rough-panel min-h-16 p-4 text-left"
        >
          <span className="relative flex items-center gap-3">
            <HdMessageBubble size={20} style={{ color: 'var(--accent)' }} />
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Mensajes</span>
              <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Comunicación de obra</span>
            </span>
          </span>
        </button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <section className="rough-panel p-4 sm:p-5">
            <div className="relative mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Trabajo</p>
                <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>Obras que requieren atención</h2>
              </div>
              <Link to="/projects" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                Ver todas
                <HdChevronRight size={16} />
              </Link>
            </div>

            <div className="relative space-y-3">
              {activeProjects.length === 0 ? (
                <div className="rough-panel rough-panel--soft p-5 text-center">
                  <HdCheck size={24} className="relative mx-auto" style={{ color: 'var(--good)' }} />
                  <p className="relative mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>No hay obras activas</p>
                  <p className="relative mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>Podés crear un proyecto nuevo cuando lo necesites.</p>
                </div>
              ) : (
                activeProjects.slice(0, 5).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="rough-panel rough-panel--soft block w-full p-4 text-left"
                  >
                    <span className="relative flex items-start gap-3">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: statusTone(project.status) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <span className="min-w-0">
                            <span className="block break-words text-sm font-semibold sm:text-base" style={{ color: 'var(--ink)' }}>
                              {project.name}
                            </span>
                            <span className="mt-0.5 block text-xs" style={{ color: 'var(--ink-soft)' }}>{project.clientName}</span>
                          </span>
                          <span className="rough-chip shrink-0" style={{ color: statusTone(project.status) }}>
                            {STATUS_LABELS[project.status] || project.status}
                          </span>
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-xs" style={{ color: 'var(--ink-soft)' }}>{getProjectModelLabel(project)}</span>
                          <HdChevronRight size={16} className="shrink-0" style={{ color: 'var(--accent)' }} />
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rough-panel p-4 sm:p-5">
            <div className="relative mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Agenda</p>
                <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                  {todayEvents.length > 0 ? 'Trabajo de hoy' : 'Próximos trabajos'}
                </h2>
              </div>
              <HdCalendar size={20} style={{ color: 'var(--accent)' }} />
            </div>

            <div className="relative divide-y" style={{ borderColor: 'var(--hair)' }}>
              {(todayEvents.length > 0 ? todayEvents : nextEvents).slice(0, 4).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate('/agenda')}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                >
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                    {formatEventTime(event.startAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {event.title || event.name || 'Trabajo programado'}
                    </span>
                    <span className="mt-0.5 block truncate text-xs" style={{ color: 'var(--ink-soft)' }}>
                      {event.location || event.project?.name || 'Agenda de trabajo'}
                    </span>
                  </span>
                  <HdChevronRight size={16} className="shrink-0" style={{ color: 'var(--ink-soft)' }} />
                </button>
              ))}

              {todayEvents.length === 0 && nextEvents.length === 0 && (
                <div className="py-5 text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Agenda libre</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>No hay trabajos programados en los próximos días.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rough-panel p-4 sm:p-5">
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Condiciones de obra</p>
                <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>Clima actual</h2>
              </div>
              <HdWind size={21} style={{ color: 'var(--accent)' }} />
            </div>

            {data.weather ? (
              <div className="relative mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-4xl font-semibold" style={{ color: 'var(--ink)' }}>
                      {data.weather.current.temperature}°
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                      {getWeatherDescription(data.weather.current.weatherCode)}
                    </p>
                  </div>
                  <span
                    className="rough-chip"
                    style={{ color: weatherIsWorkable ? 'var(--good)' : 'var(--warm)' }}
                  >
                    {weatherIsWorkable ? 'Apto para obra' : 'Revisar condiciones'}
                  </span>
                </div>
                <div className="rough-dashed mt-4 grid grid-cols-2 gap-3 pt-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Viento</p>
                    <p className="mt-1 font-mono font-semibold" style={{ color: 'var(--ink)' }}>{data.weather.current.windSpeed} km/h</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Estado</p>
                    <p className="mt-1 font-semibold" style={{ color: weatherIsWorkable ? 'var(--good)' : 'var(--warm)' }}>
                      {weatherIsWorkable ? 'Operable' : 'Precaución'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="relative mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>No se pudo cargar el clima.</p>
            )}
          </section>

          <section className="rough-panel p-4 sm:p-5">
            <div className="relative flex items-center gap-3">
              {attentionCount > 0 ? (
                <HdAlertTriangle size={20} style={{ color: 'var(--warm)' }} />
              ) : (
                <HdActivity size={20} style={{ color: 'var(--good)' }} />
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Atención</p>
                <h2 className="mt-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  {attentionCount > 0 ? `${attentionCount} asunto(s) pendientes` : 'Todo bajo control'}
                </h2>
              </div>
            </div>
            <div className="relative mt-4 space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              <p>{reminders.length} recordatorio(s) activos.</p>
              <p>{data.projects.filter((project) => project.status === 'BUDGETED').length} presupuesto(s) pendientes de avance.</p>
            </div>
          </section>

          <section className="rough-panel rough-panel--accent p-4 sm:p-5">
            <div className="relative flex gap-3">
              <HdDroplet size={22} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Pool Installer</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  El panel prioriza lo que necesitás resolver en obra. Los informes y herramientas administrativas quedan disponibles sin ocupar la pantalla principal.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};
