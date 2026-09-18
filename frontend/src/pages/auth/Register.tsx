import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { AuthLayout, AuthSubmit } from '@/components/auth/AuthLayout';
import { passwordValidationError } from '@/utils/session';

/** Crea la cuenta con la misma validación de contraseña que utiliza el servidor. */
export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    const passwordError = passwordValidationError(password);
    if (passwordError) { setError(passwordError); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'No pudimos crear la cuenta. Revisá la conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Creá tu cuenta" description="Empezá a organizar las obras de tu empresa." error={error}
      footer={<>¿Ya tenés cuenta? <Link to="/login" className="font-semibold underline" style={{ color: 'var(--accent)' }}>Iniciar sesión</Link></>}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input id="register-name" label="Nombre completo" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        <Input id="register-email" type="email" label="Correo electrónico" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Input id="register-password" type="password" label="Contraseña (mínimo 8 caracteres)" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
        <Input id="register-confirm-password" type="password" label="Confirmar contraseña" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
        <AuthSubmit loading={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</AuthSubmit>
      </form>
    </AuthLayout>
  );
};
