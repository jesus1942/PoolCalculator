import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Filter, Lock, Shield, Users, Bell } from 'lucide-react';
import { agendaService } from '@/services/agendaService';
import { crewService } from '@/services/crewService';
import { userService } from '@/services/userService';
import { projectService } from '@/services/projectService';
import { agendaMessageService } from '@/services/agendaMessageService';
import { useAuth } from '@/context/AuthContext';
import { useReminders } from '@/context/RemindersContext';

type AgendaEvent = any;
type Crew = any;
type User = any;
type Project = any;

const EVENT_TYPES = [
  { value: 'VISIT', label: 'Visita' },
  { value: 'INSTALLATION', label: 'Instalación' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'INSPECTION', label: 'Inspección' },
  { value: 'DELIVERY', label: 'Entrega' },
  { value: 'OTHER', label: 'Otro' },
];

const EVENT_STATUSES = [
  { value: 'PLANNED', label: 'Planificado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'DONE', label: 'Finalizado' },
  { value: 'CANCELED', label: 'Cancelado' },
];

const EVENT_PRIORITIES = [
  { value: 'LOW', label: 'Baja' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

const toDateInput = (date: Date) => date.toISOString().slice(0, 16);

export const Agenda: React.FC = () => {
  const { user } = useAuth();
  const { reminders, snooze, dismiss } = useReminders();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'crews'>('events');
  const [showCrewCreate, setShowCrewCreate] = useState(false);
  const [crewForm, setCrewForm] = useState({ name: '', description: '' });
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedEvents, setSelectedEvents] = useState<AgendaEvent[]>([]);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState('');
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageVisibility, setMessageVisibility] = useState<'ALL' | 'ADMIN_ONLY'>('ALL');
  const [messageImages, setMessageImages] = useState<File[]>([]);

  const now = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  }, []);

  const [filters, setFilters] = useState({
    start: defaultStart,
    end: defaultEnd,
    status: '',
    priority: '',
    type: '',
    crewId: '',
    projectId: '',
  });

  const [form, setForm] = useState({
    title: '',
    type: 'VISIT',
    status: 'PLANNED',
    priority: 'NORMAL',
    startAt: toDateInput(defaultStart),
    endAt: toDateInput(defaultEnd),
    location: '',
    projectId: '',
    crewId: '',
    assigneeIds: [] as string[],
    notesInternal: '',
    notesInstaller: '',
    assigneesCanEdit: true,
    lockedByAdmin: false,
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const hoursOptions = useMemo(() => Array.from({ length: 24 }).map((_, idx) => String(idx).padStart(2, '0')), []);
  const minutesOptions = useMemo(() => ['00', '15', '30', '45'], []);

  const splitDateTime = (value: string) => {
    const [datePart, timePart] = value.split('T');
    return {
      datePart: datePart || '',
      timePart: timePart ? timePart.slice(0, 5) : '09:00',
    };
  };

  const updateDateTime = (currentValue: string, datePart?: string, timePart?: string) => {
    const current = splitDateTime(currentValue || '');
    const nextDate = datePart || current.datePart;
    const nextTime = timePart || current.timePart;
    if (!nextDate) return currentValue;
    return `${nextDate}T${nextTime}`;
  };

  const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const monthMatrix = useMemo(() => {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const startGrid = startOfWeek(start);
    const weeks: Date[][] = [];
    let cursor = new Date(startGrid);
    for (let w = 0; w < 6; w += 1) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d += 1) {
        week.push(new Date(cursor));
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }).map((_, idx) => addDays(start, idx));
  }, [anchorDate]);

  const dayHours = useMemo(() => Array.from({ length: 24 }).map((_, idx) => idx), []);
  const todayKey = useMemo(() => formatDateKey(now), [now]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    events.forEach((event) => {
      const key = formatDateKey(new Date(event.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(event);
    });
    return map;
  }, [events]);

  const remindersByEvent = useMemo(() => {
    const map = new Map<string, any>();
    reminders.forEach((reminder: any) => {
      const id = reminder.eventId || reminder.event?.id;
      if (id) map.set(id, reminder);
    });
    return map;
  }, [reminders]);

  const mobileVisibleDays = useMemo(() => {
    if (viewMode === 'day') return [anchorDate];
    if (viewMode === 'week') return weekDays;
    return monthMatrix.flat().filter((day) => day.getMonth() === anchorDate.getMonth());
  }, [anchorDate, monthMatrix, viewMode, weekDays]);

  const mobileSelectedDateKey = useMemo(() => formatDateKey(anchorDate), [anchorDate]);
  const mobileSelectedEvents = useMemo(() => (
    (eventsByDay.get(mobileSelectedDateKey) || []).slice().sort((a, b) => (
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    ))
  ), [eventsByDay, mobileSelectedDateKey]);

  const getRangeForView = () => {
    if (viewMode === 'day') {
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    }
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate);
      const end = endOfDay(addDays(start, 6));
      return { start, end };
    }
    const startMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const endMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    return { start: startOfDay(startMonth), end: endOfDay(endMonth) };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const range = getRangeForView();
      const results = await Promise.allSettled([
        agendaService.list({
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          type: filters.type || undefined,
          crewId: filters.crewId || undefined,
          projectId: filters.projectId || undefined,
        }),
        crewService.list(),
        canManage ? userService.list() : Promise.resolve([]),
        projectService.getAll(),
      ]);

      const [eventsResult, crewsResult, usersResult, projectsResult] = results;

      if (eventsResult.status === 'fulfilled') setEvents(eventsResult.value);
      if (crewsResult.status === 'fulfilled') setCrews(crewsResult.value);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value);
      if (projectsResult.status === 'fulfilled') setProjects(projectsResult.value);
    } catch (error) {
      console.error('Error al cargar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anchorDate, viewMode, filters.status, filters.priority, filters.type, filters.crewId, filters.projectId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!editingEvent) return;
      try {
        const data = await agendaMessageService.list(editingEvent.id);
        setMessages(data);
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
        setMessages([]);
      }
    };

    if (showCreate && editingEvent) {
      loadMessages();
    } else {
      setMessages([]);
      setMessageText('');
      setMessageVisibility('ALL');
    }
  }, [showCreate, editingEvent]);

  const handleCreate = async () => {
    const startDate = new Date(form.startAt);
    const currentDate = new Date();

    if (!editingEvent && startDate.getTime() < currentDate.getTime()) {
      window.alert('No se pueden crear eventos en una fecha u hora pasada.');
      return;
    }

    try {
      if (editingEvent) {
        await agendaService.update(editingEvent.id, {
          ...form,
          projectId: form.projectId || null,
          crewId: form.crewId || null,
        });
      } else {
        await agendaService.create({
          ...form,
          projectId: form.projectId || null,
          crewId: form.crewId || null,
        });
      }
      setShowCreate(false);
      setEditingEvent(null);
      setForm({
        title: '',
        type: 'VISIT',
        status: 'PLANNED',
        priority: 'NORMAL',
        startAt: toDateInput(defaultStart),
        endAt: toDateInput(defaultEnd),
        location: '',
        projectId: '',
        crewId: '',
        assigneeIds: [],
        notesInternal: '',
        notesInstaller: '',
        assigneesCanEdit: true,
        lockedByAdmin: false,
      });
      await loadData();
    } catch (error) {
      console.error('Error al guardar evento:', error);
    }
  };

  const toggleAssignee = (id: string) => {
    setForm((prev) => {
      const exists = prev.assigneeIds.includes(id);
      return {
        ...prev,
        assigneeIds: exists ? prev.assigneeIds.filter((item) => item !== id) : [...prev.assigneeIds, id],
      };
    });
  };

  const openCreateForSlot = (date: Date, hour?: number) => {
    const start = new Date(date);
    if (typeof hour === 'number') {
      start.setHours(hour, 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }

    if (start.getTime() < Date.now()) {
      window.alert('No se pueden crear eventos en una fecha u hora pasada.');
      return;
    }

    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    const key = formatDateKey(start);
    const dayEvents = eventsByDay.get(key) || [];
    const label = start.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' }) +
      ` · ${String(start.getHours()).padStart(2, '0')}:00`;

    setSelectedEvents(dayEvents);
    setSelectedSlotLabel(label);
    setEditingEvent(null);
    setForm((prev) => ({
      ...prev,
      startAt: toDateInput(start),
      endAt: toDateInput(end),
    }));
    setShowCreate(true);
  };

  const openEditEvent = (event: AgendaEvent) => {
    const start = new Date(event.startAt);
    const label = start.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' }) +
      ` · ${String(start.getHours()).padStart(2, '0')}:00`;
    const key = formatDateKey(start);
    const dayEvents = eventsByDay.get(key) || [];

    setEditingEvent(event);
    setSelectedEvents(dayEvents);
    setSelectedSlotLabel(label);
    setForm({
      title: event.title || '',
      type: event.type || 'VISIT',
      status: event.status || 'PLANNED',
      priority: event.priority || 'NORMAL',
      startAt: toDateInput(start),
      endAt: toDateInput(new Date(event.endAt)),
      location: event.location || '',
      projectId: event.projectId || '',
      crewId: event.crewId || '',
      assigneeIds: (event.assignees || []).map((assignee: any) => assignee.userId),
      notesInternal: event.notesInternal || '',
      notesInstaller: event.notesInstaller || '',
      assigneesCanEdit: event.assigneesCanEdit ?? true,
      lockedByAdmin: event.lockedByAdmin ?? false,
    });
    setShowCreate(true);
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    try {
      await agendaService.remove(editingEvent.id);
      setShowCreate(false);
      setEditingEvent(null);
      await loadData();
    } catch (error) {
      console.error('Error al eliminar evento:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!editingEvent) return;
    const body = messageText.trim();
    if (!body && messageImages.length === 0) return;
    try {
      const created = await agendaMessageService.create(editingEvent.id, body, messageVisibility, messageImages);
      setMessages((prev) => [...prev, created]);
      setMessageText('');
      setMessageVisibility('ALL');
      setMessageImages([]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  const handleCreateCrew = async () => {
    try {
      if (!crewForm.name.trim()) return;
      await crewService.create(crewForm);
      setCrewForm({ name: '', description: '' });
      setShowCrewCreate(false);
      await loadData();
    } catch (error) {
      console.error('Error al crear crew:', error);
    }
  };

  const handleAddCrewMember = async (crewId: string, memberId: string) => {
    try {
      if (!memberId) return;
      await crewService.addMember(crewId, memberId);
      await loadData();
    } catch (error) {
      console.error('Error al agregar miembro:', error);
    }
  };

  const handleRemoveCrewMember = async (crewId: string, memberId: string) => {
    try {
      await crewService.removeMember(crewId, memberId);
      await loadData();
    } catch (error) {
      console.error('Error al quitar miembro:', error);
    }
  };

  const editingReminder = editingEvent ? remindersByEvent.get(editingEvent.id) : null;

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-black to-black pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="relative max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-50" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 sm:h-14 sm:w-14">
                <Calendar className="h-6 w-6 text-white sm:h-7 sm:w-7" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-extralight tracking-tight text-white sm:text-4xl">
                  La Agenda
                </h1>
                <p className="mt-1 max-w-2xl text-sm font-light tracking-wide text-zinc-300 sm:text-base">
                  Gestión de visitas, instalaciones y mantenimiento
                </p>
              </div>
          </div>

          {canManage && activeTab === 'events' && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowCreate(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300 transition-all hover:bg-cyan-500/20 sm:w-auto sm:px-5"
            >
              <Plus className="h-5 w-5" />
              Nuevo evento
            </button>
          )}
          {canManage && activeTab === 'crews' && (
            <button
              onClick={() => setShowCrewCreate(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300 transition-all hover:bg-cyan-500/20 sm:w-auto sm:px-5"
            >
              <Plus className="h-5 w-5" />
              Nuevo crew
            </button>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/80 p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`rounded-xl px-4 py-2 text-sm font-light transition-all ${
                  activeTab === 'events'
                    ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : 'border border-transparent text-zinc-300 hover:text-white'
                }`}
              >
                Eventos
              </button>
              <button
                onClick={() => setActiveTab('crews')}
                className={`rounded-xl px-4 py-2 text-sm font-light transition-all ${
                  activeTab === 'crews'
                    ? 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : 'border border-transparent text-zinc-300 hover:text-white'
                }`}
              >
                Crews
              </button>
            </div>
            {activeTab === 'events' && (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                <button
                  onClick={() => setViewMode('month')}
                  className={`rounded-lg border px-3 py-2 text-xs font-light transition-all ${
                    viewMode === 'month'
                      ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
                      : 'border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-2 rounded-lg text-xs font-light border transition-all ${
                    viewMode === 'week'
                      ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
                      : 'border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`rounded-lg border px-3 py-2 text-xs font-light transition-all ${
                    viewMode === 'day'
                      ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
                      : 'border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  Día
                </button>
                </div>
                <button
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                </button>
              </div>
            )}
          </div>

          {filtersOpen && activeTab === 'events' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Desde</label>
                <input
                  type="datetime-local"
                  value={toDateInput(filters.start)}
                  onChange={(e) => setFilters({ ...filters, start: new Date(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Hasta</label>
                <input
                  type="datetime-local"
                  value={toDateInput(filters.end)}
                  onChange={(e) => setFilters({ ...filters, end: new Date(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="">Todos</option>
                  {EVENT_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Prioridad</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="">Todas</option>
                  {EVENT_PRIORITIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="">Todos</option>
                  {EVENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Proyecto</label>
                <select
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="">Todos</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-zinc-300 py-16">Cargando agenda...</div>
        ) : activeTab === 'events' ? (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/80 p-3 sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-300 capitalize">
                {anchorDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                <button
                  onClick={() => setAnchorDate(addDays(anchorDate, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30))}
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setAnchorDate(new Date())}
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setAnchorDate(addDays(anchorDate, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30))}
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Siguiente
                </button>
              </div>
            </div>

            {viewMode === 'month' && (
              <>
              <div className="hidden grid-cols-7 gap-2 md:grid">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label) => (
                  <div key={label} className="text-xs text-zinc-300 text-center">
                    {label}
                  </div>
                ))}
                {monthMatrix.flat().map((day) => {
                  const key = formatDateKey(day);
                  const dayEvents = eventsByDay.get(key) || [];
                  const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={`min-h-[110px] rounded-xl border border-zinc-800/70 p-2 ${
                        isCurrentMonth ? 'bg-zinc-900/50' : 'bg-zinc-900/20 text-zinc-600'
                      } ${isToday ? 'ring-1 ring-cyan-400/70 border-cyan-500/60' : ''}`}
                      onClick={() => openCreateForSlot(day)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className={`text-xs ${isToday ? 'text-cyan-200' : 'text-zinc-300'}`}>{day.getDate()}</div>
                        {isToday && (
                          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-200">
                            Hoy
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="text-[11px] text-zinc-200 rounded-lg px-2 py-1 border"
                            style={{
                              backgroundColor: `${event.typeColor || '#0ea5e9'}1a`,
                              borderColor: `${event.typeColor || '#0ea5e9'}55`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEvent(event);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{event.title}</span>
                              {remindersByEvent.has(event.id) && (
                                <Bell className="h-3 w-3 text-emerald-300" />
                              )}
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[11px] text-zinc-300">+{dayEvents.length - 3} más</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4 md:hidden">
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                  <div className="flex min-w-max gap-2">
                    {mobileVisibleDays.map((day) => {
                      const key = formatDateKey(day);
                      const isActive = key === mobileSelectedDateKey;
                      const isToday = key === todayKey;
                      const dayEvents = eventsByDay.get(key) || [];
                      return (
                        <button
                          key={`mobile-month-chip-${key}`}
                          type="button"
                          onClick={() => setAnchorDate(day)}
                          className={`min-w-[4.5rem] rounded-2xl border px-3 py-2 text-left transition-all ${
                            isActive
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
                          } ${isToday ? 'ring-1 ring-cyan-400/60' : ''}`}
                        >
                          <div className="text-[10px] uppercase tracking-wide">
                            {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                          </div>
                          <div className="mt-1 text-lg leading-none">{day.getDate()}</div>
                          <div className="mt-1 text-[10px] text-zinc-400">{isToday ? 'Hoy' : `${dayEvents.length} ev.`}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">
                        {anchorDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-zinc-400">{mobileSelectedEvents.length} evento(s)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateForSlot(anchorDate)}
                      className="rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Agregar
                    </button>
                  </div>
                  {mobileSelectedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-sm text-zinc-400">
                      Sin eventos para este día.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mobileSelectedEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="w-full rounded-xl border px-3 py-3 text-left"
                          style={{
                            backgroundColor: `${event.typeColor || '#0ea5e9'}14`,
                            borderColor: `${event.typeColor || '#0ea5e9'}55`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-zinc-100">{event.title}</div>
                              <div className="mt-1 text-xs text-zinc-300">
                                {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {remindersByEvent.has(event.id) && <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {viewMode === 'week' && (
              <>
              <div className="hidden grid-cols-8 gap-2 md:grid">
                <div className="text-xs text-zinc-300">Hora</div>
                {weekDays.map((day) => {
                  const isToday = formatDateKey(day) === todayKey;
                  return (
                    <div
                      key={formatDateKey(day)}
                      className={`rounded-lg px-2 py-1 text-center text-xs ${isToday ? 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-200' : 'text-zinc-300'}`}
                    >
                      {day.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' })}
                    </div>
                  );
                })}
                {dayHours.map((hour) => (
                  <React.Fragment key={`hour-${hour}`}>
                    <div className="text-xs text-zinc-300 py-3">{String(hour).padStart(2, '0')}:00</div>
                    {weekDays.map((day) => {
                      const slotKey = formatDateKey(day);
                      const slotEvents = (eventsByDay.get(slotKey) || []).filter((event) => {
                        const start = new Date(event.startAt);
                        return start.getHours() === hour;
                      });
                      return (
                        <div
                          key={`${slotKey}-${hour}`}
                          className="border border-zinc-800/50 rounded-lg min-h-[48px] p-1 cursor-pointer"
                          onClick={() => openCreateForSlot(day, hour)}
                          role="button"
                          tabIndex={0}
                        >
                          {slotEvents.map((event) => (
                            <div
                              key={event.id}
                              className="text-[10px] text-zinc-200 rounded-md px-2 py-1 border"
                              style={{
                                backgroundColor: `${event.typeColor || '#0ea5e9'}1a`,
                                borderColor: `${event.typeColor || '#0ea5e9'}55`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEvent(event);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{event.title}</span>
                                {remindersByEvent.has(event.id) && (
                                  <Bell className="h-3 w-3 text-emerald-300" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="space-y-4 md:hidden">
                <div className="overflow-x-auto pb-1 scrollbar-hide">
                  <div className="flex min-w-max gap-2">
                    {weekDays.map((day) => {
                      const key = formatDateKey(day);
                      const isToday = key === todayKey;
                      const isActive = key === mobileSelectedDateKey;
                      const dayEvents = eventsByDay.get(key) || [];
                      return (
                        <button
                          key={`mobile-week-chip-${key}`}
                          type="button"
                          onClick={() => setAnchorDate(day)}
                          className={`min-w-[4.75rem] rounded-2xl border px-3 py-2 text-left transition-all ${
                            isActive
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
                          } ${isToday ? 'ring-1 ring-cyan-400/60' : ''}`}
                        >
                          <div className="text-[10px] uppercase tracking-wide">
                            {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                          </div>
                          <div className="mt-1 text-lg leading-none">{day.getDate()}</div>
                          <div className="mt-1 text-[10px] text-zinc-400">{isToday ? 'Hoy' : `${dayEvents.length} ev.`}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">
                        {anchorDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-zinc-400">{mobileSelectedEvents.length} evento(s)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateForSlot(anchorDate)}
                      className="rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Agregar
                    </button>
                  </div>
                  {mobileSelectedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-sm text-zinc-400">
                      Sin eventos para este día.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mobileSelectedEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="w-full rounded-xl border px-3 py-3 text-left"
                          style={{
                            backgroundColor: `${event.typeColor || '#0ea5e9'}14`,
                            borderColor: `${event.typeColor || '#0ea5e9'}55`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-zinc-100">{event.title}</div>
                              <div className="mt-1 text-xs text-zinc-300">
                                {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {remindersByEvent.has(event.id) && <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {viewMode === 'day' && (
              <>
              <div className="hidden grid-cols-2 gap-2 md:grid">
                <div className="text-xs text-zinc-300">Hora</div>
                <div className={`text-xs ${formatDateKey(anchorDate) === todayKey ? 'text-cyan-200' : 'text-zinc-300'}`}>
                  {anchorDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
                </div>
                {dayHours.map((hour) => {
                  const slotKey = formatDateKey(anchorDate);
                  const slotEvents = (eventsByDay.get(slotKey) || []).filter((event) => {
                    const start = new Date(event.startAt);
                    return start.getHours() === hour;
                  });
                  return (
                    <React.Fragment key={`day-${hour}`}>
                      <div className="text-xs text-zinc-300 py-3">{String(hour).padStart(2, '0')}:00</div>
                      <div
                        className="border border-zinc-800/50 rounded-lg min-h-[48px] p-1 cursor-pointer"
                        onClick={() => openCreateForSlot(anchorDate, hour)}
                        role="button"
                        tabIndex={0}
                      >
                        {slotEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-[10px] text-zinc-200 rounded-md px-2 py-1 border"
                            style={{
                              backgroundColor: `${event.typeColor || '#0ea5e9'}1a`,
                              borderColor: `${event.typeColor || '#0ea5e9'}55`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEvent(event);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{event.title}</span>
                              {remindersByEvent.has(event.id) && (
                                <Bell className="h-3 w-3 text-emerald-300" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="space-y-4 md:hidden">
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">
                        {anchorDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-xs text-zinc-400">{mobileSelectedEvents.length} evento(s)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateForSlot(anchorDate)}
                      className="rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Agregar
                    </button>
                  </div>
                  {mobileSelectedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-sm text-zinc-400">
                      Sin eventos para este día.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mobileSelectedEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="w-full rounded-xl border px-3 py-3 text-left"
                          style={{
                            backgroundColor: `${event.typeColor || '#0ea5e9'}14`,
                            borderColor: `${event.typeColor || '#0ea5e9'}55`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-zinc-100">{event.title}</div>
                              <div className="mt-1 text-xs text-zinc-300">
                                {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {remindersByEvent.has(event.id) && <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {crews.length === 0 ? (
              <div className="text-center text-zinc-300 py-16">No hay crews creados.</div>
            ) : (
              crews.map((crew) => (
                <div
                  key={crew.id}
                  className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg text-white font-light">{crew.name}</h3>
                      {crew.description && (
                        <p className="text-xs text-zinc-300 mt-1">{crew.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-300">
                    Miembros: {crew.members?.length || 0}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(crew.members || []).map((member: any) => (
                      <span
                        key={member.id}
                        className="px-3 py-1 rounded-full border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2"
                      >
                        {member.user?.name || member.user?.email}
                        {canManage && (
                          <button
                            onClick={() => handleRemoveCrewMember(crew.id, member.userId)}
                            className="text-zinc-300 hover:text-red-300"
                          >
                            Quitar
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-3">
                      <select
                        onChange={(e) => handleAddCrewMember(crew.id, e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                        defaultValue=""
                      >
                        <option value="">Agregar miembro</option>
                        {users.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/80 via-zinc-950/70 to-black/90 backdrop-blur-md"
            onClick={() => {
              setShowCreate(false);
              setEditingEvent(null);
            }}
          />
          <div className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/20 bg-zinc-900/80 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)] overscroll-contain scrollbar-hide sm:max-h-[calc(100vh-3rem)] sm:p-6">
            <div className="absolute inset-0 rounded-3xl pointer-events-none bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02]" />
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl text-white font-light">
                {editingEvent ? 'Editar evento' : 'Nuevo evento'}
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingEvent(null);
                }}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>

            {selectedEvents.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-zinc-300 mb-2">
                  Eventos existentes en {selectedSlotLabel}
                </div>
                <div className="space-y-2">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
                      style={{
                        backgroundColor: `${event.typeColor || '#0ea5e9'}1a`,
                        borderColor: `${event.typeColor || '#0ea5e9'}55`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-zinc-200">{event.title}</div>
                          <div className="text-xs text-zinc-300">
                            {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="px-3 py-1.5 text-xs rounded-full border border-white/20 text-zinc-100 hover:border-white/30 hover:text-white transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingReminder && (
              <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-emerald-200 mb-2">
                  <Bell className="h-4 w-4" />
                  Recordatorio activo (12h antes)
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => snooze(editingReminder.id, 60)}
                    className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                  >
                    Posponer 1h
                  </button>
                  <button
                    type="button"
                    onClick={() => snooze(editingReminder.id, 180)}
                    className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                  >
                    Posponer 3h
                  </button>
                  <button
                    type="button"
                    onClick={() => snooze(editingReminder.id, 720)}
                    className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                  >
                    Posponer 12h
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(editingReminder.id)}
                    className="px-3 py-1.5 text-xs rounded-full border border-red-500/40 text-red-200 hover:bg-red-500/10 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  placeholder="Visita técnica, instalación, etc."
                  disabled={!canManage && !!editingEvent}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  disabled={!canManage && !!editingEvent}
                >
                  {EVENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                >
                  {EVENT_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  disabled={!canManage && !!editingEvent}
                >
                  {EVENT_PRIORITIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Inicio</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="date"
                    value={splitDateTime(form.startAt).datePart}
                    onChange={(e) => setForm({ ...form, startAt: updateDateTime(form.startAt, e.target.value) })}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 sm:col-span-2"
                    disabled={!canManage && !!editingEvent}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={splitDateTime(form.startAt).timePart.slice(0, 2)}
                      onChange={(e) => {
                        const current = splitDateTime(form.startAt).timePart;
                        const next = `${e.target.value}:${current.slice(3, 5)}`;
                        setForm({ ...form, startAt: updateDateTime(form.startAt, undefined, next) });
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200"
                      disabled={!canManage && !!editingEvent}
                    >
                      {hoursOptions.map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                      value={splitDateTime(form.startAt).timePart.slice(3, 5)}
                      onChange={(e) => {
                        const current = splitDateTime(form.startAt).timePart;
                        const next = `${current.slice(0, 2)}:${e.target.value}`;
                        setForm({ ...form, startAt: updateDateTime(form.startAt, undefined, next) });
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200"
                      disabled={!canManage && !!editingEvent}
                    >
                      {minutesOptions.map((min) => (
                        <option key={min} value={min}>{min}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Fin</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="date"
                    value={splitDateTime(form.endAt).datePart}
                    onChange={(e) => setForm({ ...form, endAt: updateDateTime(form.endAt, e.target.value) })}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 sm:col-span-2"
                    disabled={!canManage && !!editingEvent}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={splitDateTime(form.endAt).timePart.slice(0, 2)}
                      onChange={(e) => {
                        const current = splitDateTime(form.endAt).timePart;
                        const next = `${e.target.value}:${current.slice(3, 5)}`;
                        setForm({ ...form, endAt: updateDateTime(form.endAt, undefined, next) });
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200"
                      disabled={!canManage && !!editingEvent}
                    >
                      {hoursOptions.map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                      value={splitDateTime(form.endAt).timePart.slice(3, 5)}
                      onChange={(e) => {
                        const current = splitDateTime(form.endAt).timePart;
                        const next = `${current.slice(0, 2)}:${e.target.value}`;
                        setForm({ ...form, endAt: updateDateTime(form.endAt, undefined, next) });
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200"
                      disabled={!canManage && !!editingEvent}
                    >
                      {minutesOptions.map((min) => (
                        <option key={min} value={min}>{min}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-300 mb-1">Ubicación</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  disabled={!canManage && !!editingEvent}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Proyecto</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  disabled={!canManage && !!editingEvent}
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Crew</label>
                <select
                  value={form.crewId}
                  onChange={(e) => setForm({ ...form, crewId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                  disabled={!canManage && !!editingEvent}
                >
                  <option value="">Sin crew</option>
                  {crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>{crew.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-300 mb-2">Asignar usuarios</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {users.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={form.assigneeIds.includes(member.id)}
                        onChange={() => toggleAssignee(member.id)}
                        className="accent-cyan-500"
                        disabled={!canManage && !!editingEvent}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-300 mb-1">Notas internas</label>
                <textarea
                  value={form.notesInternal}
                  onChange={(e) => setForm({ ...form, notesInternal: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[90px]"
                  disabled={!canManage && !!editingEvent}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-300 mb-1">Notas para instalador</label>
                <textarea
                  value={form.notesInstaller}
                  onChange={(e) => setForm({ ...form, notesInstaller: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[90px]"
                />
              </div>
              {editingEvent && (
                <div className="md:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-zinc-200 font-light">Conversación del evento</div>
                    <span className="text-xs text-zinc-300">Comunicaciones internas</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                    {messages.length === 0 ? (
                      <div className="text-xs text-zinc-300">Sin mensajes todavía.</div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="rounded-lg border border-zinc-800/70 bg-zinc-950/60 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-zinc-300">
                              {msg.user?.name || msg.user?.email}
                            </div>
                            <div className="flex items-center gap-2">
                              {msg.visibility === 'ADMIN_ONLY' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-200">
                                  Solo admin
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-300">
                                {new Date(msg.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-zinc-200 mt-2">{msg.body}</div>
                          {Array.isArray(msg.images) && msg.images.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {msg.images.map((url: string, idx: number) => (
                                <a key={`${msg.id}-img-${idx}`} href={url} target="_blank" rel="noreferrer">
                                  <img
                                    src={url}
                                    alt="Adjunto"
                                    className="w-full h-24 object-cover rounded-lg border border-zinc-800"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[80px]"
                      placeholder="Escribí un mensaje para el equipo..."
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 cursor-pointer hover:bg-zinc-800">
                        Adjuntar imágenes
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setMessageImages(files);
                          }}
                        />
                      </label>
                      {messageImages.length > 0 && (
                        <span className="text-[10px] text-zinc-300">{messageImages.length} imagen(es) seleccionada(s)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {canManage && (
                        <select
                          value={messageVisibility}
                          onChange={(e) => setMessageVisibility(e.target.value as 'ALL' | 'ADMIN_ONLY')}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
                        >
                          <option value="ALL">Visible para todos los asignados</option>
                          <option value="ADMIN_ONLY">Solo administradores</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all text-sm"
                      >
                        Enviar mensaje
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.assigneesCanEdit}
                  onChange={(e) => setForm({ ...form, assigneesCanEdit: e.target.checked })}
                  className="accent-cyan-500"
                  disabled={!canManage && !!editingEvent}
                />
                <span className="text-sm text-zinc-300">Permitir que los instaladores editen</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.lockedByAdmin}
                  onChange={(e) => setForm({ ...form, lockedByAdmin: e.target.checked })}
                  className="accent-cyan-500"
                  disabled={!canManage && !!editingEvent}
                />
                <span className="text-sm text-zinc-300">Bloquear edición</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {editingEvent && canManage && (
                <button
                  onClick={handleDelete}
                  className="rounded-lg border border-red-500/40 px-4 py-2 text-red-300 transition-all hover:border-red-500/70 hover:text-red-200"
                >
                  Eliminar
                </button>
              )}
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all"
              >
                {editingEvent ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCrewCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCrewCreate(false)}
          />
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-white font-light">Nuevo crew</h2>
              <button
                onClick={() => setShowCrewCreate(false)}
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Nombre</label>
                <input
                  value={crewForm.name}
                  onChange={(e) => setCrewForm({ ...crewForm, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-300 mb-1">Descripción</label>
                <textarea
                  value={crewForm.description}
                  onChange={(e) => setCrewForm({ ...crewForm, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[90px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCrewCreate(false)}
                className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCrew}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
