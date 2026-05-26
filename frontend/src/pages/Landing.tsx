import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Waves, Calculator, DollarSign, FileText, Users, Zap, CheckCircle, ArrowRight, MessageSquare, Send, Menu, X, Star } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

// Lazy load componentes pesados para mejorar rendimiento
const ProjectsCarousel = lazy(() => import('@/components/landing/ProjectsCarousel').then(m => ({ default: m.ProjectsCarousel })));
const PoolModelsCarousel = lazy(() => import('@/components/landing/PoolModelsCarousel').then(m => ({ default: m.PoolModelsCarousel })));
const ContactForm = lazy(() => import('@/components/landing/ContactForm').then(m => ({ default: m.ContactForm })));
const QuoteRequestForm = lazy(() => import('@/components/landing/QuoteRequestForm').then(m => ({ default: m.QuoteRequestForm })));
const PoolCalculatorWidget = lazy(() => import('@/components/landing/PoolCalculatorWidget').then(m => ({ default: m.PoolCalculatorWidget })));
const Testimonials = lazy(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const ProductShowcase = lazy(() => import('@/components/landing/ProductShowcase').then(m => ({ default: m.ProductShowcase })));

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [ctaTab, setCtaTab] = useState<'calculator' | 'quote' | 'contact'>('calculator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detectar scroll para animar navbar
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Refs para animaciones
  const heroRef = useScrollAnimation();
  const statsRef = useScrollAnimation();
  const projectsRef = useScrollAnimation();
  const modelsRef = useScrollAnimation();
  const calculatorRef = useScrollAnimation();
  const featuresRef = useScrollAnimation();
  const quoteRef = useScrollAnimation();
  const contactRef = useScrollAnimation();
  const testimonialsRef = useScrollAnimation();
  const productShowcaseRef = useScrollAnimation();
  const pricingRef = useScrollAnimation();
  const benefitsRef = useScrollAnimation();

  const features = [
    {
      icon: <Calculator className="w-8 h-8" />,
      title: "Cálculos Precisos",
      description: "Calcula materiales exactos para cada proyecto de piscina con precisión profesional"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Gestión de Costos",
      description: "Control total de presupuestos, materiales y mano de obra en tiempo real"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Reportes Detallados",
      description: "Genera presupuestos profesionales y reportes completos para tus clientes"
    },
    {
      icon: <Waves className="w-8 h-8" />,
      title: "Catálogo de Modelos",
      description: "Amplia selección de modelos de piscinas con especificaciones técnicas completas"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Portal del Cliente",
      description: "Tus clientes pueden ver el progreso de su proyecto en tiempo real"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Automatización",
      description: "Automatiza cálculos complejos de excavación, hidráulica y electricidad"
    }
  ];

  const benefits = [
    "Ahorra hasta 60% del tiempo en presupuestación",
    "Reduce errores de cálculo a cero",
    "Gestiona múltiples proyectos simultáneamente",
    "Exporta a Excel con un click",
    "Base de datos actualizada de precios 2025",
    "Soporte técnico profesional"
  ];

  // Loading component para Suspense
  const LoadingSection = () => (
    <div className="h-96 bg-zinc-900/60 rounded-xl animate-pulse flex items-center justify-center border border-white/5">
      <div className="text-zinc-400">Cargando...</div>
    </div>
  );

  // Schema.org JSON-LD para SEO
  const schemaOrgData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Pool Installer",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "ARS"
    },
    "description": "Sistema profesional de cálculo de materiales para piscinas de fibra de vidrio ACQUAM. Calcula excavación, materiales y presupuestos en minutos.",
    "author": {
      "@type": "Person",
      "name": "Jesús Olguín"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Domotics & IoT Solutions",
      "url": "https://poolcalculator.com"
    }
  };

  return (
    <div className="landing-surface min-h-screen overflow-x-hidden bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-zinc-100">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
      />
      {/* Header/Navigation */}
      <nav className={`bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-2xl py-2' : 'shadow-sm py-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:h-20">
            <div className="flex min-w-0 cursor-pointer items-center gap-3 sm:gap-4" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black sm:h-12 sm:w-12">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-6 w-auto sm:h-7" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white sm:text-2xl">Pool Installer</h1>
                <p className="truncate text-xs text-zinc-400 sm:text-sm">by Domotics & IoT Solutions</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#projects" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Proyectos
              </a>
              <a href="#models" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Modelos
              </a>
              <a href="#calculator" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Calculador
              </a>
              <a href="#showcase" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Demo
              </a>
              <a href="#pricing" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Precios
              </a>
              <a href="#calculator" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
                Contacto
              </a>

              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2 bg-cyan-400 text-zinc-950 font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-md hover:shadow-lg"
                >
                  Ir al Panel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 text-zinc-300 font-medium hover:text-cyan-300 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-2 bg-cyan-400 text-zinc-950 font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-md hover:shadow-lg"
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#projects" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Proyectos
              </a>
              <a href="#models" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Modelos
              </a>
              <a href="#calculator" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Calculador
              </a>
              <a href="#showcase" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Demo
              </a>
              <a href="#pricing" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Precios
              </a>
              <a href="#contact" className="block px-4 py-2 text-zinc-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                Contacto
              </a>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-left px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg font-semibold"
                >
                  Ir al Panel
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="w-full text-left px-4 py-2 text-zinc-300">
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full text-left px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg font-semibold"
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 py-14 overflow-hidden sm:px-6 sm:py-28 lg:px-8">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl animate-float-delay" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-cyan-400/5 blur-3xl animate-pulse-slow" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.032]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="max-w-7xl mx-auto relative">
          <div
            ref={heroRef.ref}
            className={`text-center mb-20 transition-all duration-1000 ease-out ${
              heroRef.isVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-20 scale-[0.98]'
            }`}
          >
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-cyan-200 animate-float-slow sm:mb-6 sm:px-4">
              <Waves className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              <span className="truncate text-sm font-semibold sm:text-base">Sistema Profesional de Cálculo</span>
            </div>
            <h2 className="mb-5 text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">Calcula Materiales para</span><br />
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent">Piscinas de Fibra</span>
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"> en Minutos</span>
            </h2>
            <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-zinc-300 sm:mb-10 sm:text-xl">
              Sistema completo para calcular materiales, presupuestar y gestionar proyectos
              de montaje de piscinas de fibra de vidrio con precisión profesional.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-base font-semibold text-zinc-950 shadow-lg transition-all hover:bg-cyan-300 hover:shadow-xl sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                  >
                    Ir al Panel
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/projects')}
                    className="w-full rounded-lg border-2 border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-zinc-200 shadow-md transition-all hover:bg-white/10 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                  >
                    Ver Proyectos
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-base font-semibold text-zinc-950 shadow-lg transition-all hover:bg-cyan-300 hover:shadow-xl sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                  >
                    Comenzar Gratis
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full rounded-lg border-2 border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-zinc-200 shadow-md transition-all hover:bg-white/10 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                  >
                    Probar Calculador
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            ref={statsRef.ref}
            className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 md:gap-8"
          >
            {[
              { value: '24', label: 'Modelos ACQUAM' },
              { value: '60%', label: 'Ahorro de Tiempo' },
              { value: '100+', label: 'Materiales' },
              { value: '2025', label: 'Precios Actualizados' },
            ].map((stat, i) => (
              <div
                key={i}
                className={`text-center transition-all duration-700 ease-out ${
                  statsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: statsRef.isVisible ? `${i * 130 + 300}ms` : '0ms' }}
              >
                <div className="mb-2 text-3xl font-bold text-cyan-300 sm:text-4xl">{stat.value}</div>
                <div className="text-sm text-zinc-400 sm:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Carousel Section - Solo visible para usuarios autenticados */}
      {isAuthenticated && (
        <section id="projects" className="py-20 bg-zinc-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              ref={projectsRef.ref}
              className={`text-center mb-12 transition-all duration-700 ease-out ${
                projectsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Proyectos Activos</h3>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Mira algunos de los proyectos en construcción</p>
            </div>
            <Suspense fallback={<LoadingSection />}><ProjectsCarousel /></Suspense>
          </div>
        </section>
      )}

      {/* Pool Models Carousel Section */}
      <section id="models" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={modelsRef.ref}
            className={`text-center mb-12 transition-all duration-700 ease-out ${
              modelsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Catálogo de Modelos ACQUAM</h3>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">24 modelos de piscinas de fibra de vidrio con especificaciones completas</p>
          </div>
          <Suspense fallback={<LoadingSection />}><PoolModelsCarousel /></Suspense>
        </div>
      </section>

      {/* Unified CTA Section: Calculator / Quote / Contact */}
      <section id="calculator" className="py-20 bg-zinc-950/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={calculatorRef.ref}
            className={`text-center mb-10 transition-all duration-700 ease-out ${
              calculatorRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-full mb-5">
              <Zap className="w-4 h-4" />
              <span className="font-semibold text-sm">Probá la aplicación</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">Calculador inteligente de piscinas</h3>
            <p className="text-zinc-400 max-w-xl mx-auto">Ingresá las medidas disponibles y descubrí qué modelos ACQUAM entran. También podés pedir presupuesto o hacernos una consulta.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1.5 w-fit mx-auto">
            {([
              { key: 'calculator', label: 'Calculador', icon: <Calculator className="w-4 h-4" /> },
              { key: 'quote',      label: 'Presupuesto', icon: <FileText className="w-4 h-4" /> },
              { key: 'contact',    label: 'Contacto',    icon: <MessageSquare className="w-4 h-4" /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setCtaTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ctaTab === tab.key
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {ctaTab === 'calculator' && (
              <Suspense fallback={<LoadingSection />}><PoolCalculatorWidget /></Suspense>
            )}
            {ctaTab === 'quote' && (
              <div className="p-8">
                <Suspense fallback={<LoadingSection />}><QuoteRequestForm /></Suspense>
              </div>
            )}
            {ctaTab === 'contact' && (
              <div className="p-8">
                <Suspense fallback={<LoadingSection />}><ContactForm /></Suspense>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section id="showcase" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={productShowcaseRef.ref}
            className={`text-center mb-16 transition-all duration-700 ease-out ${
              productShowcaseRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full mb-6">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Descubrí el Panel</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Mirá cómo funciona por dentro</h3>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Explorá todas las funcionalidades que tendrás a tu disposición</p>
          </div>
          <Suspense fallback={<LoadingSection />}><ProductShowcase /></Suspense>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={featuresRef.ref}
            className={`text-center mb-16 transition-all duration-700 ease-out ${
              featuresRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Todo lo que necesitás en una plataforma</h3>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Diseñado específicamente para instaladores profesionales de piscinas</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-400/50 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 ${
                  featuresRef.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-14 scale-[0.95]'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


{/* Testimonials Section */}
      <section className="py-20 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={testimonialsRef.ref}
            className={`text-center mb-12 transition-all duration-700 ease-out ${
              testimonialsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-full mb-6">
              <Star className="w-5 h-5 fill-yellow-400" />
              <span className="font-semibold">Clientes Satisfechos</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Lo que dicen nuestros clientes</h3>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Más de 100 profesionales confían en Pool Installer para gestionar sus proyectos</p>
          </div>
          <Suspense fallback={<LoadingSection />}><Testimonials /></Suspense>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={pricingRef.ref}
            className={`text-center mb-16 transition-all duration-700 ease-out ${
              pricingRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full mb-6">
              <DollarSign className="w-5 h-5" />
              <span className="font-semibold">Planes y Precios</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">Elegí el plan perfecto para vos</h3>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Comenzá gratis y actualizá cuando necesités más funcionalidades</p>
          </div>
          <Suspense fallback={<LoadingSection />}><PricingSection /></Suspense>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500/20 via-zinc-900 to-blue-500/20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={benefitsRef.ref}
            className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ease-out ${
              benefitsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">Por qué elegir Pool Installer</h3>
              <p className="text-xl text-zinc-300 mb-8">Desarrollado por profesionales de la industria para profesionales de la industria</p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 transition-all duration-500 ease-out ${
                      benefitsRef.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                    }`}
                    style={{ transitionDelay: benefitsRef.isVisible ? `${index * 80}ms` : '0ms' }}
                  >
                    <CheckCircle className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-zinc-200">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h4 className="text-2xl font-bold mb-4">{isAuthenticated ? 'Bienvenido de Nuevo' : 'Comenzá Hoy'}</h4>
              <p className="text-zinc-300 mb-6">
                {isAuthenticated
                  ? 'Accedé a tu panel de control y gestioná tus proyectos'
                  : 'Únete a los instaladores profesionales que ya confían en Pool Installer'}
              </p>
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full px-8 py-4 bg-cyan-400 text-zinc-950 text-lg font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-lg"
              >
                {isAuthenticated ? 'Ir al Panel' : 'Crear Cuenta Gratis'}
              </button>
              {!isAuthenticated && <p className="text-sm text-zinc-400 mt-4 text-center">No requiere tarjeta de crédito</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                  <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-6 w-auto" />
                </div>
                <span className="text-white font-bold text-lg">Pool Installer</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Sistema profesional de cálculo de materiales para montaje de piscinas de fibra de vidrio. Diseñado para instaladores en Patagonia y el resto de Argentina.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-zinc-300 font-semibold mb-4 text-sm uppercase tracking-wider">Acceso rápido</p>
              <div className="space-y-2">
                {[
                  { label: 'Calculador', href: '#calculator' },
                  { label: 'Catálogo de modelos', href: '#models' },
                  { label: 'Precios', href: '#pricing' },
                  { label: 'Contacto', href: '#contact' },
                ].map(link => (
                  <a key={link.href} href={link.href} className="block text-zinc-500 hover:text-cyan-400 transition-colors text-sm">
                    {link.label}
                  </a>
                ))}
                <a href="/login" className="block text-zinc-500 hover:text-cyan-400 transition-colors text-sm">Iniciar sesión</a>
              </div>
            </div>

            {/* Developer */}
            <div>
              <p className="text-zinc-300 font-semibold mb-4 text-sm uppercase tracking-wider">Desarrollador</p>
              <p className="text-white font-medium">Jesús Olguín</p>
              <p className="text-zinc-500 text-sm mb-3">Domotics & IoT Solutions</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-400 font-medium">Sistema en producción</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600">
            <p>© 2026 Pool Installer. Todos los derechos reservados.</p>
            <p>Hecho en Puerto Madryn, Chubut · Argentina 🇦🇷</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
