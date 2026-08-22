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

  const mobilePrimaryItems = user?.role === 'INSTALLER'
    ? [
      { to: '/installer', icon: HdLayoutGrid, label: 'Inicio' },
      { to: '/projects', icon: HdFolderOpen, label: 'Obras' },
      { to: '/agenda', icon: HdCalendar, label: 'Agenda' },
      { to: '/chat', icon: HdMessageBubble, label: 'Mensajes' },
    ]
    : [
      { to: '/dashboard', icon: HdLayoutGrid, label: 'Inicio' },
      { to: '/projects', icon: HdFolderOpen, label: 'Obras' },
      { to: '/agenda', icon: HdCalendar, label: 'Agenda' },
      { to: '/chat', icon: HdMessageBubble, label: 'Mensajes' },
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

      {/* Overlay del menú completo en mobile. */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(1.5px)' }}
      />

      {/* Sidebar: navegación principal en desktop y menú Más en mobile. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--card)', borderRight: '1.6px solid var(--hair-strong)' }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4" style={{ borderBottom: '1.3px dashed var(--hair-strong)' }}>
            <button
              onClick={() => navigate(user?.role === 'INSTALLER' ? '/installer' : '/dashboard')}
              className="flex flex-1 items-center justify-center gap-3 text-lg transition-opacity hover:opacity-80"
              title="Ir al inicio"
              style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
            >
              <span className="rough-panel rough-panel--soft inline-flex h-9 w-9 items-center justify-center">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="relative h-5 w-auto" />
              </span>
              Pool Installer
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
              aria-label="Cerrar menú"
              style={{ color: 'var(--ink-soft)' }}
            >
              <HdX size={19} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-150 ${isActive ? 'artisan-nav-active' : ''}`
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

          <div className="p-4" style={{ borderTop: '1.3px dashed var(--hair-strong)' }}>
            <div className="rough-panel rough-panel--soft mb-3 p-3">
              <p className="relative text-sm font-semibold" style={{ color: 'var(--ink)' }}>{user?.name}</p>
              <p className="relative truncate text-xs" style={{ color: 'var(--ink-soft)' }}>{user?.email}</p>
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <span className="rough-chip mt-2" style={{ color: 'var(--accent)' }}>
                  Administrador
                </span>
              )}
            </div>

            {organizations.length > 0 && (
              <div className="mb-3">
                <label
                  className="mb-1 block text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--ink-soft)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Organización
                </label>
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
              className="mb-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all"
              style={{ color: 'var(--ink-soft)' }}
              title="Cambiar tema"
            >
              <HdSun size={16} />
              <span>{theme === 'paper' ? 'Tema oscuro' : 'Tema claro'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all"
              style={{ color: 'var(--bad)' }}
            >
              <HdArrowOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido. En mobile reserva espacio para la navegación inferior. */}
      <div className="flex min-h-screen flex-col lg:ml-64">
        <header
          className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 lg:hidden"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1.4px solid var(--hair-strong)' }}
        >
          <button
            type="button"
            onClick={() => navigate(user?.role === 'INSTALLER' ? '/installer' : '/dashboard')}
            className="flex min-h-11 min-w-0 items-center gap-2 text-left"
            aria-label="Ir al inicio de Pool Installer"
          >
            <span className="rough-panel rough-panel--soft inline-flex h-9 w-9 shrink-0 items-center justify-center">
              <img src={publicAssetUrl('logo-isotipo.png')} alt="" className="relative h-5 w-auto" />
            </span>
            <span
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
            >
              Pool Installer
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            aria-label="Abrir menú completo"
            style={{ border: '1.4px solid var(--hair-strong)', color: 'var(--ink)' }}
          >
            <HdMenu size={20} />
          </button>
        </header>

        <div className="flex-grow pb-24 lg:pb-0">
          <Outlet />
        </div>

        {/* El footer editorial queda para desktop. En mobile prima el área de trabajo. */}
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      {/* Navegación operativa mobile. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 lg:hidden"
        aria-label="Navegación principal"
        style={{
          backgroundColor: 'var(--card)',
          borderTop: '1.5px solid var(--hair-strong)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {mobilePrimaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center"
            style={({ isActive }: { isActive: boolean }) => ({
              color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
              fontWeight: isActive ? 700 : 500,
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-[2px]"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                <item.icon size={21} />
                <span className="max-w-full truncate text-[10px] leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center"
          style={{ color: sidebarOpen ? 'var(--accent)' : 'var(--ink-soft)', fontWeight: sidebarOpen ? 700 : 500 }}
          aria-label="Abrir más opciones"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen && (
            <span
              aria-hidden="true"
              className="absolute inset-x-3 top-0 h-[2px]"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          )}
          <HdMenu size={21} />
          <span className="text-[10px] leading-none">Más</span>
        </button>
      </nav>
    </div>
  );
};
