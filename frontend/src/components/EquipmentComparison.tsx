import React from 'react';
import { Card } from '@/components/ui/Card';
import { EquipmentPreset } from '@/types';
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, Info } from 'lucide-react';

interface EquipmentComparisonProps {
  title: string;
  selectedEquipment: EquipmentPreset | null;
  recommendedEquipment: EquipmentPreset | null;
  requiredSpecs?: {
    minFlowRate?: number;
    minHead?: number;
    minPower?: number;
    maxPower?: number;
  };
  showDetailedComparison?: boolean;
}

export const EquipmentComparison: React.FC<EquipmentComparisonProps> = ({
  title,
  selectedEquipment,
  recommendedEquipment,
  requiredSpecs,
  showDetailedComparison = true
}) => {
  const getComparisonStatus = () => {
    if (!selectedEquipment && !recommendedEquipment) {
      return { status: 'none', message: 'No hay equipo seleccionado ni recomendación' };
    }

    if (!selectedEquipment) {
      return { status: 'missing', message: 'No has seleccionado ningún equipo' };
    }

    if (!recommendedEquipment) {
      return { status: 'unknown', message: 'No hay recomendación del sistema disponible' };
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Validar caudal
    if (requiredSpecs?.minFlowRate && selectedEquipment.flowRate) {
      if (selectedEquipment.flowRate < requiredSpecs.minFlowRate) {
        issues.push(`Caudal insuficiente: ${selectedEquipment.flowRate} m³/h < ${requiredSpecs.minFlowRate.toFixed(1)} m³/h requerido`);
      } else if (selectedEquipment.flowRate < requiredSpecs.minFlowRate * 1.1) {
        warnings.push(`Caudal justo: ${selectedEquipment.flowRate} m³/h (mínimo recomendado: ${(requiredSpecs.minFlowRate * 1.1).toFixed(1)} m³/h)`);
      }
    }

    // Validar altura
    if (requiredSpecs?.minHead && selectedEquipment.maxHead) {
      if (selectedEquipment.maxHead < requiredSpecs.minHead) {
        issues.push(`Altura insuficiente: ${selectedEquipment.maxHead} m < ${requiredSpecs.minHead.toFixed(1)} m requerido`);
      } else if (selectedEquipment.maxHead < requiredSpecs.minHead * 1.1) {
        warnings.push(`Altura justa: ${selectedEquipment.maxHead} m (mínimo recomendado: ${(requiredSpecs.minHead * 1.1).toFixed(1)} m)`);
      }
    }

    // Validar potencia
    if (requiredSpecs?.minPower && selectedEquipment.power) {
      if (selectedEquipment.power < requiredSpecs.minPower) {
        warnings.push(`Potencia menor a la recomendada: ${selectedEquipment.power} HP < ${requiredSpecs.minPower.toFixed(1)} HP`);
      }
    }

    if (issues.length > 0) {
      return { status: 'error', message: 'El equipo seleccionado NO cumple los requisitos', issues };
    }

    if (warnings.length > 0) {
      return { status: 'warning', message: 'El equipo seleccionado cumple pero está al límite', warnings };
    }

    // Comparar con recomendación
    if (selectedEquipment.id === recommendedEquipment.id) {
      return { status: 'perfect', message: 'Seleccionaste exactamente lo que el sistema recomienda' };
    }

    return { status: 'ok', message: 'El equipo seleccionado cumple con los requisitos' };
  };

  const comparison = getComparisonStatus();

  const StatusIcon = {
    none: Info,
    missing: AlertTriangle,
    unknown: Info,
    error: XCircle,
    warning: AlertTriangle,
    ok: CheckCircle,
    perfect: CheckCircle
  }[comparison.status];

  const statusColors = {
    none: 'text-gray-500 bg-gray-50 border-gray-200',
    missing: 'text-orange-600 bg-orange-50 border-orange-200',
    unknown: 'text-blue-600 bg-blue-50 border-blue-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    ok: 'text-green-600 bg-green-50 border-green-200',
    perfect: 'text-green-700 bg-green-100 border-green-300'
  }[comparison.status];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Estado general */}
      <div className={`p-4 border-l-4 ${statusColors}`}>
        <div className="flex items-start space-x-3">
          <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{comparison.message}</p>
            {comparison.issues && comparison.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {comparison.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
            {comparison.warnings && comparison.warnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {comparison.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Comparación detallada */}
      {showDetailedComparison && (selectedEquipment || recommendedEquipment) && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipo seleccionado */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-700">TU SELECCIÓN</h4>
                {selectedEquipment && comparison.status === 'perfect' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    ÓPTIMO
                  </span>
                )}
              </div>

              {selectedEquipment ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedEquipment.name}</p>
                    {selectedEquipment.brand && (
                      <p className="text-sm text-gray-600">{selectedEquipment.brand} {selectedEquipment.model}</p>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    {selectedEquipment.flowRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Caudal:</span>
                        <span className="font-medium">{selectedEquipment.flowRate} m³/h</span>
                      </div>
                    )}
                    {selectedEquipment.maxHead && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altura máx:</span>
                        <span className="font-medium">{selectedEquipment.maxHead} m</span>
                      </div>
                    )}
                    {selectedEquipment.power && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Potencia:</span>
                        <span className="font-medium">{selectedEquipment.power} HP</span>
                      </div>
                    )}
                    {selectedEquipment.voltage && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voltaje:</span>
                        <span className="font-medium">{selectedEquipment.voltage}V</span>
                      </div>
                    )}
                  </div>
                  {selectedEquipment.pricePerUnit > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Precio:</span>
                        <span className="font-bold text-green-600">
                          ${selectedEquipment.pricePerUnit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  <p className="text-sm">No has seleccionado ningún equipo</p>
                  <p className="text-xs mt-1">Ve a la pestaña Eléctrica para seleccionar</p>
                </div>
              )}
            </div>

            {/* Flecha de comparación */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-gray-400" />
            </div>

            {/* Equipo recomendado */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">RECOMENDACIÓN DEL SISTEMA</h4>

              {recommendedEquipment ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div>
                    <p className="font-semibold text-gray-900">{recommendedEquipment.name}</p>
                    {recommendedEquipment.brand && (
                      <p className="text-sm text-gray-600">{recommendedEquipment.brand} {recommendedEquipment.model}</p>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    {recommendedEquipment.flowRate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Caudal:</span>
                        <span className="font-medium">{recommendedEquipment.flowRate} m³/h</span>
                      </div>
                    )}
                    {recommendedEquipment.maxHead && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altura máx:</span>
                        <span className="font-medium">{recommendedEquipment.maxHead} m</span>
                      </div>
                    )}
                    {recommendedEquipment.power && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Potencia:</span>
                        <span className="font-medium">{recommendedEquipment.power} HP</span>
                      </div>
                    )}
                    {recommendedEquipment.voltage && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voltaje:</span>
                        <span className="font-medium">{recommendedEquipment.voltage}V</span>
                      </div>
                    )}
                  </div>
                  {recommendedEquipment.pricePerUnit > 0 && (
                    <div className="pt-2 border-t border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Precio:</span>
                        <span className="font-bold text-green-600">
                          ${recommendedEquipment.pricePerUnit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  <p className="text-sm">No hay recomendación disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Requisitos mínimos */}
          {requiredSpecs && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">REQUISITOS MÍNIMOS DEL PROYECTO</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {requiredSpecs.minFlowRate && (
                  <div>
                    <span className="text-gray-600">Caudal mín:</span>
                    <span className="ml-1 font-medium">{requiredSpecs.minFlowRate.toFixed(1)} m³/h</span>
                  </div>
                )}
                {requiredSpecs.minHead && (
                  <div>
                    <span className="text-gray-600">Altura mín:</span>
                    <span className="ml-1 font-medium">{requiredSpecs.minHead.toFixed(1)} m</span>
                  </div>
                )}
                {requiredSpecs.minPower && (
                  <div>
                    <span className="text-gray-600">Potencia mín:</span>
                    <span className="ml-1 font-medium">{requiredSpecs.minPower.toFixed(1)} HP</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
