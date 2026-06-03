import React, { useEffect, useState } from 'react';
import { HdBell, HdX } from '@/components/ui/HandDrawnIcons';
import { pushNotificationService } from '@/services/pushNotificationService';

const DISMISSED_KEY = 'browser-notification-permission-dismissed';

export const BrowserNotificationPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !pushNotificationService.isSupported()) return;
    if (Notification.permission !== 'default') return;
    if (window.localStorage.getItem(DISMISSED_KEY) === '1') return;

    let cancelled = false;
    let timer = 0;

    void pushNotificationService.getStatus().then((status) => {
      if (cancelled || !status.enabled) return;
      timer = window.setTimeout(() => setVisible(true), 1200);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    void pushNotificationService.syncIfGranted();
  }, []);

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      const result = await pushNotificationService.subscribe();
      const permission = Notification.permission;

      if (result.subscribed || permission !== 'default') {
        setVisible(false);
      }
      if (permission === 'denied') {
        window.localStorage.setItem(DISMISSED_KEY, '1');
      }
      if (!result.subscribed && result.reason === 'disabled') {
        console.warn('Las notificaciones push todavía no están configuradas en el backend.');
      }
    } catch (error) {
      console.error('No se pudo solicitar permiso de notificaciones', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[65] max-w-md rounded-2xl border border-cyan-500/30 bg-zinc-950/95 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
          <HdBell size={20} className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Activar notificaciones</div>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Activá notificaciones reales para recibir recordatorios de agenda también cuando uses la app instalada en el celular.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25"
            >
              {loading ? 'Activando...' : 'Permitir'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              Más tarde
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar aviso de notificaciones"
          className="text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <HdX size={16} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
