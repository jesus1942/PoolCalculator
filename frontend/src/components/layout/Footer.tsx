import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, FolderKanban, Settings, LogOut } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-800/50 mt-auto">
      {/* Glow effect sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-light text-white mb-4 tracking-wide">Pool Calculator</h3>
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
            <div className="text-sm space-y-2">
              <p className="text-white font-light">Jesús Olguín</p>
              <p className="text-zinc-400 text-xs font-light">Domotics & IoT Solutions</p>
              <div className="pt-2">
                <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <span className="text-xs text-cyan-400 font-light">Professional Developer</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/50 pt-8">
          <div className="text-center space-y-2">
            <p className="text-zinc-500 text-sm font-light">
              © {currentYear} Pool Calculator. Todos los derechos reservados.
            </p>
            <p className="text-zinc-600 text-xs font-light">
              Desarrollado por <span className="font-normal text-cyan-400">Jesús Olguín</span> - Domotics & IoT Solutions
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
