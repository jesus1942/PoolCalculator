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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-zinc-100">
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
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="h-12 w-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-7 w-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Pool Installer</h1>
                <p className="text-sm text-zinc-400">by Domotics & IoT Solutions</p>
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
              <a href="#contact" className="text-zinc-300 hover:text-cyan-300 font-medium transition-colors">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div
            ref={heroRef.ref}
            className={`text-center mb-16 transition-all duration-1000 ${
              heroRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-cyan-200 rounded-full mb-6 animate-pulse border border-white/10">
              <Waves className="w-5 h-5" />
              <span className="font-semibold">Sistema Profesional de Cálculo</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Calcula Materiales para<br />
              <span className="text-cyan-300">Piscinas de Fibra</span> en Minutos
            </h2>
            <p className="text-xl text-zinc-300 max-w-3xl mx-auto mb-10">
              Sistema completo para calcular materiales, presupuestar y gestionar proyectos
              de montaje de piscinas de fibra de vidrio con precisión profesional.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-4 bg-cyan-400 text-zinc-950 text-lg font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Ir al Panel
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/projects')}
                    className="px-8 py-4 bg-white/5 text-zinc-200 text-lg font-semibold rounded-lg hover:bg-white/10 transition-all shadow-md border-2 border-white/10"
                  >
                    Ver Proyectos
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-8 py-4 bg-cyan-400 text-zinc-950 text-lg font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    Comenzar Gratis
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-4 bg-white/5 text-zinc-200 text-lg font-semibold rounded-lg hover:bg-white/10 transition-all shadow-md border-2 border-white/10"
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
            className={`grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto transition-all duration-1000 delay-300 ${
              statsRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-300 mb-2">24</div>
              <div className="text-zinc-400">Modelos ACQUAM</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-300 mb-2">60%</div>
              <div className="text-zinc-400">Ahorro de Tiempo</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-300 mb-2">100+</div>
              <div className="text-zinc-400">Materiales</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-300 mb-2">2025</div>
              <div className="text-zinc-400">Precios Actualizados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Carousel Section - Solo visible para usuarios autenticados */}
      {isAuthenticated && (
        <section id="projects" className="py-20 bg-zinc-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              ref={projectsRef.ref}
              className={`text-center mb-12 transition-all duration-1000 ${
                projectsRef.isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Proyectos Activos
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Mira algunos de los proyectos en construcción
              </p>
            </div>
            <Suspense fallback={<LoadingSection />}>
              <ProjectsCarousel />
            </Suspense>
          </div>
        </section>
      )}

      {/* Pool Models Carousel Section */}
      <section id="models" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={modelsRef.ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              modelsRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Catálogo de Modelos ACQUAM
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              24 modelos de piscinas de fibra de vidrio con especificaciones completas
            </p>
          </div>
          <Suspense fallback={<LoadingSection />}>
            <PoolModelsCarousel />
          </Suspense>
        </div>
      </section>

      {/* Calculator Widget Section */}
      <section id="calculator" className="py-20 bg-zinc-950/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={calculatorRef.ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              calculatorRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Calculador Inteligente
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubre qué modelos de piscina caben en tu espacio disponible
            </p>
          </div>
          <Suspense fallback={<LoadingSection />}>
            <PoolCalculatorWidget />
          </Suspense>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section id="showcase" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={productShowcaseRef.ref}
            className={`text-center mb-16 transition-all duration-1000 ${
              productShowcaseRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full mb-6">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Descubre el Panel</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mira cómo funciona por dentro
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explora todas las funcionalidades que tendrás a tu disposición
            </p>
          </div>
          <Suspense fallback={<LoadingSection />}>
            <ProductShowcase />
          </Suspense>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={featuresRef.ref}
            className={`text-center mb-16 transition-all duration-1000 ${
              featuresRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitás en una plataforma
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Diseñado específicamente para instaladores profesionales de piscinas
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-400/50 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 ${
                  featuresRef.isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Request Section */}
      <section id="quote" className="py-20 bg-zinc-950/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={quoteRef.ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              quoteRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <Calculator className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Solicitar Presupuesto
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Completa el formulario y recibe un presupuesto personalizado sin compromiso
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl shadow-2xl p-8 border border-white/10">
            <Suspense fallback={<LoadingSection />}>
              <QuoteRequestForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={contactRef.ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              contactRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <MessageSquare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Tenés Preguntas?
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Envianos tu consulta y te responderemos a la brevedad
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl shadow-2xl p-8 border border-white/10">
            <Suspense fallback={<LoadingSection />}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={testimonialsRef.ref}
            className={`text-center mb-12 transition-all duration-1000 ${
              testimonialsRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full mb-6">
              <Star className="w-5 h-5 fill-yellow-400" />
              <span className="font-semibold">Clientes Satisfechos</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Más de 100 profesionales confían en Pool Installer para gestionar sus proyectos
            </p>
          </div>
          <Suspense fallback={<LoadingSection />}>
            <Testimonials />
          </Suspense>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={pricingRef.ref}
            className={`text-center mb-16 transition-all duration-1000 ${
              pricingRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-6">
              <DollarSign className="w-5 h-5" />
              <span className="font-semibold">Planes y Precios</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Elige el plan perfecto para ti
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comienza gratis y actualiza cuando necesites más funcionalidades
            </p>
          </div>
          <Suspense fallback={<LoadingSection />}>
            <PricingSection />
          </Suspense>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500/20 via-zinc-900 to-blue-500/20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={benefitsRef.ref}
            className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 ${
              benefitsRef.isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Por qué elegir Pool Installer
              </h3>
              <p className="text-xl text-blue-100 mb-8">
                Desarrollado por profesionales de la industria para profesionales de la industria
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h4 className="text-2xl font-bold mb-4">
                {isAuthenticated ? 'Bienvenido de Nuevo' : 'Comienza Hoy'}
              </h4>
              <p className="text-blue-100 mb-6">
                {isAuthenticated
                  ? 'Accede a tu panel de control y gestiona tus proyectos'
                  : 'Únete a los instaladores profesionales que ya confían en Pool Installer'
                }
              </p>
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full px-8 py-4 bg-cyan-400 text-zinc-950 text-lg font-semibold rounded-lg hover:bg-cyan-300 transition-all shadow-lg"
              >
                {isAuthenticated ? 'Ir al Panel' : 'Crear Cuenta Gratis'}
              </button>
              {!isAuthenticated && (
                <p className="text-sm text-blue-200 mt-4 text-center">
                  No requiere tarjeta de crédito
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-6 w-auto" />
              </div>
              <div>
                <p className="text-white font-semibold">Pool Installer</p>
                <p className="text-sm">Sistema completo de cálculo de materiales</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white font-semibold mb-1">Desarrollado por</p>
              <p className="text-sm">Jesús Olguín - Domotics & IoT Solutions</p>
              <p className="text-sm">Professional Developer</p>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm">
            © 2025 Pool Installer. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
