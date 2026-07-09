import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { HdCalendar, HdLayoutGrid, HdWaves, HdFolderOpen, HdMessageBubble, HdGear, HdArrowOut, HdUsers, HdBuilding, HdActivity, HdFileText, HdDatabase, HdMenu, HdX, HdSparkles, HdInfo } from '@/components/ui/HandDrawnIcons';
import { Footer } from '@/components/layout/Footer';
import { ReminderToasts } from '@/components/reminders/ReminderToasts';
import { BrowserNotificationPrompt } from '@/components/reminders/BrowserNotificationPrompt';
import { organizationService, OrganizationItem } from '@/services/organizationService';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { useTheme } from '@/context/ThemeContext';
import { HdSun } from '@/components/ui/HandDrawnIcons';

export const Layout: React.FC = () => {
  const { user, logout, updateSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      { to: '/installer', icon: HdCalendar, label: 'Instalador' },
      { to: '/agenda', icon: HdCalendar, label: 'La Agenda' },
      { to: '/projects', icon: HdFolderOpen, label: 'Mis Proyectos' },
      { to: '/chat', icon: HdMessageBubble, label: 'Mensajes' },
      { to: '/ayuda', icon: HdInfo, label: 'Ayuda' },
    ]
    : [
      { to: '/dashboard', icon: HdLayoutGrid, label: 'Panel' },
      { to: '/pool-models', icon: HdWaves, label: 'Modelos de Piscinas' },
      { to: '/projects', icon: HdFolderOpen, label: 'Proyectos' },
      { to: '/agenda', icon: HdCalendar, label: 'La Agenda' },
      { to: '/chat', icon: HdMessageBubble, label: 'Mensajes' },
      { to: '/settings', icon: HdGear, label: 'Configuración' },
      { to: '/ayuda', icon: HdInfo, label: 'Ayuda' },
    ];

  const currentOrgRole = organizations.find((org) => org.id === currentOrgId)?.role;
  const canManageOrgUsers =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPERADMIN' ||
    currentOrgRole === 'OWNER' ||
    currentOrgRole === 'ADMIN';

  if (user?.role !== 'INSTALLER' && canManageOrgUsers) {
    navItems.push({ to: '/admin/users', icon: HdUsers, label: 'Usuarios' });
  }

  if (user?.role === 'SUPERADMIN') {
    navItems.push({ to: '/admin/tenants', icon: HdBuilding, label: 'Tenants' });
    navItems.push({ to: '/admin/ops', icon: HdActivity, label: 'Ops' });
    navItems.push({ to: '/admin/docs', icon: HdFileText, label: 'Documentación' });
    navItems.push({ to: '/admin/sorteos', icon: HdSparkles, label: 'Sorteos' });
  }

  if (user?.role === 'ADMIN' || user?.email === 'admin@poolcalculator.com') {
    navItems.push({ to: '/admin/catalogs', icon: HdDatabase, label: 'Catálogos' });
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <ReminderToasts />
      <BrowserNotificationPrompt />
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(1.5px)' }}
      />

      {/* Sidebar — Cuaderno técnico */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--card)', borderRight: '1.6px solid var(--hair-strong)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1.3px dashed var(--hair-strong)' }}>
            <button
              onClick={() => navigate('/')}
              className="flex flex-1 items-center justify-center gap-3 text-lg hover:opacity-80 transition-opacity"
              title="Ir al inicio"
              style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
            >
              <span className="rough-panel rough-panel--soft inline-flex h-9 w-9 items-center justify-center">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-5 w-auto relative" />
              </span>
              Pool Installer
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
              aria-label="Cerrar menú"
              style={{ color: 'var(--ink-soft)' }}
            >
              <HdX size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 ${isActive ? 'artisan-nav-active' : ''}`
                }
                style={({ isActive }: { isActive: boolean }) => ({
                  color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
                  fontWeight: isActive ? 600 : 500,
                })}
              >
                <item.icon size={19} />
                <span className="text-[14.5px]">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4" style={{ borderTop: '1.3px dashed var(--hair-strong)' }}>
            <div className="rough-panel rough-panel--soft p-3 mb-3">
              <p className="text-sm font-semibold relative" style={{ color: 'var(--ink)' }}>{user?.name}</p>
              <p className="text-xs truncate relative" style={{ color: 'var(--ink-soft)' }}>{user?.email}</p>
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <span className="rough-chip mt-2" style={{ color: 'var(--accent)' }}>
                  Administrador
                </span>
              )}
            </div>
            {organizations.length > 0 && (
              <div className="mb-3">
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--ink-soft)', fontFamily: "'JetBrains Mono', monospace" }}>Organización</label>
                <div className="rough-field">
                  <span className="rough-field__bg" aria-hidden="true" />
                  <select
                    value={currentOrgId || ''}
                    onChange={(event) => handleSwitchOrganization(event.target.value)}
                    className="rough-field__control text-sm"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-4 py-2 mb-1 text-sm rounded-lg transition-all"
              style={{ color: 'var(--ink-soft)' }}
              title="Cambiar tema"
            >
              <HdSun size={16} />
              <span>{theme === 'paper' ? 'Tema oscuro' : 'Tema claro'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm rounded-lg transition-all"
              style={{ color: 'var(--bad)' }}
            >
              <HdArrowOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col min-h-screen lg:ml-64">
        <div
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 lg:hidden"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1.4px solid var(--hair-strong)' }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
            aria-label="Abrir menú"
            style={{ border: '1.4px solid var(--hair-strong)', color: 'var(--ink)' }}
          >
            <HdMenu size={20} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}>Pool Installer</span>
        </div>
        <div className="flex-grow">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
};
