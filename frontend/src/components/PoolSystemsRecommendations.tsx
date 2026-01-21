import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { HeatingRecommendation } from '@/components/HeatingRecommendation';
import { FilterRecommendation } from '@/components/FilterRecommendation';
import { WaterMaintenanceGuide } from '@/components/WaterMaintenanceGuide';
import {
  Flame,
  Filter,
  Droplet,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  TrendingUp
} from 'lucide-react';

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
      icon: <Flame className="w-6 h-6" />,
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
      icon: <Filter className="w-6 h-6" />,
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
      icon: <Droplet className="w-6 h-6" />,
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
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recomendaciones Inteligentes</h2>
              <p className="text-sm text-gray-600">
                Sistema experto para dimensionar equipos y planificar mantenimiento
              </p>
            </div>
          </div>

          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">¿Cómo funciona?</h3>
                <p className="text-gray-700 text-sm mb-3">
                  Nuestro sistema analiza las características de tu piscina (volumen: <strong>{project.volume.toFixed(2)} m³</strong>)
                  y calcula automáticamente los requisitos óptimos de:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• <strong className="text-gray-900">Calefacción:</strong> BTU/Kcal necesarios, tiempo de calentamiento y costos operativos</li>
                  <li>• <strong className="text-gray-900">Filtración:</strong> Caudal requerido, tamaño de filtro y carga filtrante</li>
                  <li>• <strong className="text-gray-900">Mantenimiento:</strong> Dosificación de químicos y cronograma de cuidados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Section Header - Always visible */}
            <button
              onClick={() => toggleSection(section.id as any)}
              className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${section.gradient} shadow-md`}>
                    <div className="text-white">
                      {section.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {expandedSection === section.id ? (
                    <span className="text-sm text-blue-600 font-medium">Ocultar</span>
                  ) : (
                    <span className="text-sm text-gray-500 font-medium">Ver más</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Section Content - Expandable */}
            {expandedSection === section.id && (
              <div className="px-6 pb-6 border-t border-gray-100">
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
