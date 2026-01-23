import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { LogOut, User, Settings, Layout, Waves, Menu, X, Database, Calendar } from 'lucide-react';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const isInstaller = user?.role === 'INSTALLER';

  return (
    <>
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 sticky top-0 z-50 shadow-2xl shadow-black/20 transition-all duration-300">
        {/* Glow effect sutil con transición de fade */}
        <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none transition-opacity duration-500 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-50'
        }`}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 group z-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-white/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative h-10 w-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-6 w-auto" />
                </div>
              </div>
              <span className="text-xl font-light text-white tracking-wide">
                Pool <span className="font-semibold">Installer</span>
              </span>
            </Link>

            {isAuthenticated && (
              <>
                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-2">
                  {isInstaller ? (
                    <Link
                      to="/installer"
                      className={`px-4 py-2 rounded-xl font-light transition-all duration-200 ${
                        isActive('/installer')
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      Instalador
                    </Link>
                  ) : (
                    <>
                  <Link
                    to="/dashboard"
                    className={`px-4 py-2 rounded-xl font-light transition-all duration-200 ${
                      isActive('/dashboard')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    Panel
                  </Link>
                  <Link
                    to="/projects"
                    className={`px-4 py-2 rounded-xl font-light transition-all duration-200 ${
                      isActive('/projects')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    Proyectos
                  </Link>
                  <Link
                    to="/agenda"
                    className={`px-4 py-2 rounded-xl font-light transition-all duration-200 flex items-center space-x-2 ${
                      isActive('/agenda')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Calendar size={18} />
                    <span>La Agenda</span>
                  </Link>
                  <Link
                    to="/pool-models"
                    className={`px-4 py-2 rounded-xl font-light transition-all duration-200 flex items-center space-x-2 ${
                      isActive('/pool-models')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Waves size={18} />
                    <span>Modelos</span>
                  </Link>
                  <Link
                    to="/settings"
                    className={`px-4 py-2 rounded-xl font-light transition-all duration-200 flex items-center space-x-2 ${
                      isActive('/settings')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Settings size={18} />
                    <span>Presets</span>
                  </Link>
                  {user?.role === 'SUPERADMIN' && (
                    <Link
                      to="/admin/catalogs"
                      className={`px-4 py-2 rounded-xl font-light transition-all duration-200 flex items-center space-x-2 ${
                        isActive('/admin/catalogs')
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      <Database size={18} />
                      <span>Catálogos</span>
                    </Link>
                  )}
                    </>
                  )}
                  <div className="flex items-center space-x-3 border-l border-zinc-800 pl-4 ml-2">
                    <div className="flex items-center space-x-2 bg-zinc-900/50 border border-zinc-800/50 px-3 py-2 rounded-xl backdrop-blur-sm">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <User size={14} className="text-white" />
                      </div>
                      <span className="text-sm text-zinc-300 font-light">{user?.name}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all duration-200 font-light"
                    >
                      <LogOut size={16} />
                      <span>Salir</span>
                    </button>
                  </div>
                </nav>

                {/* Hamburger Button - Mobile */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden relative w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center hover:bg-zinc-800/50 transition-all duration-300 z-10"
                  aria-label="Toggle menu"
                >
                  <div className="relative w-6 h-5 flex flex-col justify-center items-center">
                    {/* Línea superior */}
                    <span
                      className={`absolute w-6 h-0.5 bg-cyan-400 transform transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
                      }`}
                    />
                    {/* Línea del medio */}
                    <span
                      className={`absolute w-6 h-0.5 bg-cyan-400 transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                      }`}
                    />
                    {/* Línea inferior */}
                    <span
                      className={`absolute w-6 h-0.5 bg-cyan-400 transform transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
                      }`}
                    />
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isAuthenticated && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeMobileMenu}
          />

          {/* Mobile Menu Panel */}
          <nav
            className={`fixed top-16 right-0 w-80 max-w-[85vw] h-[calc(100vh-4rem)] bg-zinc-950/98 backdrop-blur-xl border-l border-zinc-800/50 shadow-2xl z-40 transform transition-all duration-300 ease-in-out lg:hidden ${
              isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            {/* Gradient background con fade */}
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none transition-opacity duration-500 ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}></div>

            <div className="relative h-full flex flex-col p-6 space-y-4">
              {/* User Info */}
              <div className="flex items-center space-x-3 pb-4 border-b border-zinc-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <User size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-light">{user?.name}</p>
                  <p className="text-xs text-zinc-500">Administrador</p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 space-y-2">
                {isInstaller ? (
                  <Link
                    to="/installer"
                    onClick={closeMobileMenu}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                      isActive('/installer')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Calendar size={20} />
                    <span>Instalador</span>
                  </Link>
                ) : (
                  <>
                <Link
                  to="/dashboard"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                    isActive('/dashboard')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Layout size={20} />
                  <span>Panel</span>
                </Link>
                <Link
                  to="/projects"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                    isActive('/projects')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Droplets size={20} />
                  <span>Proyectos</span>
                </Link>
                <Link
                  to="/agenda"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                    isActive('/agenda')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Calendar size={20} />
                  <span>La Agenda</span>
                </Link>
                <Link
                  to="/pool-models"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                    isActive('/pool-models')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Waves size={20} />
                  <span>Modelos</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                    isActive('/settings')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Settings size={20} />
                  <span>Presets</span>
                </Link>
                {user?.role === 'SUPERADMIN' && (
                  <Link
                    to="/admin/catalogs"
                    onClick={closeMobileMenu}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-light transition-all duration-200 ${
                      isActive('/admin/catalogs')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <Database size={20} />
                      <span>Catálogos</span>
                    </Link>
                  )}
                  </>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all duration-200 font-light"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
};
