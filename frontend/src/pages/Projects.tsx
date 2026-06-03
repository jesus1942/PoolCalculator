import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import { Project, PoolPreset, ProjectStatus } from '@/types';
import { calculateProjectFinancials } from '@/utils/projectCosting';
import { buildProjectAutoConfigurations } from '@/utils/presetAutoConfig';
import { HdPlus, HdEdit, HdTrash, HdEye, HdFileText, HdFolderOpen, HdWaves, HdCheck, HdClock, HdAlertTriangle, HdX } from '@/components/ui/HandDrawnIcons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BASE_URL = API_URL.replace('/api', '');

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [poolPresets, setPoolPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    location: '',
    poolPresetId: '',
    includeBaseEquipment: true,
    status: 'DRAFT' as ProjectStatus,
  });

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const loadData = async () => {
    try {
      setDeleteError(null);
      const projectsData = await projectService.getAll();
      setProjects(projectsData);

      if (user?.role !== 'VIEWER' && user?.role !== 'INSTALLER') {
        try {
          const presetsData = await poolPresetService.getAll();
          setPoolPresets(presetsData);
        } catch (presetError) {
          console.error('Error al cargar modelos de piscina:', presetError);
          setPoolPresets([]);
        }
      }
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedPreset = poolPresets.find((preset) => preset.id === formData.poolPresetId);

      if (editingProject) {
        const payload: Record<string, unknown> = {
          name: formData.name.trim(),
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim() || null,
          clientPhone: formData.clientPhone.trim() || null,
          location: formData.location.trim() || null,
          status: formData.status,
        };

        if (formData.poolPresetId && formData.poolPresetId !== editingProject.poolPresetId) {
          payload.poolPresetId = formData.poolPresetId;
          if (selectedPreset) {
            Object.assign(payload, buildProjectAutoConfigurations(selectedPreset));
          }
        }

        await projectService.update(editingProject.id, payload as Partial<Project>);
      } else {
        const createdProject = await projectService.create(formData);
        if (selectedPreset) {
          await projectService.update(createdProject.id, buildProjectAutoConfigurations(selectedPreset) as Partial<Project>);
        }
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      clientName: project.clientName,
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
      location: project.location || '',
      poolPresetId: project.poolPresetId,
      includeBaseEquipment: true,
      status: project.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setProjectPendingDelete(projects.find((project) => project.id === id) || null);
  };

  const confirmDelete = async () => {
    if (!projectPendingDelete) return;

    try {
      setDeletingProjectId(projectPendingDelete.id);
      await projectService.delete(projectPendingDelete.id);
      setProjectPendingDelete(null);
      await loadData();
    } catch (error: any) {
      console.error('Error al eliminar proyecto:', error);
      setDeleteError(error?.response?.data?.error || 'No se pudo eliminar el proyecto');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingProjectId) return;
    setProjectPendingDelete(null);
  };

  const dismissDeleteError = () => {
    setDeleteError(null);
  };

  const handleView = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      location: '',
      poolPresetId: '',
      includeBaseEquipment: true,
      status: 'DRAFT',
    });
  };
  const selectedPoolPreset = poolPresets.find((preset) => preset.id === formData.poolPresetId);

  const statusOptions = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'BUDGETED', label: 'Presupuestado' },
    { value: 'APPROVED', label: 'Aprobado' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
  ];

  const getStatusColor = (status: ProjectStatus) => {
    const colors = {
      DRAFT: 'bg-white/10 text-zinc-200 border border-white/20',
      BUDGETED: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
      APPROVED: 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30',
      IN_PROGRESS: 'bg-indigo-500/15 text-indigo-200 border border-indigo-400/30',
      COMPLETED: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
      CANCELLED: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
    };
    return colors[status] || colors.DRAFT;
  };

  const getStatusIcon = (status: ProjectStatus) => {
    const icons = {
      DRAFT: HdFileText,
      BUDGETED: HdAlertTriangle,
      APPROVED: HdCheck,
      IN_PROGRESS: HdClock,
      COMPLETED: HdCheck,
      CANCELLED: HdX,
    };
    return icons[status] || icons.DRAFT;
  };

  const getStatusLabel = (status: ProjectStatus) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const canCreateProjects = user?.role !== 'VIEWER' && user?.role !== 'INSTALLER';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {deleteError && !projectPendingDelete && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-start justify-between gap-4">
              <p>{deleteError}</p>
              <button
                type="button"
                onClick={dismissDeleteError}
                className="shrink-0 text-rose-500 transition-colors hover:text-rose-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <HdFolderOpen size={24} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Proyectos
                </h1>
                <p className="mt-1 text-sm sm:text-base text-gray-600">Administra todos tus proyectos de piscinas</p>
              </div>
            </div>
            {canCreateProjects && (
              <button
                onClick={() => setShowModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-white font-medium shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700 sm:w-auto"
              >
                <HdPlus size={20} />
                <span>Nuevo Proyecto</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-white/10 rounded-xl border border-white/15 shadow-2xl">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <HdFolderOpen size={32} className="h-8 w-8 text-zinc-300" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No tenes proyectos todavia
              </h3>
              <p className="text-zinc-300 mb-8 max-w-md mx-auto">
                Empieza creando tu primer proyecto de piscina y gestiona todos los detalles de construccion
              </p>
              {canCreateProjects && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 inline-flex items-center gap-2 shadow-lg"
                >
                  <HdPlus size={20} />
                  <span>Crear Primer Proyecto</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const StatusIcon = getStatusIcon(project.status);
              const canViewFinancials = project.currentUserAccess?.canViewFinancials ?? true;
              const canEditProject = project.currentUserAccess?.canEdit ?? canCreateProjects;
              const canDeleteProject = project.currentUserAccess?.canDelete ?? canEditProject;
              const financials = canViewFinancials ? calculateProjectFinancials(project) : null;
              const materialCost = financials?.totalMaterialCost || 0;
              const laborCost = financials?.totalLaborCost || 0;
              const totalCost = financials?.grandTotal || 0;
              const poolDepthLabel = project.poolPreset?.depthEnd && project.poolPreset.depthEnd !== project.poolPreset.depth
                ? `${project.poolPreset.depth}m a ${project.poolPreset.depthEnd}m`
                : `${project.poolPreset?.depth}m`;
              return (
                <div
                  key={project.id}
                  className="group relative bg-white/10 rounded-xl border border-white/15 hover:border-cyan-400/40 shadow-2xl transition-all duration-200"
                >
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-zinc-300">{project.clientName}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 flex-shrink-0 ${getStatusColor(project.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        {getStatusLabel(project.status)}
                      </span>
                    </div>

                    {/* Pool Preset Info */}
                    {project.poolPreset && (
                      <div className="border-t border-white/20 pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HdWaves size={16} className="h-4 w-4 text-cyan-300" />
                          <p className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Modelo de Piscina</p>
                        </div>
                        <p className="font-semibold text-white">{project.poolPreset.name}</p>
                        <p className="text-sm text-zinc-300 mt-1">
                          {project.poolPreset.length}m × {project.poolPreset.width}m × {poolDepthLabel}
                        </p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="border-t border-white/20 pt-4 grid grid-cols-1 gap-3">
                      {project.location && (
                        <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                          <p className="text-xs text-zinc-300 mb-1 font-medium">Ubicacion</p>
                          <p className="font-medium text-white text-sm truncate">{project.location}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-white/20 sm:flex-row">
                      <button
                        onClick={() => handleView(project.id)}
                        className="flex-1 px-4 py-2 bg-cyan-400 text-zinc-950 font-semibold rounded-lg hover:bg-cyan-300 transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <HdEye size={16} />
                        <span>Ver</span>
                      </button>
                      {canEditProject && (
                        <>
                          <button
                            onClick={() => handleEdit(project)}
                            className="px-4 py-2 bg-white/10 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors duration-200 border border-white/20"
                          >
                            <HdEdit size={16} />
                          </button>
                          {canDeleteProject && (
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="px-4 py-2 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 rounded-lg transition-colors duration-200 border border-rose-400/30"
                            >
                              <HdTrash size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Informacion del Proyecto</h3>
              <div className="space-y-4">
                <Input
                  label="Nombre del Proyecto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Piscina Familia Gonzalez"
                />

                <Select
                  label="Modelo de Piscina"
                  options={[
                    { value: '', label: 'Selecciona un modelo' },
                    ...poolPresets.map(p => ({ value: p.id, label: `${p.name} (${p.length}x${p.width}x${p.depth}m)` }))
                  ]}
                  value={formData.poolPresetId}
                  onChange={(e) => setFormData({ ...formData, poolPresetId: e.target.value })}
                  required
                />

                <Select
                  label="Estado"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                />

                {selectedPoolPreset && (selectedPoolPreset.defaultPump || selectedPoolPreset.defaultFilter) && !editingProject && (
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-cyan-900">Equipamiento base del modelo</p>
                        <p className="mt-1 text-sm text-cyan-800">
                          {selectedPoolPreset.defaultPump?.name || 'Sin bomba'} · {selectedPoolPreset.defaultFilter?.name || 'Sin filtro'}
                        </p>
                        <p className="mt-2 text-xs text-cyan-700">
                          Desactivá esta opción si querés crear el proyecto como casco solo.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-cyan-900">
                        <input
                          type="checkbox"
                          checked={formData.includeBaseEquipment}
                          onChange={(e) => setFormData({ ...formData, includeBaseEquipment: e.target.checked })}
                          className="rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        Incluir base
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Informacion del Cliente</h3>
              <div className="space-y-4">
                <Input
                  label="Nombre del Cliente"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                  placeholder="Nombre completo"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Email (opcional)"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="cliente@ejemplo.com"
                  />

                  <Input
                    label="Telefono (opcional)"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>

                <Input
                  label="Ubicacion (opcional)"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Direccion de la obra"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              <Button type="submit" className="flex-1">
                {editingProject ? 'Actualizar' : 'Crear Proyecto'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={Boolean(projectPendingDelete)}
          onClose={closeDeleteModal}
          title="Eliminar Proyecto"
          size="sm"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-zinc-200">
                Vas a eliminar <strong className="text-white">{projectPendingDelete?.name}</strong>.
              </p>
              <p className="text-sm text-zinc-400">
                Esta acción no se puede deshacer.
              </p>
              {deleteError && (
                <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingProjectId)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDelete}
                disabled={Boolean(deletingProjectId)}
                className="flex-1"
              >
                {deletingProjectId ? 'Eliminando...' : 'Eliminar Proyecto'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
