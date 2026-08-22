import React, { useEffect, useMemo, useState } from 'react';
import { Agenda } from '@/pages/Agenda';
import { agendaService } from '@/services/agendaService';
import { HdCalendar, HdClock, HdMapPin, HdPlus, HdChevronRight } from '@/components/ui/HandDrawnIcons';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const statusTone = (status: string) => {
  if (status === 'DONE') return 'var(--good)';
  if (status === 'IN_PROGRESS' || status === 'CONFIRMED') return 'var(--accent)';
  if (status === 'CANCELED') return 'var(--bad)';
  return 'var(--warm)';
};

const statusLabel = (status: string) => ({
  PLANNED: 'Planificado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'En progreso',
  DONE: 'Finalizado',
  CANCELED: 'Cancelado',
}[status] || status || 'Planificado');

const AgendaMobile: React.FC<{ onOpenFull: () => void }> = ({ onOpenFull }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'today' | 'week'>('today');

  useEffect(() => {
    let mounted = true;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    agendaService.list({ start: start.toISOString(), end: end.toISOString() })
      .then((data) => {
        if (mounted) setEvents(data);
      })
      .catch((error) => console.error('Error al cargar agenda:', error))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const now = new Date();
    const today = formatDateKey(now);
    return events
      .filter((event) => scope === 'week' || formatDateKey(new Date(event.startAt)) === today)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, scope]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    visibleEvents.forEach((event) => {
      const key = formatDateKey(new Date(event.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(event);
    });
    return Array.from(map.entries());
  }, [visibleEvents]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Planificación</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Agenda</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Trabajo, visitas, entregas y mantenimiento.</p>
        </div>
        <button
          type="button"
          onClick={onOpenFull}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
          style={{ border: '1.4px solid var(--accent)', backgroundColor: 'var(--accent-2)', color: 'var(--accent)' }}
        >
          <HdPlus size={17} />
          Gestionar
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setScope('today')}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold"
          style={{
            border: `1.4px solid ${scope === 'today' ? 'var(--accent)' : 'var(--hair-strong)'}`,
            backgroundColor: scope === 'today' ? 'var(--accent-2)' : 'var(--card)',
            color: scope === 'today' ? 'var(--accent)' : 'var(--ink-soft)',
          }}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setScope('week')}
          className="min-h-11 rounded-xl px-4 text-sm font-semibold"
          style={{
            border: `1.4px solid ${scope === 'week' ? 'var(--accent)' : 'var(--hair-strong)'}`,
            backgroundColor: scope === 'week' ? 'var(--accent-2)' : 'var(--card)',
            color: scope === 'week' ? 'var(--accent)' : 'var(--ink-soft)',
          }}
        >
          Próximos 7 días
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rough-panel p-8 text-center">
          <HdCalendar size={32} className="relative mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="relative mt-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>No hay trabajos programados</p>
          <p className="relative mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>La agenda está libre para este período.</p>
          <button
            type="button"
            onClick={onOpenFull}
            className="relative mt-5 min-h-11 rounded-xl px-4 text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--paper)' }}
          >
            Crear evento
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([key, dayEvents]) => {
            const date = new Date(`${key}T12:00:00`);
            return (
              <section key={key}>
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <h2 className="text-sm font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                    {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <span className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>{dayEvents.length} evento(s)</span>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={onOpenFull}
                      className="rough-panel block w-full p-4 text-left"
                    >
                      <span className="relative flex items-start gap-3">
                        <span className="w-12 shrink-0 font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                          {formatTime(event.startAt)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                                {event.title || 'Trabajo programado'}
                              </span>
                              <span className="mt-1 block text-xs" style={{ color: 'var(--ink-soft)' }}>
                                {event.type || 'Trabajo'}
                              </span>
                            </span>
                            <span className="rough-chip shrink-0" style={{ color: statusTone(event.status) }}>
                              {statusLabel(event.status)}
                            </span>
                          </span>

                          <span className="mt-3 flex flex-col gap-1.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
                            {event.location && (
                              <span className="flex items-center gap-2">
                                <HdMapPin size={14} />
                                <span className="truncate">{event.location}</span>
                              </span>
                            )}
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <HdClock size={14} />
                                {formatTime(event.startAt)}–{formatTime(event.endAt)}
                              </span>
                              <HdChevronRight size={16} style={{ color: 'var(--accent)' }} />
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export const AgendaExperience: React.FC = () => {
  const [fullMode, setFullMode] = useState(false);

  if (fullMode) {
    return (
      <div>
        <div className="sticky top-14 z-10 px-4 pt-3 md:hidden">
          <button
            type="button"
            onClick={() => setFullMode(false)}
            className="min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
            style={{ border: '1.4px solid var(--accent)', backgroundColor: 'var(--accent-2)', color: 'var(--accent)' }}
          >
            Volver a agenda mobile
          </button>
        </div>
        <Agenda />
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <AgendaMobile onOpenFull={() => setFullMode(true)} />
      </div>
      <div className="hidden md:block">
        <Agenda />
      </div>
    </>
  );
};
