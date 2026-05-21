import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { agendaReminderService } from '@/services/agendaReminderService';
import { PUSH_SUBSCRIPTION_FLAG } from '@/services/pushNotificationService';

interface ReminderContextValue {
  reminders: any[];
  loading: boolean;
  refresh: () => Promise<void>;
  snooze: (id: string, minutes: number) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const RemindersContext = createContext<ReminderContextValue | undefined>(undefined);

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const notifiedReminderIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('browser-notified-reminders');
      if (stored) {
        notifiedReminderIdsRef.current = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('No se pudo restaurar el historial de notificaciones del navegador', error);
    }
  }, []);

  const persistNotifiedReminderIds = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'browser-notified-reminders',
        JSON.stringify(Array.from(notifiedReminderIdsRef.current)),
      );
    } catch (error) {
      console.warn('No se pudo guardar el historial de notificaciones del navegador', error);
    }
  }, []);

  const notifyBrowserForReminders = useCallback((items: any[]) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    if (window.localStorage.getItem(PUSH_SUBSCRIPTION_FLAG) === '1') {
      return;
    }

    const freshReminders = items.filter((reminder) => !notifiedReminderIdsRef.current.has(reminder.id));
    freshReminders.forEach((reminder) => {
      const startAt = new Date(reminder.event.startAt);
      const startLabel = startAt.toLocaleString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const notification = new Notification('Recordatorio de agenda', {
        body: `${reminder.event.title}\n${startLabel}${reminder.event.location ? `\n${reminder.event.location}` : ''}`,
        tag: `agenda-reminder-${reminder.id}`,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/agenda';
      };

      notifiedReminderIdsRef.current.add(reminder.id);
    });

    if (freshReminders.length > 0) {
      persistNotifiedReminderIds();
    }
  }, [persistNotifiedReminderIds]);

  const refresh = useCallback(async () => {
    try {
      const data = await agendaReminderService.listDue();
      setReminders(data);
      notifyBrowserForReminders(data);
    } catch (error) {
      console.error('Error al cargar recordatorios:', error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [notifyBrowserForReminders]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const snooze = useCallback(async (id: string, minutes: number) => {
    const previousReminders = reminders;
    setReminders((current) => current.filter((reminder) => reminder.id !== id));

    try {
      await agendaReminderService.snooze(id, minutes);
      await refresh();
    } catch (error) {
      console.error('Error al posponer recordatorio:', error);
      setReminders(previousReminders);
      throw error;
    }
  }, [refresh, reminders]);

  const dismiss = useCallback(async (id: string) => {
    const previousReminders = reminders;
    setReminders((current) => current.filter((reminder) => reminder.id !== id));

    try {
      await agendaReminderService.dismiss(id);
      await refresh();
    } catch (error) {
      console.error('Error al descartar recordatorio:', error);
      setReminders(previousReminders);
      throw error;
    }
  }, [refresh, reminders]);

  const value = useMemo(() => ({
    reminders,
    loading,
    refresh,
    snooze,
    dismiss,
  }), [reminders, loading, refresh, snooze, dismiss]);

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useReminders debe usarse dentro de RemindersProvider');
  }
  return context;
};
