import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HdArrowOut, HdFolderOpen, HdGear, HdWaves } from '@/components/ui/HandDrawnIcons';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { developerWhatsappUrl, developerPortfolioUrl } from '@/components/DeveloperCredit';
import { TechnicalPoolScene } from '@/components/visual/TechnicalPoolScene';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, logout } = useAuth();

  return (
    <footer
      className="relative mt-auto overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        borderTop: '1.6px solid var(--hair-strong)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
          backgroundSize: '27px 27px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="rough-panel rough-panel--soft inline-flex h-11 w-11 items-center justify-center">
                  <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="relative h-6 w-auto" />
                </span>
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Pool Installer
                  </p>
                  <h2 className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--ink)' }}>
                    Del cálculo a la instalación terminada.
                  </h2>
                </div>
              </div>

              <p className="mt-5 max-w-xl text-sm leading-7" style={{ color: 'var(--ink-soft)' }}>
                Una herramienta de obra para diseñar, calcular, presupuestar y documentar instalaciones de piscinas sin separar el trabajo técnico de la gestión del proyecto.
              </p>

              <div className="rough-dashed mt-6 flex flex-wrap gap-x-5 gap-y-2 pt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
                <span>Diseñar</span>
                <span>Calcular</span>
                <span>Instalar</span>
                <span>Documentar</span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--ink-soft)' }}>
                  Navegación
                </p>
                <div className="space-y-2.5 text-sm">
                  {isAuthenticated ? (
                    <>
                      <Link to="/projects" className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70" style={{ color: 'var(--ink)' }}>
                        <HdFolderOpen size={16} style={{ color: 'var(--accent)' }} />
                        Proyectos
                      </Link>
                      <Link to="/pool-models" className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70" style={{ color: 'var(--ink)' }}>
                        <HdWaves size={16} style={{ color: 'var(--accent)' }} />
                        Modelos
                      </Link>
                      <Link to="/settings" className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70" style={{ color: 'var(--ink)' }}>
                        <HdGear size={16} style={{ color: 'var(--accent)' }} />
                        Configuración
                      </Link>
                      <button
                        type="button"
                        onClick={logout}
                        className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--bad)' }}
                      >
                        <HdArrowOut size={16} />
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="block min-h-10 py-2" style={{ color: 'var(--ink)' }}>Iniciar sesión</Link>
                      <Link to="/register" className="block min-h-10 py-2" style={{ color: 'var(--accent)' }}>Crear cuenta</Link>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--ink-soft)' }}>
                  Desarrollo
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Jesús Olguín</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>Domotics &amp; IoT Solutions · Puerto Madryn, AR</p>
                <div className="mt-3 flex flex-col gap-1 text-sm">
                  <a
                    href={developerWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                  <a
                    href={developerPortfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-10 items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    <Globe size={15} />
                    Portfolio
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rough-panel min-h-[330px] overflow-hidden sm:min-h-[390px]">
            <div className="relative h-full min-h-[330px] sm:min-h-[390px]">
              <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
                <span className="rough-chip" style={{ color: 'var(--accent)' }}>MAQUETA TÉCNICA</span>
              </div>
              <TechnicalPoolScene className="h-full min-h-[330px] sm:min-h-[390px]" />
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-soft)' }}>Vista conceptual</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Casco · hidráulica · equipos</p>
                  </div>
                  <p className="max-w-xs text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                    La misma lógica visual servirá para la futura vista 3D del diseño hidráulico de cada proyecto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rough-dashed mt-10 flex flex-col gap-2 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between" style={{ color: 'var(--ink-soft)' }}>
          <span>© {currentYear} Pool Installer. Todos los derechos reservados.</span>
          <span>Herramienta técnica desarrollada en Puerto Madryn, Chubut.</span>
        </div>
      </div>
    </footer>
  );
};
