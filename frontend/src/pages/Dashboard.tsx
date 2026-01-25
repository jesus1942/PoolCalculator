import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import { weatherService, WeatherData, HourlyWeatherData, getWeatherDescription, getWeatherEmoji, isGoodWorkingWeather, isNightTime } from '@/services/weatherService';
import { agendaService } from '@/services/agendaService';
import { agendaChecklistService } from '@/services/agendaChecklistService';
import { useReminders } from '@/context/RemindersContext';
import { Project, PoolPreset } from '@/types';
import { Droplets, Layers, FolderOpen, Waves, TrendingUp, Clock, CheckCircle2, ChevronRight, ChevronDown, BarChart3, Activity, Wind, Umbrella, Calendar, AlertTriangle, ListTodo, Circle, Plus, Trash2, Bell, Sparkles } from 'lucide-react';
import FlipCard from '@/components/ui/FlipCard';
import { PoolFitWizard } from '@/components/PoolFitWizard';
import { ProjectsChart } from '@/components/dashboard/ProjectsChart';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Notifications } from '@/components/dashboard/Notifications';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { reminders, snooze, dismiss } = useReminders();
  const [projects, setProjects] = useState<Project[]>([]);
  const [presets, setPresets] = useState<PoolPreset[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeatherData[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [checklistByEvent, setChecklistByEvent] = useState<Record<string, any[]>>({});
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    loadData();
    // Detectar si es de noche
    setIsNight(isNightTime());
    // Actualizar cada hora
    const interval = setInterval(() => {
      setIsNight(isNightTime());
    }, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);

      const results = await Promise.allSettled([
        projectService.getAll(),
        poolPresetService.getAll(),
        weatherService.getWeather(), // Buenos Aires por defecto
        weatherService.getHourlyWeather(), // Clima por hora
        agendaService.list({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      ]);

      const [projectsResult, presetsResult, weatherResult, hourlyResult, agendaResult] = results;

      if (projectsResult.status === 'fulfilled') {
        setProjects(projectsResult.value);
      } else {
        console.error('Error al cargar proyectos:', projectsResult.reason);
      }

      if (presetsResult.status === 'fulfilled') {
        setPresets(presetsResult.value);
      } else {
        console.error('Error al cargar presets:', presetsResult.reason);
      }

      if (weatherResult.status === 'fulfilled') {
        setWeather(weatherResult.value);
      } else {
        console.error('Error al cargar clima:', weatherResult.reason);
        setWeather(null);
      }

      if (hourlyResult.status === 'fulfilled') {
        setHourlyWeather(hourlyResult.value);
      } else {
        console.error('Error al cargar clima por hora:', hourlyResult.reason);
        setHourlyWeather([]);
      }

      if (agendaResult.status === 'fulfilled') {
        setAgendaEvents(agendaResult.value);
        const todayKey = start.toISOString().slice(0, 10);
        const todays = agendaResult.value.filter((event: any) =>
          new Date(event.startAt).toISOString().slice(0, 10) === todayKey
        );
        setTodayEvents(todays);
      } else {
        console.error('Error al cargar agenda:', agendaResult.reason);
        setAgendaEvents([]);
        setTodayEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadChecklist = async () => {
      const map: Record<string, any[]> = {};
      await Promise.allSettled(
        todayEvents.map(async (event) => {
          const items = await agendaChecklistService.list(event.id);
          map[event.id] = items;
        })
      );
      setChecklistByEvent(map);
    };

    if (todayEvents.length > 0) {
      loadChecklist();
    } else {
      setChecklistByEvent({});
    }
  }, [todayEvents]);

  const toggleChecklistItem = async (eventId: string, item: any) => {
    try {
      const updated = await agendaChecklistService.update(eventId, item.id, { done: !item.done });
      setChecklistByEvent((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || []).map((i) => (i.id === updated.id ? updated : i)),
      }));
    } catch (error) {
      console.error('Error al actualizar checklist:', error);
    }
  };

  const addChecklistItem = async (eventId: string) => {
    const label = (newChecklistText[eventId] || '').trim();
    if (!label) return;
    try {
      const item = await agendaChecklistService.add(eventId, label);
      setChecklistByEvent((prev) => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), item],
      }));
      setNewChecklistText((prev) => ({ ...prev, [eventId]: '' }));
    } catch (error) {
      console.error('Error al agregar checklist:', error);
    }
  };

  const removeChecklistItem = async (eventId: string, itemId: string) => {
    try {
      await agendaChecklistService.remove(eventId, itemId);
      setChecklistByEvent((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter((i) => i.id !== itemId),
      }));
    } catch (error) {
      console.error('Error al eliminar checklist:', error);
    }
  };

  const stats = [
    {
      title: 'Proyectos Totales',
      value: projects.length,
      icon: FolderOpen,
      gradient: 'from-blue-600 via-blue-500 to-cyan-500',
      glowColor: 'shadow-blue-500/50',
    },
    {
      title: 'Modelos de Piscinas',
      value: presets.length,
      icon: Waves,
      gradient: 'from-cyan-600 via-cyan-500 to-teal-500',
      glowColor: 'shadow-cyan-500/50',
    },
    {
      title: 'En Progreso',
      value: projects.filter(p => p.status === 'IN_PROGRESS').length,
      icon: Clock,
      gradient: 'from-amber-600 via-amber-500 to-orange-500',
      glowColor: 'shadow-amber-500/50',
    },
    {
      title: 'Completados',
      value: projects.filter(p => p.status === 'COMPLETED').length,
      icon: CheckCircle2,
      gradient: 'from-emerald-600 via-green-500 to-teal-500',
      glowColor: 'shadow-green-500/50',
    },
  ];

  // Calcular porcentaje de completados
  const completionRate = projects.length > 0
    ? (projects.filter(p => p.status === 'COMPLETED').length / projects.length) * 100
    : 0;

  const inProgressRate = projects.length > 0
    ? (projects.filter(p => p.status === 'IN_PROGRESS').length / projects.length) * 100
    : 0;

  const agendaByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    agendaEvents.forEach((event) => {
      const dateKey = new Date(event.startAt).toISOString().slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)?.push(event);
    });
    return map;
  }, [agendaEvents]);

  const upcomingDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  // Días buenos para trabajar en los próximos 7 días
  const workableDays = weather?.daily.filter(day =>
    isGoodWorkingWeather(day.weatherCode, day.windSpeed, day.precipitation)
  ).length || 0;

  // Filtrar solo las horas futuras desde la hora actual
  const futureHourlyWeather = hourlyWeather.filter(hour => {
    const hourTime = new Date(hour.time);
    return hourTime > new Date();
  });

  // Obtener las horas de un día específico
  const getHourlyWeatherForDay = (date: string): HourlyWeatherData[] => {
    return hourlyWeather.filter(hour => hour.time.startsWith(date));
  };

  const today = new Date();
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const newYearInfo = useMemo(() => {
    const now = new Date();
    const isJan1 = now.getMonth() === 0 && now.getDate() === 1;
    const showEfemerides = false;
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    const diffMs = nextYear.getTime() - now.getTime();
    const daysUntil = isJan1 ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      isJan1,
      showEfemerides,
      daysUntil,
      year: now.getFullYear(),
    };
  }, []);
  const newYearEfemerides = useMemo(
    () => [
      { year: '46 a.C.', text: 'Julio César instaura el calendario juliano y fija el 1 de enero como inicio del año civil.' },
      { year: '1582', text: 'Se promulga el calendario gregoriano, base del calendario moderno.' },
      { year: '1970', text: 'Comienza la época Unix: 1 de enero de 1970 a las 00:00 UTC.' },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
          </div>
          <p className="text-zinc-400 text-lg font-light tracking-wide">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      {/* Gradiente de fondo sutil */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-black to-black pointer-events-none -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none -z-10"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 min-h-screen">
        {/* Header Minimalista */}
        <div className="mb-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Droplets className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-white tracking-tight">
                  Hola, <span className="font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">{user?.name}</span>
                </h1>
                <p className="text-zinc-500 mt-2 text-sm sm:text-base font-light tracking-wide">
                  {today.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex-shrink-0">
              <Notifications projects={projects} weather={weather} />
            </div>
          </div>
        </div>

        {/* Efemérides de Año Nuevo */}
        {newYearInfo.showEfemerides && (
          <div className="mb-8 group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

            <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

              <div className="relative p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-md opacity-50"></div>
                      <div className="relative p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-orange-500/50">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-light text-white tracking-wide">Efemérides de Año Nuevo</h2>
                      <p className="text-zinc-500 text-sm font-light">Historia breve del 1 de enero</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 font-light">
                    {newYearInfo.isJan1
                      ? `Feliz Año Nuevo ${newYearInfo.year}`
                      : `Faltan ${newYearInfo.daysUntil} días para Año Nuevo`}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {newYearEfemerides.map((item) => (
                    <div
                      key={item.year}
                      className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4"
                    >
                      <div className="text-xs text-amber-300 font-light mb-2">{item.year}</div>
                      <div className="text-sm text-zinc-200 font-light leading-relaxed">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clima y Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Widget de Clima con Flip - Estilo Strudel */}
          <div className="lg:col-span-1 group relative h-[420px] sm:h-[480px]">
            {/* Glow effect */}
            <div className={`absolute -inset-0.5 bg-gradient-to-br ${weather && isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0) ? 'from-green-600 to-emerald-600' : 'from-red-600 to-orange-600'} rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition duration-500`}></div>

            <FlipCard
              className="h-full"
              front={
                <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden h-full">
                  {/* Efecto de cristal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                        <Activity className="h-5 w-5 text-cyan-400" />
                      </div>
                      <h2 className="text-lg font-light text-white tracking-wide">Clima Actual</h2>
                      <span className="ml-auto text-xs text-zinc-500 font-light">Click para ver por hora</span>
                    </div>

                    {weather ? (
                      <>
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <div className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white mb-3 tracking-tighter">
                              {weather.current.temperature}°
                            </div>
                            <p className="text-zinc-400 font-light text-base sm:text-lg">
                              {getWeatherDescription(weather.current.weatherCode)}
                            </p>
                          </div>
                          <div className="text-5xl sm:text-6xl opacity-90">
                            {getWeatherEmoji(weather.current.weatherCode, true)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="relative group/card">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-2xl"></div>
                            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800/50">
                              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2 font-light">
                                <Wind className="h-4 w-4" />
                                Viento
                              </div>
                              <div className="text-white text-xl font-light">
                                {weather.current.windSpeed}
                                <span className="text-sm text-zinc-500"> km/h</span>
                                {weather.current.windGust !== null && (
                                  <span className="ml-2 text-xs text-amber-300">ráf. {weather.current.windGust} km/h</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="relative group/card">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-2xl"></div>
                            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800/50">
                              <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2 font-light">
                                <Umbrella className="h-4 w-4" />
                                Humedad
                              </div>
                              <div className="text-white text-xl font-light">{weather.current.humidity}<span className="text-sm text-zinc-500">%</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Indicador de condiciones de trabajo */}
                        <div className={`relative overflow-hidden rounded-2xl p-4 border ${isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0) ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'}`}>
                          <div className="flex items-center gap-3">
                            {isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0) ? (
                              <div className="p-2 rounded-xl bg-emerald-500/10">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-red-500/10">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                              </div>
                            )}
                      <span className={`font-light text-sm ${isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0) ? 'text-emerald-300' : 'text-red-300'}`}>
                        {isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0)
                          ? 'Buenas condiciones para trabajar'
                          : 'Condiciones adversas'}
                      </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
                        No se pudo cargar el clima. Reintentá más tarde.
                      </div>
                    )}
                  </div>
                </div>
              }
              back={
                <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden h-full">
                  {/* Efecto de cristal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

                  <div className="p-8 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                        <Clock className="h-5 w-5 text-purple-400" />
                      </div>
                      <h2 className="text-lg font-light text-white tracking-wide">Clima por Hora</h2>
                      <span className="ml-auto text-xs text-zinc-500 font-light">Click para volver</span>
                    </div>

                    {/* Lista scrolleable de clima por hora - Solo horas futuras */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                      {futureHourlyWeather.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">
                          <p>No hay pronóstico horario disponible</p>
                        </div>
                      ) : (
                        futureHourlyWeather.map((hour, index) => {
                          const time = new Date(hour.time);
                          const hourStr = time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                          const isHourNight = time.getHours() >= 20 || time.getHours() < 6;

                          return (
                            <div key={index} className="relative group/hour">
                              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 to-zinc-900/30 rounded-xl"></div>
                              <div className="relative bg-zinc-900/60 backdrop-blur-xl rounded-xl p-3 border border-zinc-800/30 hover:border-zinc-700/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-zinc-400 font-light text-sm w-16">{hourStr}</span>
                                    <span className="text-3xl">{getWeatherEmoji(hour.weatherCode, isHourNight)}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-white font-light text-lg">{hour.temperature}°</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                      <Wind className="h-3 w-3" />
                                      <span>{hour.windSpeed}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                      <Umbrella className="h-3 w-3" />
                                      <span>{hour.humidity}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              }
            />
          </div>

          {/* Stats Cards - Grid 2x2 Estilo Strudel */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {stats.map((stat, index) => (
              <div key={index} className="group relative">
                {/* Glow effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${stat.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition duration-500`}></div>

                <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
                  {/* Efecto de cristal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`relative p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} ${stat.glowColor} shadow-2xl`}>
                        <stat.icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <TrendingUp className="h-5 w-5 text-cyan-500" />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-light text-zinc-500 mb-2 tracking-wide">{stat.title}</p>
                      <p className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-white tracking-tight">
                        {stat.value}
                      </p>
                    </div>
                  </div>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pronóstico de 7 días - Estilo Strudel */}
        {weather && (
          <div className="mb-8 group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

            <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-md opacity-50"></div>
                      <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-xl shadow-blue-500/50">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-light text-white tracking-wide">Pronóstico de 7 días</h2>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-light text-zinc-300">
                      {workableDays} días buenos para trabajar
                    </span>
                  </div>
                </div>

                <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-4 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-7">
                  {weather.daily.map((day, index) => {
                    // Parsear la fecha correctamente en zona horaria local (YYYY-MM-DD)
                    const [year, month, dayNum] = day.date.split('-').map(Number);
                    const date = new Date(year, month - 1, dayNum);
                    const isGoodDay = isGoodWorkingWeather(day.weatherCode, day.windSpeed, day.precipitation);
                    const dayHourlyWeather = getHourlyWeatherForDay(day.date);

                    return (
                      <div key={index} className="group/day relative h-[250px] sm:h-[280px]">
                        <div className={`absolute -inset-0.5 ${isGoodDay ? 'bg-gradient-to-br from-emerald-600 to-green-600' : 'bg-gradient-to-br from-red-600 to-orange-600'} rounded-2xl blur-md opacity-0 group-hover/day:opacity-30 transition duration-300`}></div>

                        <FlipCard
                          className="h-full"
                          front={
                            <div className={`relative overflow-hidden rounded-2xl p-5 border h-full ${
                              isGoodDay
                                ? 'bg-zinc-950/80 border-emerald-500/20 hover:border-emerald-500/40'
                                : 'bg-zinc-950/80 border-red-500/20 hover:border-red-500/40'
                            }`}>
                              <div className={`absolute top-0 left-0 right-0 h-1 ${isGoodDay ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}></div>

                              <div className="text-center">
                                <p className="text-zinc-500 text-xs font-light mb-1 tracking-wide">
                                  {index === 0 ? 'Hoy' : dayNames[date.getDay()]}
                                </p>
                                <p className="text-zinc-600 text-xs mb-3 font-light">
                                  {date.getDate()}/{date.getMonth() + 1}
                                </p>
                                <div className="text-4xl mb-3 transform group-hover/day:scale-110 transition duration-300">
                                  {getWeatherEmoji(day.weatherCode)}
                                </div>
                                <div className="text-white font-light text-2xl mb-1">
                                  {day.maxTemp}°
                                </div>
                                <div className="text-zinc-500 text-sm font-light">
                                  {day.minTemp}°
                                </div>

                                {/* Indicadores */}
                                <div className="mt-4 space-y-2">
                                  {day.precipitation > 0 && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-blue-400 font-light">
                                      <Umbrella className="h-3 w-3" />
                                      {day.precipitation}mm
                                    </div>
                                  )}
                                  {day.windSpeed > 20 && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400 font-light">
                                      <Wind className="h-3 w-3" />
                                      {day.windSpeed}km/h
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          }
                          back={
                            <div className="relative overflow-hidden rounded-2xl bg-zinc-950/90 border border-zinc-800/50 p-3 h-full">
                              <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-white text-xs font-light">
                                    {index === 0 ? 'Hoy' : dayNames[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}
                                  </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                                  {dayHourlyWeather.length === 0 ? (
                                    <p className="text-zinc-500 text-xs text-center py-4">Sin datos</p>
                                  ) : (
                                    dayHourlyWeather.map((hour, hourIndex) => {
                                      const time = new Date(hour.time);
                                      const hourStr = time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                      const isHourNight = time.getHours() >= 20 || time.getHours() < 6;

                                      return (
                                        <div key={hourIndex} className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-800/30">
                                          <div className="flex items-center justify-between">
                                            <span className="text-zinc-400 font-light text-xs">{hourStr}</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xl">{getWeatherEmoji(hour.weatherCode, isHourNight)}</span>
                                              <span className="text-white font-light text-xs">{hour.temperature}°</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Hoy - La Agenda del instalador + checklist */}
        <div className="mb-8 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

          <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-md opacity-50"></div>
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/50">
                      <ListTodo className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-wide">Hoy</h2>
                    <p className="text-zinc-500 text-sm font-light">La Agenda del instalador y checklist</p>
                  </div>
                </div>
                <Link
                  to="/agenda"
                  className="text-sm text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 px-4 py-2 rounded-xl transition-all"
                >
                  Ir a agenda
                </Link>
              </div>

              {reminders.length > 0 && (
                <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-emerald-200 mb-3">
                    <Bell className="h-4 w-4" />
                    Recordatorios activos (12h antes)
                  </div>
                  <div className="space-y-3">
                    {reminders.slice(0, 3).map((reminder) => {
                      const startAt = new Date(reminder.event.startAt);
                      const startLabel = startAt.toLocaleString('es-AR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div key={reminder.id} className="rounded-xl border border-emerald-500/20 bg-zinc-950/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm text-white font-light">{reminder.event.title}</div>
                              <div className="text-xs text-zinc-400 mt-1">{startLabel}</div>
                              {reminder.event.project?.name && (
                                <div className="text-xs text-zinc-500 mt-1">Proyecto: {reminder.event.project.name}</div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => snooze(reminder.id, 60)}
                                className="px-2.5 py-1 text-[11px] rounded-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                              >
                                Posponer 1h
                              </button>
                              <button
                                type="button"
                                onClick={() => snooze(reminder.id, 180)}
                                className="px-2.5 py-1 text-[11px] rounded-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                              >
                                Posponer 3h
                              </button>
                              <button
                                type="button"
                                onClick={() => snooze(reminder.id, 720)}
                                className="px-2.5 py-1 text-[11px] rounded-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                              >
                                Posponer 12h
                              </button>
                              <button
                                type="button"
                                onClick={() => dismiss(reminder.id)}
                                className="px-2.5 py-1 text-[11px] rounded-full border border-red-500/30 text-red-200 hover:bg-red-500/10 transition-colors"
                              >
                                Descartar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {todayEvents.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-sm text-zinc-400">
                  No hay eventos para hoy. Podés crear uno desde la agenda.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {todayEvents.map((event) => {
                    const startTime = new Date(event.startAt);
                    const endTime = new Date(event.endAt);
                    const timeRange = `${startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
                    const assignees = [
                      ...(event.assignees || []).map((a: any) => a.user?.name || a.user?.email).filter(Boolean),
                      ...((event.crew?.members || []).map((m: any) => m.user?.name || m.user?.email).filter(Boolean)),
                    ];
                    const uniqueAssignees = Array.from(new Set(assignees));
                    const checklistItems = checklistByEvent[event.id] || [];

                    return (
                      <div key={event.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm text-white font-light">{event.title}</div>
                            <div className="text-xs text-zinc-500 mt-1">{timeRange}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: `${event.statusColor || '#94a3b8'}55`,
                                color: event.statusColor || '#94a3b8',
                              }}
                            >
                              {event.status}
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: `${event.typeColor || '#0ea5e9'}55`,
                                color: event.typeColor || '#0ea5e9',
                              }}
                            >
                              {event.type}
                            </span>
                          </div>
                        </div>

                        {(event.project?.name || event.location || uniqueAssignees.length > 0) && (
                          <div className="mt-3 space-y-1 text-xs text-zinc-400">
                            {event.project?.name && <div>Proyecto: {event.project.name}</div>}
                            {event.location && <div>Ubicación: {event.location}</div>}
                            {uniqueAssignees.length > 0 && (
                              <div>Asignados: {uniqueAssignees.slice(0, 3).join(', ')}{uniqueAssignees.length > 3 ? '…' : ''}</div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 border-t border-zinc-800/60 pt-4">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
                            <ListTodo className="h-4 w-4" />
                            Checklist (recordatorios in-app)
                          </div>

                          {checklistItems.length === 0 ? (
                            <div className="text-xs text-zinc-500">Sin ítems todavía.</div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                              {checklistItems.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 text-xs text-zinc-300">
                                  <button
                                    type="button"
                                    onClick={() => toggleChecklistItem(event.id, item)}
                                    className="text-zinc-500 hover:text-emerald-300 transition-colors"
                                  >
                                    {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4" />}
                                  </button>
                                  <span className={item.done ? 'line-through text-zinc-500' : ''}>{item.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeChecklistItem(event.id, item.id)}
                                    className="ml-auto text-zinc-600 hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            <input
                              value={newChecklistText[event.id] || ''}
                              onChange={(e) => setNewChecklistText((prev) => ({ ...prev, [event.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addChecklistItem(event.id);
                                }
                              }}
                              placeholder="Agregar item..."
                              className="flex-1 bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => addChecklistItem(event.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 text-emerald-200 text-xs hover:bg-emerald-500/10 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* La Agenda próximos 7 días */}
        <div className="mb-8 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

          <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl blur-md opacity-50"></div>
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-xl shadow-cyan-500/50">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-wide">La Agenda próximos 7 días</h2>
                    <p className="text-zinc-500 text-sm font-light">Eventos y visitas planificadas</p>
                  </div>
                </div>
                <Link
                  to="/agenda"
                  className="text-sm text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 px-4 py-2 rounded-xl transition-all"
                >
                  Ver agenda completa
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingDays.map((day) => {
                  const dateKey = day.toISOString().slice(0, 10);
                  const dayEvents = agendaByDay.get(dateKey) || [];
                  return (
                    <div key={dateKey} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-white font-light">
                          {day.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </div>
                        <span className="text-xs text-zinc-500">{dayEvents.length} eventos</span>
                      </div>
                      {dayEvents.length === 0 ? (
                        <div className="text-xs text-zinc-500">Sin eventos</div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-lg border px-3 py-2 text-xs text-zinc-200"
                              style={{
                                backgroundColor: `${event.typeColor || '#0ea5e9'}1a`,
                                borderColor: `${event.typeColor || '#0ea5e9'}55`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-light">{event.title}</span>
                                <span className="text-[11px] text-zinc-400">
                                  {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{
                                    borderColor: `${event.statusColor || '#22c55e'}55`,
                                    color: event.statusColor || '#22c55e',
                                  }}
                                >
                                  {event.status}
                                </span>
                                {event.project?.name && (
                                  <span className="text-[10px] text-zinc-500">{event.project.name}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos de Proyectos */}
        <div className="mb-8">
          <ProjectsChart projects={projects} />
        </div>

        {/* Gráficos de Tendencias */}
        <div className="mb-8">
          <TrendCharts projects={projects} />
        </div>

        {/* Métricas de Progreso - Estilo Strudel */}
        <div className="mb-8 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

          <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

            <div className="relative p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-md opacity-50"></div>
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl shadow-purple-500/50">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-light text-white tracking-wide">Métricas de Proyectos</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tasa de Completitud */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 font-light tracking-wide">Tasa de Completitud</span>
                    <span className="text-white text-2xl font-extralight">{completionRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-4 bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-800/50">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-green-500/50"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <p className="text-zinc-600 text-sm mt-3 font-light">
                    {projects.filter(p => p.status === 'COMPLETED').length} de {projects.length} proyectos completados
                  </p>
                </div>

                {/* Proyectos en Progreso */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 font-light tracking-wide">En Progreso</span>
                    <span className="text-white text-2xl font-extralight">{inProgressRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-4 bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-800/50">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-amber-500/50"
                      style={{ width: `${inProgressRate}%` }}
                    ></div>
                  </div>
                  <p className="text-zinc-600 text-sm mt-3 font-light">
                    {projects.filter(p => p.status === 'IN_PROGRESS').length} proyectos activos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asistente Inteligente */}
        <div className="mb-8">
          <PoolFitWizard />
        </div>

        {/* Activity Timeline */}
        <div className="mb-8">
          <ActivityTimeline projects={projects} presets={presets} />
        </div>

        {/* Proyectos y Modelos - Estilo Strudel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proyectos Recientes */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

            <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

              <div className="relative p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-md opacity-50"></div>
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-xl shadow-blue-500/50">
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-light text-white tracking-wide">Proyectos Recientes</h2>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center">
                      <FolderOpen className="h-10 w-10 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-light">
                      Todavía no tenés proyectos creados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => {
                      const isExpanded = expandedProject === project.id;
                      return (
                        <div
                          key={project.id}
                          className="group/item relative rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-200 cursor-pointer overflow-hidden"
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                        >
                          <div className="p-5">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-light text-white text-lg">{project.name}</h4>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-cyan-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover/item:text-cyan-400 transition-colors" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-500 font-light">{project.clientName}</p>
                              </div>
                              <span className={`px-4 py-2 text-xs font-light rounded-xl shadow-sm flex-shrink-0 ${
                                project.status === 'COMPLETED' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-green-500/30' :
                                project.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-500/30' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {project.status === 'COMPLETED' ? 'Completado' :
                                 project.status === 'IN_PROGRESS' ? 'En progreso' : 'Borrador'}
                              </span>
                            </div>

                            {/* Contenido expandido */}
                            {isExpanded && (
                              <div className="mt-5 pt-5 border-t border-zinc-800/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/30">
                                    <p className="text-zinc-600 text-xs mb-2 font-light">Área de Espejo</p>
                                    <p className="text-white font-light text-lg">{project.waterMirrorArea} m²</p>
                                  </div>
                                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/30">
                                    <p className="text-zinc-600 text-xs mb-2 font-light">Volumen</p>
                                    <p className="text-white font-light text-lg">{project.volume} m³</p>
                                  </div>
                                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/30">
                                    <p className="text-zinc-600 text-xs mb-2 font-light">Perímetro</p>
                                    <p className="text-white font-light text-lg">{project.perimeter} m</p>
                                  </div>
                                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/30">
                                    <p className="text-zinc-600 text-xs mb-2 font-light">Excavación</p>
                                    <p className="text-white font-light text-lg">{project.excavationLength}x{project.excavationWidth}m</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 pointer-events-none"></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modelos Disponibles */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

            <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

              <div className="relative p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl blur-md opacity-50"></div>
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 shadow-xl shadow-cyan-500/50">
                      <Waves className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-light text-white tracking-wide">Modelos Disponibles</h2>
                </div>

                {presets.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center">
                      <Waves className="h-10 w-10 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-light">
                      No hay modelos de piscinas disponibles
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {presets.slice(0, 5).map((preset) => {
                      const isExpanded = expandedPreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className="group/item relative rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-200 cursor-pointer overflow-hidden"
                          onClick={() => setExpandedPreset(isExpanded ? null : preset.id)}
                        >
                          <div className="p-5">
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl blur-sm opacity-50"></div>
                                <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/30">
                                  <Layers className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-light text-white text-lg">{preset.name}</h4>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-cyan-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover/item:text-cyan-400 transition-colors" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-500 font-light">
                                  {preset.length}m × {preset.width}m × {preset.depth}m
                                </p>
                                <p className="text-xs text-zinc-600 mt-1 capitalize font-light">
                                  {preset.shape.toLowerCase().replace('_', ' ')}
                                </p>

                                {/* Contenido expandido */}
                                {isExpanded && (
                                  <div className="mt-5 pt-5 border-t border-zinc-800/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
                                        <p className="text-zinc-600 text-xs mb-1 font-light">Colchón Lateral</p>
                                        <p className="text-white font-light">{preset.lateralCushionSpace}m</p>
                                      </div>
                                      <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
                                        <p className="text-zinc-600 text-xs mb-1 font-light">Colchón Piso</p>
                                        <p className="text-white font-light">{preset.floorCushionDepth}m</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 pointer-events-none"></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
