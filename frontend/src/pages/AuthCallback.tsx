import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    console.log('[AUTH CALLBACK] Iniciando proceso de autenticación...');
    console.log('[AUTH CALLBACK] Token recibido:', token ? 'SÍ' : 'NO');
    console.log('[AUTH CALLBACK] Error recibido:', error);

    if (error) {
      console.error('[AUTH CALLBACK] ❌ Error en autenticación:', error);
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      try {
        console.log('[AUTH CALLBACK] Decodificando token...');

        // Decodificar el token JWT para obtener los datos del usuario
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[AUTH CALLBACK] Payload decodificado:', payload);

        // Crear objeto de usuario
        const user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name || payload.email.split('@')[0],
        };

        console.log('[AUTH CALLBACK] Usuario creado:', user);

        // Guardar token y usuario usando authService
        authService.setToken(token);
        authService.setUser(user);

        console.log('[AUTH CALLBACK] ✅ Token y usuario guardados en localStorage');
        console.log('[AUTH CALLBACK] Verificando localStorage...');
        console.log('[AUTH CALLBACK] Token en localStorage:', localStorage.getItem('token') ? 'SÍ' : 'NO');
        console.log('[AUTH CALLBACK] User en localStorage:', localStorage.getItem('user') ? 'SÍ' : 'NO');

        // Redirigir al dashboard con recarga completa para que AuthContext actualice
        console.log('[AUTH CALLBACK] Redirigiendo a /dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } catch (err) {
        console.error('[AUTH CALLBACK] ❌ Error al procesar token:', err);
        navigate('/login?error=invalid_token');
      }
    } else {
      console.log('[AUTH CALLBACK] ❌ No hay token, redirigiendo a login');
      navigate('/login');
    }
  }, [token, error, navigate]);

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
