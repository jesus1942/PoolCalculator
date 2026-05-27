import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, FolderKanban, Settings, LogOut } from 'lucide-react';
import { DeveloperCredit } from '@/components/DeveloperCredit';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-zinc-800/50 bg-[#02050b]">
      <div className="footer-horizon absolute inset-0 pointer-events-none" />
      <div className="footer-nebula absolute inset-0 pointer-events-none" />
      <div className="footer-spacefield absolute inset-0 opacity-75 pointer-events-none" />
      <div className="footer-sweep absolute inset-y-0 left-[-18%] w-[48%] opacity-40 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-[72px] h-px bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-light text-white mb-4 tracking-wide">Pool Installer</h3>
            <p className="text-zinc-400 text-sm font-light leading-relaxed">
              Sistema completo de cálculo de materiales para montaje de piscinas de fibra de vidrio.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-light text-white mb-4 tracking-wide">Enlaces Rápidos</h3>
            {isAuthenticated ? (
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/projects" className="text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-2 font-light group">
                    <Home size={14} className="group-hover:scale-110 transition-transform" />
                    Mis Proyectos
                  </Link>
                </li>
                <li>
                  <Link to="/pool-models" className="text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-2 font-light group">
                    <FolderKanban size={14} className="group-hover:scale-110 transition-transform" />
                    Modelos de Piscinas
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-2 font-light group">
                    <Settings size={14} className="group-hover:scale-110 transition-transform" />
                    Configuración
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-2 font-light group"
                  >
                    <LogOut size={14} className="group-hover:scale-110 transition-transform" />
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

          <div>
            <h3 className="text-lg font-light text-white mb-4 tracking-wide">Desarrollador</h3>
            <DeveloperCredit variant="full" />
          </div>
        </div>

        <div className="border-t border-zinc-800/50 pt-8">
          <div className="text-center space-y-2">
            <p className="text-zinc-500 text-sm font-light">
              © {currentYear} Pool Installer. Todos los derechos reservados.
            </p>
            <DeveloperCredit variant="inline" className="text-zinc-600 text-xs font-light" />
          </div>
        </div>
      </div>
    </footer>
  );
};
