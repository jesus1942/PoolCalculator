import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '@/services/api';
import { usePublicIntegrations } from '@/hooks/usePublicIntegrations';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

/** Marco accesible compartido por ingreso y registro, sin duplicar estilos ni OAuth. */
export const AuthLayout = ({ title, description, error, children, footer }: {
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
  footer: ReactNode;
}) => {
  const { googleEnabled } = usePublicIntegrations();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>← Volver al inicio</Link>
        <section className="rounded-2xl p-6 shadow-sm sm:p-8" style={{ background: 'var(--card)', border: '1px solid var(--hair-strong)' }}>
          <img src={publicAssetUrl('logo-isotipo.png')} alt="PoolInstaller" className="mx-auto mb-5 h-12 w-auto" />
          <h1 className="text-center text-2xl font-semibold">{title}</h1>
          <p className="mb-6 mt-2 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{description}</p>
          {error && <p role="alert" className="mb-5 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{error}</p>}
          {children}
          {googleEnabled && (
            <>
              <p className="my-5 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>O continuá con</p>
              <a href={`${API_URL.replace(/\/$/, '')}/auth/google`} className="flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-semibold" style={{ borderColor: 'var(--hair-strong)', color: 'var(--ink)', background: 'var(--paper)' }}>Continuar con Google</a>
            </>
          )}
          <div className="mt-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{footer}</div>
        </section>
      </div>
    </main>
  );
};

/** Acción principal con contraste estable en ambos temas. */
export const AuthSubmit = ({ loading, children }: { loading: boolean; children: ReactNode }) => (
  <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl px-4 py-3 font-semibold disabled:cursor-wait disabled:opacity-60" style={{ background: '#155e63', color: '#ffffff' }}>{children}</button>
);
