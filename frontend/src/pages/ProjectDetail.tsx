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
import type { Project, ProjectStatus as ProjectStatusType, PoolPreset, ProjectTabId } from '@/types';
import {
  buildProjectAutoConfigurations,
} from '@/utils/presetAutoConfig';
import { HdArrowLeft, HdEdit, HdFileText, HdUsers, HdPackage, HdZap, HdActivity, HdAlertTriangle } from '@/components/ui/HandDrawnIcons';
import { Hammer, FileSpreadsheet, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DAILY_UPDATE_EXCLUDED_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

const toProjectDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastProjectUpdateDate = (project: Project): Date | null => {
  const lastUpdateAt = project.lastProjectUpdateAt || project.projectUpdates?.[0]?.createdAt;
  if (!lastUpdateAt) return null;

  const parsed = new Date(lastUpdateAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [poolPresets, setPoolPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProjectMeta, setSavingProjectMeta] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTabId>('overview');
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

  const hydrateProjectData = async (data: Project) => {
    const hydratedProject = { ...data } as Project & { additionals?: any[] };

    try {
      if (!id) return hydratedProject;
      const additionalsService = await import('@/services/additionalsService');
      hydratedProject.additionals = await additionalsService.additionalsService.getProjectAdditionals(id);
    } catch (error) {
      console.log('No se pudieron cargar los adicionales:', error);
      hydratedProject.additionals = [];
    }

    return hydratedProject;
  };

  const syncEditFormData = (data: Project) => {
    setEditFormData({
      name: data.name,
      clientName: data.clientName,
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      location: data.location || '',
      poolPresetId: data.poolPresetId,
      status: data.status,
    });
  };

  const loadProject = async () => {
    try {
      if (!id) return;
      const data = await hydrateProjectData(await projectService.getById(id));

      if (data.poolPreset && id) {
        let needsUpdate = false;
        const updates: any = {};
        const additionals = (data as any).additionals || [];
        const autoConfigs = buildProjectAutoConfigurations(data.poolPreset, additionals);

        const electricalConfig = data.electricalConfig as any;
        if (
          !electricalConfig ||
          Object.keys(electricalConfig).length === 0 ||
          !Array.isArray(electricalConfig.items) ||
          electricalConfig.items.length === 0 ||
          Number(electricalConfig.totalWatts ?? electricalConfig.totalPower ?? 0) <= 0
        ) {
          updates.electricalConfig = autoConfigs.electricalConfig;
          needsUpdate = true;
          console.log('[Auto-config] Configuración eléctrica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        const plumbingConfig = data.plumbingConfig as any;
        if (
          !plumbingConfig ||
          Object.keys(plumbingConfig).length === 0 ||
          typeof plumbingConfig.distanceToEquipment !== 'number'
        ) {
          updates.plumbingConfig = autoConfigs.plumbingConfig;
          needsUpdate = true;
          console.log('[Auto-config] Configuración hidráulica generada desde modelo', data.poolPreset.name, 'con', additionals.length, 'adicionales');
        }

        if (!data.tileCalculation || Object.keys(data.tileCalculation).length === 0) {
          updates.tileCalculation = autoConfigs.tileCalculation;
          needsUpdate = true;
          console.log('[Auto-config] Configuración de losetas generada desde modelo', data.poolPreset.name);
        }

        if (needsUpdate) {
          try {
            await projectService.update(id, updates);
            const updatedData = await hydrateProjectData(await projectService.getById(id));
            setProject(updatedData);
            syncEditFormData(updatedData);
            console.log('[Auto-config] Configuraciones guardadas automáticamente');
            return;
          } catch (error) {
            console.error('Error al guardar configuraciones automáticas:', error);
          }
        }
      }

      setProject(data);
      syncEditFormData(data);
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

  const handleAutoSavePlumbingConfig = async (plumbingConfig: any) => {
    try {
      if (!id) return;
      await projectService.update(id, { plumbingConfig });
      setProject((prev) => prev ? { ...prev, plumbingConfig } : prev);
    } catch (error) {
      console.error('Error al persistir configuración hidráulica:', error);
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
        const selectedPreset = poolPresets.find((preset) => preset.id === editFormData.poolPresetId);
        if (selectedPreset) {
          Object.assign(payload, buildProjectAutoConfigurations(selectedPreset, (project as any).additionals || []));
        }
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
              <HdFileText size={32} className="h-8 w-8 text-zinc-400" />
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
  const globalReadOnlyUser = readOnlyRoles.includes(user?.role || '');
  const fallbackAllowedTabs: ProjectTabId[] = globalReadOnlyUser ? ['overview', 'status', 'export'] : ['overview', 'status', 'tiles', 'plumbing', 'electrical', 'hydraulic_pro', 'electrical_pro', 'tasks', 'roles', 'systems', 'additionals', 'export'];
  const currentUserAccess = project.currentUserAccess || {
    canAccess: true,
    canEdit: !globalReadOnlyUser,
    canDelete: !globalReadOnlyUser,
    canViewFinancials: true,
    allowedTabs: fallbackAllowedTabs,
    source: globalReadOnlyUser ? 'assignment' as const : 'owner' as const,
  };
  const isReadOnlyProjectUser = !currentUserAccess.canEdit;
  const allowedTabsSet = new Set<ProjectTabId>(currentUserAccess.allowedTabs || fallbackAllowedTabs);
  const canViewFinancials = currentUserAccess.canViewFinancials;
  const lastProjectUpdateDate = getLastProjectUpdateDate(project);
  const needsDailyProjectUpdate = !DAILY_UPDATE_EXCLUDED_STATUSES.has(project.status) && (
    !lastProjectUpdateDate || toProjectDateKey(lastProjectUpdateDate) !== toProjectDateKey(new Date())
  );
  const lastProjectUpdateLabel = lastProjectUpdateDate
    ? lastProjectUpdateDate.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
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

  const allTabs: Array<{ id: ProjectTabId; label: string; icon: React.FC<any> }> = [
    { id: 'overview', label: 'Vista General', icon: HdFileText },
    { id: 'status', label: 'Estado', icon: HdActivity },
    { id: 'tiles', label: 'Losetas', icon: HdEdit },
    { id: 'plumbing', label: 'Hidráulica', icon: Hammer },
    { id: 'electrical', label: 'Eléctrica', icon: HdZap },
    { id: 'hydraulic_pro', label: 'Análisis Hidráulico', icon: HdActivity },
    { id: 'electrical_pro', label: 'Análisis Eléctrico', icon: HdZap },
    { id: 'tasks', label: 'Tareas', icon: Hammer },
    { id: 'roles', label: 'Roles', icon: HdUsers },
    { id: 'systems', label: 'Sistemas', icon: Cpu },
    { id: 'additionals', label: 'Adicionales', icon: HdPackage },
    { id: 'export', label: 'Exportar', icon: FileSpreadsheet },
  ];
  const tabs = allTabs.filter((tab) => allowedTabsSet.has(tab.id));
  const visibleActiveTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id || 'overview';

  return (
    <div className="project-surface min-h-screen bg-zinc-950/50">
      <div className="sticky top-0 z-50 bg-zinc-950/80 border-b border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="group p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                <HdArrowLeft size={20} className="h-5 w-5 text-zinc-300 group-hover:text-white transition-colors" />
              </button>
              <div className="min-w-0">
                <h1 className="mb-1 break-words text-xl font-bold text-white sm:text-2xl">{project.name}</h1>
                <p className="break-words text-sm font-medium text-zinc-400">Cliente: {project.clientName}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${currentStatusClass}`}>
                {currentStatusLabel}
              </span>
              {!isReadOnlyProjectUser && (
                <Button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="w-full border border-white/15 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                >
                  Editar ficha
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex min-w-max gap-2 pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:px-4 sm:py-2.5 sm:text-sm ${
                      visibleActiveTab === tab.id
                        ? 'bg-cyan-400 text-zinc-950 shadow-sm'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {visibleActiveTab === tab.id && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {needsDailyProjectUpdate && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-50 shadow-lg shadow-amber-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200">
                  <HdAlertTriangle size={20} className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-100">Actualización diaria pendiente</p>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Este proyecto todavía no tiene avance registrado hoy{lastProjectUpdateLabel ? `. Última actualización: ${lastProjectUpdateLabel}.` : '.'}
                  </p>
                </div>
              </div>
              {allowedTabsSet.has('status') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="rounded-xl border border-amber-300/40 bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200"
                >
                  {isReadOnlyProjectUser ? 'Ver estado' : 'Cargar avance'}
                </button>
              )}
            </div>
          </div>
        )}

        {visibleActiveTab === 'overview' && <ImprovedOverviewTab project={project} canViewFinancials={canViewFinancials} />}
        {visibleActiveTab === 'status' && <ProjectStatusPanel project={project} />}
        {visibleActiveTab === 'tiles' && !isReadOnlyProjectUser && <TileEditor project={project} onSave={handleSaveTileConfig} />}
        {visibleActiveTab === 'plumbing' && !isReadOnlyProjectUser && <PlumbingEditor project={project} onSave={handleSavePlumbingConfig} onAutoSave={handleAutoSavePlumbingConfig} />}
        {visibleActiveTab === 'electrical' && id && !isReadOnlyProjectUser && (
          <div className="space-y-6">
            <EquipmentSelector
              projectId={id}
              selectedEquipment={(project as any).additionals || []}
              onUpdate={loadProject}
            />
          </div>
        )}
        {visibleActiveTab === 'hydraulic_pro' && id && !isReadOnlyProjectUser && <HydraulicAnalysisPanel projectId={id} />}
        {visibleActiveTab === 'electrical_pro' && id && !isReadOnlyProjectUser && <ElectricalAnalysisPanel projectId={id} />}
        {visibleActiveTab === 'tasks' && !isReadOnlyProjectUser && (
          <TasksManager
            project={project}
            onSave={handleSaveTasks}
            onUpdateProjectSettings={handleUpdateProjectSettings}
          />
        )}
        {visibleActiveTab === 'roles' && !isReadOnlyProjectUser && <RolesManager />}
        {visibleActiveTab === 'systems' && !isReadOnlyProjectUser && <PoolSystemsRecommendations project={project} />}
        {visibleActiveTab === 'additionals' && !isReadOnlyProjectUser && <AdditionalsManager project={project} onUpdate={loadProject} />}
        {visibleActiveTab === 'export' && allowedTabsSet.has('export') && <EnhancedExportManager project={project} />}
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

const ImprovedOverviewTab: React.FC<{ project: Project; canViewFinancials: boolean }> = ({ project, canViewFinancials }) => {
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

  return <ImprovedOverview project={project} roles={roles} rolesCostSummary={rolesCostSummary} additionals={additionals} canViewFinancials={canViewFinancials} />;
};
