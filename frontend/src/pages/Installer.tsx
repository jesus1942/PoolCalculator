import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, MessageCircle, Save, ImagePlus, CloudSun } from 'lucide-react';
import { agendaService } from '@/services/agendaService';
import { agendaMessageService } from '@/services/agendaMessageService';
import { useAuth } from '@/context/AuthContext';
import { weatherService, WeatherData, getWeatherDescription, getWeatherEmoji } from '@/services/weatherService';

type AgendaEvent = any;

const toDateInput = (date: Date) => date.toISOString().slice(0, 16);

export const Installer: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PLANNED');
  const [notesInstaller, setNotesInstaller] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [messageImages, setMessageImages] = useState<File[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);
    return { start, end };
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await agendaService.list({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      setEvents(data || []);
      if (!selectedEvent && data?.length) {
        setSelectedEvent(data[0]);
        setStatus(data[0].status);
        setNotesInstaller(data[0].notesInstaller || '');
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (eventId: string) => {
    try {
      const data = await agendaMessageService.list(eventId);
      setMessages(data || []);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await weatherService.getWeather();
        setWeather(data);
      } catch (error) {
        console.error('Error al cargar clima:', error);
        setWeatherError('No se pudo cargar el clima.');
      }
    };
    loadWeather();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setStatus(selectedEvent.status || 'PLANNED');
    setNotesInstaller(selectedEvent.notesInstaller || '');
    loadMessages(selectedEvent.id);
  }, [selectedEvent]);

  const handleSave = async () => {
    if (!selectedEvent) return;
    try {
      const updated = await agendaService.update(selectedEvent.id, {
        status,
        notesInstaller,
      });
      setSelectedEvent(updated);
      await loadEvents();
    } catch (error) {
      console.error('Error al actualizar evento:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedEvent) return;
    const body = messageText.trim();
    if (!body && messageImages.length === 0) return;
    try {
      const created = await agendaMessageService.create(selectedEvent.id, body, 'ALL', messageImages);
      setMessages((prev) => [...prev, created]);
      setMessageText('');
      setMessageImages([]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Panel del Instalador</h1>
          <p className="text-sm text-zinc-400">Hola {user?.name}. Acá tenés tus eventos asignados y la conversación del equipo.</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <CloudSun size={14} />
            Clima de hoy
          </div>
          {weather ? (
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-3xl">{getWeatherEmoji(weather.current.weatherCode, true)}</div>
              <div>
                <div className="text-2xl text-white">{weather.current.temperature}°</div>
                <div className="text-xs text-zinc-400">
                  {getWeatherDescription(weather.current.weatherCode)}
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                Viento: {weather.current.windSpeed} km/h
                {weather.current.windGust !== null && (
                  <span> · Ráfagas: {weather.current.windGust} km/h</span>
                )}
                {' '}· Humedad: {weather.current.humidity}%
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              {weatherError || 'Cargando clima...'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 h-full">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 mb-3">
              <Calendar size={14} />
              Próximos 14 días
            </div>
            {loading && <p className="text-sm text-zinc-500">Cargando eventos...</p>}
            {!loading && events.length === 0 && (
              <p className="text-sm text-zinc-500">No hay eventos asignados.</p>
            )}
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition ${
                    selectedEvent?.id === event.id
                      ? 'bg-white/10 border-cyan-400/50 text-white'
                      : 'border-transparent text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <div className="text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(event.startAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{' '}
                    · {new Date(event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            {!selectedEvent ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-500">
                Seleccioná un evento para ver detalles.
              </div>
            ) : (
              <>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
                      <p className="text-xs text-zinc-400">{selectedEvent.type} · {selectedEvent.status}</p>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <MapPin size={14} />
                      {selectedEvent.location || 'Sin ubicación'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300">
                    <div>
                      <p className="text-xs text-zinc-500">Inicio</p>
                      <p>{new Date(selectedEvent.startAt).toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Fin</p>
                      <p>{new Date(selectedEvent.endAt).toLocaleString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Estado</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200"
                      >
                        <option value="PLANNED">Planificado</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="DONE">Finalizado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Notas del instalador</label>
                      <textarea
                        value={notesInstaller}
                        onChange={(e) => setNotesInstaller(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[80px]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30"
                  >
                    <Save size={16} />
                    Guardar avance
                  </button>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} />
                    <h3 className="text-lg font-semibold">Mensajes</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {messages.length === 0 ? (
                      <p className="text-sm text-zinc-500">Sin mensajes todavía.</p>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{msg.user?.name || msg.user?.email}</span>
                            <span>{new Date(msg.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-sm text-zinc-200 mt-2">{msg.body}</div>
                          {Array.isArray(msg.images) && msg.images.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {msg.images.map((url: string, idx: number) => (
                                <a key={`${msg.id}-img-${idx}`} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="Adjunto" className="w-full h-24 object-cover rounded-lg border border-zinc-800" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 min-h-[80px]"
                      placeholder="Escribí un mensaje para el equipo..."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <ImagePlus size={14} />
                        Adjuntar imágenes
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => setMessageImages(Array.from(e.target.files || []))}
                        />
                      </label>
                      <button
                        onClick={handleSendMessage}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                      >
                        Enviar mensaje
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
