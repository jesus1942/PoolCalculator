import React, { useEffect, useMemo, useState } from 'react';
import { Building2, PlusCircle, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { organizationService, OrganizationAdminItem } from '@/services/organizationService';

export const TenantsManager: React.FC = () => {
  const { user } = useAuth();
  const isSuperadmin = useMemo(() => user?.role === 'SUPERADMIN', [user]);

  const [tenants, setTenants] = useState<OrganizationAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
  });

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await organizationService.listAll();
      setTenants(data);
    } catch (err) {
      setError('No se pudieron cargar los tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    loadTenants();
  }, [isSuperadmin]);

  const handleCreate = async () => {
    if (!form.name) {
      setError('El nombre del tenant es requerido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await organizationService.create({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        ownerEmail: form.ownerEmail.trim() || undefined,
        ownerName: form.ownerName.trim() || undefined,
        ownerPassword: form.ownerPassword || undefined,
      });
      setForm({ name: '', slug: '', ownerEmail: '', ownerName: '', ownerPassword: '' });
      await loadTenants();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo crear el tenant.');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-400">Solo SUPERADMIN puede administrar tenants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Tenants (Organizaciones)</h1>
            <p className="text-sm text-zinc-400">Crear y administrar organizaciones del SaaS.</p>
          </div>
          <button
            onClick={loadTenants}
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
            <span className="text-sm uppercase tracking-wider">Nuevo tenant</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="Slug (opcional)"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              value={form.ownerEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
              placeholder="Email owner"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              value={form.ownerName}
              onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
              placeholder="Nombre owner"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
            <input
              type="password"
              value={form.ownerPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, ownerPassword: event.target.value }))}
              placeholder="Password owner"
              className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-sm"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition"
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? 'Guardando...' : 'Crear tenant'}</span>
            </button>
          </div>
        </section>

        <section className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-zinc-300 mb-4">
            <Building2 size={18} />
            <span className="text-sm uppercase tracking-wider">Tenants actuales</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left text-zinc-200">
              <thead className="text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Owner</th>
                  <th className="py-2 pr-4">Miembros</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-zinc-800/60">
                    <td className="py-3 pr-4">{tenant.name}</td>
                    <td className="py-3 pr-4">{tenant.slug || '-'}</td>
                    <td className="py-3 pr-4">
                      {tenant.owner ? `${tenant.owner.name} (${tenant.owner.email})` : '-'}
                    </td>
                    <td className="py-3 pr-4">{tenant.membersCount}</td>
                  </tr>
                ))}
                {tenants.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-4 text-zinc-500 text-center">
                      No hay tenants cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
