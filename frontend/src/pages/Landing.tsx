import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ClipboardList, FileText, FolderOpen, Menu, MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePublicIntegrations } from '@/hooks/usePublicIntegrations';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { LandingReveal, TiltCard } from '@/components/landing/LandingMotion';
import { TechnicalPoolScene } from '@/components/visual/TechnicalPoolScene';
import '@/theme/landing-v3.css';

const ProductShowcase = lazy(() => import('@/components/landing/ProductShowcase').then(m => ({ default: m.ProductShowcase })));
const PoolModelsCarousel = lazy(() => import('@/components/landing/PoolModelsCarousel').then(m => ({ default: m.PoolModelsCarousel })));
const PoolCalculatorWidget = lazy(() => import('@/components/landing/PoolCalculatorWidget').then(m => ({ default: m.PoolCalculatorWidget })));
const ContactForm = lazy(() => import('@/components/landing/ContactForm').then(m => ({ default: m.ContactForm })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));

const navigation = [
  { href: '#showcase', label: 'La aplicación' },
  { href: '#models', label: 'Catálogo' },
  { href: '#calculator', label: 'Probala' },
  { href: '#pricing', label: 'Planes' },
  { href: '#contact', label: 'Contacto' },
];

/** Estado de carga visible sin reservar pantallas enteras vacías. */
function LoadingSection() {
  return <div className="pl-loading" role="status">Preparando esta sección…</div>;
}

