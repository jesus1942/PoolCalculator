import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ElectricalAnalysis, EquipmentPreset } from '@/types';
import { professionalCalculationsService, ElectricalParams } from '@/services/professionalCalculationsService';
import { additionalsService } from '@/services/additionalsService';
import { EquipmentComparison } from '@/components/EquipmentComparison';
import { AlertTriangle, CheckCircle, Zap, DollarSign, Settings, Cable } from 'lucide-react';

interface ElectricalAnalysisPanelProps {
  projectId: string;
}

export const ElectricalAnalysisPanel: React.FC<ElectricalAnalysisPanelProps> = ({ projectId }) => {
  const [analysis, setAnalysis] = useState<ElectricalAnalysis | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ElectricalParams>({
    voltage: 220,
    distanceToPanel: 15,
    installationType: 'CONDUIT',
    ambientTemp: 25,
    electricityCostPerKwh: 0.15,
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    await Promise.all([
      loadAnalysis(),
      loadSelectedEquipment()
    ]);
  };

  const loadSelectedEquipment = async () => {
    try {
      const additionals = await additionalsService.getProjectAdditionals(projectId);
      const equipment = additionals
        .filter((item: any) => item.equipment)
        .map((item: any) => item.equipment);
      setSelectedEquipment(equipment);
      console.log('[ElectricalAnalysis] Equipos seleccionados:', equipment.length);
    } catch (error) {
      console.error('[ElectricalAnalysis] Error loading selected equipment:', error);
    }
  };

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalCalculationsService.getElectricalAnalysis(projectId, params);
      setAnalysis(data);
    } catch (err: any) {
      console.error('Error loading electrical analysis:', err);

      // Prevenir redirect al login
      if (err.response?.status === 401) {
        setError('Error de autenticación. Tu sesión puede haber expirado. Recarga la página e intenta de nuevo.');
      } else if (err.response?.status === 404) {
        setError('Proyecto no encontrado o sin configuración eléctrica.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error interno del servidor';
        setError(`Error del servidor: ${errorMsg}`);
      } else if (err.code === 'ERR_NETWORK') {
        setError('Error de conexión. Verifica que el backend esté corriendo en puerto 3000.');
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
        setError(`Error al cargar el análisis eléctrico: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = () => {
    loadAnalysis();
    setShowSettings(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          <span className="ml-3 text-gray-600">Calculando análisis eléctrico...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <Button onClick={loadAnalysis}>
          Reintentar
        </Button>
      </Card>
    );
  }

  if (!analysis || !analysis.totalInstalledPower || !analysis.voltage) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 mb-4">No hay datos de análisis eléctrico disponibles.</p>
        <p className="text-sm text-gray-400 mb-4">
          Asegúrate de que el proyecto tenga configurada la instalación eléctrica (equipos y cargas).
        </p>
        <Button onClick={loadAnalysis}>
          Intentar cargar
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con configuración */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Zap className="w-6 h-6 text-yellow-600 mr-2" />
            <h3 className="text-xl font-bold">Análisis Eléctrico Profesional</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </Button>
        </div>

        {showSettings && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voltaje (V)
                </label>
                <input
                  type="number"
                  value={params.voltage}
                  onChange={(e) => setParams({ ...params, voltage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distancia al panel (m)
                </label>
                <input
                  type="number"
                  value={params.distanceToPanel}
                  onChange={(e) => setParams({ ...params, distanceToPanel: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de instalación
                </label>
                <select
                  value={params.installationType}
                  onChange={(e) => setParams({ ...params, installationType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="CONDUIT">Conduit</option>
                  <option value="TRAY">Bandeja</option>
                  <option value="DIRECT">Directo</option>
                  <option value="AIR">Aire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperatura ambiente (°C)
                </label>
                <input
                  type="number"
                  value={params.ambientTemp}
                  onChange={(e) => setParams({ ...params, ambientTemp: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo energía ($/kWh)
                </label>
                <input
                  type="number"
                  value={params.electricityCostPerKwh}
                  onChange={(e) => setParams({ ...params, electricityCostPerKwh: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  step="0.01"
                />
              </div>
            </div>
            <Button onClick={handleRecalculate} className="w-full">
              Recalcular
            </Button>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Potencia Instalada</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(analysis.totalInstalledPower / 1000).toFixed(2)} kW
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Potencia Demanda</p>
            <p className="text-2xl font-bold text-orange-600">
              {(analysis.totalDemandPower / 1000).toFixed(2)} kW
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Corriente Total</p>
            <p className="text-2xl font-bold text-red-600">
              {analysis.totalCurrent.toFixed(2)} A
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Voltaje</p>
            <p className="text-2xl font-bold text-blue-600">{analysis.voltage} V</p>
          </div>
        </div>
      </Card>

      {/* Equipos seleccionados */}
      {selectedEquipment.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Equipos Seleccionados para este Proyecto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedEquipment.map((equip) => (
              <div key={equip.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{equip.name}</p>
                    {equip.brand && (
                      <p className="text-sm text-gray-600">{equip.brand}</p>
                    )}
                  </div>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                    {equip.type}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  {equip.power && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potencia:</span>
                      <span className="font-medium">{equip.power} HP</span>
                    </div>
                  )}
                  {equip.consumption && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consumo:</span>
                      <span className="font-medium">{equip.consumption} W</span>
                    </div>
                  )}
                  {equip.voltage && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voltaje:</span>
                      <span className="font-medium">{equip.voltage}V</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-medium mb-1">Información</p>
            <p>Los cálculos eléctricos se basan en estos equipos seleccionados. Si cambias los equipos en la pestaña Eléctrica, recarga este análisis para ver los cambios.</p>
          </div>
        </Card>
      )}

      {/* Especificaciones de cable */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <Cable className="w-5 h-5 mr-2 text-yellow-600" />
          Especificación de Cable
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Fase:</span>
              <span className="font-semibold">{analysis.cable.phase}F</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Sección transversal:</span>
              <span className="font-semibold">{analysis.cable.crossSection} mm²</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Corriente máxima:</span>
              <span className="font-semibold">{analysis.cable.maxCurrent.toFixed(2)} A</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Caída de tensión:</span>
              <span className="font-semibold">{analysis.cable.voltageDrop.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Caída de tensión (%):</span>
              <span className={`font-semibold ${
                analysis.cable.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {analysis.cable.voltageDropPercent.toFixed(2)}%
                {analysis.cable.isValid ? (
                  <CheckCircle className="w-4 h-4 inline ml-1" />
                ) : (
                  <AlertTriangle className="w-4 h-4 inline ml-1" />
                )}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Distancia:</span>
              <span className="font-semibold">{analysis.distanceToPanel} m</span>
            </div>
          </div>
        </div>
        {analysis.cable.warning && (
          <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-yellow-700">
            ⚠️ {analysis.cable.warning}
          </div>
        )}
      </Card>

      {/* Protecciones */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Protecciones Eléctricas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Breaker */}
          <div className="border-l-4 border-red-500 pl-4">
            <h5 className="font-semibold text-lg mb-3">Interruptor Termomagnético</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Capacidad:</span>
                <span className="font-semibold">{analysis.breaker.rating} A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Polos:</span>
                <span className="font-semibold">{analysis.breaker.poles}P</span>
              </div>
              {analysis.breaker.breakingCapacity && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacidad de ruptura:</span>
                  <span className="font-semibold">{analysis.breaker.breakingCapacity} kA</span>
                </div>
              )}
            </div>
          </div>

          {/* RCD */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h5 className="font-semibold text-lg mb-3">Diferencial (RCD)</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Capacidad:</span>
                <span className="font-semibold">{analysis.rcd.rating} A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Polos:</span>
                <span className="font-semibold">{analysis.rcd.poles}P</span>
              </div>
              {analysis.rcd.leakageCurrent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sensibilidad:</span>
                  <span className="font-semibold text-blue-600">
                    {analysis.rcd.leakageCurrent} mA
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Desglose de cargas */}
      {analysis.loads && analysis.loads.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Desglose de Cargas Eléctricas</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Equipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Potencia (W)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Voltaje (V)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Corriente (A)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cos φ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysis.loads.map((load, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium">{load.name}</td>
                    <td className="px-4 py-3 text-sm">{load.type}</td>
                    <td className="px-4 py-3 text-sm">{load.power.toFixed(0)}</td>
                    <td className="px-4 py-3 text-sm">{load.voltage}</td>
                    <td className="px-4 py-3 text-sm">{load.current.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{load.powerFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Costos operativos */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          Costos Operativos Estimados
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Basado en ${analysis.operatingCost.electricityCostPerKwh.toFixed(2)}/kWh
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Costo Diario</p>
            <p className="text-3xl font-bold text-green-600">
              ${analysis.operatingCost.dailyCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Costo Mensual</p>
            <p className="text-3xl font-bold text-blue-600">
              ${analysis.operatingCost.monthlyCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Costo Anual</p>
            <p className="text-3xl font-bold text-purple-600">
              ${analysis.operatingCost.annualCost.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          * Estimación basada en 8 horas diarias de operación de bomba de filtrado
        </p>
      </Card>

      {/* Advertencias y errores */}
      {(analysis.warnings.length > 0 || analysis.errors.length > 0) && (
        <Card className="p-6">
          {analysis.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-red-600 mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Errores Críticos
              </h4>
              <ul className="space-y-2">
                {analysis.errors.map((error, index) => (
                  <li key={index} className="text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.warnings.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-yellow-600 mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Advertencias
              </h4>
              <ul className="space-y-2">
                {analysis.warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
