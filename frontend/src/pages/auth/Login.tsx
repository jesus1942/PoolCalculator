import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { AuthLayout, AuthSubmit } from '@/components/auth/AuthLayout';

/** Inicia la sesión y recupera el destino protegido solicitado previamente. */
export const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(location.search).has('error') ? 'No se pudo completar el ingreso con Google. Intentá nuevamente.' : '');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath : user.role === 'INSTALLER' ? '/installer' : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'No pudimos iniciar sesión. Revisá la conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Ingresá a PoolInstaller" description="Tus proyectos, presupuestos y equipo en un solo lugar." error={error}
      footer={<>¿No tenés cuenta? <Link to="/register" className="font-semibold underline" style={{ color: 'var(--accent)' }}>Crear cuenta</Link></>}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input id="login-email" type="email" label="Correo electrónico" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Input id="login-password" type="password" label="Contraseña" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--accent)' }}>Olvidé mi contraseña</Link>
        <AuthSubmit loading={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}</AuthSubmit>
      </form>
    </AuthLayout>
  );
};
