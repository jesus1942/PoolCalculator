import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/** Informa una dirección inválida y ofrece un destino válido según la sesión. */
export const NotFound = () => {
  const { user } = useAuth();
  const destination = !user ? '/' : user.role === 'INSTALLER' ? '/installer' : '/dashboard';
  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ color: 'var(--ink)' }}>
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>404</p>
        <h1 className="mt-2 text-2xl font-semibold">No encontramos esta página</h1>
        <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>Revisá la dirección o volvé al inicio para continuar.</p>
        <Link to={destination} className="mt-6 inline-flex min-h-11 items-center rounded-xl px-5 font-semibold" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Volver al inicio</Link>
      </div>
    </main>
  );
};
