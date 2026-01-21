import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Clock, MapPin, X } from 'lucide-react';
import { useReminders } from '@/context/RemindersContext';

export const ReminderToasts: React.FC = () => {
  const { reminders, snooze, dismiss } = useReminders();
  const navigate = useNavigate();

  const visibleReminders = useMemo(() => reminders.slice(0, 3), [reminders]);

  if (visibleReminders.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[60] w-[360px] max-w-[90vw] space-y-3">
      {visibleReminders.map((reminder) => {
        const startAt = new Date(reminder.event.startAt);
        const startLabel = startAt.toLocaleString('es-AR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div key={reminder.id} className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-emerald-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none"></div>
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-teal-400"></div>

            <div className="relative p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Bell className="h-4 w-4 text-emerald-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm text-white font-light">Recordatorio de agenda</div>
                    <div className="text-xs text-zinc-400 mt-1">{reminder.event.title}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(reminder.id)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors"
                  aria-label="Descartar recordatorio"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{startLabel}</span>
                </div>
                {reminder.event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{reminder.event.location}</span>
                  </div>
                )}
                {reminder.event.project?.name && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Proyecto: {reminder.event.project.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => snooze(reminder.id, 60)}
                  className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                >
                  Posponer 1h
                </button>
                <button
                  type="button"
                  onClick={() => snooze(reminder.id, 180)}
                  className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                >
                  Posponer 3h
                </button>
                <button
                  type="button"
                  onClick={() => snooze(reminder.id, 720)}
                  className="px-3 py-1.5 text-xs rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition-colors"
                >
                  Posponer 12h
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/agenda')}
                  className="px-3 py-1.5 text-xs rounded-full border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                >
                  Ver agenda
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(reminder.id)}
                  className="px-3 py-1.5 text-xs rounded-full border border-red-500/40 text-red-200 hover:bg-red-500/10 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
