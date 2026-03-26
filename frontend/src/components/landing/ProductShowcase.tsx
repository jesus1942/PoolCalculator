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
      <div className="grid h-full grid-cols-1 gap-3 bg-[#07111f] p-3 text-white sm:gap-4 sm:p-4 lg:grid-cols-[1.2fr_0.8fr] lg:p-5">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Panel</p>
          <p className="mt-2 text-lg font-semibold sm:mt-3 sm:text-2xl">Proyectos activos</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
            <div className="rounded-xl bg-white/5 p-2.5 sm:p-3">
              <p className="text-xs text-zinc-400">Activos</p>
              <p className="mt-1.5 text-lg font-bold sm:mt-2 sm:text-2xl">12</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 sm:p-3">
              <p className="text-xs text-zinc-400">Presupuestos</p>
              <p className="mt-1.5 text-lg font-bold sm:mt-2 sm:text-2xl">6</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 sm:p-3">
              <p className="text-xs text-zinc-400">Alertas</p>
              <p className="mt-1.5 text-lg font-bold sm:mt-2 sm:text-2xl">3</p>
            </div>
          </div>
        </div>
        <div className="space-y-2.5 sm:space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm text-zinc-400">Actividad reciente</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Excavación completada</div>
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Presupuesto exportado</div>
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">Cliente aprobó proyecto</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
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
      <div className="h-full bg-[#0b1220] p-3 text-white sm:p-4 lg:p-5">
        <div className="grid gap-2.5 sm:gap-3">
          {['Casa Figueroa', 'Club del Lago', 'Barrio Norte'].map((name, index) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-zinc-400">Modelo {index === 0 ? 'Jade' : index === 1 ? 'Citrino' : 'Alejandrita'}</p>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] text-emerald-200 sm:px-3 sm:text-xs">Activo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (featureId === 'calculator') {
    return (
      <div className="grid h-full grid-cols-1 gap-3 bg-[#0d1117] p-3 text-white sm:gap-4 sm:p-4 lg:grid-cols-2 lg:p-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Entrada</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-zinc-950 p-3">Modelo: Jade</div>
            <div className="rounded-xl bg-zinc-950 p-3">Distancia cabecera: 8 m</div>
            <div className="rounded-xl bg-zinc-950 p-3">Iluminación: 2 luces</div>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 sm:p-4">
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
      <div className="h-full bg-[#f7f7f5] p-3 text-zinc-900 sm:p-4 lg:p-5">
        <div className="mx-auto h-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Reporte</p>
          <p className="mt-2 text-lg font-semibold sm:text-xl">{title}</p>
          <div className="mt-4 space-y-3 sm:mt-5">
            <div className="h-3 rounded-full bg-zinc-200" />
            <div className="h-3 w-5/6 rounded-full bg-zinc-200" />
            <div className="h-20 rounded-2xl bg-cyan-100 sm:h-24" />
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
      <div className="grid h-full grid-cols-1 gap-3 bg-[#111827] p-3 text-white sm:gap-4 sm:p-4 lg:grid-cols-[1.1fr_0.9fr] lg:p-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <p className="text-sm text-zinc-400">Costos por etapa</p>
          <div className="mt-4 flex h-32 items-end gap-2 sm:h-40 sm:gap-3 lg:h-48">
            {[45, 68, 58, 82, 61].map((height, index) => (
              <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-500 to-blue-400" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-2.5 sm:space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm text-zinc-400">Rentabilidad</p>
            <p className="mt-3 text-2xl font-bold sm:text-3xl">23%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm text-zinc-400">Promedio por obra</p>
            <p className="mt-3 text-2xl font-bold sm:text-3xl">$4.8M</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0f172a] p-3 text-white sm:p-4 lg:p-5">
      <div className="grid h-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:gap-4 sm:p-4 lg:p-5">
        <div className="rounded-2xl bg-cyan-400/10 p-3 sm:p-4">
          <p className="text-sm text-cyan-100">Portal del cliente</p>
          <p className="mt-2 text-lg font-semibold sm:text-2xl">Seguimiento compartido</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-3 sm:p-4">Línea de tiempo</div>
          <div className="rounded-xl bg-white/5 p-3 sm:p-4">Fotos y avances</div>
          <div className="rounded-xl bg-white/5 p-3 sm:p-4">Estado de tareas</div>
          <div className="rounded-xl bg-white/5 p-3 sm:p-4">Documentación</div>
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
      <div className="mb-10 grid grid-cols-2 gap-3 md:mb-12 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {features.map((feature, index) => (
          <button
            key={feature.id}
            onClick={() => setActiveFeature(index)}
            className={`group relative rounded-xl p-3 transition-all duration-300 hover:-translate-y-0.5 sm:p-4 ${
              activeFeature === index
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl sm:scale-[1.02]'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
          >
            <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg sm:mb-3 sm:h-12 sm:w-12 ${
              activeFeature === index
                ? 'bg-white/20'
                : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
            } transition-colors`}>
              {feature.icon}
            </div>
            <h4 className={`text-xs font-semibold leading-tight sm:text-sm ${
              activeFeature === index ? 'text-white' : 'text-gray-900'
            }`}>
              {feature.title}
            </h4>
          </button>
        ))}
      </div>

      {/* Feature Content */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left side - Description */}
          <div className="flex flex-col justify-center p-6 md:p-12">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 sm:mb-6 sm:h-16 sm:w-16">
              {features[activeFeature].icon}
            </div>

            <h3 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">
              {features[activeFeature].title}
            </h3>

            <p className="mb-6 text-base text-gray-600 sm:text-lg">
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
                  <span className="text-sm text-gray-700 sm:text-base">{highlight}</span>
                </div>
              ))}
            </div>

            <button className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg sm:w-fit sm:hover:scale-[1.02]">
              Ver Demo Interactiva
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right side - Screenshot/Image */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 p-5 sm:p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10"></div>
            <div className="relative w-full max-w-[20rem] overflow-hidden rounded-[1.75rem] border-[10px] border-white shadow-2xl transition-all duration-500 sm:max-w-[24rem] sm:rounded-[2rem] md:max-w-none md:rounded-xl md:border-4 md:hover:scale-[1.02] md:aspect-auto md:min-h-[400px] aspect-[10/13]">
              <ShowcasePreview
                featureId={features[activeFeature].id}
                title={features[activeFeature].title}
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-4 sm:p-5 md:p-6">
                <div className="text-white">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse sm:h-3 sm:w-3"></div>
                    <span className="text-sm font-medium">En vivo</span>
                  </div>
                  <p className="max-w-[16rem] text-xs opacity-90 sm:max-w-none sm:text-sm">
                    Vista representativa del flujo real de la app
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 md:grid-cols-4 md:gap-6">
        <div className="rounded-xl bg-white p-4 text-center shadow-md sm:p-5 md:p-6">
          <div className="mb-2 text-2xl font-bold text-blue-600 sm:text-3xl">100+</div>
          <div className="text-sm text-gray-600">Instaladores Activos</div>
        </div>
        <div className="rounded-xl bg-white p-4 text-center shadow-md sm:p-5 md:p-6">
          <div className="mb-2 text-2xl font-bold text-blue-600 sm:text-3xl">500+</div>
          <div className="text-sm text-gray-600">Proyectos Completados</div>
        </div>
        <div className="rounded-xl bg-white p-4 text-center shadow-md sm:p-5 md:p-6">
          <div className="mb-2 text-2xl font-bold text-blue-600 sm:text-3xl">60%</div>
          <div className="text-sm text-gray-600">Ahorro de Tiempo</div>
        </div>
        <div className="rounded-xl bg-white p-4 text-center shadow-md sm:p-5 md:p-6">
          <div className="mb-2 text-2xl font-bold text-blue-600 sm:text-3xl">24/7</div>
          <div className="text-sm text-gray-600">Soporte Técnico</div>
        </div>
      </div>
    </div>
  );
};
