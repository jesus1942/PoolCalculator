import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HdEye, HdEyeOff, HdWaves } from '@/components/ui/HandDrawnIcons';
import { Input } from '@/components/ui/Input';
import { AuthLayout, AuthSubmit } from '@/components/auth/AuthLayout';
import api from '@/services/api';

export const ClientLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');

    if (!username.trim() || !password) {
      setError('Ingresá el usuario y la contraseña que te compartió tu equipo.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const response = await api.post('/public/timeline/login', {
        username: username.trim(),
        // El servidor compara la contraseña completa, incluidos sus espacios.
        password,
      });

      const { shareToken, projectName } = response.data;
      sessionStorage.setItem('clientShareToken', shareToken);
      sessionStorage.setItem('clientProjectName', projectName);
      navigate(`/timeline/${shareToken}`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Verificá los datos con tu equipo de instalación.');
      } else if (err.response?.status === 410) {
        setError('El acceso a este proyecto expiró. Pedile a tu equipo que lo renueve.');
      } else if (err.response?.status === 429) {
        setError('Hubo demasiados intentos de ingreso. Esperá unos minutos antes de volver a intentar.');
      } else {
        setError('No pudimos abrir tu diario. Revisá la conexión e intentá nuevamente.');
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="El diario de tu piscina"
      description="Fotos, relatos y avances publicados por tu equipo. La historia de tu proyecto, capítulo a capítulo."
      error={error}
      showGoogle={false}
      footer={
        <p id="client-access-help" className="leading-relaxed">
          ¿No tenés los datos de acceso? Pedile a tu equipo de instalación que te comparta tu usuario y contraseña.
        </p>
      }
    >
      <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
        <span aria-hidden="true"><HdWaves size={20} /></span>
        Acceso del cliente
      </div>
      <form onSubmit={handleLogin} className="space-y-5" aria-busy={loading}>
        <Input
          id="client-login-username"
          label="Usuario del proyecto"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="client-access-help"
          disabled={loading}
          required
        />

        <div>
          <Input
            id="client-login-password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={loading}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              aria-controls="client-login-password"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ color: 'var(--accent)' }}
            >
              <span aria-hidden="true">{showPassword ? <HdEyeOff size={18} /> : <HdEye size={18} />}</span>
              {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            </button>
          </div>
        </div>

        <AuthSubmit loading={loading}>
          <span role="status" aria-live="polite">{loading ? 'Abriendo tu diario…' : 'Entrar a mi diario'}</span>
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
