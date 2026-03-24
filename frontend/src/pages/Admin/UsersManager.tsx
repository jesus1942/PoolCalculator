import React, { useEffect, useMemo, useState } from 'react';
import { Users, PlusCircle, RefreshCw, Pencil, Save, X, CalendarDays, MessageCircle, FolderOpen, ArrowUpRight, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';
import { agendaService } from '@/services/agendaService';
import { agendaMessageService } from '@/services/agendaMessageService';
import { useNavigate } from 'react-router-dom';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  orgRole?: string | null;
  createdAt: string;
};

const ROLE_OPTIONS = ['ADMIN', 'INSTALLER', 'USER', 'VIEWER'];
const ORG_ROLE_OPTIONS = ['ADMIN', 'MEMBER', 'VIEWER'];

export const UsersManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useMemo(() => user?.role === 'ADMIN' || user?.role === 'SUPERADMIN', [user]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    orgRole: 'MEMBER',
  });

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'USER',
    orgRole: 'MEMBER',
    password: '',
  });
  const [operationsUser, setOperationsUser] = useState<UserRow | null>(null);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsEvents, setOperationsEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [eventMessages, setEventMessages] = useState<any[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.list();
      setUsers(data);
    } catch (err) {
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Completá nombre, email y contraseña.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await userService.create({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        orgRole: createForm.orgRole,
      });
      setCreateForm({ name: '', email: '', password: '', role: 'USER', orgRole: 'MEMBER' });
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    setEditForm({
      name: row.name || '',
      role: row.role || 'USER',
      orgRole: row.orgRole || 'MEMBER',
      password: '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm({ name: '', role: 'USER', orgRole: 'MEMBER', password: '' });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await userService.update(editing.id, {
        name: editForm.name.trim(),
        role: editForm.role,
        orgRole: editForm.orgRole,
        password: editForm.password || undefined,
      });
      await loadUsers();
      closeEdit();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo actualizar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const loadOperations = async (targetUser: UserRow) => {
    setOperationsUser(targetUser);
    setOperationsLoading(true);
    setSelectedEvent(null);
    setEventMessages([]);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 21);
      const events = await agendaService.list({
        assigneeId: targetUser.id,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setOperationsEvents(events || []);
      if (events?.length) {
        setSelectedEvent(events[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar el operativo del usuario.');
    } finally {
      setOperationsLoading(false);
    }
  };

  const closeOperations = () => {
    setOperationsUser(null);
    setOperationsEvents([]);
    setSelectedEvent(null);
    setEventMessages([]);
    setMessageBody('');
  };

  useEffect(() => {
    if (!selectedEvent) return;
    const run = async () => {
      try {
        const data = await agendaMessageService.list(selectedEvent.id);
        setEventMessages(data || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'No se pudieron cargar los mensajes del evento.');
        setEventMessages([]);
      }
    };
    run();
  }, [selectedEvent]);

  const handleSendOperationalMessage = async () => {
    if (!selectedEvent || !messageBody.trim()) return;
    try {
      setSendingMessage(true);
      const created = await agendaMessageService.create(selectedEvent.id, messageBody.trim(), 'ALL');
      setEventMessages((prev) => [...prev, created]);
      setMessageBody('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo enviar el mensaje.');
    } finally {
      setSendingMessage(false);
    }
  };

  const operationalSummary = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const todayEvents = operationsEvents.filter((event) =>
      String(event.startAt || '').slice(0, 10) === todayIso
    );
    const activeNowEvents = operationsEvents.filter((event) => {
      const start = new Date(event.startAt).getTime();
      const end = new Date(event.endAt).getTime();
      const current = now.getTime();
      return start <= current && current <= end;
    });
    const nextEvent = [...operationsEvents]
      .filter((event) => new Date(event.startAt).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] || null;

    return {
      todayCount: todayEvents.length,
      activeNowCount: activeNowEvents.length,
      nextEvent,
    };
  }, [operationsEvents]);

  const recentImageMessages = useMemo(
    () => eventMessages.filter((msg) => Array.isArray(msg.images) && msg.images.length > 0).slice().reverse().slice(0, 6),
    [eventMessages],
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-300">Solo administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Usuarios de la organización</h1>
            <p className="text-sm text-zinc-300">Crear usuarios y asignar roles internos.</p>
          </div>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700/70 text-zinc-300 hover:text-white hover:border-zinc-500/70 transition"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-zinc-300 mb-4">
            <PlusCircle size={18} />
            <span className="text-sm uppercase tracking-wider">Nuevo usuario</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Contraseña"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <select
              value={createForm.role}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-zinc-950 text-zinc-100">
                  {option}
                </option>
              ))}
            </select>
            <select
              value={createForm.orgRole}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, orgRole: event.target.value }))}
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            >
              {ORG_ROLE_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-zinc-950 text-zinc-100">
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition"
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? 'Guardando...' : 'Crear usuario'}</span>
            </button>
          </div>
        </section>

        <section className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-zinc-300 mb-4">
            <Users size={18} />
            <span className="text-sm uppercase tracking-wider">Usuarios actuales</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left text-zinc-200">
              <thead className="text-xs uppercase tracking-wider text-zinc-300">
                <tr>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Rol Org</th>
                  <th className="py-2 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {users.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-800/60">
                    <td className="py-3 pr-4">{row.name}</td>
                    <td className="py-3 pr-4">{row.email}</td>
                    <td className="py-3 pr-4">{row.role}</td>
                    <td className="py-3 pr-4">{row.orgRole || '-'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
                        >
                          <Pencil size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => loadOperations(row)}
                          className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
                        >
                          <CalendarDays size={14} />
                          <span>Operativo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-4 text-zinc-300 text-center">
                      No hay usuarios cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editing && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700/70 rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Editar usuario</h2>
                <button onClick={closeEdit} className="text-zinc-300 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nombre"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
                />
                <select
                  value={editForm.role}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-zinc-950 text-zinc-100">
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={editForm.orgRole}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, orgRole: event.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
                >
                  {ORG_ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-zinc-950 text-zinc-100">
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Nueva contraseña (opcional)"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg border border-zinc-700/70 text-zinc-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition"
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {operationsUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-6xl rounded-2xl border border-zinc-700/70 bg-zinc-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Operativo de {operationsUser.name}</h2>
                  <p className="text-sm text-zinc-400">{operationsUser.email}</p>
                </div>
                <button onClick={closeOperations} className="text-zinc-300 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Eventos hoy</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{operationalSummary.todayCount}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Activos ahora</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">{operationalSummary.activeNowCount}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Próximo evento</div>
                  <div className="mt-2 text-sm font-medium text-white">
                    {operationalSummary.nextEvent
                      ? `${operationalSummary.nextEvent.title} · ${new Date(operationalSummary.nextEvent.startAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : 'Sin próximos eventos'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
                <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                  <div className="mb-3 text-xs uppercase tracking-wider text-zinc-400">Eventos asignados</div>
                  {operationsLoading ? (
                    <div className="text-sm text-zinc-400">Cargando operativo...</div>
                  ) : operationsEvents.length === 0 ? (
                    <div className="text-sm text-zinc-500">No hay eventos asignados en los próximos 21 días.</div>
                  ) : (
                    <div className="space-y-2">
                      {operationsEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            selectedEvent?.id === event.id
                              ? 'border-cyan-400/50 bg-white/10 text-white'
                              : 'border-zinc-800/70 bg-zinc-950/40 text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-sm font-medium">{event.title}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {new Date(event.startAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">{event.project?.name || 'Sin proyecto'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                  {!selectedEvent ? (
                    <div className="text-sm text-zinc-500">Seleccioná un evento para ver conversación y avances.</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-semibold text-white">{selectedEvent.title}</div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {selectedEvent.project?.name || 'Sin proyecto'} · {selectedEvent.location || 'Sin ubicación'}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {selectedEvent.project?.id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/${selectedEvent.project.id}`)}
                              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10"
                            >
                              <FolderOpen size={14} />
                              Ver proyecto
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate('/agenda')}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                          >
                            <ArrowUpRight size={14} />
                            Abrir agenda
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-zinc-800/70 bg-black/10 p-3">
                        {eventMessages.length === 0 ? (
                          <div className="text-sm text-zinc-500">Sin mensajes todavía.</div>
                        ) : (
                          eventMessages.map((msg) => (
                            <div key={msg.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                              <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>{msg.user?.name || msg.user?.email}</span>
                                <span>{new Date(msg.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="mt-2 text-sm text-zinc-200">{msg.body}</div>
                              {Array.isArray(msg.images) && msg.images.length > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {msg.images.map((url: string, idx: number) => (
                                    <a key={`${msg.id}-${idx}`} href={url} target="_blank" rel="noreferrer">
                                      <img src={url} alt="Adjunto" className="h-24 w-full rounded-lg border border-zinc-800 object-cover" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {recentImageMessages.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
                            <Camera size={14} />
                            Últimos avances con fotos
                          </div>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {recentImageMessages.flatMap((msg) =>
                              (msg.images || []).slice(0, 3).map((url: string, idx: number) => (
                                <a
                                  key={`${msg.id}-${idx}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60"
                                >
                                  <img src={url} alt="Avance" className="h-28 w-full object-cover" />
                                </a>
                              )),
                            ).slice(0, 6)}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
                          <MessageCircle size={14} />
                          Mensaje al operativo
                        </div>
                        <textarea
                          value={messageBody}
                          onChange={(event) => setMessageBody(event.target.value)}
                          placeholder="Escribí un mensaje para este evento..."
                          className="min-h-[110px] w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleSendOperationalMessage}
                            disabled={sendingMessage || !messageBody.trim()}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <MessageCircle size={16} />
                            <span>{sendingMessage ? 'Enviando...' : 'Enviar mensaje'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
