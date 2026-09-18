import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoading } from '@/components/PageLoading';
import { userFromSessionToken } from '@/utils/session';

/** Completa OAuth sin registrar credenciales ni dejar el token en el historial. */
export const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateSession } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const query = new URLSearchParams(location.search);
    const fragment = new URLSearchParams(location.hash.slice(1));
    const token = fragment.get('token') || query.get('token');
    if (query.get('error') || !token) {
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }
    try {
      const user = userFromSessionToken(token);
      updateSession(user, token);
      navigate(user.role === 'INSTALLER' ? '/installer' : '/dashboard', { replace: true });
    } catch {
      navigate('/login?error=invalid_token', { replace: true });
    }
  }, [location.search, location.hash, navigate, updateSession]);

  return <PageLoading label="Completando inicio de sesión…" />;
};
