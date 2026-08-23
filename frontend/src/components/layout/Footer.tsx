import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HdArrowOut, HdFolderOpen, HdGear, HdWaves } from '@/components/ui/HandDrawnIcons';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { developerWhatsappUrl, developerPortfolioUrl } from '@/components/DeveloperCredit';
import { TechnicalPoolScene } from '@/components/visual/TechnicalPoolScene';

interface FooterProps {
  showcase?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ showcase = false }) => {
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

      {showcase && (
        <section className="relative overflow-hidden" style={{ borderBottom: '1.3px dashed var(--hair-strong)' }}>
          <div className="relative mx-auto max-w-[1500px] px-3 pb-4 pt-10 sm:px-6 sm:pb-7 sm:pt-14 lg:px-8 lg:pt-16">
            <div className="relative min-h-[560px] overflow-hidden sm:min-h-[650px] lg:min-h-[720px]">
              <TechnicalPoolScene className="absolute inset-0 h-full w-full" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between gap-4 px-2 sm:px-4 lg:px-8">
                <div className="max-w-xl">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-[11px]"
                    style={{ color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    INSTALACIÓN COMO SISTEMA
                  </p>
                  <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-[1.02] sm:text-4xl lg:text-6xl" style={{ color: 'var(--ink)' }}>
                    Diseñá la piscina. Entendé lo que pasa debajo.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-7 sm:text-base" style={{ color: 'var(--ink-soft)' }}>
                    El casco, los puntos hidráulicos, las cañerías y la sala técnica forman una sola instalación. Pool Installer lleva esa lógica del plano al cálculo y a la obra.
                  </p>
                </div>

                <div className="hidden pt-1 text-right lg:block">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--ink-soft)' }}>CORTE TÉCNICO / V2</p>
                  <p className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>CASCO + HIDRÁULICA + EQUIPOS</p>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-2 bottom-4 z-10 sm:inset-x-4 sm:bottom-8 lg:inset-x-8">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['01', 'Casco', 'Geometría y profundidad'],
                    ['02', 'Succión', 'Skimmer, fondo y colector'],
                    ['03', 'Impulsión', 'Retornos y distribución'],
                    ['04', 'Sala técnica', 'Bomba, filtro y bypass'],
                  ].map(([number, label, description]) => (
                    <div
                      key={number}
                      className="rounded-xl px-3 py-3 backdrop-blur-sm sm:px-4"
                      style={{
                        border: '1.2px solid var(--hair-strong)',
                        backgroundColor: 'color-mix(in srgb, var(--card) 82%, transparent)',
                      }}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>{number}</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</span>
                      </div>
                      <p className="mt-1 pl-6 text-[11px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${showcase ? 'py-10 sm:py-12' : 'py-10 sm:py-12'}`}>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
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

            <p className="mt-5 max-w-2xl text-sm leading-7" style={{ color: 'var(--ink-soft)' }}>
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

        <div className="rough-dashed mt-9 flex flex-col gap-2 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between" style={{ color: 'var(--ink-soft)' }}>
          <span>© {currentYear} Pool Installer. Todos los derechos reservados.</span>
          <span>Herramienta técnica desarrollada en Puerto Madryn, Chubut.</span>
        </div>
      </div>
    </footer>
  );
};
