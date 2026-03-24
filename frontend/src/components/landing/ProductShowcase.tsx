import React, { useState } from 'react';
import { LayoutDashboard, FolderOpen, Calculator, FileText, BarChart3, Share2, ChevronRight } from 'lucide-react';

interface ShowcaseFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights: string[];
}

const ShowcasePreview: React.FC<{ featureId: string; title: string }> = ({ featureId, title }) => {
  if (featureId === 'dashboard') {
    return (
      <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-4 bg-[#07111f] p-5 text-white">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Panel</p>
          <p className="mt-3 text-2xl font-semibold">Proyectos activos</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-zinc-400">Activos</p>
              <p className="mt-2 text-2xl font-bold">12</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-zinc-400">Presupuestos</p>
              <p className="mt-2 text-2xl font-bold">6</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-zinc-400">Alertas</p>
              <p className="mt-2 text-2xl font-bold">3</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Actividad reciente</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Excavación completada</div>
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Presupuesto exportado</div>
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Cliente aprobó proyecto</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Accesos rápidos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">Nuevo proyecto</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Exportar</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Agenda</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (featureId === 'projects') {
    return (
      <div className="h-full bg-[#0b1220] p-5 text-white">
        <div className="grid gap-3">
          {['Casa Figueroa', 'Club del Lago', 'Barrio Norte'].map((name, index) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-zinc-400">Modelo {index === 0 ? 'Jade' : index === 1 ? 'Citrino' : 'Alejandrita'}</p>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200">Activo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (featureId === 'calculator') {
    return (
      <div className="grid h-full grid-cols-2 gap-4 bg-[#0d1117] p-5 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Entrada</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-zinc-950 p-3">Modelo: Jade</div>
            <div className="rounded-xl bg-zinc-950 p-3">Distancia cabecera: 8 m</div>
            <div className="rounded-xl bg-zinc-950 p-3">Iluminación: 2 luces</div>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">Salida</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-black/20 p-3">Volumen: 36.9 m³</div>
            <div className="rounded-xl bg-black/20 p-3">Cañería: 47 m</div>
            <div className="rounded-xl bg-black/20 p-3">Potencia: 1.130 W</div>
          </div>
        </div>
      </div>
    );
  }

  if (featureId === 'reports') {
    return (
      <div className="h-full bg-[#f7f7f5] p-5 text-zinc-900">
        <div className="mx-auto h-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Reporte</p>
          <p className="mt-2 text-xl font-semibold">{title}</p>
          <div className="mt-5 space-y-3">
            <div className="h-3 rounded-full bg-zinc-200" />
            <div className="h-3 w-5/6 rounded-full bg-zinc-200" />
            <div className="h-24 rounded-2xl bg-cyan-100" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-xl bg-zinc-100" />
              <div className="h-16 rounded-xl bg-zinc-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (featureId === 'analytics') {
    return (
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-4 bg-[#111827] p-5 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Costos por etapa</p>
          <div className="mt-4 flex h-48 items-end gap-3">
            {[45, 68, 58, 82, 61].map((height, index) => (
              <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-500 to-blue-400" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Rentabilidad</p>
            <p className="mt-3 text-3xl font-bold">23%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-400">Promedio por obra</p>
            <p className="mt-3 text-3xl font-bold">$4.8M</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0f172a] p-5 text-white">
      <div className="grid h-full gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="rounded-2xl bg-cyan-400/10 p-4">
          <p className="text-sm text-cyan-100">Portal del cliente</p>
          <p className="mt-2 text-2xl font-semibold">Seguimiento compartido</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">Línea de tiempo</div>
          <div className="rounded-xl bg-white/5 p-4">Fotos y avances</div>
          <div className="rounded-xl bg-white/5 p-4">Estado de tareas</div>
          <div className="rounded-xl bg-white/5 p-4">Documentación</div>
        </div>
      </div>
    </div>
  );
};

export const ProductShowcase: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features: ShowcaseFeature[] = [
    {
      id: 'dashboard',
      title: 'Panel de Control',
      description: 'Vista general de todos tus proyectos, estadísticas y acceso rápido a las funciones principales.',
      icon: <LayoutDashboard className="w-6 h-6" />,
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
              <ShowcasePreview
                featureId={features[activeFeature].id}
                title={features[activeFeature].title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-sm font-medium">En vivo</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Vista representativa del flujo real de la app
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
