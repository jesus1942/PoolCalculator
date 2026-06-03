import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { HeatingRecommendation } from '@/components/HeatingRecommendation';
import { FilterRecommendation } from '@/components/FilterRecommendation';
import { WaterMaintenanceGuide } from '@/components/WaterMaintenanceGuide';
import { HdFlame, HdFilter, HdDroplet, HdChevronDown, HdChevronRight, HdLightbulb, HdTrendingUp } from '@/components/ui/HandDrawnIcons';

interface PoolSystemsRecommendationsProps {
  project: Project;
  onAddHeater?: (heaterType: string, power: number) => void;
  onAddFilter?: (filterType: string, size: number) => void;
}

export const PoolSystemsRecommendations: React.FC<PoolSystemsRecommendationsProps> = ({
  project,
  onAddHeater,
  onAddFilter
}) => {
  const [expandedSection, setExpandedSection] = useState<'heating' | 'filter' | 'maintenance' | null>(null);

  const toggleSection = (section: 'heating' | 'filter' | 'maintenance') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'heating',
      title: 'Calefacción de Piscina',
      description: 'Recomendaciones de calentadores según volumen y uso',
      icon: <HdFlame className="w-6 h-6" />,
      gradient: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      component: (
        <HeatingRecommendation
          volume={project.volume}
          onSelectHeater={onAddHeater}
        />
      )
    },
    {
      id: 'filter',
      title: 'Sistema de Filtración',
      description: 'Dimensionamiento de filtros y bombas',
      icon: <HdFilter className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      component: (
        <FilterRecommendation
          projectId={project.id}
          volume={project.volume}
          onSelectFilter={onAddFilter}
        />
      )
    },
    {
      id: 'maintenance',
      title: 'Mantenimiento del Agua',
      description: 'Guía completa de químicos y cuidado',
      icon: <HdDroplet className="w-6 h-6" />,
      gradient: 'from-cyan-500 to-teal-500',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-700',
      component: (
        <WaterMaintenanceGuide
          volume={project.volume}
          filterType="Arena"
        />
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-zinc-100 shadow-lg">
              <HdLightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Recomendaciones Inteligentes</h2>
              <p className="text-base text-zinc-300">
                Sistema experto para dimensionar equipos y planificar mantenimiento
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-start gap-3">
              <HdTrendingUp className="w-5 h-5 text-zinc-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">¿Cómo funciona?</h3>
                <p className="text-zinc-300 text-base mb-3">
                  Nuestro sistema analiza las características de tu piscina (volumen: <strong>{project.volume.toFixed(2)} m³</strong>)
                  y calcula automáticamente los requisitos óptimos de:
                </p>
                <ul className="space-y-1 text-base text-zinc-300">
                  <li>• <strong className="text-white">Calefacción:</strong> BTU/Kcal necesarios, tiempo de calentamiento y costos operativos</li>
                  <li>• <strong className="text-white">Filtración:</strong> Caudal requerido, tamaño de filtro y carga filtrante</li>
                  <li>• <strong className="text-white">Mantenimiento:</strong> Dosificación de químicos y cronograma de cuidados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-zinc-950 border border-zinc-800 text-zinc-100">
            {/* Section Header - Always visible */}
            <button
              onClick={() => toggleSection(section.id as any)}
              className="w-full p-6 text-left hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${section.gradient} shadow-md`}>
                    <div className="text-white">
                      {section.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{section.title}</h3>
                    <p className="text-base text-zinc-300">{section.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {expandedSection === section.id ? (
                    <span className="text-sm text-zinc-200 font-medium">Ocultar</span>
                  ) : (
                    <span className="text-sm text-zinc-400 font-medium">Ver más</span>
                  )}
                  <HdChevronDown
                    className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Section Content - Expandable */}
            {expandedSection === section.id && (
              <div className="px-6 pb-6 border-t border-zinc-800">
                <div className="pt-6">
                  {section.component}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
