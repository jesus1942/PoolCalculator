import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Flame,
  Zap,
  Sun,
  Wind,
  ThermometerSun,
  Clock,
  DollarSign,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { calculateHeatingRequirements, HeatingRecommendation as IHeatingRecommendation } from '@/utils/poolCalculations';

interface HeatingRecommendationProps {
  volume: number; // Volumen de la piscina en m³
  onSelectHeater?: (heaterType: string, power: number) => void;
}

export const HeatingRecommendation: React.FC<HeatingRecommendationProps> = ({
  volume,
  onSelectHeater
}) => {
  const [recommendation, setRecommendation] = useState<IHeatingRecommendation | null>(null);
  const [targetTemp, setTargetTemp] = useState(28);
  const [ambientTemp, setAmbientTemp] = useState(15);
  const [isIndoor, setIsIndoor] = useState(false);
  const [hasCover, setHasCover] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    calculateRecommendation();
  }, [volume, targetTemp, ambientTemp, isIndoor, hasCover]);

  const calculateRecommendation = () => {
    const result = calculateHeatingRequirements(
      volume,
      targetTemp,
      ambientTemp,
      isIndoor,
      hasCover
    );
    setRecommendation(result);
  };

  if (!recommendation) {
    return <div className="text-center text-gray-500">Calculando recomendaciones...</div>;
  }

  const heaterTypes = [
    {
      id: 'gas',
      name: 'Caldera a Gas',
      icon: <Flame className="w-6 h-6" />,
      gradient: 'from-orange-600 to-red-600',
      heatupTime: recommendation.heatupTime.gas,
      dailyCost: recommendation.dailyOperationCost.gas,
      pros: ['Calentamiento rápido', 'Alta potencia', 'Independiente de clima'],
      cons: ['Costo operativo alto', 'Requiere instalación de gas', 'Emisiones'],
      power: 50000, // BTU/h
      unit: 'BTU/h'
    },
    {
      id: 'electric',
      name: 'Calentador Eléctrico',
      icon: <Zap className="w-6 h-6" />,
      gradient: 'from-yellow-600 to-amber-600',
      heatupTime: recommendation.heatupTime.electric,
      dailyCost: recommendation.dailyOperationCost.electric,
      pros: ['Instalación simple', 'Sin mantenimiento', 'Compacto'],
      cons: ['Alto consumo eléctrico', 'Costo operativo elevado', 'Lento en climas fríos'],
      power: 15, // kW
      unit: 'kW'
    },
    {
      id: 'heatpump',
      name: 'Bomba de Calor',
      icon: <Wind className="w-6 h-6" />,
      gradient: 'from-blue-600 to-cyan-600',
      heatupTime: recommendation.heatupTime.heatPump,
      dailyCost: recommendation.dailyOperationCost.heatPump,
      pros: ['Muy eficiente (COP 3-5)', 'Bajo costo operativo', 'Ecológica'],
      cons: ['Inversión inicial alta', 'Depende temperatura ambiente', 'Más lenta que gas'],
      power: 12, // kW
      unit: 'kW',
      recommended: true
    },
    {
      id: 'solar',
      name: 'Sistema Solar',
      icon: <Sun className="w-6 h-6" />,
      gradient: 'from-green-600 to-emerald-600',
      heatupTime: recommendation.heatupTime.solar,
      dailyCost: recommendation.dailyOperationCost.solar,
      pros: ['Costo operativo $0', 'Ecológico', 'Bajo mantenimiento'],
      cons: ['Depende del sol', 'Calentamiento lento', 'Requiere gran superficie de colectores'],
      power: 8, // kW equivalente
      unit: 'kW equiv'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl blur-md opacity-50"></div>
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 shadow-xl">
                  <ThermometerSun className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-light text-white tracking-wide">Recomendación de Calefacción</h2>
                <p className="text-sm text-zinc-400 font-light">Sistema inteligente de análisis térmico</p>
              </div>
            </div>

            {/* Configuración */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Temperatura deseada (°C)</label>
                <Input
                  type="number"
                  value={targetTemp}
                  onChange={(e) => setTargetTemp(Number(e.target.value))}
                  min={20}
                  max={35}
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Temperatura ambiente (°C)</label>
                <Input
                  type="number"
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  min={0}
                  max={40}
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tipo de piscina</label>
                <Select
                  value={isIndoor ? 'indoor' : 'outdoor'}
                  onChange={(e) => setIsIndoor(e.target.value === 'indoor')}
                  options={[
                    { value: 'outdoor', label: 'Exterior' },
                    { value: 'indoor', label: 'Cubierta' }
                  ]}
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Cobertor térmico</label>
                <Select
                  value={hasCover ? 'yes' : 'no'}
                  onChange={(e) => setHasCover(e.target.value === 'yes')}
                  options={[
                    { value: 'no', label: 'No' },
                    { value: 'yes', label: 'Sí' }
                  ]}
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
            </div>

            {/* Datos calculados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Volumen</p>
                <p className="text-2xl font-light text-white">{recommendation.volumeM3} m³</p>
                <p className="text-xs text-zinc-600">{recommendation.volumeLiters.toLocaleString()} L</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">BTU Requeridos</p>
                <p className="text-2xl font-light text-white">{(recommendation.btuRequired / 1000).toFixed(0)}k</p>
                <p className="text-xs text-zinc-600">Para calentar</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">kW Requeridos</p>
                <p className="text-2xl font-light text-white">{recommendation.kwRequired.toFixed(1)} kW</p>
                <p className="text-xs text-zinc-600">Potencia térmica</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">Kcal Necesarias</p>
                <p className="text-2xl font-light text-white">{(recommendation.kcalRequired / 1000).toFixed(0)}k</p>
                <p className="text-xs text-zinc-600">Calorías totales</p>
              </div>
            </div>

            {/* Recomendación principal */}
            <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/50 rounded-2xl p-6 border border-blue-500/30 mb-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-light text-white mb-2">Recomendación</h3>
                  <p className="text-zinc-300 font-light mb-3">{recommendation.recommendation}</p>
                  <ul className="space-y-2">
                    {recommendation.considerations.map((consideration, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{consideration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="secondary"
              className="w-full"
            >
              {showDetails ? 'Ocultar' : 'Ver'} Comparativa Detallada
            </Button>
          </div>
        </div>
      </div>

      {/* Comparativa de sistemas */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {heaterTypes.map((heater) => (
            <div key={heater.id} className="group relative">
              <div className={`absolute -inset-0.5 bg-gradient-to-br ${heater.gradient} rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition duration-500`}></div>

              <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${heater.gradient} shadow-xl`}>
                        {heater.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-light text-white">{heater.name}</h3>
                        <p className="text-sm text-zinc-500">{heater.power} {heater.unit}</p>
                      </div>
                    </div>
                    {heater.recommended && (
                      <span className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        Recomendado
                      </span>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <p className="text-xs text-zinc-500">Tiempo de calentamiento</p>
                      </div>
                      <p className="text-lg font-light text-white">{heater.heatupTime.toFixed(1)}h</p>
                    </div>
                    <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-zinc-400" />
                        <p className="text-xs text-zinc-500">Costo operativo diario</p>
                      </div>
                      <p className="text-lg font-light text-white">${heater.dailyCost.toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Ventajas */}
                  <div className="mb-3">
                    <p className="text-xs text-zinc-500 mb-2">Ventajas:</p>
                    <ul className="space-y-1">
                      {heater.pros.map((pro, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Desventajas */}
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-2">Desventajas:</p>
                    <ul className="space-y-1">
                      {heater.cons.map((con, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                          <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {onSelectHeater && (
                    <Button
                      onClick={() => onSelectHeater(heater.id, heater.power)}
                      className="w-full"
                      variant={heater.recommended ? 'primary' : 'secondary'}
                    >
                      Seleccionar {heater.name}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