/** Landing comercial: la navegación, la demostración y el contacto son flujos distintos. */
export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { whatsappUrl } = usePublicIntegrations();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountPath = isAuthenticated ? '/dashboard' : '/register';
  const accountLabel = isAuthenticated ? 'Ir a mi panel' : 'Crear una cuenta';

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const schema = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'Pool Installer', applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
    description: 'Aplicación para organizar proyectos, materiales, presupuestos y seguimiento de obras de piscinas.',
    author: { '@type': 'Person', name: 'Jesús Olguín' },
  };

  return (
    <div className="pool-landing-v3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <a href="#landing-main" className="pl-skip-link">Ir al contenido</a>
      <header className="pl-header">
        <div className="pl-container pl-header-inner">
          <a href="#landing-main" className="pl-brand" aria-label="Pool Installer, inicio">
            <span className="pl-brand-mark rough-panel"><img src={publicAssetUrl('logo-isotipo.png')} alt="" width="30" height="30" /></span>
            <span><strong>Pool Installer</strong><small>El cuaderno de tus obras.</small></span>
          </a>
          <nav className="pl-desktop-nav" aria-label="Navegación principal">{navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
          <div className="pl-header-actions">{!isAuthenticated && <Link className="pl-login" to="/login">Ingresar</Link>}<Link className="pl-button pl-button--primary pl-header-cta" to={accountPath}>{isAuthenticated ? 'Mi panel' : 'Crear cuenta'}<ArrowUpRight size={16} /></Link><button ref={menuButton} type="button" className="pl-menu-button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="landing-mobile-menu">{menuOpen ? <X size={23} /> : <Menu size={23} />}</button></div>
        </div>
        {menuOpen && <nav id="landing-mobile-menu" className="pl-mobile-nav" aria-label="Navegación móvil">{navigation.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowUpRight size={17} /></a>)}{!isAuthenticated && <Link to="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión<ArrowUpRight size={17} /></Link>}<Link to={accountPath} onClick={() => setMenuOpen(false)}>{accountLabel}<ArrowUpRight size={17} /></Link></nav>}
      </header>

      <main id="landing-main">
        <section className="pl-hero pl-container" aria-labelledby="landing-title">
          <div className="pl-hero-copy">
            <p className="pl-kicker"><span className="pl-kicker-line" />DE LA IDEA A LA OBRA</p>
            <h1 id="landing-title">Cada piscina,<br />un proyecto<br /><span>bajo control.</span></h1>
            <p className="pl-hero-description">Tu experiencia en obra merece una herramienta a su altura. Organizá modelos, materiales, presupuestos y avances en un mismo lugar.</p>
            <div className="pl-hero-actions"><Link to={accountPath} className="pl-button pl-button--primary">{accountLabel}<ArrowRight size={19} /></Link><a href="#showcase" className="pl-button pl-button--secondary">Mirar por dentro<ArrowDown size={18} /></a></div>
            <p className="pl-hero-footnote">Pensado para instaladores. Hecho en Puerto Madryn.</p>
          </div>
          <div className="pl-hero-art">
            <TiltCard className="pl-hero-sheet rough-panel">
              <div className="pl-sheet-heading"><span>CUADERNO DE PROYECTO</span><span>PI — 01</span></div>
              <div className="pl-hero-scene"><TechnicalPoolScene className="h-full w-full" /></div>
              <div className="pl-sheet-caption"><strong>Todo empieza por ver el conjunto.</strong><span>Vista conceptual de una instalación.</span></div>
            </TiltCard>
            <div className="pl-hero-note rough-panel"><Check size={18} /><span>La información de tu obra,<br /><strong>siempre en la misma ficha.</strong></span></div>
          </div>
        </section>

        <div className="pl-container"><div className="pl-workflow-strip">{[
          { n: '01', icon: FolderOpen, title: 'Definí el proyecto', text: 'Cliente, modelo y alcance.' },
          { n: '02', icon: FileText, title: 'Ordená el presupuesto', text: 'Materiales, equipos y costos.' },
          { n: '03', icon: ClipboardList, title: 'Seguí cada avance', text: 'Tareas, equipo y cliente.' },
        ].map(item => <div key={item.n}><span>{item.n}</span><item.icon size={22} /><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div></div>

        <section id="showcase" className="pl-section pl-container" aria-labelledby="showcase-title">
          <LandingReveal><div className="pl-section-heading"><div><p className="pl-kicker">UN RECORRIDO, PASO A PASO</p><h2 id="showcase-title">Menos cosas sueltas.<br /><span>Más claridad para trabajar.</span></h2></div><p>Pasá las tarjetas y conocé cómo se organiza la aplicación. Los datos de esta demostración son ejemplos.</p></div><Suspense fallback={<LoadingSection />}><ProductShowcase /></Suspense></LandingReveal>
        </section>

        <section id="models" className="pl-section pl-section--catalog" aria-labelledby="models-title">
          <div className="pl-container"><LandingReveal><div className="pl-section-heading"><div><p className="pl-kicker">EL PUNTO DE PARTIDA</p><h2 id="models-title">Un modelo.<br /><span>Muchas posibilidades.</span></h2></div><p>Explorá las fichas del catálogo disponible y encontrá el punto de partida de tu próximo proyecto.</p></div><Suspense fallback={<LoadingSection />}><PoolModelsCarousel /></Suspense></LandingReveal></div>
        </section>

        <section id="calculator" className="pl-section pl-container" aria-labelledby="calculator-title">
          <LandingReveal className="pl-try-grid"><div className="pl-try-copy"><p className="pl-kicker">PROBÁ UNA PARTE DE LA APLICACIÓN</p><h2 id="calculator-title">De tus medidas<br /><span>al catálogo.</span></h2><p>Ingresá el espacio disponible y consultá los modelos que devuelve el buscador. No necesitás crear una cuenta para explorar esta función.</p><ol><li><span>01</span>Ingresá largo y ancho.</li><li><span>02</span>Revisá los modelos encontrados.</li><li><span>03</span>Explorá la ficha que te interesa.</li></ol><p className="pl-small">La búsqueda compara medidas del catálogo. La definición del proyecto requiere revisar las condiciones de la obra.</p></div><div className="pl-form-panel pl-calculator-panel"><Suspense fallback={<LoadingSection />}><PoolCalculatorWidget /></Suspense></div></LandingReveal>
        </section>

        <section id="pricing" className="pl-section pl-commercial-section" aria-label="Consulta de planes"><div className="pl-container"><LandingReveal><Suspense fallback={<LoadingSection />}><PricingSection /></Suspense></LandingReveal></div></section>

        <section className="pl-section pl-container pl-faq-section" aria-labelledby="faq-title"><div><p className="pl-kicker">ANTES DE EMPEZAR</p><h2 id="faq-title">Las cosas,<br /><span>claras.</span></h2></div><div className="pl-faq-list">{[
          ['¿Para quién está pensado?', 'Para profesionales y equipos que necesitan organizar proyectos de piscinas, sus materiales, presupuestos y seguimiento en una aplicación.'],
          ['¿Lo puedo usar desde el celular?', 'La aplicación web adapta sus pantallas al celular y a la computadora. Para consultar y guardar información necesitás conexión a internet.'],
          ['¿Los datos de la demostración son reales?', 'Las tarjetas del recorrido usan datos de ejemplo. La sección Catálogo consulta los modelos disponibles en la aplicación.'],
          ['¿Cómo consulto los planes y la suscripción?', 'Escribinos desde el formulario de contacto. Confirmamos el alcance, los precios y las condiciones antes de contratar. La landing no procesa pagos.'],
        ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

        <section id="contact" className="pl-section pl-contact-section" aria-labelledby="contact-title"><div className="pl-container pl-contact-grid"><div><p className="pl-kicker">DE PROFESIONAL A PROFESIONAL</p><h2 id="contact-title">Contanos cómo<br /><span>trabajás.</span></h2><p>¿Trabajás solo o coordinás un equipo? ¿Qué te lleva más tiempo en cada obra? Empecemos por ahí.</p><div className="pl-contact-note rough-panel"><MessageCircle size={23} /><div><strong>Una conversación concreta.</strong><p>Consultá por una demostración, el alcance de la aplicación o sus condiciones comerciales.</p></div></div>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="pl-text-link">También podés escribir por WhatsApp<ArrowUpRight size={18} /></a>}</div><div id="contact-form" className="pl-form-panel"><Suspense fallback={<LoadingSection />}><ContactForm /></Suspense></div></div></section>
      </main>
    </div>
  );
};

export default Landing;
