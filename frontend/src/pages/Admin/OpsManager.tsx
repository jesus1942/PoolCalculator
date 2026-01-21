import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { opsService, OpsLog, OpsStatus } from '@/services/opsService';

const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR'];
const CATEGORIES = ['ALL', 'AGENDA_NOTIFY', 'AGENDA_REMINDER', 'SYSTEM'];

export const OpsManager: React.FC = () => {
  const { user } = useAuth();
  const isSuperadmin = useMemo(() => user?.role === 'SUPERADMIN', [user]);
  const [status, setStatus] = useState<OpsStatus | null>(null);
  const [logs, setLogs] = useState<OpsLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState('ALL');
  const [category, setCategory] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResponse, logsResponse] = await Promise.all([
        opsService.status(),
        opsService.logs({
          limit: 200,
          level: level === 'ALL' ? undefined : level,
          category: category === 'ALL' ? undefined : category,
        }),
      ]);
      setStatus(statusResponse);
      setLogs(logsResponse);
    } catch (err) {
      setError('No se pudo cargar el panel operativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    loadData();
  }, [isSuperadmin, level, category]);

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-400">Solo SUPERADMIN puede ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldAlert className="text-emerald-300" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Backend & Base de datos</h1>
              <p className="text-sm text-zinc-400">Observabilidad y logs operativos.</p>
            </div>
          </div>
          <button
            onClick={loadData}
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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Base de datos</div>
            <div className="mt-2 text-lg text-white">
              {status?.db.ok ? 'Conectada' : 'Sin conexión'}
            </div>
            {!status?.db.ok && status?.db.error && (
              <div className="mt-2 text-xs text-red-300">{status.db.error}</div>
            )}
            <div className="mt-2 text-xs text-zinc-500">
              Uptime: {status ? `${Math.floor(status.uptimeSeconds / 60)} min` : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">SMTP</div>
            <div className="mt-2 text-lg text-white">
              {status?.smtp.configured ? 'Configurado' : 'No configurado'}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Intervalo: {status ? `${Math.round(status.reminders.intervalMs / 60000)} min` : '-'}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Recordatorios</div>
            <div className="mt-2 text-lg text-white">
              {status ? status.reminders.pendingCount : '-'} pendientes
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              En cola: {status ? status.reminders.dueCount : '-'} · Último email: {status?.reminders.lastEmailSentAt ? new Date(status.reminders.lastEmailSentAt).toLocaleString('es-AR') : 'N/A'}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-zinc-300">
              <Activity size={18} />
              <span className="text-sm uppercase tracking-wider">Logs operativos</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
              >
                {LEVELS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200"
              >
                {CATEGORIES.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm text-left text-zinc-200">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Hora</th>
                  <th className="py-2 pr-4">Nivel</th>
                  <th className="py-2 pr-4">Categoría</th>
                  <th className="py-2 pr-4">Mensaje</th>
                  <th className="py-2 pr-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-zinc-800/60">
                    <td className="py-3 pr-4 text-xs text-zinc-400">
                      {new Date(log.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          log.level === 'ERROR'
                            ? 'border-red-500/50 text-red-300'
                            : log.level === 'WARN'
                            ? 'border-amber-500/50 text-amber-200'
                            : 'border-emerald-500/40 text-emerald-200'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-400">{log.category}</td>
                    <td className="py-3 pr-4">
                      <div className="text-sm text-zinc-200">{log.message}</div>
                      {log.meta && (
                        <div className="text-xs text-zinc-500 mt-1">{JSON.stringify(log.meta)}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-400">
                      {log.user ? `${log.user.name || '-'} (${log.user.email})` : '-'}
                    </td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-zinc-500 text-center">
                      No hay logs disponibles.
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
