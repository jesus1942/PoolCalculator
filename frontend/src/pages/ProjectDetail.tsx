import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TileEditor } from '@/components/TileEditor';
import { PlumbingEditor } from '@/components/PlumbingEditor';
import { RolesManager } from '@/components/RolesManager';
import { TasksManager } from '@/components/TasksManager';
import { AdditionalsManager } from '@/components/AdditionalsManager';
import { PoolSystemsRecommendations } from '@/components/PoolSystemsRecommendations';
import { EnhancedExportManager } from '@/components/EnhancedExportManager';
import { ElectricalEditor } from '@/components/ElectricalEditor';
import { EquipmentSelector } from '@/components/EquipmentSelector';
import { ProjectStatus } from '@/components/ProjectStatus';
import { ImprovedOverview } from '@/components/ImprovedOverview';
import { HydraulicAnalysisPanel } from '@/components/HydraulicAnalysisPanel';
import { ElectricalAnalysisPanel } from '@/components/ElectricalAnalysisPanel';
import { projectService } from '@/services/projectService';
import { Project } from '@/types';
import { plumbingCalculationService } from '@/services/plumbingCalculationService';
import {
  generateElectricalConfigFromPreset,
  generateElectricalConfigFromPresetWithAdditionals,
  generatePlumbingConfigFromPreset,
  generatePlumbingConfigFromPresetWithAdditionals,
  generateTileConfigFromPreset
} from '@/utils/presetAutoConfig';
import { ArrowLeft, Edit, FileText, Hammer, Users, FileSpreadsheet, Package, Zap, Activity, Cpu } from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'status' | 'tiles' | 'plumbing' | 'electrical' | 'tasks' | 'roles' | 'systems' | 'additionals' | 'export' | 'hydraulic_pro' | 'electrical_pro'>('overview');

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      if (!id) return;
      const data = await projectService.getById(id);

      // Cargar adicionales del proyecto
      try {
        const additionalsService = await import('@/services/additionalsService');
        const additionals = await additionalsService.additionalsService.getProjectAdditionals(id);
        (data as any).additionals = additionals;
      } catch (error) {
        console.log('No se pudieron cargar los adicionales:', error);
        (data as any).additionals = [];
      }

      // Auto-configurar pestañas si hay poolPreset y las configuraciones están vacías
      if (data.poolPreset && id) {
        let needsUpdate = false;
        const updates: any = {};

        // Obtener adicionales si existen
        const additionals = (data as any).additionals || [];

        // Auto-configurar eléctrica si está vacía
        if (!data.electricalConfig || Object.keys(data.electricalConfig).length === 0) {
          updates.electricalConfig = generateElectricalConfigFromPresetWithAdditionals(
            data.poolPreset,
            additionals
          );
          needsUpdate = true;
          console.log('[Auto-config] Configuración eléctrica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        // Auto-configurar hidráulica si está vacía
        if (!data.plumbingConfig || Object.keys(data.plumbingConfig).length === 0) {
          updates.plumbingConfig = generatePlumbingConfigFromPresetWithAdditionals(
            data.poolPreset,
            additionals
          );
          needsUpdate = true;
          console.log('[Auto-config] Configuración hidráulica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        // Auto-configurar losetas si está vacía
        if (!data.tileCalculation || Object.keys(data.tileCalculation).length === 0) {
          updates.tileCalculation = generateTileConfigFromPreset(data.poolPreset);
          needsUpdate = true;
          console.log('[Auto-config] Configuración de losetas generada desde modelo', data.poolPreset.name);
        }

        // Guardar actualizaciones si es necesario
        if (needsUpdate) {
          try {
            await projectService.update(id, updates);
            // Recargar para obtener datos actualizados
            const updatedData = await projectService.getById(id);
            setProject(updatedData);
            console.log('[Auto-config] Configuraciones guardadas automáticamente');
            return; // Salir early para usar los datos actualizados
          } catch (error) {
            console.error('Error al guardar configuraciones automáticas:', error);
          }
        }
      }

      setProject(data);
    } catch (error) {
      console.error('Error al cargar proyecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTileConfig = async (tileConfig: any) => {
    try {
      if (!id) return;
      await projectService.update(id, { tileCalculation: tileConfig });
      await loadProject();
      setActiveTab('overview');
      alert('Configuración de losetas guardada exitosamente. Los materiales se calcularon automáticamente.');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleSavePlumbingConfig = async (plumbingConfig: any) => {
    try {
      if (!id) return;
      await projectService.update(id, { plumbingConfig });
      await loadProject();
      setActiveTab('overview');
      alert('Configuración de instalaciones hidráulicas guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleSaveTasks = async (tasks: any) => {
    try {
      if (!id) return;
      await projectService.update(id, { tasks });
      await loadProject();
      alert('Tareas guardadas exitosamente');
    } catch (error) {
      console.error('Error al guardar tareas:', error);
      alert('Error al guardar las tareas');
    }
  };

  const handleSaveElectricalConfig = async (electricalConfig: any) => {
    try {
      if (!id) return;
      await projectService.update(id, { electricalConfig });
      await loadProject();
      setActiveTab('overview');
      alert('Configuración eléctrica guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración eléctrica');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-300 mx-auto mb-4"></div>
          <p className="text-zinc-300 text-lg font-medium">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950/50 flex items-center justify-center p-4">
        <div className="bg-white/10 rounded-lg border border-white/15 shadow-2xl max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Proyecto no encontrado</h3>
            <p className="text-zinc-400 mb-6">El proyecto que buscas no existe o fue eliminado.</p>
            <Button
              onClick={() => navigate('/projects')}
              className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Volver a Proyectos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Vista General', icon: FileText },
    { id: 'status', label: 'Estado', icon: Activity },
    { id: 'tiles', label: 'Losetas', icon: Edit },
    { id: 'plumbing', label: 'Hidráulica', icon: Hammer },
    { id: 'electrical', label: 'Eléctrica', icon: Zap },
    { id: 'hydraulic_pro', label: 'Análisis Hidráulico', icon: Activity },
    { id: 'electrical_pro', label: 'Análisis Eléctrico', icon: Zap },
    { id: 'tasks', label: 'Tareas', icon: Hammer },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'systems', label: 'Sistemas', icon: Cpu },
    { id: 'additionals', label: 'Adicionales', icon: Package },
    { id: 'export', label: 'Exportar', icon: FileSpreadsheet },
  ];

  return (
    <div className="project-surface min-h-screen bg-zinc-950/50">
      {/* Header Sticky */}
      <div className="sticky top-0 z-50 bg-zinc-950/80 border-b border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Header Superior */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="group p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-300 group-hover:text-white transition-colors" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{project.name}</h1>
                <p className="text-sm text-zinc-400 font-medium">Cliente: {project.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${
                project.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30' :
                project.status === 'IN_PROGRESS' ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30' :
                'bg-white/10 text-zinc-200 border border-white/20'
              }`}>
                {project.status === 'COMPLETED' ? 'Completado' :
                 project.status === 'IN_PROGRESS' ? 'En Progreso' : 'Borrador'}
              </span>
            </div>
          </div>

          {/* Tabs Horizontales */}
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-cyan-400 text-zinc-950 shadow-sm'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>

                    {/* Indicador activo */}
                    {activeTab === tab.id && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <ImprovedOverviewTab project={project} />}
        {activeTab === 'status' && <ProjectStatus project={project} />}
        {activeTab === 'tiles' && <TileEditor project={project} onSave={handleSaveTileConfig} />}
        {activeTab === 'plumbing' && <PlumbingEditor project={project} onSave={handleSavePlumbingConfig} />}
        {activeTab === 'electrical' && id && (
          <div className="space-y-6">
            <EquipmentSelector
              projectId={id}
              selectedEquipment={(project as any).additionals || []}
              onUpdate={loadProject}
            />
          </div>
        )}
        {activeTab === 'hydraulic_pro' && id && <HydraulicAnalysisPanel projectId={id} />}
        {activeTab === 'electrical_pro' && id && <ElectricalAnalysisPanel projectId={id} />}
        {activeTab === 'tasks' && <TasksManager project={project} onSave={handleSaveTasks} />}
        {activeTab === 'roles' && <RolesManager />}
        {activeTab === 'systems' && <PoolSystemsRecommendations project={project} />}
        {activeTab === 'additionals' && <AdditionalsManager project={project} />}
        {activeTab === 'export' && <EnhancedExportManager project={project} />}
      </div>
    </div>
  );
};

const ImprovedOverviewTab: React.FC<{ project: Project }> = ({ project }) => {
  const [roles, setRoles] = React.useState<any[]>([]);
  const [additionals, setAdditionals] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadRoles();
    loadAdditionals();
  }, [project.id]);

  const loadRoles = async () => {
    try {
      const { default: api } = await import('@/services/api');
      const response = await api.get('/profession-roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const loadAdditionals = async () => {
    try {
      const additionalsService = await import('@/services/additionalsService');
      const data = await additionalsService.additionalsService.getProjectAdditionals(project.id);
      setAdditionals(data);
    } catch (error) {
      console.error('Error al cargar adicionales:', error);
      setAdditionals([]);
    }
  };

  const tasks = project.tasks as any;
  const hasTasks = tasks && Object.keys(tasks).length > 0;

  // Calcular costos por rol basado en tareas asignadas
  const rolesCostSummary = React.useMemo(() => {
    const summary: Record<string, { hours: number; cost: number; tasksCount: number }> = {};

    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            if (task.assignedRoleId) {
              if (!summary[task.assignedRoleId]) {
                summary[task.assignedRoleId] = { hours: 0, cost: 0, tasksCount: 0 };
              }
              summary[task.assignedRoleId].hours += task.estimatedHours || 0;
              summary[task.assignedRoleId].cost += task.laborCost || 0;
              summary[task.assignedRoleId].tasksCount += 1;
            }
          });
        } else if (categoryTasks && typeof categoryTasks === 'object' && (categoryTasks as any).assignedRoleId) {
          const singleTask = categoryTasks as any;
          if (!summary[singleTask.assignedRoleId]) {
            summary[singleTask.assignedRoleId] = { hours: 0, cost: 0, tasksCount: 0 };
          }
          summary[singleTask.assignedRoleId].hours += singleTask.estimatedHours || 0;
          summary[singleTask.assignedRoleId].cost += singleTask.laborCost || 0;
          summary[singleTask.assignedRoleId].tasksCount += 1;
        }
      });
    }

    return summary;
  }, [tasks, hasTasks]);

  return <ImprovedOverview project={project} roles={roles} rolesCostSummary={rolesCostSummary} additionals={additionals} />;
};

// Componente auxiliar no usado (puede eliminarse)
const OldOverviewTab: React.FC<{ project: Project }> = ({ project }) => {
  const materials = project.materials as any;
  const hasMaterials = materials && Object.keys(materials).length > 0;
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
  const hasElectroweldedMesh = materials?.electroweldedMesh?.quantity > 0;
  const tasks = project.tasks as any;
  const hasTasks = tasks && Object.keys(tasks).length > 0;
  const additionals = (project as any).additionals || [];
  const hasAdditionals = additionals.length > 0;

  // Calcular costos de adicionales
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

  // Calcular costos de plomería
  const plumbingCosts = hasPlumbing
    ? plumbingConfig.selectedItems.reduce((sum: number, item: any) =>
        sum + (item.quantity * item.pricePerUnit), 0)
    : 0;

  // Calcular costos de instalación eléctrica
  const electricalCosts = hasElectrical && electricalConfig.items
    ? electricalConfig.items.reduce((sum: number, item: any) =>
        sum + (item.pricePerUnit ? item.pricePerUnit * item.quantity : 0), 0)
    : 0;

  // Costos totales
  const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts + electricalCosts;
  const totalLaborCost = project.laborCost + additionalsCosts.laborCost;
  const grandTotal = totalMaterialCost + totalLaborCost;

  // Calcular caños si hay configuración de plomería
  const pipeCalculation = hasPlumbing && plumbingConfig.distanceToEquipment
    ? plumbingCalculationService.calculateFromProject(project, plumbingConfig.distanceToEquipment)
    : null;

  // Calcular costos por rol basado en tareas asignadas
  const rolesCostSummary = React.useMemo(() => {
    const summary: Record<string, { hours: number; cost: number; tasksCount: number }> = {};

    if (hasTasks) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            if (task.assignedRoleId) {
              if (!summary[task.assignedRoleId]) {
                summary[task.assignedRoleId] = { hours: 0, cost: 0, tasksCount: 0 };
              }
              summary[task.assignedRoleId].hours += task.estimatedHours || 0;
              summary[task.assignedRoleId].cost += task.laborCost || 0;
              summary[task.assignedRoleId].tasksCount += 1;
            }
          });
        } else if (categoryTasks && typeof categoryTasks === 'object' && (categoryTasks as any).assignedRoleId) {
          // Soporte para formato antiguo (objeto en lugar de array)
          const singleTask = categoryTasks as any;
          if (!summary[singleTask.assignedRoleId]) {
            summary[singleTask.assignedRoleId] = { hours: 0, cost: 0, tasksCount: 0 };
          }
          summary[singleTask.assignedRoleId].hours += singleTask.estimatedHours || 0;
          summary[singleTask.assignedRoleId].cost += singleTask.laborCost || 0;
          summary[singleTask.assignedRoleId].tasksCount += 1;
        }
      });
    }

    return summary;
  }, [tasks, hasTasks]);

  const totalRolesCost = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.cost, 0);
  const totalRolesHours = Object.values(rolesCostSummary).reduce((sum, role) => sum + role.hours, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="font-medium">{project.clientName}</p>
          </div>
          {project.clientEmail && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{project.clientEmail}</p>
            </div>
          )}
          {project.clientPhone && (
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium">{project.clientPhone}</p>
            </div>
          )}
          {project.location && (
            <div>
              <p className="text-sm text-gray-600">Ubicación</p>
              <p className="font-medium">{project.location}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <h3 className="text-lg font-semibold mb-4">Especificaciones de la Piscina</h3>
        {project.poolPreset && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Modelo</p>
              <p className="font-medium text-lg">{project.poolPreset.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dimensiones</p>
              <p className="font-medium">{project.poolPreset.length}m x {project.poolPreset.width}m x {project.poolPreset.depth}m</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volumen</p>
              <p className="font-medium">{project.volume.toFixed(2)} m³</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Perímetro</p>
              <p className="font-medium">{project.perimeter.toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Excavación</p>
              <p className="font-medium">{project.excavationLength}m x {project.excavationWidth}m x {project.excavationDepth}m</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Área Espejo de Agua</p>
              <p className="font-medium">{project.waterMirrorArea.toFixed(2)} m²</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Retornos</p>
              <p className="font-medium">{project.poolPreset.returnsCount} unidades</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Skimmers</p>
              <p className="font-medium">{project.poolPreset.skimmerCount} unidades</p>
            </div>
          </div>
        )}
      </Card>

      {hasMaterials && (
        <>
          {/* Losetas Calculadas */}
          {materials.tiles && Array.isArray(materials.tiles) && materials.tiles.length > 0 && (
            <Card className="lg:col-span-3">
              <h3 className="text-lg font-semibold mb-4">Losetas Calculadas</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Área de vereda: <strong>{project.sidewalkArea.toFixed(2)} m²</strong>
                </p>
              </div>
              <div className="space-y-3">
                {materials.tiles.map((tile: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          tile.type === 'first_ring'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tile.type === 'first_ring' ? 'PRIMER ANILLO' : 'FILAS ADICIONALES'}
                        </span>
                        <h5 className="font-medium">{tile.tileName}</h5>
                      </div>
                      <p className="text-lg font-bold text-primary-600">{tile.quantity} {tile.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Materiales de Vereda */}
          <Card className="lg:col-span-3">
            <h3 className="text-lg font-semibold mb-4">Materiales Calculados - Vereda</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {materials.adhesive && materials.adhesive.quantity > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Pegamento</p>
                  <p className="font-semibold text-lg">{materials.adhesive.quantity} {materials.adhesive.unit}</p>
                </div>
              )}
              {materials.cement && materials.cement.quantity > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Cemento</p>
                  <p className="font-semibold text-lg">{materials.cement.quantity} {materials.cement.unit}</p>
                </div>
              )}
              {materials.sand && parseFloat(materials.sand.quantity) > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Arena</p>
                  <p className="font-semibold text-lg">{materials.sand.quantity} {materials.sand.unit}</p>
                </div>
              )}
              {materials.gravel && parseFloat(materials.gravel.quantity) > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Piedra</p>
                  <p className="font-semibold text-lg">{materials.gravel.quantity} {materials.gravel.unit}</p>
                </div>
              )}
              {materials.whiteCement && materials.whiteCement.quantity > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Cemento Blanco</p>
                  <p className="font-semibold text-lg">{materials.whiteCement.quantity} {materials.whiteCement.unit}</p>
                </div>
              )}
              {materials.marmolina && materials.marmolina.quantity > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Marmolina</p>
                  <p className="font-semibold text-lg">{materials.marmolina.quantity} {materials.marmolina.unit}</p>
                </div>
              )}
              {materials.wireMesh && materials.wireMesh.quantity > 0 && !hasElectroweldedMesh && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Malla Metálica</p>
                  <p className="font-semibold text-lg">{materials.wireMesh.quantity} {materials.wireMesh.unit}</p>
                  {getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m') && (
                    <p className="text-xs text-gray-500">{getMeshSheetLabel(materials.wireMesh.quantity, materials.wireMesh.unit, wireMeshSheetM2, '2x3m')}</p>
                  )}
                </div>
              )}
              {materials.waterproofing && materials.waterproofing.quantity > 0 && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Impermeabilizante</p>
                  <p className="font-semibold text-lg">{materials.waterproofing.quantity} {materials.waterproofing.unit}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Materiales de Cama Interna */}
          <Card className="lg:col-span-3">
            <h3 className="text-lg font-semibold mb-4">Materiales Calculados - Cama Interna</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {materials.geomembrane && materials.geomembrane.quantity > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Geomembrana</p>
                  <p className="font-semibold text-lg">{materials.geomembrane.quantity} {materials.geomembrane.unit}</p>
                </div>
              )}
              {materials.electroweldedMesh && materials.electroweldedMesh.quantity > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Malla Electrosoldada</p>
                  <p className="font-semibold text-lg">{materials.electroweldedMesh.quantity} {materials.electroweldedMesh.unit}</p>
                  {getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m') && (
                    <p className="text-xs text-green-600">{getMeshSheetLabel(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, electroweldedMeshSheetM2, '2x6m')}</p>
                  )}
                </div>
              )}
              {materials.sandForBed && parseFloat(materials.sandForBed.quantity) > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Arena para Cama</p>
                  <p className="font-semibold text-lg">{materials.sandForBed.quantity} {materials.sandForBed.unit}</p>
                </div>
              )}
              {materials.cementBags && materials.cementBags.quantity > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Cemento</p>
                  <p className="font-semibold text-lg">{materials.cementBags.quantity} {materials.cementBags.unit}</p>
                  <p className="text-xs text-green-600">({materials.cementKg?.quantity || 0} kg)</p>
                </div>
              )}
              {materials.drainStone && parseFloat(materials.drainStone.quantity) > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Piedra Drenaje</p>
                  <p className="font-semibold text-lg">{materials.drainStone.quantity} {materials.drainStone.unit}</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Plomería */}
      {hasPlumbing && (
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">Instalaciones Hidráulicas</h3>
          {plumbingConfig.distanceToEquipment && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-800">
                Distancia a cabecera: <strong>{plumbingConfig.distanceToEquipment} metros</strong>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {plumbingConfig.selectedItems.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  {item.diameter && <p className="text-sm text-gray-600">Ø {item.diameter}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.quantity} unidades</p>
                  <p className="text-sm text-gray-600">${(item.pricePerUnit * item.quantity).toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cálculo de Caños */}
          {pipeCalculation && (
            <div className="mt-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
              <h4 className="font-semibold text-cyan-900 mb-3">Caños Calculados Automáticamente</h4>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/70 p-2 rounded">
                  <p className="text-xs text-cyan-700">Distancia Máx.</p>
                  <p className="text-lg font-bold text-cyan-900">{pipeCalculation.summary.maxDistance}m</p>
                </div>
                <div className="bg-white/70 p-2 rounded">
                  <p className="text-xs text-cyan-700">Accesorios</p>
                  <p className="text-lg font-bold text-cyan-900">{pipeCalculation.summary.totalAccessories}</p>
                </div>
                <div className="bg-white/70 p-2 rounded">
                  <p className="text-xs text-cyan-700">Total Caños</p>
                  <p className="text-lg font-bold text-cyan-900">{pipeCalculation.summary.totalMeters}m</p>
                </div>
              </div>

              <div className="space-y-2">
                {pipeCalculation.pipeRequirements.map((req, idx) => (
                  <div key={idx} className="bg-white/70 p-2 rounded text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded mr-2 ${
                          req.lineType === 'SUCCION' ? 'bg-blue-200 text-blue-900' :
                          req.lineType === 'RETORNO' ? 'bg-green-200 text-green-900' :
                          req.lineType === 'HIDROJET' ? 'bg-purple-200 text-purple-900' :
                          'bg-orange-200 text-orange-900'
                        }`}>
                          {req.lineType}
                        </span>
                        <span className="text-gray-700">{req.diameter}</span>
                      </div>
                      <span className="font-bold text-cyan-900">{req.totalMeters}m</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-cyan-700 mt-3 italic">
                Cálculo basado en distancia máxima desde extremo más alejado + 15% para conexiones
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Instalación Eléctrica */}
      {hasElectrical && (
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">Instalación Eléctrica</h3>

          {/* Resumen de cálculos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Potencia Total</p>
              <p className="text-2xl font-bold text-yellow-900">
                {electricalConfig.totalWatts || 0} W
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Amperaje Total</p>
              <p className="text-2xl font-bold text-yellow-900">
                {((electricalConfig.totalWatts || 0) / 220).toFixed(2)} A
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Cable Recomendado</p>
              <p className="text-xl font-bold text-yellow-900">
                {electricalConfig.recommendedCableSection || 'N/A'}
              </p>
            </div>
          </div>

          {/* Items eléctricos */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 mb-2">Items Eléctricos</h4>
            {electricalConfig.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Potencia: {item.watts}W</span>
                    <span>Voltaje: {item.voltage}V</span>
                    <span>Cantidad: {item.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-yellow-600">
                    {(item.watts * item.quantity)} W total
                  </p>
                  <p className="text-sm text-gray-600">
                    {((item.watts * item.quantity) / item.voltage).toFixed(2)} A
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tareas */}
      {hasTasks && (
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">Resumen de Tareas</h3>

          {/* Resumen de costos de tareas */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-indigo-700">Horas Totales Estimadas</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {Object.values(tasks).reduce((acc: number, task: any) => {
                    return acc + (task?.estimatedHours || 0);
                  }, 0)} hs
                </p>
              </div>
              <div>
                <p className="text-sm text-indigo-700">Costo Total Mano de Obra</p>
                <p className="text-2xl font-bold text-indigo-900">
                  ${Object.values(tasks).reduce((acc: number, task: any) => {
                    return acc + (task?.laborCost || 0);
                  }, 0).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de tareas por categoría */}
          <div className="space-y-3">
            {Object.entries(tasks).map(([key, task]: [string, any]) => {
              if (!task || !task.name) return null;

              const categoryLabels: Record<string, string> = {
                excavation: 'Excavación',
                hydraulic: 'Instalación Hidráulica',
                floor: 'Solado y Cama',
                electrical: 'Instalación Eléctrica',
                tiles: 'Colocación de Losetas',
                finishes: 'Terminaciones'
              };

              return (
                <div key={key} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{categoryLabels[key] || key}</h4>
                      <p className="text-sm text-gray-600">{task.name}</p>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {task.estimatedHours && (
                        <p className="text-sm font-semibold text-gray-700">
                          {task.estimatedHours} hs
                        </p>
                      )}
                      {task.laborCost && (
                        <p className="text-sm font-bold text-indigo-600">
                          ${task.laborCost.toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Materiales de la tarea */}
                  {task.materials && task.materials.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-300">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Materiales:</p>
                      <div className="space-y-1">
                        {task.materials.map((material: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{material.name}</span>
                            <span>{material.quantity} {material.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Roles y Mano de Obra */}
      {roles.length > 0 && (
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">Roles y Mano de Obra</h3>

          {/* Resumen general */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-purple-700">Roles Configurados</p>
                <p className="text-2xl font-bold text-purple-900">{roles.length}</p>
              </div>
              <div>
                <p className="text-sm text-purple-700">Horas Totales Asignadas</p>
                <p className="text-2xl font-bold text-purple-900">{totalRolesHours.toFixed(1)} hs</p>
              </div>
              <div>
                <p className="text-sm text-purple-700">Costo Total Mano de Obra</p>
                <p className="text-2xl font-bold text-purple-900">${totalRolesCost.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>

          {/* Lista de roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role: any) => {
              const roleSummary = rolesCostSummary[role.id] || { hours: 0, cost: 0, tasksCount: 0 };
              const hasAssignedTasks = roleSummary.tasksCount > 0;

              return (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border-2 ${
                    hasAssignedTasks
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{role.name}</h4>
                    {hasAssignedTasks && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-600 text-white">
                        {roleSummary.tasksCount} tareas
                      </span>
                    )}
                  </div>

                  {role.description && (
                    <p className="text-xs text-gray-600 mb-3">{role.description}</p>
                  )}

                  <div className="space-y-2 mb-3">
                    {role.hourlyRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tarifa/hora</span>
                        <span className="font-medium">${role.hourlyRate.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {role.dailyRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tarifa/día</span>
                        <span className="font-medium">${role.dailyRate.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>

                  {hasAssignedTasks && (
                    <div className="pt-3 border-t border-purple-200">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-purple-700 font-medium">Horas asignadas</span>
                        <span className="font-bold text-purple-900">{roleSummary.hours.toFixed(1)} hs</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700 font-medium">Costo total</span>
                        <span className="font-bold text-purple-900">${roleSummary.cost.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  )}

                  {!hasAssignedTasks && (
                    <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
                      Sin tareas asignadas
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Materiales y Equipamiento Adicional */}
      {hasAdditionals && (
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">Materiales y Equipamiento Adicional</h3>

          {/* Resumen de costos de adicionales */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-teal-700">Costo Materiales Adicionales</p>
                <p className="text-2xl font-bold text-teal-900">
                  ${additionalsCosts.materialCost.toLocaleString('es-AR')}
                </p>
              </div>
              {additionalsCosts.laborCost > 0 && (
                <div>
                  <p className="text-sm text-teal-700">Costo Mano de Obra Adicional</p>
                  <p className="text-2xl font-bold text-teal-900">
                    ${additionalsCosts.laborCost.toLocaleString('es-AR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de adicionales */}
          <div className="space-y-2">
            {additionals.map((additional: any) => {
              const getItemName = () => {
                if (additional.customName) return additional.customName;
                if (additional.accessory) return additional.accessory.name;
                if (additional.equipment) return additional.equipment.name;
                if (additional.material) return additional.material.name;
                return 'Sin nombre';
              };

              const getItemType = () => {
                if (additional.customCategory) return `Personalizado - ${additional.customCategory}`;
                if (additional.accessory) return 'Accesorio';
                if (additional.equipment) return 'Equipamiento';
                if (additional.material) return 'Material';
                return '';
              };

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

              const totalCost = materialCost + laborCost;

              return (
                <div key={additional.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{getItemName()}</p>
                        <span className="px-2 py-0.5 text-xs rounded bg-teal-100 text-teal-800">
                          {getItemType()}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Cantidad: {quantity} {additional.customUnit || 'unidades'}</span>
                        {materialCost > 0 && <span>Material: ${materialCost.toLocaleString('es-AR')}</span>}
                        {laborCost > 0 && <span>M.O.: ${laborCost.toLocaleString('es-AR')}</span>}
                      </div>
                      {additional.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{additional.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600">
                        ${totalCost.toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
