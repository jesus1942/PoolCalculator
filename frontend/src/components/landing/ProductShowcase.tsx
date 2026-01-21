import React, { useState } from 'react';
import { LayoutDashboard, FolderOpen, Calculator, FileText, BarChart3, Share2, ChevronRight } from 'lucide-react';

interface ShowcaseFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  highlights: string[];
}

export const ProductShowcase: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features: ShowcaseFeature[] = [
    {
      id: 'dashboard',
      title: 'Panel de Control',
      description: 'Vista general de todos tus proyectos, estadísticas y acceso rápido a las funciones principales.',
      icon: <LayoutDashboard className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
      highlights: [
        'Resumen de proyectos activos',
        'Estadísticas en tiempo real',
        'Accesos directos personalizables',
        'Notificaciones importantes'
      ]
    },
    {
      id: 'projects',
      title: 'Gestión de Proyectos',
      description: 'Crea, edita y gestiona múltiples proyectos de piscinas simultáneamente con total control.',
      icon: <FolderOpen className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop',
      highlights: [
        'Lista completa de proyectos',
        'Filtros y búsqueda avanzada',
        'Estados personalizables',
        'Vista detallada por proyecto'
      ]
    },
    {
      id: 'calculator',
      title: 'Calculadora de Materiales',
      description: 'Calcula automáticamente todos los materiales necesarios basándose en el modelo de piscina seleccionado.',
      icon: <Calculator className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=500&fit=crop',
      highlights: [
        'Cálculos automáticos precisos',
        'Excavación y movimiento de tierra',
        'Materiales de construcción',
        'Instalación hidráulica y eléctrica'
      ]
    },
    {
      id: 'reports',
      title: 'Reportes y Exportación',
      description: 'Genera reportes profesionales y exporta toda la información a Excel con un solo click.',
      icon: <FileText className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop',
      highlights: [
        'Exportación a Excel personalizada',
        'Reportes de materiales detallados',
        'Presupuestos profesionales',
        'Listas de compra optimizadas'
      ]
    },
    {
      id: 'analytics',
      title: 'Análisis y Estadísticas',
      description: 'Visualiza el rendimiento de tus proyectos con gráficos y métricas clave.',
      icon: <BarChart3 className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
      highlights: [
        'Gráficos interactivos',
        'Comparación de proyectos',
        'Análisis de costos',
        'Tendencias y proyecciones'
      ]
    },
    {
      id: 'client-portal',
      title: 'Portal del Cliente',
      description: 'Comparte el progreso del proyecto con tus clientes mediante un portal seguro y personalizado.',
      icon: <Share2 className="w-6 h-6" />,
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=500&fit=crop',
      highlights: [
        'Acceso compartido seguro',
        'Actualizaciones en tiempo real',
        'Timeline visual del proyecto',
        'Sin necesidad de crear cuenta'
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Feature Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        {features.map((feature, index) => (
          <button
            key={feature.id}
            onClick={() => setActiveFeature(index)}
            className={`group relative p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              activeFeature === index
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
          >
            <div className={`mb-3 inline-flex items-center justify-center w-12 h-12 rounded-lg ${
              activeFeature === index
                ? 'bg-white/20'
                : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
            } transition-colors`}>
              {feature.icon}
            </div>
            <h4 className={`font-semibold text-sm leading-tight ${
              activeFeature === index ? 'text-white' : 'text-gray-900'
            }`}>
              {feature.title}
            </h4>
          </button>
        ))}
      </div>

      {/* Feature Content */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left side - Description */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 mb-6">
              {features[activeFeature].icon}
            </div>

            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              {features[activeFeature].title}
            </h3>

            <p className="text-lg text-gray-600 mb-6">
              {features[activeFeature].description}
            </p>

            <div className="space-y-3">
              {features[activeFeature].highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>

            <button className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105 w-fit">
              Ver Demo Interactiva
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right side - Screenshot/Image */}
          <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50 p-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10"></div>
            <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden shadow-2xl border-4 border-white transform transition-all duration-500 hover:scale-105">
              <img
                src={features[activeFeature].image}
                alt={features[activeFeature].title}
                className="w-full h-full object-cover"
              />
              {/* Overlay para simular interfaz */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-sm font-medium">En vivo</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Captura del panel de Pool Installer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
          <div className="text-sm text-gray-600">Instaladores Activos</div>
        </div>
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
          <div className="text-sm text-gray-600">Proyectos Completados</div>
        </div>
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-3xl font-bold text-blue-600 mb-2">60%</div>
          <div className="text-sm text-gray-600">Ahorro de Tiempo</div>
        </div>
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
          <div className="text-sm text-gray-600">Soporte Técnico</div>
        </div>
      </div>
    </div>
  );
};
