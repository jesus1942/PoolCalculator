import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { agendaService } from '@/services/agendaService';
import { agendaMessageService } from '@/services/agendaMessageService';
import { weatherService, type WeatherData, getWeatherDescription, isGoodWorkingWeather } from '@/services/weatherService';
import {
  HdCalendar,
  HdCheck,
  HdChevronRight,
  HdClock,
  HdImage,
  HdMapPin,
  HdMessageBubble,
  HdSave,
  HdSun,
} from '@/components/ui/HandDrawnIcons';

type AgendaEvent = any;

const EVENT_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planificado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'DONE', label: 'Finalizado' },
];

const statusLabel = (status: string) => EVENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

const statusTone = (status: string) => {
  if (status === 'DONE') return 'var(--good)';
  if (status === 'IN_PROGRESS' || status === 'CONFIRMED') return 'var(--accent)';
  return 'var(--warm)';
};

const formatEventDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatEventTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export const InstallerV2: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PLANNED');
  const [notesInstaller, setNotesInstaller] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageImages, setMessageImages] = useState<File[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const messageImagePreviews = useMemo(
    () => messageImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [messageImages],
  );

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await agendaService.list({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      const sorted = [...(data || [])].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setEvents(sorted);
      if (!selectedEvent && sorted.length) {
        setSelectedEvent(sorted[0]);
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (eventId: string) => {
    try {
      setMessages(await agendaMessageService.list(eventId) || []);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    void loadEvents();
    weatherService.getWeather()
      .then(setWeather)
      .catch((error) => {
        console.error('Error al cargar clima:', error);
        setWeatherError('No se pudo cargar el clima.');
      });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setStatus(selectedEvent.status || 'PLANNED');
    setNotesInstaller(selectedEvent.notesInstaller || '');
    void loadMessages(selectedEvent.id);
  }, [selectedEvent?.id]);

  useEffect(() => () => {
    messageImagePreviews.forEach((image) => URL.revokeObjectURL(image.url));
  }, [messageImagePreviews]);

  const selectEvent = (event: AgendaEvent) => {
    setSelectedEvent(event);
    setMobileDetailOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEvent || savingEvent) return;
    try {
      setSavingEvent(true);
      const updated = await agendaService.update(selectedEvent.id, { status, notesInstaller });
      setSelectedEvent(updated);
      setEvents((current) => current.map((event) => event.id === updated.id ? updated : event));
    } catch (error) {
      console.error('Error al actualizar evento:', error);
      alert('No se pudo guardar el avance');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedEvent || sendingMessage) return;
    const body = messageText.trim();
    if (!body && messageImages.length === 0) return;
    try {
      setSendingMessage(true);
      setMessageError(null);
      const created = await agendaMessageService.create(selectedEvent.id, body, 'ALL', messageImages);
      setMessages((current) => [...current, created]);
      setMessageText('');
      setMessageImages([]);
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error);
      setMessageError(error?.response?.data?.error || 'No se pudo enviar el mensaje o las imágenes.');
    } finally {
      setSendingMessage(false);
    }
  };

  const weatherGood = weather
    ? isGoodWorkingWeather(weather.current.weatherCode, weather.current.windSpeed, 0)
    : null;

  const eventList = (
    <div className="space-y-2">
      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
        ))
      ) : events.length === 0 ? (
        <div className="rough-panel p-7 text-center">
          <HdCalendar size={30} className="relative mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="relative mt-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>No tenés trabajos asignados</p>
          <p className="relative mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>Cuando te asignen una visita o instalación va a aparecer acá.</p>
        </div>
      ) : (
        events.map((event) => {
          const selected = selectedEvent?.id === event.id;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => selectEvent(event)}
              className="rough-panel block min-h-20 w-full p-3.5 text-left"
            >
              <span className="relative flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusTone(event.status) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{event.title}</span>
                      <span className="mt-1 block text-xs capitalize" style={{ color: 'var(--ink-soft)' }}>
                        {formatEventDate(event.startAt)} · {formatEventTime(event.startAt)}
                      </span>
                    </span>
                    <HdChevronRight size={17} className="shrink-0" style={{ color: selected ? 'var(--accent)' : 'var(--ink-soft)' }} />
                  </span>
                  {event.location && (
                    <span className="mt-2 flex items-center gap-1.5 truncate text-xs" style={{ color: 'var(--ink-soft)' }}>
                      <HdMapPin size={13} />
                      {event.location}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  const eventDetail = selectedEvent ? (
    <div className="space-y-4">
      <section className="rough-panel p-4 sm:p-5">
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="rough-chip" style={{ color: statusTone(selectedEvent.status) }}>{statusLabel(selectedEvent.status)}</span>
            <h2 className="mt-3 break-words text-xl font-semibold" style={{ color: 'var(--ink)' }}>{selectedEvent.title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{selectedEvent.type || 'Trabajo asignado'}</p>
          </div>
          <div className="text-right text-xs" style={{ color: 'var(--ink-soft)' }}>
            <p>{formatEventDate(selectedEvent.startAt)}</p>
            <p className="mt-1 font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              {formatEventTime(selectedEvent.startAt)}–{formatEventTime(selectedEvent.endAt)}
            </p>
          </div>
        </div>

        {selectedEvent.location && (
          <div className="relative rough-dashed mt-4 flex items-center gap-2 pt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
            <HdMapPin size={16} style={{ color: 'var(--accent)' }} />
            <span className="break-words">{selectedEvent.location}</span>
          </div>
        )}
      </section>

      <section className="rough-panel p-4 sm:p-5">
        <div className="relative mb-4 flex items-center gap-2">
          <HdSave size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Cargar avance</h3>
        </div>

        <div className="relative space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>Estado del trabajo</label>
            <div className="rough-field">
              <span className="rough-field__bg" aria-hidden="true" />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rough-field__control">
                {EVENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>Notas de obra</label>
            <div className="rough-field">
              <span className="rough-field__bg" aria-hidden="true" />
              <textarea
                value={notesInstaller}
                onChange={(event) => setNotesInstaller(event.target.value)}
                rows={4}
                placeholder="Qué se hizo, qué falta o qué problema encontraste…"
                className="rough-field__control resize-y"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={savingEvent}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold sm:w-auto"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--paper)' }}
          >
            <HdSave size={17} />
            {savingEvent ? 'Guardando…' : 'Guardar avance'}
          </button>
        </div>
      </section>

      <section className="rough-panel p-4 sm:p-5">
        <div className="relative mb-4 flex items-center gap-2">
          <HdMessageBubble size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Mensajes del trabajo</h3>
        </div>

        <div className="relative max-h-64 space-y-2 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>Todavía no hay mensajes.</p>
          ) : messages.map((message) => (
            <article key={message.id} className="rough-panel rough-panel--soft p-3">
              <div className="relative flex items-center justify-between gap-3 text-[10px]" style={{ color: 'var(--ink-soft)' }}>
                <span className="truncate">{message.user?.name || message.user?.email || 'Equipo'}</span>
                <span className="shrink-0">{new Date(message.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {message.body && <p className="relative mt-2 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--ink)' }}>{message.body}</p>}
              {Array.isArray(message.images) && message.images.length > 0 && (
                <div className="relative mt-2 grid grid-cols-2 gap-2">
                  {message.images.map((url: string, index: number) => (
                    <a key={`${message.id}-${index}`} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Adjunto de obra" className="h-24 w-full rounded-lg object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="relative rough-dashed mt-4 space-y-3 pt-4">
          {messageError && <p className="text-xs" style={{ color: 'var(--bad)' }}>{messageError}</p>}
          <div className="rough-field">
            <span className="rough-field__bg" aria-hidden="true" />
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={3}
              placeholder="Mensaje para el equipo…"
              className="rough-field__control resize-y"
            />
          </div>

          {messageImagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {messageImagePreviews.map((image, index) => (
                <div key={`${image.file.name}-${index}`} className="rough-panel rough-panel--soft relative overflow-hidden p-1">
                  <img src={image.url} alt={image.file.name} className="relative h-20 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setMessageImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute right-1 top-1 min-h-8 rounded-lg px-2 text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--bad)' }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
            <label
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold"
              style={{ border: '1.4px solid var(--hair-strong)', color: 'var(--ink-soft)', backgroundColor: 'var(--card2)' }}
            >
              <HdImage size={16} />
              {messageImages.length > 0 ? `${messageImages.length} imagen(es)` : 'Adjuntar imágenes'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  setMessageError(null);
                  setMessageImages(Array.from(event.target.files || []));
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={sendingMessage || (!messageText.trim() && messageImages.length === 0)}
              className="min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--good)', color: 'var(--paper)' }}
            >
              {sendingMessage ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : (
    <div className="rough-panel p-7 text-center">
      <HdCalendar size={30} className="relative mx-auto" style={{ color: 'var(--accent)' }} />
      <p className="relative mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>Seleccioná un trabajo para ver sus detalles.</p>
    </div>
  );

  return (
    <main className="installer-v2 mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="mb-5 sm:mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Área de trabajo</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--ink)' }}>Panel del instalador</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{user?.name ? `${user.name}, ` : ''}estos son tus próximos trabajos asignados.</p>
      </section>

      <section className="rough-panel mb-5 p-4 sm:p-5">
        <div className="relative flex items-center gap-3">
          <HdSun size={20} style={{ color: weatherGood ? 'var(--good)' : 'var(--warm)' }} />
          {weather ? (
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Clima de trabajo</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{getWeatherDescription(weather.current.weatherCode)}</p>
                </div>
                <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{weather.current.temperature}°</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
                <span>Viento {weather.current.windSpeed} km/h</span>
                <span>Humedad {weather.current.humidity}%</span>
                <span style={{ color: weatherGood ? 'var(--good)' : 'var(--warm)' }}>{weatherGood ? 'Condiciones operables' : 'Revisar condiciones'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{weatherError || 'Cargando clima…'}</p>
          )}
        </div>
      </section>

      <div className="lg:hidden">
        {!mobileDetailOpen ? eventList : (
          <div>
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="mb-3 min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
              style={{ border: '1.4px solid var(--hair-strong)', backgroundColor: 'var(--card)', color: 'var(--ink)' }}
            >
              Volver a mis trabajos
            </button>
            {eventDetail}
          </div>
        )}
      </div>

      <div className="hidden gap-5 lg:grid lg:grid-cols-[320px_1fr]">
        <aside>{eventList}</aside>
        <section>{eventDetail}</section>
      </div>
    </main>
  );
};
