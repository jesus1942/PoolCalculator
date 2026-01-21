import React, { useEffect, useMemo, useState } from 'react';
import { Users, PlusCircle, RefreshCw, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-400">Solo administradores pueden gestionar usuarios.</p>
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
            <p className="text-sm text-zinc-400">Crear usuarios y asignar roles internos.</p>
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
              <thead className="text-xs uppercase tracking-wider text-zinc-400">
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
                      <button
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
                      >
                        <Pencil size={14} />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-4 text-zinc-500 text-center">
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
                <button onClick={closeEdit} className="text-zinc-400 hover:text-white">
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
      </div>
    </div>
  );
};
