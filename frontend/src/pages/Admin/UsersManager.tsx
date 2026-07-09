import React, { useEffect, useMemo, useState } from 'react';
import { HdUsers, HdPlus, HdRefresh, HdEdit, HdSave, HdX, HdCalendar, HdMessageBubble, HdFolderOpen, HdExternalLink, HdCamera, HdShield } from '@/components/ui/HandDrawnIcons';
import { useAuth } from '@/context/AuthContext';
import { organizationService } from '@/services/organizationService';
import { userService, type UserProjectAccessEntry } from '@/services/userService';
import { agendaService } from '@/services/agendaService';
import { agendaMessageService } from '@/services/agendaMessageService';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import type { ProjectTabId } from '@/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  orgRole?: string | null;
  createdAt: string;
};

// SUPERADMIN solo aparece como opción cuando quien edita es superadmin.
const ROLE_OPTIONS = ['SUPERADMIN', 'ADMIN', 'INSTALLER', 'USER', 'VIEWER'];
const ORG_ROLE_OPTIONS = ['ADMIN', 'MEMBER', 'VIEWER'];
// Los tenants solo dan de alta instaladores; el resto de los roles los maneja el superadmin.
const TENANT_ROLE_OPTIONS = ['INSTALLER'];
const TENANT_ORG_ROLE_OPTIONS = ['MEMBER', 'VIEWER'];
const PROJECT_TAB_LABELS: Record<ProjectTabId, string> = {
  overview: 'Vista General',
  status: 'Estado',
  costs: 'Costos',
  tiles: 'Losetas',
  plumbing: 'Hidráulica',
  electrical: 'Eléctrica',
  hydraulic_pro: 'Análisis Hidráulico',
  electrical_pro: 'Análisis Eléctrico',
  tasks: 'Tareas',
  roles: 'Roles',
  systems: 'Sistemas',
  additionals: 'Adicionales',
  export: 'Exportar',
};

