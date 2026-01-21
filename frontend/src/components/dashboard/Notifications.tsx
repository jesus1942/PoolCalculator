import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X, Cloud, FolderOpen, Settings, TrendingUp } from 'lucide-react';
import { Project } from '@/types';
import { WeatherData, isGoodWorkingWeather } from '@/services/weatherService';
import { useReminders } from '@/context/RemindersContext';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'weather';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: React.ReactNode;
  actionUrl?: string;
  actions?: { label: string; onClick: () => void; tone?: 'primary' | 'danger' }[];
}

interface NotificationsProps {
  projects: Project[];
  weather?: WeatherData | null;
}

export const Notifications: React.FC<NotificationsProps> = ({ projects, weather }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { reminders, snooze, dismiss } = useReminders();

  useEffect(() => {
    generateNotifications();
  }, [projects, weather, reminders]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];

    // Verificar proyectos en progreso
    const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS');
    if (inProgressProjects.length > 0) {
      newNotifications.push({
        id: 'in-progress-1',
        type: 'info',
        title: 'Proyectos en progreso',
        message: `Tenés ${inProgressProjects.length} proyecto${inProgressProjects.length > 1 ? 's' : ''} en progreso`,
        timestamp: new Date(),
        read: false,
        icon: <FolderOpen className="w-4 h-4" />,
        actionUrl: '/projects'
      });
    }

    // Verificar proyectos completados recientemente (últimos 7 días)
    const recentlyCompleted = projects.filter(p => {
      if (p.status !== 'COMPLETED') return false;
      const updatedDate = new Date(p.updatedAt);
      const daysDiff = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    if (recentlyCompleted.length > 0) {
      newNotifications.push({
        id: 'completed-1',
        type: 'success',
        title: '¡Proyectos completados!',
        message: `${recentlyCompleted.length} proyecto${recentlyCompleted.length > 1 ? 's completados' : ' completado'} esta semana`,
        timestamp: new Date(recentlyCompleted[0].updatedAt),
        read: false,
        icon: <CheckCircle2 className="w-4 h-4" />,
        actionUrl: '/projects'
      });
    }

    // Alertas climáticas
    if (weather) {
      const today = weather.current;
      const tomorrow = weather.daily[1];

      // Alerta de mal clima hoy
      if (!isGoodWorkingWeather(today.weatherCode, today.windSpeed, 0)) {
        newNotifications.push({
          id: 'weather-today',
          type: 'warning',
          title: 'Condiciones adversas hoy',
          message: `Clima desfavorable para trabajos en exterior. Viento: ${today.windSpeed}km/h`,
          timestamp: new Date(),
          read: false,
          icon: <Cloud className="w-4 h-4" />,
        });
      }

      // Alerta de buen clima mañana
      if (tomorrow && isGoodWorkingWeather(tomorrow.weatherCode, tomorrow.windSpeed, tomorrow.precipitation)) {
        newNotifications.push({
          id: 'weather-tomorrow',
          type: 'info',
          title: 'Buen clima mañana',
          message: `Condiciones ideales para trabajar. Temp: ${tomorrow.maxTemp}°C`,
          timestamp: new Date(),
          read: false,
          icon: <Cloud className="w-4 h-4" />,
        });
      }

      // Alerta de lluvia próxima
      const rainyDays = weather.daily.slice(0, 3).filter(day => day.precipitation > 5);
      if (rainyDays.length > 0) {
        newNotifications.push({
          id: 'weather-rain',
          type: 'warning',
          title: 'Lluvia próxima',
          message: `Se esperan ${rainyDays.length} día${rainyDays.length > 1 ? 's' : ''} con lluvia en los próximos 3 días`,
          timestamp: new Date(),
          read: false,
          icon: <Cloud className="w-4 h-4" />,
        });
      }
    }

    // Recordatorios de agenda (12h antes)
    if (reminders.length > 0) {
      reminders.forEach((reminder: any) => {
        const startAt = new Date(reminder.event.startAt);
        const startLabel = startAt.toLocaleString('es-AR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        newNotifications.push({
          id: `reminder-${reminder.id}`,
          type: 'info',
          title: 'Recordatorio de agenda',
          message: `${reminder.event.title} · ${startLabel}`,
          timestamp: new Date(reminder.remindAt),
          read: false,
          icon: <Bell className="w-4 h-4" />,
          actionUrl: '/agenda',
          actions: [
            { label: 'Posponer 1h', onClick: () => snooze(reminder.id, 60) },
            { label: 'Posponer 3h', onClick: () => snooze(reminder.id, 180) },
            { label: 'Posponer 12h', onClick: () => snooze(reminder.id, 720) },
            { label: 'Descartar', onClick: () => dismiss(reminder.id), tone: 'danger' },
          ],
        });
      });
    }

    // Alerta de proyectos sin actividad reciente (más de 30 días)
    const staleProjects = projects.filter(p => {
      if (p.status === 'COMPLETED') return false;
      const updatedDate = new Date(p.updatedAt);
      const daysDiff = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    });

    if (staleProjects.length > 0) {
      newNotifications.push({
        id: 'stale-projects',
        type: 'warning',
        title: 'Proyectos sin actualizar',
        message: `${staleProjects.length} proyecto${staleProjects.length > 1 ? 's' : ''} sin actividad hace más de 30 días`,
        timestamp: new Date(),
        read: false,
        icon: <AlertTriangle className="w-4 h-4" />,
        actionUrl: '/projects'
      });
    }

    // Recordatorio de configuración si hay pocos modelos
    const mockPresetsCount = 5; // En un caso real, recibirías esto como prop
    if (mockPresetsCount < 3) {
      newNotifications.push({
        id: 'few-presets',
        type: 'info',
        title: 'Configuración recomendada',
        message: 'Agregá más modelos de piscinas para ofrecer más opciones a tus clientes',
        timestamp: new Date(),
        read: false,
        icon: <Settings className="w-4 h-4" />,
        actionUrl: '/pool-models'
      });
    }

    // Métricas positivas
    if (projects.length > 0) {
      const completionRate = (projects.filter(p => p.status === 'COMPLETED').length / projects.length) * 100;
      if (completionRate >= 80) {
        newNotifications.push({
          id: 'high-completion',
          type: 'success',
          title: '¡Excelente desempeño!',
          message: `Tasa de completitud del ${completionRate.toFixed(0)}%. ¡Seguí así!`,
          timestamp: new Date(),
          read: false,
          icon: <TrendingUp className="w-4 h-4" />,
        });
      }
    }

    // Ordenar por fecha (más recientes primero)
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setNotifications(newNotifications);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-950/30',
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-400'
        };
      case 'warning':
        return {
          bg: 'bg-orange-950/30',
          border: 'border-orange-500/30',
          iconBg: 'bg-orange-500/10',
          iconColor: 'text-orange-400'
        };
      case 'weather':
        return {
          bg: 'bg-blue-950/30',
          border: 'border-blue-500/30',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400'
        };
      default:
        return {
          bg: 'bg-zinc-900/30',
          border: 'border-zinc-700/30',
          iconBg: 'bg-zinc-700/10',
          iconColor: 'text-zinc-400'
        };
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900/80 hover:border-zinc-700/50 transition-all duration-200 group"
      >
        <Bell className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />

        {/* Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-black">
            <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/50 shadow-2xl overflow-hidden z-50"
          style={{
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-light text-white">Notificaciones</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Marcar todas leídas
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-zinc-500 font-light">
                {unreadCount} sin leer
              </p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-500 font-light">No hay notificaciones</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notification) => {
                  const styles = getNotificationStyles(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`relative rounded-xl p-4 border ${styles.bg} ${styles.border} ${!notification.read ? 'opacity-100' : 'opacity-60'} transition-all hover:opacity-100`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.actionUrl) {
                          // Aquí podrías navegar si tuvieras useNavigate
                          console.log('Navigate to:', notification.actionUrl);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${styles.iconBg} ${styles.iconColor} flex-shrink-0`}>
                          {notification.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-white text-sm font-light">{notification.title}</h4>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          <p className="text-zinc-400 text-xs font-light mb-2">
                            {notification.message}
                          </p>
                          {notification.actions && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {notification.actions.map((action, index) => (
                                <button
                                  key={`${notification.id}-action-${index}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick();
                                  }}
                                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                                    action.tone === 'danger'
                                      ? 'border-red-500/40 text-red-200 hover:bg-red-500/10'
                                      : 'border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-zinc-600 text-[10px] font-light">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 rounded-lg hover:bg-zinc-800/50 transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - Quick Actions */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/50">
              <button
                onClick={() => {
                  setNotifications([]);
                  setIsOpen(false);
                }}
                className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors font-light"
              >
                Limpiar todas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
