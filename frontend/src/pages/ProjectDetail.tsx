import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TileEditor } from '@/components/TileEditor';
import { PlumbingEditor } from '@/components/PlumbingEditor';
import { RolesManager } from '@/components/RolesManager';
import { TasksManager } from '@/components/TasksManager';
import { AdditionalsManager } from '@/components/AdditionalsManager';
import { PoolSystemsRecommendations } from '@/components/PoolSystemsRecommendations';
import { EnhancedExportManager } from '@/components/EnhancedExportManager';
import { EquipmentSelector } from '@/components/EquipmentSelector';
import { ProjectStatus as ProjectStatusPanel } from '@/components/ProjectStatus';
import { ImprovedOverview } from '@/components/ImprovedOverview';
import { HydraulicAnalysisPanel } from '@/components/HydraulicAnalysisPanel';
import { ElectricalAnalysisPanel } from '@/components/ElectricalAnalysisPanel';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import type { Project, ProjectStatus as ProjectStatusType, PoolPreset } from '@/types';
import {
  generateElectricalConfigFromPresetWithAdditionals,
  generatePlumbingConfigFromPresetWithAdditionals,
  generateTileConfigFromPreset
} from '@/utils/presetAutoConfig';
import { ArrowLeft, Edit, FileText, Hammer, Users, FileSpreadsheet, Package, Zap, Activity, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [poolPresets, setPoolPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProjectMeta, setSavingProjectMeta] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'status' | 'tiles' | 'plumbing' | 'electrical' | 'tasks' | 'roles' | 'systems' | 'additionals' | 'export' | 'hydraulic_pro' | 'electrical_pro'>('overview');
  const [editFormData, setEditFormData] = useState({
    name: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    location: '',
    poolPresetId: '',
    status: 'DRAFT' as ProjectStatusType,
  });

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'VIEWER' || user?.role === 'INSTALLER') return;
    poolPresetService.getAll()
      .then(setPoolPresets)
      .catch((error) => console.error('Error al cargar modelos de piscina:', error));
  }, [user?.role]);

  const loadProject = async () => {
    try {
      if (!id) return;
      const data = await projectService.getById(id);

      try {
        const additionalsService = await import('@/services/additionalsService');
        const additionals = await additionalsService.additionalsService.getProjectAdditionals(id);
        (data as any).additionals = additionals;
      } catch (error) {
        console.log('No se pudieron cargar los adicionales:', error);
        (data as any).additionals = [];
      }

      if (data.poolPreset && id) {
        let needsUpdate = false;
        const updates: any = {};
        const additionals = (data as any).additionals || [];

        if (!data.electricalConfig || Object.keys(data.electricalConfig).length === 0) {
          updates.electricalConfig = generateElectricalConfigFromPresetWithAdditionals(
            data.poolPreset,
            additionals
          );
          needsUpdate = true;
          console.log('[Auto-config] Configuración eléctrica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        if (!data.plumbingConfig || Object.keys(data.plumbingConfig).length === 0) {
          updates.plumbingConfig = generatePlumbingConfigFromPresetWithAdditionals(
            data.poolPreset,
            additionals
          );
          needsUpdate = true;
          console.log('[Auto-config] Configuración hidráulica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        if (!data.tileCalculation || Object.keys(data.tileCalculation).length === 0) {
          updates.tileCalculation = generateTileConfigFromPreset(data.poolPreset);
          needsUpdate = true;
          console.log('[Auto-config] Configuración de losetas generada desde modelo', data.poolPreset.name);
        }

        if (needsUpdate) {
          try {
            await projectService.update(id, updates);
            const updatedData = await projectService.getById(id);
            setProject(updatedData);
            console.log('[Auto-config] Configuraciones guardadas automáticamente');
            return;
          } catch (error) {
            console.error('Error al guardar configuraciones automáticas:', error);
          }
        }
      }

      setProject(data);
      setEditFormData({
        name: data.name,
        clientName: data.clientName,
        clientEmail: data.clientEmail || '',
        clientPhone: data.clientPhone || '',
        location: data.location || '',
        poolPresetId: data.poolPresetId,
        status: data.status,
      });
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

  const handleUpdateProjectSettings = async (exportSettings: Record<string, unknown>) => {
    if (!id) return;
    await projectService.update(id, { exportSettings });
    await loadProject();
  };

  const handleSaveProjectMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;

    try {
      setSavingProjectMeta(true);
      const payload: Record<string, unknown> = {
        name: editFormData.name.trim(),
        clientName: editFormData.clientName.trim(),
        clientEmail: editFormData.clientEmail.trim() || null,
        clientPhone: editFormData.clientPhone.trim() || null,
        location: editFormData.location.trim() || null,
        status: editFormData.status,
      };

      if (editFormData.poolPresetId && editFormData.poolPresetId !== project.poolPresetId) {
        payload.poolPresetId = editFormData.poolPresetId;
      }

      await projectService.update(id, payload as Partial<Project>);
      await loadProject();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error al actualizar proyecto:', error);
      alert('No se pudo actualizar el proyecto');
    } finally {
      setSavingProjectMeta(false);
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

  const readOnlyRoles = ['VIEWER', 'INSTALLER'];
  const isReadOnlyProjectUser = readOnlyRoles.includes(user?.role || '');
  const projectStatusOptions = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'BUDGETED', label: 'Presupuestado' },
    { value: 'APPROVED', label: 'Aprobado' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];
  const currentStatusLabel = projectStatusOptions.find((option) => option.value === project.status)?.label || project.status;
  const currentStatusClass =
    project.status === 'COMPLETED'
      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
      : project.status === 'IN_PROGRESS'
        ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
        : project.status === 'BUDGETED'
          ? 'bg-blue-500/15 text-blue-200 border border-blue-400/30'
          : project.status === 'APPROVED'
            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30'
            : project.status === 'CANCELLED'
              ? 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
              : 'bg-white/10 text-zinc-200 border border-white/20';

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
  ].filter((tab) => {
    if (!isReadOnlyProjectUser) return true;
    return ['overview', 'status', 'export'].includes(tab.id);
  });

  return (
    <div className="project-surface min-h-screen bg-zinc-950/50">
      <div className="sticky top-0 z-50 bg-zinc-950/80 border-b border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              <span className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${currentStatusClass}`}>
                {currentStatusLabel}
              </span>
              {!isReadOnlyProjectUser && (
                <Button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/15"
                >
                  Editar ficha
                </Button>
              )}
            </div>
          </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <ImprovedOverviewTab project={project} />}
        {activeTab === 'status' && <ProjectStatusPanel project={project} />}
        {activeTab === 'tiles' && !isReadOnlyProjectUser && <TileEditor project={project} onSave={handleSaveTileConfig} />}
        {activeTab === 'plumbing' && !isReadOnlyProjectUser && <PlumbingEditor project={project} onSave={handleSavePlumbingConfig} />}
        {activeTab === 'electrical' && id && !isReadOnlyProjectUser && (
          <div className="space-y-6">
            <EquipmentSelector
              projectId={id}
              selectedEquipment={(project as any).additionals || []}
              onUpdate={loadProject}
            />
          </div>
        )}
        {activeTab === 'hydraulic_pro' && id && !isReadOnlyProjectUser && <HydraulicAnalysisPanel projectId={id} />}
        {activeTab === 'electrical_pro' && id && !isReadOnlyProjectUser && <ElectricalAnalysisPanel projectId={id} />}
        {activeTab === 'tasks' && !isReadOnlyProjectUser && (
          <TasksManager
            project={project}
            onSave={handleSaveTasks}
            onUpdateProjectSettings={handleUpdateProjectSettings}
          />
        )}
        {activeTab === 'roles' && !isReadOnlyProjectUser && <RolesManager />}
        {activeTab === 'systems' && !isReadOnlyProjectUser && <PoolSystemsRecommendations project={project} />}
        {activeTab === 'additionals' && !isReadOnlyProjectUser && <AdditionalsManager project={project} onUpdate={loadProject} />}
        {activeTab === 'export' && <EnhancedExportManager project={project} />}
      </div>

      {!isReadOnlyProjectUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Proyecto"
          size="lg"
        >
          <form onSubmit={handleSaveProjectMeta} className="space-y-5">
            <Input
              label="Nombre del proyecto"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />

            <Select
              label="Modelo de piscina"
              options={[
                { value: '', label: 'Selecciona un modelo' },
                ...poolPresets.map((preset) => ({
                  value: preset.id,
                  label: `${preset.name} (${preset.length}x${preset.width}x${preset.depth}m)`,
                })),
              ]}
              value={editFormData.poolPresetId}
              onChange={(e) => setEditFormData({ ...editFormData, poolPresetId: e.target.value })}
              required
            />

            <Select
              label="Estado"
              options={projectStatusOptions}
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as ProjectStatusType })}
            />

            <Input
              label="Cliente"
              value={editFormData.clientName}
              onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={editFormData.clientEmail}
                onChange={(e) => setEditFormData({ ...editFormData, clientEmail: e.target.value })}
              />
              <Input
                label="Teléfono"
                value={editFormData.clientPhone}
                onChange={(e) => setEditFormData({ ...editFormData, clientPhone: e.target.value })}
              />
            </div>

            <Input
              label="Ubicación"
              value={editFormData.location}
              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingProjectMeta}>
                {savingProjectMeta ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
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
