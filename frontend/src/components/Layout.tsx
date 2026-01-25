import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Waves, FolderOpen, Settings, LogOut, Database, FileText, Calendar, Users, Building2, Activity, Menu, X } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { ReminderToasts } from '@/components/reminders/ReminderToasts';
import { organizationService, OrganizationItem } from '@/services/organizationService';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

export const Layout: React.FC = () => {
  const { user, logout, updateSession } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Navegar a la landing con replace para evitar volver atrás
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!user) return;
      try {
        const data = await organizationService.list();
        setOrganizations(data.organizations || []);
        setCurrentOrgId(data.currentOrgId || user.currentOrgId || null);
      } catch (error) {
        console.error('Error al cargar organizaciones:', error);
      }
    };
    loadOrganizations();
  }, [user]);

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      const data = await organizationService.switchOrganization(orgId);
      updateSession(data.user as any, data.token);
      setCurrentOrgId(data.user.currentOrgId || null);
    } catch (error) {
      console.error('Error al cambiar organización:', error);
      alert('No se pudo cambiar la organización');
    }
  };

  const navItems = user?.role === 'INSTALLER'
    ? [
      { to: '/installer', icon: Calendar, label: 'Instalador' },
      { to: '/agenda', icon: Calendar, label: 'La Agenda' },
    ]
    : [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
      { to: '/pool-models', icon: Waves, label: 'Modelos de Piscinas' },
      { to: '/projects', icon: FolderOpen, label: 'Proyectos' },
      { to: '/settings', icon: Settings, label: 'Configuración' },
    ];

  if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
    navItems.push({ to: '/admin/users', icon: Users, label: 'Usuarios' });
  }

  if (user?.role === 'SUPERADMIN') {
    navItems.push({ to: '/admin/tenants', icon: Building2, label: 'Tenants' });
    navItems.push({ to: '/admin/ops', icon: Activity, label: 'Ops' });
    navItems.push({ to: '/admin/docs', icon: FileText, label: 'Documentación' });
  }

  // Agregar opción de catálogos para administradores
  if (user?.role === 'ADMIN' || user?.email === 'admin@poolcalculator.com') {
    navItems.push({ to: '/admin/catalogs', icon: Database, label: 'Catálogos' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 overflow-x-hidden">
      <ReminderToasts />
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <button
              onClick={() => navigate('/')}
              className="flex flex-1 items-center justify-center gap-3 text-xl font-light text-white hover:opacity-80 transition-opacity"
              title="Ir al inicio"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black border border-white/10 shadow-md">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-5 w-auto" />
              </span>
              Pool Installer
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/20'
                      : 'text-zinc-300 hover:bg-white/10 hover:text-white border border-transparent'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="bg-white/5 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30">
                  Administrador
                </span>
              )}
            </div>
            {organizations.length > 0 && (
              <div className="mb-3">
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Organización</label>
                <select
                  value={currentOrgId || ''}
                  onChange={(event) => handleSwitchOrganization(event.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id} className="bg-zinc-950 text-zinc-100">
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all border border-transparent hover:border-red-500/30"
            >
              <LogOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col min-h-screen lg:ml-64">
        <div className="sticky top-0 z-20 flex items-center gap-3 bg-black/60 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-200 hover:bg-white/10"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-zinc-100">Panel</span>
        </div>
        <div className="flex-grow">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
};
