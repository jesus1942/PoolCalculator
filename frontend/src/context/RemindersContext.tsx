import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { agendaReminderService } from '@/services/agendaReminderService';

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

  const refresh = useCallback(async () => {
    try {
      const data = await agendaReminderService.listDue();
      setReminders(data);
    } catch (error) {
      console.error('Error al cargar recordatorios:', error);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const snooze = useCallback(async (id: string, minutes: number) => {
    await agendaReminderService.snooze(id, minutes);
    await refresh();
  }, [refresh]);

  const dismiss = useCallback(async (id: string) => {
    await agendaReminderService.dismiss(id);
    await refresh();
  }, [refresh]);

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
