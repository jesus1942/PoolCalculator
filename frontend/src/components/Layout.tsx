import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
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

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [sidebarOpen]);

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

  const homePath = user?.role === 'INSTALLER' ? '/installer' : '/dashboard';

  return (
    <div className="min-h-screen overflow-x-hidden">
      <ReminderToasts />
      <BrowserNotificationPrompt />

      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 transition-opacity duration-200 lg:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(3px)' }}
      />

      <aside
        aria-label="Menú principal"
        className={`fixed inset-y-0 left-0 z-40 w-[88vw] max-w-[360px] transform transition-transform duration-200 ease-out lg:w-64 lg:max-w-none lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          backgroundColor: 'var(--card)',
          borderRight: '1.6px solid var(--hair-strong)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex min-h-[72px] items-center gap-3 px-4" style={{ borderBottom: '1.3px dashed var(--hair-strong)' }}>
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              title="Ir al inicio"
            >
              <span className="rough-panel rough-panel--soft inline-flex h-11 w-11 shrink-0 items-center justify-center">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="relative h-6 w-auto" />
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate text-[15px] font-semibold"
                  style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Pool Installer
                </span>
                <span className="mt-0.5 block truncate text-[11px]" style={{ color: 'var(--ink-soft)' }}>
                  Herramientas de obra
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:hidden"
              aria-label="Cerrar menú"
              style={{ border: '1.4px solid var(--hair-strong)', color: 'var(--ink)' }}
            >
              <HdX size={19} />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <p
              className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--ink-soft)', fontFamily: "'JetBrains Mono', monospace" }}
            >
              Navegación
            </p>

            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150 ${isActive ? 'artisan-nav-active' : ''}`
                  }
                  style={({ isActive }: { isActive: boolean }) => ({
                    color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
                    fontWeight: isActive ? 650 : 500,
                    backgroundColor: isActive ? 'var(--accent-2)' : 'transparent',
                  })}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
                    <item.icon size={19} />
                  </span>
                  <span className="min-w-0 truncate text-[14px]">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="shrink-0 p-3 sm:p-4" style={{ borderTop: '1.3px dashed var(--hair-strong)' }}>
            <div className="mb-3 px-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{user?.name}</p>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--ink-soft)' }}>{user?.email}</p>
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
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ border: '1.3px solid var(--hair-strong)', color: 'var(--ink-soft)' }}
                title="Cambiar tema"
              >
                <HdSun size={16} />
                <span>{theme === 'paper' ? 'Oscuro' : 'Claro'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ border: '1.3px solid var(--hair-strong)', color: 'var(--bad)' }}
              >
                <HdArrowOut size={16} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-64">
        <header
          className="sticky top-0 z-20 flex min-h-[62px] items-center justify-between gap-3 px-3 py-2 lg:hidden"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--card) 96%, transparent)',
            borderBottom: '1.4px solid var(--hair-strong)',
            backdropFilter: 'blur(12px)',
            paddingTop: 'max(8px, env(safe-area-inset-top))',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="flex min-h-11 min-w-0 items-center gap-2.5 text-left"
            aria-label="Ir al inicio de Pool Installer"
          >
            <span className="rough-panel rough-panel--soft inline-flex h-9 w-9 shrink-0 items-center justify-center">
              <img src={publicAssetUrl('logo-isotipo.png')} alt="" className="relative h-5 w-auto" />
            </span>
            <span
              className="truncate text-[13px] font-semibold"
              style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
            >
              Pool Installer
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3"
            aria-label="Abrir menú completo"
            aria-expanded={sidebarOpen}
            style={{ border: '1.4px solid var(--hair-strong)', color: 'var(--ink)', backgroundColor: 'var(--card2)' }}
          >
            <HdMenu size={19} />
            <span className="text-xs font-semibold">Menú</span>
          </button>
        </header>

        <main className="flex-grow pb-[72px] lg:pb-0">
          <Outlet />
        </main>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <nav
        className="mobile-tabbar fixed inset-x-0 bottom-0 z-20 lg:hidden"
        aria-label="Navegación principal"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          width: '100%',
          backgroundColor: 'color-mix(in srgb, var(--card) 97%, transparent)',
          borderTop: '1.5px solid var(--hair-strong)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 -8px 24px color-mix(in srgb, var(--ink) 7%, transparent)',
        }}
      >
        {mobilePrimaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="relative flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center"
            style={({ isActive }: { isActive: boolean }) => ({
              color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
              fontWeight: isActive ? 700 : 550,
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-0 h-[2px] w-8 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                <span
                  className="inline-flex h-6 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: isActive ? 'var(--accent-2)' : 'transparent' }}
                >
                  <item.icon size={19} />
                </span>
                <span className="max-w-full truncate text-[10px] leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
