import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, User, Waves, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { DeveloperCredit } from '@/components/DeveloperCredit';

export const ClientLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  useEffect(() => {
    // Extract share token from returnUrl if present
    const match = returnUrl.match(/\/timeline\/([^/?]+)/);
    if (match) {
      // Pre-warm the session — nothing needed here, just for reference
    }
    // Entrance animation trigger
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [returnUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresá usuario y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/public/timeline/login', {
        username: username.trim(),
        password: password.trim(),
      });

      const { shareToken, projectName } = response.data;
      sessionStorage.setItem('clientShareToken', shareToken);
      sessionStorage.setItem('clientProjectName', projectName);
      navigate(`/timeline/${shareToken}`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Verificá con tu constructor.');
      } else if (err.response?.status === 410) {
        setError('El acceso a este proyecto ha expirado. Contactá a tu constructor.');
      } else {
        setError('Error al conectar. Por favor intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex flex-col items-center justify-center p-4">

      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="animate-float-delay absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="animate-pulse-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      {/* Main card */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'
        }`}
      >
        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black border border-white/10 shadow-2xl shadow-cyan-500/20">
              <img
                src={publicAssetUrl('logo-isotipo.png')}
                alt="Pool Installer"
                className="h-7 w-auto"
              />
            </span>
            <span className="text-2xl font-light text-white tracking-wide">Pool Installer</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                Seguimiento
              </span>
              <span className="text-white"> de Obra</span>
            </h1>
            <p className="text-zinc-400 text-sm">
              Ingresá para ver el progreso de tu piscina en tiempo real
            </p>
          </div>
        </div>

        {/* Glass login card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tu usuario"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: loading
                  ? 'rgba(6,182,212,0.3)'
                  : 'linear-gradient(135deg, #06b6d4, #0891b2)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Ingresando…
                  </>
                ) : (
                  <>
                    <Waves className="w-4 h-4" />
                    Ver mi proyecto
                  </>
                )}
              </span>
              {/* Hover shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8">
            <p className="text-xs text-zinc-600 text-center leading-relaxed">
              ¿No tenés credenciales?{' '}
              <span className="text-zinc-400">Contactá a tu constructor</span> para que te comparta el acceso.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <DeveloperCredit variant="compact" />
        </div>
      </div>

      {/* Decorative wave element */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-10"
        style={{
          background: 'linear-gradient(to top, rgba(6,182,212,0.15), transparent)',
        }}
      />
    </div>
  );
};
