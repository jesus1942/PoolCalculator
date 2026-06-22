import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HdHome, HdFolderOpen, HdGear, HdArrowOut } from '@/components/ui/HandDrawnIcons';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { developerWhatsappUrl, developerPortfolioUrl } from '@/components/DeveloperCredit';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass =
    'text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-2 font-light group';

  return (
    <footer className="relative mt-auto border-t border-white/10 bg-zinc-950/80">
      {/* Glow sutil, en armonía con el resto de la app */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, rgba(73, 213, 255, 0.08), transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 mb-10">
          {/* Marca */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-4 w-auto" />
              </span>
              <span className="text-base font-medium text-white tracking-wide">Pool Installer</span>
            </div>
            <p className="text-zinc-400 text-sm font-light leading-relaxed max-w-xs">
              Sistema completo de cálculo de materiales para montaje de piscinas de fibra de vidrio.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              Enlaces rápidos
            </h3>
            {isAuthenticated ? (
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/projects" className={linkClass}>
                    <HdHome size={14} className="group-hover:scale-110 transition-transform" />
                    Mis Proyectos
                  </Link>
                </li>
                <li>
                  <Link to="/pool-models" className={linkClass}>
                    <HdFolderOpen size={14} className="group-hover:scale-110 transition-transform" />
                    Modelos de Piscinas
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className={linkClass}>
                    <HdGear size={14} className="group-hover:scale-110 transition-transform" />
                    Configuración
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-2 font-light group"
                  >
                    <HdArrowOut size={14} className="group-hover:scale-110 transition-transform" />
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            ) : (
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/login" className="text-zinc-400 hover:text-cyan-400 transition-colors font-light">
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-zinc-400 hover:text-cyan-400 transition-colors font-light">
                    Registrarse
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* Desarrollador */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              Desarrollo
            </h3>
            <p className="text-sm font-light text-zinc-400 leading-relaxed">
              Desarrollado por{' '}
              <a
                href={developerPortfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-200 hover:text-cyan-400 underline-offset-4 hover:underline transition-colors"
              >
                Jesús Olguín
              </a>
            </p>
            <p className="text-xs text-zinc-600 mb-4">Domotics &amp; IoT Solutions · Puerto Madryn, AR</p>
            <div className="flex flex-col gap-2.5 text-sm">
              <a
                href={developerWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors font-light group w-fit"
              >
                <MessageCircle size={15} className="text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                WhatsApp
              </a>
              <a
                href={developerPortfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors font-light group w-fit"
              >
                <Globe size={15} className="text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Portfolio
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <p className="text-zinc-500 text-xs font-light">
            © {currentYear} Pool Installer. Todos los derechos reservados.
          </p>
          <p className="text-zinc-600 text-xs font-light">
            Hecho en Puerto Madryn, Chubut · Argentina
          </p>
        </div>
      </div>
    </footer>
  );
};