export const UsersManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlatformAdmin = useMemo(() => user?.role === 'ADMIN' || user?.role === 'SUPERADMIN', [user]);
  const [currentOrgRole, setCurrentOrgRole] = useState<string | null>(null);
  const [orgRoleChecked, setOrgRoleChecked] = useState(false);
  // También administran los OWNER/ADMIN de la organización aunque su rol global sea USER.
  const isAdmin = isPlatformAdmin || currentOrgRole === 'OWNER' || currentOrgRole === 'ADMIN';
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const roleOptions = isSuperadmin ? ROLE_OPTIONS : TENANT_ROLE_OPTIONS;
  const orgRoleOptions = isSuperadmin ? ORG_ROLE_OPTIONS : TENANT_ORG_ROLE_OPTIONS;
  const defaultRole = isSuperadmin ? 'USER' : 'INSTALLER';
  const canEditRow = (row: UserRow) => isSuperadmin || row.role === 'INSTALLER';

  useEffect(() => {
    if (isPlatformAdmin) {
      setOrgRoleChecked(true);
      return;
    }
    let active = true;
    organizationService
      .list()
      .then((data) => {
        if (!active) return;
        const current = data.organizations?.find((org) => org.id === data.currentOrgId);
        setCurrentOrgRole(current?.role || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setOrgRoleChecked(true);
      });
    return () => {
      active = false;
    };
  }, [isPlatformAdmin]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole,
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

  const [projectAccessUser, setProjectAccessUser] = useState<UserRow | null>(null);
  const [projectAccessEntries, setProjectAccessEntries] = useState<UserProjectAccessEntry[]>([]);
  const [projectAccessLoading, setProjectAccessLoading] = useState(false);
  const [projectAccessSavingId, setProjectAccessSavingId] = useState<string | null>(null);
  const [projectTabsCatalog, setProjectTabsCatalog] = useState<ProjectTabId[]>([]);

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
      setCreateForm({ name: '', email: '', password: '', role: defaultRole, orgRole: 'MEMBER' });
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

  const loadProjectAccess = async (targetUser: UserRow) => {
    setProjectAccessUser(targetUser);
    setProjectAccessLoading(true);
    setProjectAccessEntries([]);
    setProjectTabsCatalog([]);
    setError(null);
    try {
      const data = await userService.getProjectAccess(targetUser.id);
      setProjectAccessEntries(data.projects || []);
      setProjectTabsCatalog(data.tabsCatalog || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudieron cargar los permisos por proyecto.');
    } finally {
      setProjectAccessLoading(false);
    }
  };

  const closeProjectAccess = () => {
    setProjectAccessUser(null);
    setProjectAccessEntries([]);
    setProjectTabsCatalog([]);
    setProjectAccessSavingId(null);
  };

  const patchProjectAccessEntry = (projectId: string, updater: (entry: UserProjectAccessEntry) => UserProjectAccessEntry) => {
    setProjectAccessEntries((prev) => prev.map((entry) => (entry.projectId === projectId ? updater(entry) : entry)));
  };

  const toggleProjectTab = (projectId: string, tabId: ProjectTabId) => {
    patchProjectAccessEntry(projectId, (entry) => {
      const hasTab = entry.allowedTabs.includes(tabId);
      const nextTabs = hasTab
        ? entry.allowedTabs.filter((item) => item !== tabId)
        : [...entry.allowedTabs, tabId];

      return {
        ...entry,
        enabled: true,
        allowedTabs: nextTabs,
      };
    });
  };

  const saveProjectAccess = async (entry: UserProjectAccessEntry) => {
    if (!projectAccessUser || entry.inheritedFromOwnership) return;
    setProjectAccessSavingId(entry.projectId);
    setError(null);
    try {
      const payload = {
        enabled: entry.enabled,
        canEdit: entry.canEdit,
        canViewFinancials: entry.canViewFinancials,
        allowedTabs: entry.allowedTabs,
      };
      const updated = await userService.updateProjectAccess(projectAccessUser.id, entry.projectId, payload);
      patchProjectAccessEntry(entry.projectId, (current) => ({
        ...current,
        enabled: updated.enabled,
        canEdit: updated.canEdit,
        canViewFinancials: updated.canViewFinancials,
        allowedTabs: updated.allowedTabs,
      }));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar el acceso al proyecto.');
    } finally {
      setProjectAccessSavingId(null);
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
    if (!orgRoleChecked) {
      return (
        <div className="min-h-screen px-6 py-10 text-zinc-200">
          <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
            <p className="text-zinc-300">Verificando permisos...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-300">Solo administradores de la organización pueden gestionar usuarios.</p>
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
            <HdRefresh size={16} className={loading ? 'animate-spin' : ''} />
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
            <HdPlus size={18} />
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
              {roleOptions.map((option) => (
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
              {orgRoleOptions.map((option) => (
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
              <HdSave size={16} />
              <span>{saving ? 'Guardando...' : 'Crear usuario'}</span>
            </button>
          </div>
        </section>

        <section className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-zinc-300 mb-4">
            <HdUsers size={18} />
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
                      <div className="flex items-center gap-3 flex-wrap">
                        {canEditRow(row) && (
                          <button
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
                          >
                            <HdEdit size={14} />
                            <span>Editar</span>
                          </button>
                        )}
                        <button
                          onClick={() => loadProjectAccess(row)}
                          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
                        >
                          <HdShield size={14} />
                          <span>Permisos</span>
                        </button>
                        <button
                          onClick={() => loadOperations(row)}
                          className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
                        >
                          <HdCalendar size={14} />
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
                  <HdX size={18} />
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
                  {roleOptions.map((option) => (
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
                  {orgRoleOptions.map((option) => (
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
                  <HdSave size={16} />
                  <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={Boolean(projectAccessUser)}
          onClose={closeProjectAccess}
          title={projectAccessUser ? `Permisos de ${projectAccessUser.name}` : 'Permisos por proyecto'}
          size="xl"
        >
          <div className="space-y-4">
            {projectAccessUser && (
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                <p><strong className="text-white">Usuario:</strong> {projectAccessUser.name} · {projectAccessUser.email}</p>
                <p className="mt-1"><strong className="text-white">Rol actual:</strong> {projectAccessUser.role} / {projectAccessUser.orgRole || 'MEMBER'}</p>
                {projectAccessUser.role === 'VIEWER' && (
                  <p className="mt-2 text-amber-200">Los usuarios `VIEWER` nunca reciben permiso de edición aunque el proyecto quede compartido.</p>
                )}
              </div>
            )}

            {projectAccessLoading ? (
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-6 text-sm text-zinc-400">Cargando proyectos y permisos...</div>
            ) : projectAccessEntries.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-6 text-sm text-zinc-400">No hay proyectos para configurar en esta organización.</div>
            ) : (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {projectAccessEntries.map((entry) => {
                  const tabs = projectTabsCatalog.length > 0 ? projectTabsCatalog : (Object.keys(PROJECT_TAB_LABELS) as ProjectTabId[]);
                  const isViewerRole = projectAccessUser?.role === 'VIEWER';
                  const isDisabled = Boolean(entry.inheritedFromOwnership);
                  return (
                    <div key={entry.projectId} className={`rounded-2xl border p-4 transition ${entry.enabled
                      ? 'border-cyan-500/30 bg-cyan-950/10'
                      : 'border-zinc-800/70 bg-zinc-950/60 opacity-75'}`}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">{entry.name}</h3>
                          <p className="text-sm text-zinc-400">Cliente: {entry.clientName} · Estado: {entry.status}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.inheritedFromOwnership && (
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                              Acceso total heredado por propietario
                            </span>
                          )}
                          {!entry.inheritedFromOwnership && (
                            <span className={`rounded-full border px-3 py-1 text-xs ${entry.enabled
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-zinc-700/70 bg-zinc-900/70 text-zinc-400'}`}>
                              {entry.enabled ? 'Compartido' : 'Sin acceso'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <label className="flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-3 py-3 text-sm text-zinc-200">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            disabled={isDisabled}
                            onChange={(event) => patchProjectAccessEntry(entry.projectId, (current) => ({
                              ...current,
                              enabled: event.target.checked,
                              canEdit: event.target.checked ? current.canEdit : false,
                              canViewFinancials: event.target.checked ? current.canViewFinancials : false,
                              allowedTabs: event.target.checked ? (current.allowedTabs.length > 0 ? current.allowedTabs : ['overview', 'status']) : [],
                            }))}
                          />
                          <span>Compartir proyecto</span>
                        </label>

                        <label className={`flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-3 py-3 text-sm ${entry.enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          <input
                            type="checkbox"
                            checked={entry.canEdit}
                            disabled={!entry.enabled || isDisabled || isViewerRole}
                            onChange={(event) => patchProjectAccessEntry(entry.projectId, (current) => ({
                              ...current,
                              canEdit: event.target.checked,
                            }))}
                          />
                          <span>Puede editar</span>
                        </label>

                        <label className={`flex items-center gap-2 rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-3 py-3 text-sm ${entry.enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          <input
                            type="checkbox"
                            checked={entry.canViewFinancials}
                            disabled={!entry.enabled || isDisabled}
                            onChange={(event) => patchProjectAccessEntry(entry.projectId, (current) => ({
                              ...current,
                              canViewFinancials: event.target.checked,
                            }))}
                          />
                          <span>Puede ver costos</span>
                        </label>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Pestañas visibles</p>
                        {!entry.enabled ? (
                          <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/50 px-3 py-3 text-sm text-zinc-500">
                            Este usuario no ve este proyecto. Activá "Compartir proyecto" para elegir pestañas.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {tabs.map((tabId) => {
                              const selected = entry.allowedTabs.includes(tabId);
                              return (
                                <button
                                  key={tabId}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => toggleProjectTab(entry.projectId, tabId)}
                                  className={`rounded-full border px-3 py-1.5 text-xs transition ${selected
                                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                                    : 'border-zinc-700/70 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'}`}
                                >
                                  {PROJECT_TAB_LABELS[tabId]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          disabled={isDisabled || projectAccessSavingId === entry.projectId || (entry.enabled && entry.allowedTabs.length === 0)}
                          onClick={() => saveProjectAccess(entry)}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <HdSave size={15} />
                          <span>{projectAccessSavingId === entry.projectId ? 'Guardando...' : 'Guardar acceso'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>

        {operationsUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-6xl rounded-2xl border border-zinc-700/70 bg-zinc-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Operativo de {operationsUser.name}</h2>
                  <p className="text-sm text-zinc-400">{operationsUser.email}</p>
                </div>
                <button onClick={closeOperations} className="text-zinc-300 hover:text-white">
                  <HdX size={18} />
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
                              <HdFolderOpen size={14} />
                              Ver proyecto
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => window.open(`/agenda?event=${selectedEvent.id}`, '_blank')}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-700/70 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                          >
                            <HdExternalLink size={14} />
                            Abrir agenda
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
                            <HdMessageBubble size={16} />
                            Conversación
                          </div>
                          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                            {eventMessages.length === 0 ? (
                              <div className="text-sm text-zinc-500">Sin mensajes aún.</div>
                            ) : (
                              eventMessages.map((message) => (
                                <div key={message.id} className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">
                                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                                    <span>{message.user?.name || 'Sistema'}</span>
                                    <span>{new Date(message.createdAt).toLocaleString('es-AR')}</span>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{message.body}</p>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="mt-4 space-y-2">
                            <textarea
                              value={messageBody}
                              onChange={(event) => setMessageBody(event.target.value)}
                              rows={3}
                              placeholder="Enviar indicación operativa..."
                              className="w-full rounded-xl border border-zinc-800/70 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={handleSendOperationalMessage}
                                disabled={sendingMessage || !messageBody.trim()}
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <HdMessageBubble size={15} />
                                <span>{sendingMessage ? 'Enviando...' : 'Enviar mensaje'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
                            <HdCamera size={16} />
                            Últimas imágenes
                          </div>
                          {recentImageMessages.length === 0 ? (
                            <div className="text-sm text-zinc-500">No hay imágenes compartidas en este evento.</div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {recentImageMessages.flatMap((message) =>
                                (message.images || []).slice(0, 2).map((image: string, index: number) => (
                                  <a
                                    key={`${message.id}-${index}`}
                                    href={image}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/60"
                                  >
                                    <img src={image} alt="Avance" className="h-28 w-full object-cover transition group-hover:scale-[1.03]" />
                                  </a>
                                ))
                              )}
                            </div>
                          )}
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
