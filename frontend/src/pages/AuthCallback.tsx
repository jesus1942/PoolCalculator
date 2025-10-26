import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      console.error('Error en autenticación:', error);
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      // Guardar token
      localStorage.setItem('token', token);

      // Actualizar contexto de auth
      if (setAuthData) {
        setAuthData(token);
      }

      // Redirigir al dashboard
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [token, error, navigate, setAuthData]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-black to-black pointer-events-none -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent pointer-events-none -z-10"></div>

      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 font-light">Completando inicio de sesión...</p>
      </div>
    </div>
  );
};
