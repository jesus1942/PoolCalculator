import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

// Para OAuth necesitamos la URL base sin /api
const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'INSTALLER') {
        navigate('/installer');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Botón para volver a la landing */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Volver al inicio</span>
          </Link>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-black border border-black/80 flex items-center justify-center shadow-lg">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-9 w-auto" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center mb-2 text-white">
              Pool Installer
            </h2>
            <p className="text-center text-zinc-400 mb-8">
              Ingresá a tu cuenta para continuar
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />

              <div>
                <Input
                  type="password"
                  label="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <div className="mt-2 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-zinc-950 text-zinc-400 font-medium">O continuar con</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 rounded-xl font-medium transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </button>

            <p className="mt-6 text-center text-sm text-zinc-400">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="text-cyan-300 hover:text-cyan-200 font-semibold transition-colors">
                Registrate acá
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
