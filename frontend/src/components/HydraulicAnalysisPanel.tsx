import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HydraulicAnalysis, EquipmentPreset } from '@/types';
import { professionalCalculationsService, HydraulicParams } from '@/services/professionalCalculationsService';
import { productImageService } from '@/services/productImageService';
import { additionalsService } from '@/services/additionalsService';
import { EquipmentComparison } from '@/components/EquipmentComparison';
import { AlertTriangle, CheckCircle, Droplet, TrendingUp, Settings } from 'lucide-react';

interface HydraulicAnalysisPanelProps {
  projectId: string;
}

export const HydraulicAnalysisPanel: React.FC<HydraulicAnalysisPanelProps> = ({ projectId }) => {
  const [analysis, setAnalysis] = useState<HydraulicAnalysis | null>(null);
  const [selectedPump, setSelectedPump] = useState<EquipmentPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<HydraulicParams>({
    distanceToEquipment: 8,
    staticLift: 1.5,
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
      const pumpAdditional = additionals.find(
        (item: any) => item.equipment && item.equipment.type === 'PUMP'
      );
      if (pumpAdditional) {
        setSelectedPump(pumpAdditional.equipment);
        console.log('[HydraulicAnalysis] Bomba seleccionada:', pumpAdditional.equipment.name);
      } else {
        setSelectedPump(null);
        console.log('[HydraulicAnalysis] No hay bomba seleccionada');
      }
    } catch (error) {
      console.error('[HydraulicAnalysis] Error loading selected equipment:', error);
    }
  };

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[HydraulicAnalysis] Cargando análisis para proyecto:', projectId);
      console.log('[HydraulicAnalysis] Parámetros:', params);
      const response = await professionalCalculationsService.getHydraulicAnalysis(projectId, params);
      console.log('[HydraulicAnalysis] Datos recibidos:', response);

      // El backend devuelve { projectId, projectName, volume, parameters, analysis }
      // Necesitamos extraer el objeto analysis y agregar los campos que faltan
      const analysisData = response.analysis;

      // Mapear campos del backend al formato que espera el frontend
      const mappedAnalysis = {
        projectId: response.projectId,
        tdh: analysisData.totalDynamicHead,
        flowRate: analysisData.pumpSelectionDetails?.requiredFlowRate || 0,
        staticLift: response.parameters.staticLift,
        distanceToEquipment: response.parameters.distanceToEquipment,
        suctionPipeLoss: {
          type: 'Succión',
          diameter: 50, // Default, ajustar según datos reales
          length: response.parameters.distanceToEquipment,
          velocity: analysisData.velocityChecks?.[0]?.velocity || 0,
          loss: analysisData.frictionLoss?.suction || 0,
          isValid: analysisData.velocityChecks?.[0]?.isValid || false,
          warning: analysisData.velocityChecks?.[0]?.recommendation
        },
        returnPipeLoss: {
          type: 'Retorno',
          diameter: 40, // Default
          length: response.parameters.distanceToEquipment,
          velocity: analysisData.velocityChecks?.[1]?.velocity || 0,
          loss: analysisData.frictionLoss?.return || 0,
          isValid: analysisData.velocityChecks?.[1]?.isValid || false,
          warning: analysisData.velocityChecks?.[1]?.recommendation
        },
        fittingLosses: [], // El backend no está devolviendo esto en formato detallado
        totalFrictionLoss: analysisData.frictionLoss?.total || 0,
        totalSingularLoss: analysisData.singularLoss?.total || 0,
        recommendedPump: analysisData.recommendedPump,
        warnings: analysisData.warnings || [],
        errors: analysisData.errors || []
      };

      console.log('[HydraulicAnalysis] Análisis mapeado:', mappedAnalysis);
      setAnalysis(mappedAnalysis);
    } catch (err: any) {
      console.error('[HydraulicAnalysis] Error completo:', err);
      console.error('[HydraulicAnalysis] Error response:', err.response);
      console.error('[HydraulicAnalysis] Error status:', err.response?.status);
      console.error('[HydraulicAnalysis] Error data:', err.response?.data);

      // Prevenir redirect al login
      if (err.response?.status === 401) {
        setError('Error de autenticación. Tu sesión puede haber expirado. Recarga la página e intenta de nuevo.');
      } else if (err.response?.status === 404) {
        setError('Proyecto no encontrado o sin configuración hidráulica.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error interno del servidor';
        setError(`Error del servidor: ${errorMsg}`);
      } else if (err.code === 'ERR_NETWORK') {
        setError('Error de conexión. Verifica que el backend esté corriendo en puerto 3000.');
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
        setError(`Error al cargar el análisis hidráulico: ${errorMsg}`);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Calculando análisis hidráulico...</span>
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

  if (!analysis || typeof analysis.tdh === 'undefined') {
    return (
      <Card className="p-6">
        <p className="text-gray-500 mb-4">No hay datos de análisis hidráulico disponibles.</p>
        <p className="text-sm text-gray-400 mb-4">
          Asegúrate de que el proyecto tenga configurada la instalación hidráulica (tuberías y accesorios).
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
            <Droplet className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-bold">Análisis Hidráulico Profesional</h3>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distancia al equipo (m)
              </label>
              <input
                type="number"
                value={params.distanceToEquipment}
                onChange={(e) => setParams({ ...params, distanceToEquipment: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altura estática (m)
              </label>
              <input
                type="number"
                value={params.staticLift}
                onChange={(e) => setParams({ ...params, staticLift: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                step="0.1"
                min="0"
              />
            </div>
            <Button onClick={handleRecalculate} className="w-full">
              Recalcular
            </Button>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">TDH Total</p>
            <p className="text-3xl font-bold text-blue-600">{analysis.tdh.toFixed(2)} m</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Caudal</p>
            <p className="text-3xl font-bold text-green-600">
              {analysis.flowRate.toFixed(2)} m³/h
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Pérdidas Totales</p>
            <p className="text-3xl font-bold text-purple-600">
              {analysis.totalFrictionLoss.toFixed(2)} m
            </p>
          </div>
        </div>
      </Card>

      {/* Comparación: Selección vs Recomendación */}
      <EquipmentComparison
        title="Bomba de Filtración"
        selectedEquipment={selectedPump}
        recommendedEquipment={analysis.recommendedPump}
        requiredSpecs={{
          minFlowRate: analysis.flowRate,
          minHead: analysis.tdh,
        }}
        showDetailedComparison={true}
      />

      {/* Pérdidas por fricción */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Pérdidas por Fricción
        </h4>
        <div className="space-y-4">
          {/* Succión */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">Tubería de Succión</p>
                <p className="text-sm text-gray-600">
                  Ø {analysis.suctionPipeLoss.diameter}" - {analysis.suctionPipeLoss.length.toFixed(1)}m
                </p>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {analysis.suctionPipeLoss.loss.toFixed(3)} m
              </span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Velocidad:</span>
              <span className={`ml-2 font-medium ${
                analysis.suctionPipeLoss.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {analysis.suctionPipeLoss.velocity.toFixed(2)} m/s
                {analysis.suctionPipeLoss.isValid ? (
                  <CheckCircle className="w-4 h-4 inline ml-1" />
                ) : (
                  <AlertTriangle className="w-4 h-4 inline ml-1" />
                )}
              </span>
            </div>
            {analysis.suctionPipeLoss.warning && (
              <p className="text-sm text-yellow-600 mt-1">⚠️ {analysis.suctionPipeLoss.warning}</p>
            )}
          </div>

          {/* Retorno */}
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">Tubería de Retorno</p>
                <p className="text-sm text-gray-600">
                  Ø {analysis.returnPipeLoss.diameter}" - {analysis.returnPipeLoss.length.toFixed(1)}m
                </p>
              </div>
              <span className="text-lg font-bold text-green-600">
                {analysis.returnPipeLoss.loss.toFixed(3)} m
              </span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Velocidad:</span>
              <span className={`ml-2 font-medium ${
                analysis.returnPipeLoss.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {analysis.returnPipeLoss.velocity.toFixed(2)} m/s
                {analysis.returnPipeLoss.isValid ? (
                  <CheckCircle className="w-4 h-4 inline ml-1" />
                ) : (
                  <AlertTriangle className="w-4 h-4 inline ml-1" />
                )}
              </span>
            </div>
            {analysis.returnPipeLoss.warning && (
              <p className="text-sm text-yellow-600 mt-1">⚠️ {analysis.returnPipeLoss.warning}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Pérdidas singulares */}
      {analysis.fittingLosses && analysis.fittingLosses.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Pérdidas Singulares (Accesorios)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Accesorio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Diámetro
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Coef. K
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pérdida (m)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysis.fittingLosses.map((fitting, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{fitting.type}</td>
                    <td className="px-4 py-3 text-sm">{fitting.diameter}"</td>
                    <td className="px-4 py-3 text-sm">{fitting.quantity}</td>
                    <td className="px-4 py-3 text-sm">{fitting.kCoefficient.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{fitting.loss.toFixed(3)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-sm text-right">
                    Total Pérdidas Singulares:
                  </td>
                  <td className="px-4 py-3 text-sm">{analysis.totalSingularLoss.toFixed(3)} m</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bomba recomendada */}
      {analysis.recommendedPump && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Bomba Recomendada</h4>
          <div className="flex items-start space-x-4">
            {analysis.recommendedPump.imageUrl && (
              <img
                src={productImageService.getImageUrl(analysis.recommendedPump.imageUrl) || undefined}
                alt={analysis.recommendedPump.name}
                className="w-32 h-32 object-contain rounded-lg border border-gray-200"
              />
            )}
            <div className="flex-1">
              <h5 className="text-xl font-bold text-gray-900">{analysis.recommendedPump.name}</h5>
              <p className="text-gray-600">
                {analysis.recommendedPump.brand} - {analysis.recommendedPump.model}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-600">Potencia</p>
                  <p className="text-lg font-semibold">{analysis.recommendedPump.power} HP</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TDH Máximo</p>
                  <p className="text-lg font-semibold">{analysis.recommendedPump.maxTdh} m</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Caudal</p>
                  <p className="text-lg font-semibold">{analysis.recommendedPump.flowRate} m³/h</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

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
