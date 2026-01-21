import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Project, EquipmentPreset } from '@/types';
import { PoolVisualizationCanvas, exportCanvasToImage } from '@/components/PoolVisualizationCanvas';
import { Button } from '@/components/ui/Button';
import { EquipmentComparison } from '@/components/EquipmentComparison';
import { professionalCalculationsService } from '@/services/professionalCalculationsService';
import { productImageService } from '@/services/productImageService';
import {
  DollarSign,
  Droplets,
  Ruler,
  Package,
  Zap,
  Wrench,
  Users,
  PlusCircle,
  CheckCircle2,
  Layers,
  ListTodo,
  Clock,
  CheckCircle,
  Circle,
  Download,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Image as ImageIcon
} from 'lucide-react';

interface ImprovedOverviewProps {
  project: Project;
  roles: any[];
  rolesCostSummary: Record<string, { hours: number; cost: number; tasksCount: number }>;
  additionals: any[];
}

export const ImprovedOverview: React.FC<ImprovedOverviewProps> = ({
  project,
  roles,
  rolesCostSummary,
  additionals
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showEquipmentComparison, setShowEquipmentComparison] = useState(false);
  const [selectedPump, setSelectedPump] = useState<EquipmentPreset | null>(null);
  const [recommendedPump, setRecommendedPump] = useState<EquipmentPreset | null>(null);
  const [hydraulicSpecs, setHydraulicSpecs] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'planta' | 'cad'>('planta');

  // Cargar comparación de equipos
  useEffect(() => {
    if (showEquipmentComparison) {
      loadEquipmentComparison();
    }
  }, [showEquipmentComparison, project.id]);

  const loadEquipmentComparison = async () => {
    try {
      // Cargar bomba seleccionada
      const pumpAdditional = additionals.find(
        (item: any) => item.equipment && item.equipment.type === 'PUMP'
      );
      if (pumpAdditional) {
        setSelectedPump(pumpAdditional.equipment);
      }

      // Cargar análisis hidráulico para obtener recomendación
      const hydraulicData = await professionalCalculationsService.getHydraulicAnalysis(project.id, {
        distanceToEquipment: 8,
        staticLift: 1.5
      });

      if (hydraulicData.analysis) {
        setRecommendedPump(hydraulicData.analysis.recommendedPump);
        setHydraulicSpecs({
          minFlowRate: hydraulicData.analysis.pumpSelectionDetails?.requiredFlowRate,
          minHead: hydraulicData.analysis.totalDynamicHead
        });
      }
    } catch (error) {
      console.error('Error loading equipment comparison:', error);
    }
  };

  const materials = project.materials as any;
  const hasMaterials = materials && Object.keys(materials).length > 0;
  const hasElectroweldedMesh = materials?.electroweldedMesh?.quantity > 0;
  const electroweldedMeshSheetM2 = 12;
  const wireMeshSheetM2 = 6;
  const getMeshSheetLabel = (quantity: number, unit: string, sheetAreaM2: number, sheetLabel: string) => {
    if (!quantity || !unit) return '';
    const normalizedUnit = unit.toLowerCase();
    if (!normalizedUnit.includes('m²') && !normalizedUnit.includes('m2')) return '';
    const sheets = Math.ceil(quantity / sheetAreaM2);
    return `≈ ${sheets} mallas de ${sheetLabel}`;
  };
  const plumbingConfig = project.plumbingConfig as any;
  const hasPlumbing = plumbingConfig && plumbingConfig.selectedItems && plumbingConfig.selectedItems.length > 0;
  const electricalConfig = project.electricalConfig as any;
  const hasElectrical = electricalConfig && electricalConfig.items && electricalConfig.items.length > 0;
  const hasAdditionals = additionals.length > 0;

  // Calcular costos
  const plumbingCosts = hasPlumbing
    ? plumbingConfig.selectedItems.reduce((sum: number, item: any) =>
        sum + (item.quantity * item.pricePerUnit), 0)
    : 0;

  const electricalCosts = hasElectrical && electricalConfig.items
    ? electricalConfig.items.reduce((sum: number, item: any) =>
        sum + (item.pricePerUnit ? item.pricePerUnit * item.quantity : 0), 0)
    : 0;

  const additionalsCosts = additionals.reduce((acc: any, additional: any) => {
    const quantity = additional.newQuantity || 0;
    let materialCost = 0;
    let laborCost = 0;

    if (additional.customPricePerUnit) {
      materialCost = additional.customPricePerUnit * quantity;
      laborCost = (additional.customLaborCost || 0) * quantity;
    } else if (additional.accessory) {
      materialCost = additional.accessory.pricePerUnit * quantity;
    } else if (additional.equipment) {
      materialCost = additional.equipment.pricePerUnit * quantity;
    } else if (additional.material) {
      materialCost = additional.material.pricePerUnit * quantity;
    }

    return {
      materialCost: acc.materialCost + materialCost,
      laborCost: acc.laborCost + laborCost,
    };
  }, { materialCost: 0, laborCost: 0 });

  const tasks = project.tasks as any || {};
  const hasTasks = tasks && Object.keys(tasks).length > 0;

  const computedTasksLabor = Object.values(tasks || {}).reduce((sum: number, categoryTasks: any) => {
    if (!Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.reduce((inner: number, task: any) => inner + (task.laborCost || 0), 0);
  }, 0);
  const baseLaborCost = computedTasksLabor > 0 ? computedTasksLabor : (project.laborCost || 0);

  const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts + electricalCosts;
  const totalLaborCost = baseLaborCost + additionalsCosts.laborCost;
  const grandTotal = totalMaterialCost + totalLaborCost;

  const totalRolesCost = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.cost, 0);
  const totalRolesHours = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.hours, 0);

  // Calcular estadísticas de tareas
  const taskStats = React.useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;
    let totalHours = 0;

    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            totalTasks++;
            totalHours += task.estimatedHours || 0;

            if (task.status === 'completed') completedTasks++;
            else if (task.status === 'in_progress') inProgressTasks++;
            else pendingTasks++;
          });
        }
      });
    }

    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      totalHours,
      progress
    };
  }, [tasks, hasTasks]);

  const categoryLabels: Record<string, string> = {
    excavation: 'Excavación',
    hydraulic: 'Instalación Hidráulica',
    electrical: 'Instalación Eléctrica',
    floor: 'Solado y Cama',
    tiles: 'Colocación de Losetas',
    finishes: 'Terminaciones',
    additionals: 'Adicionales',
    other: 'Otros'
  };

  return (
    <div className="space-y-6">
      {/* RESUMEN EJECUTIVO - HEADER */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">{project.name}</h2>
            <p className="text-blue-100 text-lg">Cliente: {project.clientName}</p>
            {project.location && (
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <p className="text-blue-200 text-sm">{project.location}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm mb-1">TOTAL DEL PROYECTO</p>
            <p className="text-5xl font-bold">${grandTotal.toLocaleString('es-AR')}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                Materiales: ${totalMaterialCost.toLocaleString('es-AR')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                M.O.: ${totalLaborCost.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ESPECIFICACIONES DE LA PISCINA */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">Especificaciones de la Piscina</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Modelo</p>
            <p className="font-bold text-lg">{project.poolPreset?.name}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <Ruler className="text-blue-600 mb-2" size={20} />
            <p className="text-sm text-blue-700 mb-1">Dimensiones</p>
            <p className="font-semibold">{project.poolPreset?.length}m × {project.poolPreset?.width}m × {project.poolPreset?.depth}m</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Volumen</p>
            <p className="font-bold text-2xl">{project.volume.toFixed(1)} m³</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700 mb-1">Área Espejo</p>
            <p className="font-bold text-2xl">{project.waterMirrorArea.toFixed(1)} m²</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">Perímetro</p>
            <p className="font-semibold">{project.perimeter.toFixed(1)} m</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">Excavación</p>
            <p className="font-semibold text-sm">{project.excavationLength}m × {project.excavationWidth}m × {project.excavationDepth}m</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">Retornos</p>
            <p className="font-semibold">{project.poolPreset?.returnsCount} unidades</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-1">Skimmers</p>
            <p className="font-semibold">{project.poolPreset?.skimmerCount} unidades</p>
          </div>
        </div>
      </Card>

      {/* COMPARACIÓN DE EQUIPOS - EXPANDIBLE */}
      <Card className="border-2 border-purple-200">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-purple-50 transition-colors p-4 -m-4 mb-4 rounded-t-lg"
          onClick={() => setShowEquipmentComparison(!showEquipmentComparison)}
        >
          <div className="flex items-center gap-2">
            <Zap className="text-purple-600" size={24} />
            <h3 className="text-xl font-bold">Comparación de Equipos</h3>
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              Selección vs Recomendación
            </span>
          </div>
          <button className="p-2 hover:bg-purple-100 rounded-full transition-colors">
            {showEquipmentComparison ? (
              <ChevronUp className="text-purple-600" size={20} />
            ) : (
              <ChevronDown className="text-purple-600" size={20} />
            )}
          </button>
        </div>

        {showEquipmentComparison && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <p className="text-sm text-gray-600 mb-4">
              Compara los equipos que seleccionaste manualmente con las recomendaciones del sistema basadas en los cálculos hidráulicos y eléctricos profesionales.
            </p>

            {hydraulicSpecs && (
              <EquipmentComparison
                title="Bomba de Filtración - Comparación"
                selectedEquipment={selectedPump}
                recommendedEquipment={recommendedPump}
                requiredSpecs={{
                  minFlowRate: hydraulicSpecs.minFlowRate,
                  minHead: hydraulicSpecs.minHead,
                }}
                showDetailedComparison={true}
              />
            )}

            {!hydraulicSpecs && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">Cargando recomendaciones del sistema...</p>
              </div>
            )}

            {additionals.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">No has seleccionado equipos</p>
                <p>Ve a la pestaña "Eléctrica" para seleccionar los equipos que vas a instalar en este proyecto.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* PROGRESO DE TAREAS */}
      {hasTasks && (
        <Card className="border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="text-indigo-600" size={24} />
            <h3 className="text-xl font-bold">Progreso de Tareas</h3>
          </div>

          {/* Resumen de progreso */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <p className="text-sm text-indigo-700 mb-1">Total</p>
              <p className="text-3xl font-bold text-indigo-900">{taskStats.totalTasks}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
              <p className="text-sm text-green-700 mb-1">Completadas</p>
              <p className="text-2xl font-bold text-green-900">{taskStats.completedTasks}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Clock size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-sm text-blue-700 mb-1">En Progreso</p>
              <p className="text-2xl font-bold text-blue-900">{taskStats.inProgressTasks}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Circle size={20} className="text-gray-600 mx-auto mb-1" />
              <p className="text-sm text-gray-700 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{taskStats.pendingTasks}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm text-purple-700 mb-1">Horas Totales</p>
              <p className="text-3xl font-bold text-purple-900">{taskStats.totalHours}</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progreso General</span>
              <span className="text-2xl font-bold text-indigo-600">{taskStats.progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${taskStats.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Lista de tareas por categoría */}
          <div className="space-y-4">
            {Object.entries(tasks).map(([category, categoryTasks]: [string, any]) => {
              if (!Array.isArray(categoryTasks) || categoryTasks.length === 0) return null;

              const categoryStats = categoryTasks.reduce((acc: any, task: any) => {
                acc.total++;
                if (task.status === 'completed') acc.completed++;
                else if (task.status === 'in_progress') acc.inProgress++;
                else acc.pending++;
                acc.hours += task.estimatedHours || 0;
                return acc;
              }, { total: 0, completed: 0, inProgress: 0, pending: 0, hours: 0 });

              const categoryProgress = categoryStats.total > 0
                ? (categoryStats.completed / categoryStats.total) * 100
                : 0;

              return (
                <div key={category} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{categoryLabels[category] || category}</h4>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600">{categoryStats.completed}/{categoryStats.total} tareas</span>
                      <span className="font-bold text-indigo-600">{categoryProgress.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Mini barra de progreso */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${categoryProgress}%` }}
                    ></div>
                  </div>

                  {/* Lista de tareas */}
                  <div className="space-y-2">
                    {categoryTasks.map((task: any, index: number) => (
                      <div
                        key={task.id || index}
                        className={`p-3 rounded-lg border-l-4 ${
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-500'
                            : task.status === 'in_progress'
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-gray-50 border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {task.status === 'completed' ? (
                                <CheckCircle size={18} className="text-green-600" />
                              ) : task.status === 'in_progress' ? (
                                <Clock size={18} className="text-blue-600" />
                              ) : (
                                <Circle size={18} className="text-gray-400" />
                              )}
                              <p className="font-medium text-sm">{task.name}</p>
                            </div>
                            {task.description && (
                              <p className="text-xs text-gray-600 ml-6">{task.description}</p>
                            )}
                            {task.suggestedRoleType && (
                              <span className="inline-block ml-6 mt-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                                {task.suggestedRoleType}
                              </span>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-semibold text-gray-700">
                              {task.estimatedHours}hs
                            </p>
                            {task.laborCost > 0 && (
                              <p className="text-xs text-gray-600">
                                ${task.laborCost.toLocaleString('es-AR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* DESGLOSE DE COSTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Materiales */}
        <Card className="border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-blue-600" size={24} />
            <h3 className="text-lg font-bold">Materiales</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Construcción Base</span>
              <span className="font-semibold">${project.materialCost.toLocaleString('es-AR')}</span>
            </div>
            {plumbingCosts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Plomería</span>
                <span className="font-semibold text-purple-700">${plumbingCosts.toLocaleString('es-AR')}</span>
              </div>
            )}
            {electricalCosts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Instalación Eléctrica</span>
                <span className="font-semibold text-yellow-700">${electricalCosts.toLocaleString('es-AR')}</span>
              </div>
            )}
            {additionalsCosts.materialCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Adicionales</span>
                <span className="font-semibold text-teal-700">${additionalsCosts.materialCost.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
              <span className="font-bold text-blue-900">TOTAL MATERIALES</span>
              <span className="font-bold text-2xl text-blue-600">${totalMaterialCost.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </Card>

        {/* Mano de Obra */}
        <Card className="border-2 border-green-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-green-600" size={24} />
            <h3 className="text-lg font-bold">Mano de Obra</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-gray-600">Base (tareas)</span>
              <span className="font-semibold">${baseLaborCost.toLocaleString('es-AR')}</span>
            </div>
            {totalRolesCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Detalle por Roles ({totalRolesHours.toFixed(0)}hs)</span>
                <span className="font-semibold text-purple-700">${totalRolesCost.toLocaleString('es-AR')} <span className="text-xs text-gray-500">(incluido)</span></span>
              </div>
            )}
            {additionalsCosts.laborCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">M.O. Adicionales</span>
                <span className="font-semibold text-teal-700">${additionalsCosts.laborCost.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
              <span className="font-bold text-green-900">TOTAL MANO DE OBRA</span>
              <span className="font-bold text-2xl text-green-600">${totalLaborCost.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </Card>

        {/* Total Proyecto */}
        <Card className="border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-white">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-primary-600" size={24} />
            <h3 className="text-lg font-bold">Total Proyecto</h3>
          </div>
          <div className="text-center py-6">
            <p className="text-sm text-primary-700 mb-2">COSTO TOTAL</p>
            <p className="text-5xl font-bold text-primary-600 mb-4">${grandTotal.toLocaleString('es-AR')}</p>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Materiales</span>
                <span className="font-semibold">{((totalMaterialCost / grandTotal) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(totalMaterialCost / grandTotal) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mano de Obra</span>
                <span className="font-semibold">{((totalLaborCost / grandTotal) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* MATERIALES DETALLADOS */}
      {hasMaterials && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="text-gray-700" size={24} />
            <h3 className="text-xl font-bold">Materiales Calculados</h3>
          </div>

          {/* Losetas */}
          {materials.tiles && Array.isArray(materials.tiles) && materials.tiles.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  Losetas y Cerámicos
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'cad' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode(viewMode === 'planta' ? 'cad' : 'planta')}
                    className="flex items-center gap-2"
                  >
                    <Grid3x3 size={16} />
                    {viewMode === 'planta' ? 'Vista CAD' : 'Vista Planta'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => canvasRef.current && exportCanvasToImage(canvasRef.current, `pool-${project.name.replace(/\s+/g, '-')}-visualization.png`)}
                    className="flex items-center gap-2"
                  >
                    <Download size={16} />
                    Exportar Dibujo
                  </Button>
                </div>
              </div>

              {/* Visualización de la Piscina */}
              <div className="mb-4 bg-white/10 border border-white/15 rounded-lg p-6 flex items-center justify-center">
                <div className="w-full max-w-4xl">
                  <PoolVisualizationCanvas
                    ref={canvasRef}
                    project={project}
                    tileConfig={project.tileCalculation}
                    width={800}
                    height={500}
                    showMeasurements={true}
                    viewMode={viewMode}
                  />
                </div>
              </div>

              <div className="bg-cyan-500/10 p-3 rounded-lg mb-3 border border-cyan-400/20">
                <p className="text-sm text-cyan-100">
                  Área total de vereda: <strong>{project.sidewalkArea.toFixed(2)} m²</strong>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {materials.tiles.map((tile: any, index: number) => (
                  <div key={index} className="border border-white/15 bg-white/5 rounded-lg p-3 hover:border-cyan-400/40 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${
                          tile.type === 'first_ring'
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-cyan-500/20 text-cyan-200'
                        }`}>
                          {tile.type === 'first_ring' ? 'PRIMER ANILLO' : 'FILAS ADICIONALES'}
                        </span>
                        <p className="font-medium text-white">{tile.tileName}</p>
                      </div>
                      <p className="text-xl font-bold text-cyan-200">{tile.quantity} {tile.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materiales de Vereda y Cama */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {materials.adhesive && materials.adhesive.quantity > 0 && (
              <div className="bg-white/8 p-3 rounded-lg border border-white/15">
                <p className="text-xs text-zinc-400 mb-1">Pegamento</p>
                <p className="font-bold text-lg">{materials.adhesive.quantity} {materials.adhesive.unit}</p>
              </div>
            )}
            {materials.cement && materials.cement.quantity > 0 && (
              <div className="bg-white/8 p-3 rounded-lg border border-white/15">
                <p className="text-xs text-zinc-400 mb-1">Cemento</p>
                <p className="font-bold text-lg">{materials.cement.quantity} {materials.cement.unit}</p>
              </div>
            )}
            {materials.sand && parseFloat(materials.sand.quantity) > 0 && (
              <div className="bg-white/8 p-3 rounded-lg border border-white/15">
                <p className="text-xs text-zinc-400 mb-1">Arena</p>
                <p className="font-bold text-lg">{materials.sand.quantity} {materials.sand.unit}</p>
              </div>
            )}
            {materials.gravel && parseFloat(materials.gravel.quantity) > 0 && (
              <div className="bg-white/8 p-3 rounded-lg border border-white/15">
                <p className="text-xs text-zinc-400 mb-1">Piedra</p>
                <p className="font-bold text-lg">{materials.gravel.quantity} {materials.gravel.unit}</p>
              </div>
            )}
            {materials.whiteCement && materials.whiteCement.quantity > 0 && (
              <div className="bg-white/8 p-3 rounded-lg border border-white/15">
                <p className="text-xs text-zinc-400 mb-1">Cemento Blanco</p>
                <p className="font-bold text-lg">{materials.whiteCement.quantity} {materials.whiteCement.unit}</p>
              </div>
            )}
            {materials.geomembrane && materials.geomembrane.quantity > 0 && (
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-400/20">
                <p className="text-xs text-emerald-200 mb-1">Geomembrana</p>
                <p className="font-bold text-lg">{materials.geomembrane.quantity} {materials.geomembrane.unit}</p>
              </div>
            )}
            {materials.electroweldedMesh && materials.electroweldedMesh.quantity > 0 && (
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-400/20">
                <p className="text-xs text-emerald-200 mb-1">Malla Electrosoldada</p>
                <p className="font-bold text-lg">{materials.electroweldedMesh.quantity} {materials.electroweldedMesh.unit}</p>
                {getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m') && (
                  <p className="text-xs text-emerald-200">{getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m')}</p>
                )}
              </div>
            )}
            {materials.wireMesh && materials.wireMesh.quantity > 0 && !hasElectroweldedMesh && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Malla Metálica</p>
                <p className="font-bold text-lg">{materials.wireMesh.quantity} {materials.wireMesh.unit}</p>
                {getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m') && (
                  <p className="text-xs text-gray-600">{getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m')}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* INSTALACIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plomería */}
        {hasPlumbing && (
          <Card className="border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="text-purple-600" size={24} />
              <h3 className="text-lg font-bold">Instalación Hidráulica</h3>
            </div>
            {plumbingConfig.distanceToEquipment && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-purple-800 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Distancia a cabecera: <strong>{plumbingConfig.distanceToEquipment} metros</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              {plumbingConfig.selectedItems.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{item.itemName}</p>
                    {item.diameter && <p className="text-xs text-purple-600">Ø {item.diameter}</p>}
                  </div>
                  <p className="font-semibold">{item.quantity} un.</p>
                </div>
              ))}
              {plumbingConfig.selectedItems.length > 5 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  + {plumbingConfig.selectedItems.length - 5} items más...
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-900">Total Plomería</span>
                <span className="font-bold text-xl text-purple-600">${plumbingCosts.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Eléctrica */}
        {hasElectrical && (
          <Card className="border-l-4 border-yellow-500">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-yellow-600" size={24} />
              <h3 className="text-lg font-bold">Instalación Eléctrica</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700 mb-1">Potencia Total</p>
                <p className="text-xl font-bold text-yellow-900">{electricalConfig.totalWatts || 0} W</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700 mb-1">Amperaje</p>
                <p className="text-xl font-bold text-yellow-900">{((electricalConfig.totalWatts || 0) / 220).toFixed(1)} A</p>
              </div>
            </div>
            {electricalConfig.recommendedCableSection && (
              <div className="bg-yellow-100 p-3 rounded-lg mb-3">
                <p className="text-sm text-yellow-900 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Cable recomendado: <strong>{electricalConfig.recommendedCableSection}</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              {electricalConfig.items.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-yellow-700">{item.watts}W × {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-yellow-900">{(item.watts * item.quantity)}W</p>
                </div>
              ))}
              {electricalConfig.items.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  + {electricalConfig.items.length - 3} items más...
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-yellow-900">Total Eléctrica</span>
                <span className="font-bold text-xl text-yellow-600">${electricalCosts.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ADICIONALES */}
      {hasAdditionals && (
        <Card className="border-l-4 border-teal-500">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="text-teal-600" size={24} />
            <h3 className="text-lg font-bold">Items Adicionales</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionals.map((additional: any) => {
              const getItemName = () => {
                if (additional.customName) return additional.customName;
                if (additional.accessory) return additional.accessory.name;
                if (additional.equipment) return additional.equipment.name;
                if (additional.material) return additional.material.name;
                return 'Sin nombre';
              };

              const getItemImage = () => {
                if (additional.accessory?.imageUrl) return additional.accessory.imageUrl;
                if (additional.equipment?.imageUrl) return additional.equipment.imageUrl;
                if (additional.material?.imageUrl) return additional.material.imageUrl;
                return null;
              };

              const quantity = additional.newQuantity || 0;
              let materialCost = 0;

              if (additional.customPricePerUnit) {
                materialCost = additional.customPricePerUnit * quantity;
              } else if (additional.accessory) {
                materialCost = additional.accessory.pricePerUnit * quantity;
              } else if (additional.equipment) {
                materialCost = additional.equipment.pricePerUnit * quantity;
              } else if (additional.material) {
                materialCost = additional.material.pricePerUnit * quantity;
              }

              const imageUrl = getItemImage();

              return (
                <div key={additional.id} className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex gap-3">
                    {/* Imagen del producto */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded border-2 border-teal-300 overflow-hidden bg-white">
                        {imageUrl ? (
                          <img
                            src={productImageService.getImageUrl(imageUrl) || undefined}
                            alt={getItemName()}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-teal-300" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del item */}
                    <div className="flex-1 flex justify-between items-start">
                      <div>
                        <p className="font-medium text-teal-900">{getItemName()}</p>
                        <p className="text-xs text-teal-600">{quantity} {additional.customUnit || 'unidades'}</p>
                      </div>
                      <p className="font-bold text-teal-700">${materialCost.toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CONTACTO DEL CLIENTE */}
      <Card className="bg-white/10 border border-white/15">
        <h3 className="text-lg font-bold mb-4 text-white">Información de Contacto</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {project.clientEmail && (
            <div>
              <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                Email
              </p>
              <p className="font-medium text-sm text-white">{project.clientEmail}</p>
            </div>
          )}
          {project.clientPhone && (
            <div>
              <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                Teléfono
              </p>
              <p className="font-medium text-sm text-white">{project.clientPhone}</p>
            </div>
          )}
          {project.location && (
            <div>
              <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                Ubicación
              </p>
              <p className="font-medium text-sm text-white">{project.location}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              Creado
            </p>
            <p className="font-medium text-sm text-white">{new Date(project.createdAt).toLocaleDateString('es-AR')}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
