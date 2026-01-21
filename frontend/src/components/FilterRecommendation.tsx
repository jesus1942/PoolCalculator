import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  Filter,
  Droplets,
  Gauge,
  Clock,
  Package,
  Zap,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import api from '@/services/api';

interface FilterRecommendationProps {
  projectId: string; // ID del proyecto para obtener recomendaciones profesionales
  volume: number; // Volumen de la piscina en m³
  onSelectFilter?: (filterType: string, size: number) => void;
}

interface ProfessionalRecommendation {
  equipment: {
    pump: {
      name: string;
      power: number;
      flowRate: number;
      maxHead: number;
      connectionSize: string;
      price: number;
    };
    filter: {
      name: string;
      diameter: number | null;
      area: number | null;
      sandRequired: number | null;
      price: number;
    };
  };
  hydraulicAnalysis: {
    requiredFlowRate: number;
    velocityChecks: any[];
    totalDynamicHead: number;
  };
}

export const FilterRecommendation: React.FC<FilterRecommendationProps> = ({
  projectId,
  volume,
  onSelectFilter
}) => {
  const [recommendation, setRecommendation] = useState<ProfessionalRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [distanceToEquipment, setDistanceToEquipment] = useState(5);
  const [staticLift, setStaticLift] = useState(1.5);

  useEffect(() => {
    loadProfessionalRecommendation();
  }, [projectId, distanceToEquipment, staticLift]);

  const loadProfessionalRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[FilterRecommendation] Solicitando cálculos profesionales para proyecto:', projectId);
      const response = await api.get(`/professional-calculations/${projectId}`, {
        params: {
          distanceToEquipment,
          staticLift
        }
      });
      console.log('[FilterRecommendation] Respuesta recibida:', response.data);
      setRecommendation(response.data);
    } catch (err: any) {
      console.error('[FilterRecommendation] Error al cargar recomendaciones profesionales:', err);
      console.error('[FilterRecommendation] Detalles del error:', err.response?.data);

      // Mostrar error más descriptivo
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Error al cargar recomendaciones';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Calculando recomendaciones profesionales...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!recommendation) {
    return <div className="text-center text-gray-500">No se pudieron obtener recomendaciones</div>;
  }

  const circulationTime = 8; // Tiempo estándar de circulación

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-md opacity-50"></div>
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-xl">
                  <Filter className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-light text-white tracking-wide">Recomendación Profesional de Filtración</h2>
                <p className="text-sm text-zinc-400 font-light">Basado en cálculos hidráulicos completos</p>
              </div>
            </div>

            {/* Configuración de parámetros */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Distancia a equipamiento (m)</label>
                <input
                  type="number"
                  value={distanceToEquipment}
                  onChange={(e) => setDistanceToEquipment(parseFloat(e.target.value) || 5)}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white"
                  step="0.5"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Altura estática (m)</label>
                <input
                  type="number"
                  value={staticLift}
                  onChange={(e) => setStaticLift(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white"
                  step="0.1"
                  min="0"
                />
              </div>
            </div>

            {/* Datos calculados principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-zinc-500">Volumen</p>
                </div>
                <p className="text-2xl font-light text-white">{volume.toFixed(1)} m³</p>
                <p className="text-xs text-zinc-600">{(volume * 1000).toLocaleString()} L</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <p className="text-xs text-zinc-500">Caudal Requerido</p>
                </div>
                <p className="text-2xl font-light text-white">{recommendation.hydraulicAnalysis.requiredFlowRate.toFixed(1)}</p>
                <p className="text-xs text-zinc-600">m³/h</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-zinc-500">TDH Total</p>
                </div>
                <p className="text-2xl font-light text-white">{recommendation.hydraulicAnalysis.totalDynamicHead.toFixed(1)}m</p>
                <p className="text-xs text-zinc-600">Altura dinámica</p>
              </div>
              <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <p className="text-xs text-zinc-500">Potencia Bomba</p>
                </div>
                <p className="text-2xl font-light text-white">{recommendation.equipment.pump.power} HP</p>
                <p className="text-xs text-zinc-600">{(recommendation.equipment.pump.power * 745.7).toFixed(0)}W</p>
              </div>
            </div>

            {/* Bomba recomendada */}
            <div className="bg-gradient-to-br from-orange-950/50 to-amber-950/50 rounded-2xl p-6 border border-orange-500/30 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
                  <Zap className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-light text-white mb-2">Bomba Recomendada</h3>
                  <p className="text-xl font-medium text-orange-300 mb-4">{recommendation.equipment.pump.name}</p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Caudal</p>
                      <p className="text-white font-light">{recommendation.equipment.pump.flowRate} m³/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Altura máxima</p>
                      <p className="text-white font-light">{recommendation.equipment.pump.maxHead} m</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Conexión</p>
                      <p className="text-white font-light">{recommendation.equipment.pump.connectionSize}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtro recomendado */}
            <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/50 rounded-2xl p-6 border border-blue-500/30 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                  <Filter className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-light text-white mb-2">Filtro Recomendado</h3>
                  <p className="text-xl font-medium text-blue-300 mb-4">{recommendation.equipment.filter.name}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {recommendation.equipment.filter.diameter && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Diámetro del filtro</p>
                        <p className="text-white font-light">{recommendation.equipment.filter.diameter}" pulgadas</p>
                      </div>
                    )}
                    {recommendation.equipment.filter.area && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Área de filtración</p>
                        <p className="text-white font-light">{recommendation.equipment.filter.area.toFixed(2)} m²</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Carga filtrante */}
            {recommendation.equipment.filter.sandRequired && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-light text-white">Arena de Sílice</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-3xl font-light text-white">{Math.round(recommendation.equipment.filter.sandRequired * 0.75)}</p>
                    <p className="text-zinc-400">kg</p>
                  </div>
                  <p className="text-xs text-zinc-500">Granulometría: 0.5-1.0mm</p>
                  <p className="text-xs text-zinc-500">En el 75% superior del filtro</p>
                </div>

                <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-light text-white">Grava de Soporte</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-3xl font-light text-white">{Math.round(recommendation.equipment.filter.sandRequired * 0.25)}</p>
                    <p className="text-zinc-400">kg</p>
                  </div>
                  <p className="text-xs text-zinc-500">Granulometría: 3-5mm</p>
                  <p className="text-xs text-zinc-500">En el 25% inferior del filtro</p>
                </div>
              </div>
            )}

            {/* Retrolavado */}
            <div className="bg-orange-950/30 rounded-2xl p-4 border border-orange-500/30 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-medium text-orange-300 mb-2">Frecuencia de Retrolavado</h3>
                  <p className="text-white font-light mb-2">Cada 1-2 semanas o cuando aumente 0.5 bar la presión</p>
                  <p className="text-xs text-zinc-400">
                    Realice retrolavado cuando la presión del manómetro aumente 0.5 bar por encima de la presión limpia.
                  </p>
                </div>
              </div>
            </div>

            {/* Costo operativo */}
            <div className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 rounded-2xl p-6 border border-green-500/30 mb-6">
              <h4 className="text-lg font-light text-white mb-4">Costo Operativo Estimado</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Consumo eléctrico diario</p>
                  <p className="text-white font-light">
                    {((recommendation.equipment.pump.power * 745.7 * circulationTime) / 1000).toFixed(1)} kWh/día
                  </p>
                  <p className="text-xs text-zinc-600">({circulationTime} horas/día)</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Costo mensual aprox. (ARS)</p>
                  <p className="text-white font-light">
                    ${(((recommendation.equipment.pump.power * 745.7 * circulationTime) / 1000) * 30 * 50).toFixed(0)}
                  </p>
                  <p className="text-xs text-zinc-600">Tarifa: $50/kWh</p>
                </div>
              </div>
            </div>

            {/* Recomendaciones profesionales */}
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="secondary"
              className="w-full"
            >
              {showDetails ? 'Ocultar' : 'Ver'} Análisis Hidráulico Detallado
            </Button>
          </div>
        </div>
      </div>

      {/* Análisis hidráulico detallado */}
      {showDetails && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-500"></div>

          <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <Info className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-light text-white">Análisis Hidráulico Profesional</h3>
              </div>

              {/* Información de cálculo */}
              <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 mb-6">
                <h4 className="text-lg font-light text-white mb-4">Parámetros del Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 mb-1">Altura Dinámica Total (TDH)</p>
                    <p className="text-white text-xl font-light">{recommendation.hydraulicAnalysis.totalDynamicHead.toFixed(2)} m</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-1">Caudal de Diseño</p>
                    <p className="text-white text-xl font-light">{recommendation.hydraulicAnalysis.requiredFlowRate.toFixed(1)} m³/h</p>
                  </div>
                </div>
              </div>

              {/* Recomendaciones */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-300 font-light">La bomba seleccionada puede manejar el TDH calculado de {recommendation.hydraulicAnalysis.totalDynamicHead.toFixed(1)}m con {recommendation.equipment.pump.maxHead}m de altura máxima</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-300 font-light">El caudal de {recommendation.equipment.pump.flowRate} m³/h es adecuado para recircular {volume.toFixed(1)} m³ en {circulationTime} horas</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-300 font-light">Sistema dimensionado según normativas profesionales para instalaciones hidráulicas de piscinas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
