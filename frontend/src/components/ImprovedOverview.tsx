import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Project, EquipmentPreset } from '@/types';
import { PoolVisualizationCanvas, exportCanvasToImage } from '@/components/PoolVisualizationCanvas';
import { Button } from '@/components/ui/Button';
import { EquipmentComparison } from '@/components/EquipmentComparison';
import { professionalCalculationsService } from '@/services/professionalCalculationsService';
import { productImageService } from '@/services/productImageService';
import { calculateProjectFinancials, getAdditionalName, summarizeHydraulicSystem } from '@/utils/projectCosting';
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
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Grid3x3,
  Image as ImageIcon,
  Eye,
  EyeOff
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
  const [showGrandTotal, setShowGrandTotal] = useState(false);

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
  const visibleHydraulicItems = React.useMemo(() => {
    const selectedItems = Array.isArray(plumbingConfig?.selectedItems) ? plumbingConfig.selectedItems : [];
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const visibleFromConfig = selectedItems.filter((item: any) => {
      const name = normalize(item.itemName || item.name || '');
      const category = normalize(item.category || '');

      const isInstallationSupply =
        category === 'pipe' ||
        category === 'fitting' ||
        category === 'valve' ||
        name.includes('caño') ||
        name.includes('cano') ||
        name.includes('pvc') ||
        name.includes('codo') ||
        name.includes('tee') ||
        name.includes('te ') ||
        name.includes('cupla') ||
        name.includes('copla') ||
        name.includes('union') ||
        name.includes('valvula') ||
        name.includes('check') ||
        name.includes('pegamento') ||
        name.includes('adhesivo') ||
        name.includes('solvente');

      if (isInstallationSupply) return false;

      return (
        name.includes('retorno') ||
        name.includes('skimmer') ||
        name.includes('hidro') ||
        name.includes('cascada') ||
        name.includes('barrefondo') ||
        name.includes('toma') ||
        name.includes('desague') ||
        name.includes('dren') ||
        name.includes('sumidero') ||
        name.includes('boquilla') ||
        name.includes('jet')
      );
    });

    const visibleFromAdditionals = additionals
      .filter((additional: any) => {
        const quantity = additional.newQuantity || 0;
        if (!quantity) return false;

        const name = normalize(getAdditionalName(additional));
        const category = normalize(
          additional.customCategory ||
          additional.accessory?.type ||
          additional.equipment?.type ||
          additional.material?.type ||
          ''
        );

        return (
          name.includes('cascada') ||
          name.includes('hidrojet') ||
          name.includes('hidromas') ||
          name.includes('retorno') ||
          name.includes('skimmer') ||
          name.includes('bomba') ||
          name.includes('caldaia') ||
          name.includes('calef') ||
          category.includes('pump') ||
          category.includes('heater') ||
          category.includes('hydro') ||
          category.includes('skimmer') ||
          category.includes('return')
        );
      })
      .map((additional: any) => ({
        itemName: getAdditionalName(additional),
        diameter: additional.accessory?.diameter || additional.material?.diameter || additional.equipment?.diameter,
        quantity: additional.newQuantity || 0,
      }));

    const merged = [...visibleFromConfig];

    visibleFromAdditionals.forEach((item) => {
      const existing = merged.find((entry: any) => entry.itemName === item.itemName && entry.diameter === item.diameter);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.push(item);
      }
    });

    return merged;
  }, [plumbingConfig, additionals]);
  const electricalConfig = project.electricalConfig as any;
  const hasElectrical = electricalConfig && electricalConfig.items && electricalConfig.items.length > 0;
  const hasAdditionals = additionals.length > 0;

  // Calcular costos
  const tasks = project.tasks as any || {};
  const hasTasks = tasks && Object.keys(tasks).length > 0;
  const financials = React.useMemo(() => calculateProjectFinancials(project, additionals), [project, additionals]);
  const {
    plumbingCosts,
    electricalCosts,
    additionalsCosts,
    duplicatedAdditionals,
    duplicatedAdditionalsCosts,
    baseMaterialCost,
    baseLaborCost,
    totalMaterialCost,
    totalLaborCost,
    grandTotal,
  } = financials;
  const hydraulicSummary = React.useMemo(() => summarizeHydraulicSystem(project, additionals), [project, additionals]);
  const persistedMaterialCost = Number(project.materialCost || 0);
  const materialShare = grandTotal > 0 ? (totalMaterialCost / grandTotal) * 100 : 0;
  const laborShare = grandTotal > 0 ? (totalLaborCost / grandTotal) * 100 : 0;

  const totalRolesCost = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.cost, 0);
  const totalRolesHours = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.hours, 0);

  // Calcular estadísticas de tareas
  const taskStats = React.useMemo(() => {
    let totalTasks = 0;
    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          totalTasks += categoryTasks.length;
        }
      });
    }
    return { totalTasks };
  }, [tasks, hasTasks]);

  const poolDepthLabel = project.poolPreset?.depthEnd && project.poolPreset.depthEnd !== project.poolPreset.depth
    ? `${project.poolPreset.depth}m a ${project.poolPreset.depthEnd}m`
    : `${project.poolPreset?.depth}m`;

  return (
    <div className="space-y-6">
      {/* RESUMEN EJECUTIVO - HEADER */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">{project.name}</h2>
            <p className="text-zinc-50 text-xl">Cliente: {project.clientName}</p>
            {project.location && (
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3 h-3 text-zinc-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <p className="text-zinc-100 text-base">{project.location}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <p className="text-zinc-100 text-base">TOTAL DEL PROYECTO</p>
              <button
                type="button"
                onClick={() => setShowGrandTotal((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-50 transition hover:bg-white/20"
                aria-label={showGrandTotal ? 'Ocultar total del proyecto' : 'Mostrar total del proyecto'}
                title={showGrandTotal ? 'Ocultar total del proyecto' : 'Mostrar total del proyecto'}
              >
                {showGrandTotal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="min-h-[60px] min-w-[260px] text-5xl font-bold tracking-tight">
              {showGrandTotal ? `$${grandTotal.toLocaleString('es-AR')}` : '••••••••••'}
            </p>
            <div className="flex gap-4 mt-2 text-base text-zinc-50">
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
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="text-zinc-200" size={24} />
          <h3 className="text-2xl font-bold text-white">Especificaciones de la Piscina</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Modelo</p>
            <p className="font-bold text-xl text-white">{project.poolPreset?.name}</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <Ruler className="text-zinc-300 mb-2" size={20} />
            <p className="text-base text-zinc-300 mb-1">Dimensiones</p>
            <p className="font-semibold text-lg text-zinc-50">{project.poolPreset?.length}m × {project.poolPreset?.width}m × {poolDepthLabel}</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Volumen</p>
            <p className="font-bold text-2xl text-white">{project.volume.toFixed(1)} m³</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Área Espejo</p>
            <p className="font-bold text-2xl text-white">{project.waterMirrorArea.toFixed(1)} m²</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Perímetro</p>
            <p className="font-semibold text-lg text-zinc-50">{project.perimeter.toFixed(1)} m</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Excavación</p>
            <p className="font-semibold text-base text-zinc-50">{project.excavationLength}m × {project.excavationWidth}m × {project.excavationDepth}m</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Retornos</p>
            <p className="font-semibold text-lg text-zinc-50">{hydraulicSummary.total.returns} unidades</p>
            <p className="text-xs text-zinc-400 mt-1">Base {hydraulicSummary.base.returns}{hydraulicSummary.added.returns > 0 ? ` + ${hydraulicSummary.added.returns}` : ''}</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Skimmers</p>
            <p className="font-semibold text-lg text-zinc-50">{hydraulicSummary.total.skimmers} unidades</p>
            <p className="text-xs text-zinc-400 mt-1">Base {hydraulicSummary.base.skimmers}{hydraulicSummary.added.skimmers > 0 ? ` + ${hydraulicSummary.added.skimmers}` : ''}</p>
          </div>
        </div>
      </Card>

      {/* COMPARACIÓN DE EQUIPOS - EXPANDIBLE */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors p-4 -m-4 mb-4 rounded-t-lg"
          onClick={() => setShowEquipmentComparison(!showEquipmentComparison)}
        >
          <div className="flex items-center gap-2">
            <Zap className="text-zinc-200" size={24} />
            <h3 className="text-2xl font-bold text-white">Comparación de Equipos</h3>
            <span className="text-base bg-zinc-900 text-zinc-200 border border-zinc-700 px-3 py-1 rounded-full">
              Selección vs Recomendación
            </span>
          </div>
          <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            {showEquipmentComparison ? (
              <ChevronUp className="text-zinc-200" size={20} />
            ) : (
              <ChevronDown className="text-zinc-200" size={20} />
            )}
          </button>
        </div>

        {showEquipmentComparison && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <p className="text-base text-zinc-300 mb-4">
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
                <p className="text-base text-zinc-300">Cargando recomendaciones del sistema...</p>
              </div>
            )}

            {additionals.length === 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-base text-zinc-200">
                <p className="font-medium mb-1">No has seleccionado equipos</p>
                <p>Ve a la pestaña "Eléctrica" para seleccionar los equipos que vas a instalar en este proyecto.</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* DESGLOSE DE COSTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mano de Obra */}
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100 lg:col-span-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-zinc-200" size={24} />
            <h3 className="text-lg font-bold text-white">Mano de Obra</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-8 text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase mb-2">Total Mano de Obra</p>
              <p className="text-6xl font-bold leading-none text-white md:text-7xl">
                ${totalLaborCost.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-400">Base (tareas)</span>
              <span className="font-semibold text-zinc-100">${baseLaborCost.toLocaleString('es-AR')}</span>
            </div>
            {totalRolesCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Detalle por Roles ({totalRolesHours.toFixed(0)}hs)</span>
                <span className="font-semibold text-zinc-100">${totalRolesCost.toLocaleString('es-AR')} <span className="text-xs text-zinc-500">(incluido)</span></span>
              </div>
            )}
            {additionalsCosts.laborCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">M.O. Adicionales</span>
                <span className="font-semibold text-zinc-100">${additionalsCosts.laborCost.toLocaleString('es-AR')}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Materiales */}
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100 lg:col-span-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-zinc-200" size={24} />
            <h3 className="text-lg font-bold text-white">Materiales</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-zinc-400">Construcción Base</span>
              <span className="font-semibold text-zinc-100">${persistedMaterialCost.toLocaleString('es-AR')}</span>
            </div>
            {plumbingCosts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Plomería</span>
                <span className="font-semibold text-zinc-100">${plumbingCosts.toLocaleString('es-AR')}</span>
              </div>
            )}
            {electricalCosts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Instalación Eléctrica</span>
                <span className="font-semibold text-zinc-100">${electricalCosts.toLocaleString('es-AR')}</span>
              </div>
            )}
            {additionalsCosts.materialCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Adicionales</span>
                <span className="font-semibold text-zinc-100">${additionalsCosts.materialCost.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
              <span className="font-bold text-white">TOTAL MATERIALES</span>
              <span className="font-bold text-2xl text-white">${totalMaterialCost.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </Card>

        {/* Total Proyecto */}
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-zinc-200" size={24} />
            <h3 className="text-lg font-bold text-white">Total Proyecto</h3>
          </div>
          <div className="py-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-5 mb-4">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase mb-2">Costo Total</p>
              <p className="text-3xl font-semibold text-zinc-100 md:text-4xl">${grandTotal.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 shadow-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Materiales</span>
                <span className="font-semibold text-zinc-100">{materialShare.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                <div
                  className="bg-zinc-200 h-2 rounded-full"
                  style={{ width: `${materialShare}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Mano de Obra</span>
                <span className="font-semibold text-zinc-100">{laborShare.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-zinc-950 border border-amber-800/40 text-zinc-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-amber-300" size={22} />
          <h3 className="text-lg font-bold text-white">Auditoría de Costos</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Base persistida</p>
            <p className="mt-2 text-2xl font-bold text-white">${persistedMaterialCost.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Construcción base guardada en proyecto</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Hidráulica + eléctrica</p>
            <p className="mt-2 text-2xl font-bold text-white">${(plumbingCosts + electricalCosts).toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Plomería ${plumbingCosts.toLocaleString('es-AR')} · Eléctrica ${electricalCosts.toLocaleString('es-AR')}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Adicionales activos</p>
            <p className="mt-2 text-2xl font-bold text-white">${additionalsCosts.materialCost.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Sólo adicionales no duplicados en configs</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Duplicados descartados</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">${duplicatedAdditionalsCosts.materialCost.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">{duplicatedAdditionals.length} adicional(es) ya representados en hidráulica o eléctrica</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Materiales auditados</p>
            <p className="mt-2 text-xl font-bold text-white">${baseMaterialCost.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Base final antes de sumar adicionales activos</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Mano de obra base</p>
            <p className="mt-2 text-xl font-bold text-white">${baseLaborCost.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Tareas base sin categoría additionals</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total auditado</p>
            <p className="mt-2 text-xl font-bold text-white">${grandTotal.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-zinc-400">Resultado final que hoy usa toda la app</p>
          </div>
        </div>

        {duplicatedAdditionals.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-200">Adicionales descartados por posible doble conteo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {duplicatedAdditionals.map((additional: any, index: number) => (
                <span key={`${additional.id || getAdditionalName(additional)}-${index}`} className="rounded-full border border-amber-700/50 bg-amber-900/20 px-3 py-1 text-xs text-amber-100">
                  {getAdditionalName(additional)} x{additional.newQuantity || 0}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* MATERIALES DETALLADOS */}
      {hasMaterials && (
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="text-zinc-200" size={24} />
            <h3 className="text-xl font-bold text-white">Materiales Calculados</h3>
          </div>

          {/* Losetas */}
          {materials.tiles && Array.isArray(materials.tiles) && materials.tiles.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-200 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-zinc-300" />
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
              <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex items-center justify-center">
                <div className="w-full max-w-4xl">
                  <PoolVisualizationCanvas
                    ref={canvasRef}
                    project={project}
                    tileConfig={project.tileCalculation}
                    width={1080}
                    height={680}
                    showMeasurements={true}
                    viewMode={viewMode}
                    renderQuality={2.25}
                  />
                </div>
              </div>

              <div className="bg-zinc-900 p-3 rounded-lg mb-3 border border-zinc-800">
                <p className="text-sm text-zinc-200">
                  Área total de vereda: <strong>{project.sidewalkArea.toFixed(2)} m²</strong>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {materials.tiles.map((tile: any, index: number) => (
                  <div key={index} className="border border-zinc-800 bg-zinc-900 rounded-lg p-3 hover:border-zinc-600 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${
                          tile.type === 'first_ring'
                            ? 'bg-zinc-800 text-zinc-200'
                            : 'bg-zinc-800 text-zinc-200'
                        }`}>
                          {tile.type === 'first_ring' ? 'PRIMER ANILLO' : 'FILAS ADICIONALES'}
                        </span>
                        <p className="font-medium text-white">{tile.tileName}</p>
                      </div>
                      <p className="text-xl font-bold text-zinc-100">{tile.quantity} {tile.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materiales de Vereda y Cama */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {materials.adhesive && materials.adhesive.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Pegamento</p>
                <p className="font-bold text-lg text-white">{materials.adhesive.quantity} {materials.adhesive.unit}</p>
              </div>
            )}
            {materials.cement && materials.cement.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Cemento</p>
                <p className="font-bold text-lg text-white">{materials.cement.quantity} {materials.cement.unit}</p>
              </div>
            )}
            {materials.sand && parseFloat(materials.sand.quantity) > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Arena</p>
                <p className="font-bold text-lg text-white">{materials.sand.quantity} {materials.sand.unit}</p>
              </div>
            )}
            {materials.gravel && parseFloat(materials.gravel.quantity) > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Piedra</p>
                <p className="font-bold text-lg text-white">{materials.gravel.quantity} {materials.gravel.unit}</p>
              </div>
            )}
            {materials.whiteCement && materials.whiteCement.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Cemento Blanco</p>
                <p className="font-bold text-lg text-white">{materials.whiteCement.quantity} {materials.whiteCement.unit}</p>
              </div>
            )}
            {materials.geomembrane && materials.geomembrane.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Geomembrana</p>
                <p className="font-bold text-lg text-white">{materials.geomembrane.quantity} {materials.geomembrane.unit}</p>
              </div>
            )}
            {materials.electroweldedMesh && materials.electroweldedMesh.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Malla Electrosoldada</p>
                <p className="font-bold text-lg text-white">{materials.electroweldedMesh.quantity} {materials.electroweldedMesh.unit}</p>
                {getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m') && (
                  <p className="text-xs text-zinc-400">{getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m')}</p>
                )}
              </div>
            )}
            {materials.sandForBed && parseFloat(materials.sandForBed.quantity) > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Arena terciada relleno</p>
                <p className="font-bold text-lg text-white">{materials.sandForBed.quantity} {materials.sandForBed.unit}</p>
                {materials.sandForBedBulkBags && (
                  <p className="text-xs text-zinc-400">({materials.sandForBedBulkBags.quantity} {materials.sandForBedBulkBags.unit})</p>
                )}
              </div>
            )}
            {materials.cementBags && materials.cementBags.quantity > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Cemento cama/relleno</p>
                <p className="font-bold text-lg text-white">{materials.cementBags.quantity} {materials.cementBags.unit}</p>
                <p className="text-xs text-zinc-400">({materials.cementKg?.quantity || 0} kg)</p>
              </div>
            )}
            {materials.fillReference && parseFloat(materials.fillReference.quantity) > 0 && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Profundidad referencia</p>
                <p className="font-bold text-lg text-white">{materials.fillReference.quantity} {materials.fillReference.unit}</p>
              </div>
            )}
            {materials.wireMesh && materials.wireMesh.quantity > 0 && !hasElectroweldedMesh && (
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Malla Metálica</p>
                <p className="font-bold text-lg text-white">{materials.wireMesh.quantity} {materials.wireMesh.unit}</p>
                {getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m') && (
                  <p className="text-xs text-zinc-400">{getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m')}</p>
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
          <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="text-zinc-200" size={24} />
              <h3 className="text-lg font-bold text-white">Instalación Hidráulica</h3>
            </div>
            {plumbingConfig.distanceToEquipment && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-3">
                <p className="text-sm text-zinc-300 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Distancia a cabecera: <strong>{plumbingConfig.distanceToEquipment} metros</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              {visibleHydraulicItems.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-zinc-900 rounded text-sm border border-zinc-800">
                  <div>
                    <p className="font-medium text-white">{item.itemName}</p>
                    {item.diameter && <p className="text-xs text-zinc-400">Ø {item.diameter}</p>}
                  </div>
                  <p className="font-semibold text-zinc-100">{item.quantity} un.</p>
                </div>
              ))}
              {visibleHydraulicItems.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-3">
                  No hay accesorios visibles configurados.
                </p>
              )}
              {visibleHydraulicItems.length > 5 && (
                <p className="text-xs text-zinc-500 text-center py-2">
                  + {visibleHydraulicItems.length - 5} items más...
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">Total Plomería</span>
                <span className="font-bold text-xl text-white">${plumbingCosts.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Eléctrica */}
        {hasElectrical && (
          <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-zinc-200" size={24} />
              <h3 className="text-lg font-bold text-white">Instalación Eléctrica</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Potencia Total</p>
                <p className="text-xl font-bold text-white">{electricalConfig.totalWatts || 0} W</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">Amperaje</p>
                <p className="text-xl font-bold text-white">{((electricalConfig.totalWatts || 0) / 220).toFixed(1)} A</p>
              </div>
            </div>
            {electricalConfig.recommendedCableSection && (
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-3">
                <p className="text-sm text-zinc-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Cable recomendado: <strong>{electricalConfig.recommendedCableSection}</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              {electricalConfig.items.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-zinc-900 rounded text-sm border border-zinc-800">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-zinc-400">{item.watts}W × {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-white">{(item.watts * item.quantity)}W</p>
                </div>
              ))}
              {electricalConfig.items.length > 3 && (
                <p className="text-xs text-zinc-500 text-center py-2">
                  + {electricalConfig.items.length - 3} items más...
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">Total Eléctrica</span>
                <span className="font-bold text-xl text-white">${electricalCosts.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ADICIONALES */}
      {hasAdditionals && (
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="text-zinc-200" size={24} />
            <h3 className="text-lg font-bold text-white">Items Adicionales</h3>
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
              let laborCost = 0;

              if (typeof additional.customPricePerUnit === 'number' && additional.customPricePerUnit > 0) {
                materialCost = additional.customPricePerUnit * quantity;
              } else if (additional.accessory) {
                materialCost = additional.accessory.pricePerUnit * quantity;
              } else if (additional.equipment) {
                materialCost = additional.equipment.pricePerUnit * quantity;
              } else if (additional.material) {
                materialCost = additional.material.pricePerUnit * quantity;
              }

              if (typeof additional.customLaborCost === 'number' && additional.customLaborCost > 0) {
                laborCost = additional.customLaborCost * quantity;
              }

              const totalCost = materialCost + laborCost;
              const imageUrl = getItemImage();

              return (
                <div key={additional.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <div className="flex gap-3">
                    {/* Imagen del producto */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded border border-zinc-700 overflow-hidden bg-zinc-950">
                        {imageUrl ? (
                          <img
                            src={productImageService.getImageUrl(imageUrl) || undefined}
                            alt={getItemName()}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del item */}
                    <div className="flex-1 flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white">{getItemName()}</p>
                        <p className="text-xs text-zinc-400">{quantity} {additional.customUnit || 'unidades'}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
                          {materialCost > 0 && <span>Material: ${materialCost.toLocaleString('es-AR')}</span>}
                          {laborCost > 0 && <span>M.O.: ${laborCost.toLocaleString('es-AR')}</span>}
                        </div>
                      </div>
                      <p className="font-bold text-zinc-100">${totalCost.toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CONTACTO DEL CLIENTE */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
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
