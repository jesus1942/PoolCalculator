import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Droplet,
  Beaker,
  Calendar,
  CheckSquare,
  DollarSign,
  AlertCircle,
  Info,
  Sun,
  Cloud,
  Snowflake,
  Leaf,
  TrendingUp,
  Package,
  TestTube
} from 'lucide-react';
import { generateWaterMaintenanceGuide, WaterMaintenanceGuide as IWaterMaintenanceGuide } from '@/utils/poolCalculations';

interface WaterMaintenanceGuideProps {
  volume: number; // Volumen de la piscina en m³
  filterType?: string; // Tipo de filtro instalado
}

export const WaterMaintenanceGuide: React.FC<WaterMaintenanceGuideProps> = ({
  volume,
  filterType = 'Arena'
}) => {
  const [guide, setGuide] = useState<IWaterMaintenanceGuide | null>(null);
  const [activeTab, setActiveTab] = useState<'chemicals' | 'parameters' | 'seasonal' | 'checklists'>('chemicals');

  useEffect(() => {
    const maintenanceGuide = generateWaterMaintenanceGuide(volume, filterType);
    setGuide(maintenanceGuide);
  }, [volume, filterType]);

  if (!guide) {
    return <div className="text-center text-gray-500">Cargando guía de mantenimiento...</div>;
  }

  const tabs = [
    { id: 'chemicals', label: 'Químicos', icon: <Beaker className="w-4 h-4" /> },
    { id: 'parameters', label: 'Parámetros', icon: <TestTube className="w-4 h-4" /> },
    { id: 'seasonal', label: 'Estacional', icon: <Calendar className="w-4 h-4" /> },
    { id: 'checklists', label: 'Checklists', icon: <CheckSquare className="w-4 h-4" /> }
  ];

  const seasonIcons = {
    'Verano (Dic-Feb)': <Sun className="w-5 h-5 text-yellow-400" />,
    'Otoño (Mar-May)': <Leaf className="w-5 h-5 text-orange-400" />,
    'Invierno (Jun-Ago)': <Snowflake className="w-5 h-5 text-blue-400" />,
    'Primavera (Sep-Nov)': <Cloud className="w-5 h-5 text-green-400" />
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur-md opacity-50"></div>
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-xl">
                    <Droplet className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white tracking-wide">Guía de Mantenimiento del Agua</h2>
                  <p className="text-sm text-zinc-400 font-light">Plan completo personalizado para tu piscina</p>
                </div>
              </div>

              {/* Costo anual */}
              <div className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 rounded-2xl p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-zinc-500">Costo anual estimado</p>
                </div>
                <p className="text-2xl font-light text-white">${guide.annualMaintenanceCost.toFixed(0)}</p>
                <p className="text-xs text-zinc-600">~${(guide.annualMaintenanceCost / 12).toFixed(0)}/mes</p>
              </div>
            </div>

            {/* Volume info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Volumen</p>
                <p className="text-2xl font-light text-white">{guide.volumeM3} m³</p>
                <p className="text-xs text-zinc-600">{guide.volumeLiters.toLocaleString()} L</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Tipo de Filtro</p>
                <p className="text-xl font-light text-white">{filterType}</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Químicos necesarios</p>
                <p className="text-2xl font-light text-white">{guide.chemicals.length}</p>
                <p className="text-xs text-zinc-600">productos</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-light transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                      : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900/80 border border-zinc-800/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
              {/* Tab: Químicos */}
              {activeTab === 'chemicals' && (
                <div className="space-y-4">
                  {guide.chemicals.map((chemical, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                            <Beaker className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-light text-white mb-1">{chemical.name}</h3>
                            <p className="text-sm text-zinc-400 mb-3">{chemical.purpose}</p>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Dosificación</p>
                                <p className="text-white font-light">{chemical.dosage}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Frecuencia</p>
                                <p className="text-white font-light">{chemical.frequency}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-950/50 rounded-xl p-3 border border-green-500/30">
                          <p className="text-xs text-zinc-500 mb-1">Costo anual</p>
                          <p className="text-xl font-light text-green-300">${chemical.annualCost.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-blue-950/30 rounded-2xl p-4 border border-blue-500/30 mt-6">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-300 mb-2">Consejos Importantes</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <span>Siempre disuelva los químicos en un balde antes de agregarlos a la piscina</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span>Nunca mezcle químicos directamente entre sí</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <span>Agregue químicos con la bomba en funcionamiento</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <span>Use guantes y gafas de protección al manipular químicos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span>Almacene los químicos en un lugar fresco, seco y ventilado</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span>Mantenga los químicos fuera del alcance de niños y mascotas</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Parámetros */}
              {activeTab === 'parameters' && (
                <div className="space-y-4">
                  {guide.waterParameters.map((param, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                          <TestTube className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-light text-white">{param.parameter}</h3>
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm border border-green-500/30">
                              {param.idealRange}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Frecuencia de testeo</p>
                              <p className="text-white font-light">{param.testFrequency}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Método de ajuste</p>
                              <p className="text-white font-light">{param.adjustMethod}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-orange-950/30 rounded-2xl p-4 border border-orange-500/30 mt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-orange-300 mb-2">Orden de Ajuste de Químicos</h4>
                        <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
                          <li>Primero ajuste la Alcalinidad Total (80-120 ppm)</li>
                          <li>Luego ajuste el pH (7.2-7.6)</li>
                          <li>Después ajuste la Dureza Cálcica (200-400 ppm)</li>
                          <li>Agregue Estabilizador si es necesario (30-50 ppm)</li>
                          <li>Finalmente ajuste el Cloro (1-3 ppm)</li>
                        </ol>
                        <p className="text-xs text-zinc-500 mt-3">
                          Espere 4-6 horas entre cada ajuste para permitir que el químico se distribuya.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Estacional */}
              {activeTab === 'seasonal' && (
                <div className="space-y-4">
                  {guide.seasonalTips.map((season, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {seasonIcons[season.season as keyof typeof seasonIcons]}
                        <h3 className="text-xl font-light text-white">{season.season}</h3>
                      </div>

                      <ul className="space-y-2">
                        {season.tips.map((tip, tipIdx) => (
                          <li
                            key={tipIdx}
                            className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30"
                          >
                            <TrendingUp className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <p className="text-zinc-300 font-light">{tip}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Checklists */}
              {activeTab === 'checklists' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Weekly Checklist */}
                  <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
                        <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-light text-white">Checklist Semanal</h3>
                    </div>

                    <ul className="space-y-2">
                      {guide.weeklyChecklist.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30 hover:border-zinc-700/50 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-zinc-300 font-light">{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Monthly Checklist */}
                  <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                        <Calendar className="w-5 h-5 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-light text-white">Checklist Mensual</h3>
                    </div>

                    <ul className="space-y-2">
                      {guide.monthlyChecklist.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30 hover:border-zinc-700/50 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <p className="text-zinc-300 font-light">{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
