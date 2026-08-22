import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import type { Project, PoolPreset, ProjectStatus } from '@/types';
import { calculateProjectFinancials } from '@/utils/projectCosting';
import { buildProjectAutoConfigurations } from '@/utils/presetAutoConfig';
import {
  HdAlertTriangle,
  HdCheck,
  HdChevronRight,
  HdClock,
  HdEdit,
  HdFileText,
  HdFolderOpen,
  HdPlus,
  HdTrash,
  HdWaves,
  HdX,
} from '@/components/ui/HandDrawnIcons';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'BUDGETED', label: 'Presupuestado' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const STATUS_ORDER: Record<ProjectStatus, number> = {
  IN_PROGRESS: 0,
  APPROVED: 1,
  BUDGETED: 2,
  DRAFT: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

const getStatusLabel = (status: ProjectStatus) => STATUS_OPTIONS.find((item) => item.value === status)?.label || status;

const getStatusTone = (status: ProjectStatus) => {
  if (status === 'COMPLETED') return 'var(--good)';
  if (status === 'CANCELLED') return 'var(--bad)';
  if (status === 'IN_PROGRESS' || status === 'APPROVED') return 'var(--accent)';
  return 'var(--warm)';
};

const getStatusIcon = (status: ProjectStatus) => {
  if (status === 'COMPLETED' || status === 'APPROVED') return HdCheck;
  if (status === 'IN_PROGRESS') return HdClock;
  if (status === 'CANCELLED') return HdX;
  if (status === 'BUDGETED') return HdAlertTriangle;
  return HdFileText;
};

const currency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const ProjectsV2: React.FC = () => {
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
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | ProjectStatus>('ACTIVE');
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

  const canCreateProjects = user?.role !== 'VIEWER' && user?.role !== 'INSTALLER';

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

  const loadData = async () => {
    setLoading(true);
    setDeleteError(null);
    try {
      const projectsData = await projectService.getAll();
      setProjects(projectsData);

      if (user?.role !== 'VIEWER' && user?.role !== 'INSTALLER') {
        try {
          setPoolPresets(await poolPresetService.getAll());
        } catch (error) {
          console.error('Error al cargar modelos:', error);
          setPoolPresets([]);
        }
      }
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.role]);

  const visibleProjects = useMemo(() => {
    return [...projects]
      .filter((project) => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'ACTIVE') return project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
        return project.status === statusFilter;
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [projects, statusFilter]);

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
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
          if (selectedPreset) Object.assign(payload, buildProjectAutoConfigurations(selectedPreset));
        }
        await projectService.update(editingProject.id, payload as Partial<Project>);
      } else {
        const created = await projectService.create(formData);
        if (selectedPreset) {
          await projectService.update(created.id, buildProjectAutoConfigurations(selectedPreset) as Partial<Project>);
        }
      }
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
      alert('No se pudo guardar el proyecto');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!projectPendingDelete) return;
    setDeletingProjectId(projectPendingDelete.id);
    try {
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

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 h-24 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="projects-v2 mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Obras</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--ink)' }}>Proyectos</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {projects.length} proyecto(s) · {projects.filter((project) => project.status === 'IN_PROGRESS').length} en ejecución
          </p>
        </div>

        {canCreateProjects && (
          <Button onClick={openCreate} className="min-h-11 w-full sm:w-auto">
            <HdPlus size={18} />
            Nuevo proyecto
          </Button>
        )}
      </section>

      {deleteError && (
        <div className="rough-panel mb-4 p-4">
          <div className="relative flex items-start gap-3">
            <HdAlertTriangle size={18} style={{ color: 'var(--bad)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--bad)' }}>No se pudo eliminar</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>{deleteError}</p>
            </div>
            <button type="button" onClick={() => setDeleteError(null)} className="min-h-10 px-2 text-xs" style={{ color: 'var(--ink-soft)' }}>Cerrar</button>
          </div>
        </div>
      )}

      <section className="mb-5 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex min-w-max gap-2">
          {[
            { id: 'ACTIVE' as const, label: 'Activos' },
            { id: 'IN_PROGRESS' as const, label: 'En ejecución' },
            { id: 'BUDGETED' as const, label: 'Presupuestos' },
            { id: 'COMPLETED' as const, label: 'Completados' },
            { id: 'ALL' as const, label: 'Todos' },
          ].map((filter) => {
            const selected = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold"
                style={{
                  border: `1.4px solid ${selected ? 'var(--accent)' : 'var(--hair-strong)'}`,
                  backgroundColor: selected ? 'var(--accent-2)' : 'var(--card)',
                  color: selected ? 'var(--accent)' : 'var(--ink-soft)',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {visibleProjects.length === 0 ? (
        <section className="rough-panel p-8 text-center sm:p-12">
          <HdFolderOpen size={34} className="relative mx-auto" style={{ color: 'var(--accent)' }} />
          <h2 className="relative mt-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>No hay proyectos en esta vista</h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>
            Cambiá el filtro o creá una nueva obra para empezar a trabajar.
          </p>
          {canCreateProjects && (
            <Button onClick={openCreate} className="relative mt-5 min-h-11">
              <HdPlus size={18} />
              Crear proyecto
            </Button>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {visibleProjects.map((project) => {
            const StatusIcon = getStatusIcon(project.status);
            const tone = getStatusTone(project.status);
            const canViewFinancials = project.currentUserAccess?.canViewFinancials ?? true;
            const canEditProject = project.currentUserAccess?.canEdit ?? canCreateProjects;
            const canDeleteProject = project.currentUserAccess?.canDelete ?? canEditProject;
            const financials = canViewFinancials ? calculateProjectFinancials(project) : null;
            const depthLabel = project.poolPreset?.depthEnd && project.poolPreset.depthEnd !== project.poolPreset.depth
              ? `${project.poolPreset.depth} a ${project.poolPreset.depthEnd} m`
              : project.poolPreset?.depth
                ? `${project.poolPreset.depth} m`
                : null;

            return (
              <article key={project.id} className="rough-panel p-4 sm:p-5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                          <div className="min-w-0">
                            <h2 className="break-words text-base font-semibold sm:text-lg" style={{ color: 'var(--ink)' }}>{project.name}</h2>
                            <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-soft)' }}>{project.clientName}</p>
                          </div>
                          <span className="rough-chip shrink-0" style={{ color: tone }}>
                            <StatusIcon size={13} />
                            {getStatusLabel(project.status)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {project.poolPreset && (
                            <div className="rough-panel rough-panel--soft p-3">
                              <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Piscina</p>
                              <p className="relative mt-1 truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{project.poolPreset.name}</p>
                              <p className="relative mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
                                {project.poolPreset.length} × {project.poolPreset.width} m{depthLabel ? ` · ${depthLabel}` : ''}
                              </p>
                            </div>
                          )}
                          {project.location && (
                            <div className="rough-panel rough-panel--soft p-3">
                              <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Ubicación</p>
                              <p className="relative mt-1 truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{project.location}</p>
                            </div>
                          )}
                          {financials && (
                            <div className="rough-panel rough-panel--soft p-3">
                              <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Costo calculado</p>
                              <p className="relative mt-1 truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{currency(financials.grandTotal)}</p>
                            </div>
                          )}
                        </div>

                        <div className="rough-dashed mt-4 flex items-center justify-between gap-3 pt-3">
                          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Abrir proyecto</span>
                          <HdChevronRight size={18} style={{ color: 'var(--accent)' }} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {(canEditProject || canDeleteProject) && (
                    <div className="mt-3 flex gap-2 pl-5 sm:justify-end">
                      {canEditProject && (
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold sm:flex-none"
                          style={{ border: '1.3px solid var(--hair-strong)', color: 'var(--ink-soft)', backgroundColor: 'var(--card2)' }}
                        >
                          <HdEdit size={16} />
                          Editar
                        </button>
                      )}
                      {canDeleteProject && (
                        <button
                          type="button"
                          onClick={() => setProjectPendingDelete(project)}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold sm:flex-none"
                          style={{ border: '1.3px solid color-mix(in srgb, var(--bad) 45%, var(--hair))', color: 'var(--bad)', backgroundColor: 'var(--card)' }}
                        >
                          <HdTrash size={16} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          if (saving) return;
          setShowModal(false);
          resetForm();
        }}
        title={editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del proyecto"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <Select
            label="Modelo de piscina"
            value={formData.poolPresetId}
            onChange={(event) => setFormData((prev) => ({ ...prev, poolPresetId: event.target.value }))}
            options={[
              { value: '', label: 'Seleccioná un modelo' },
              ...poolPresets.map((preset) => ({
                value: preset.id,
                label: `${preset.name} (${preset.length} × ${preset.width} × ${preset.depth} m)`,
              })),
            ]}
            required
          />

          <Select
            label="Estado"
            value={formData.status}
            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))}
            options={STATUS_OPTIONS}
          />

          <Input
            label="Cliente"
            value={formData.clientName}
            onChange={(event) => setFormData((prev) => ({ ...prev, clientName: event.target.value }))}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={formData.clientEmail}
              onChange={(event) => setFormData((prev) => ({ ...prev, clientEmail: event.target.value }))}
            />
            <Input
              label="Teléfono"
              value={formData.clientPhone}
              onChange={(event) => setFormData((prev) => ({ ...prev, clientPhone: event.target.value }))}
            />
          </div>

          <Input
            label="Ubicación"
            value={formData.location}
            onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
          />

          {!editingProject && (
            <label className="rough-panel rough-panel--soft flex min-h-14 cursor-pointer items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={formData.includeBaseEquipment}
                onChange={(event) => setFormData((prev) => ({ ...prev, includeBaseEquipment: event.target.checked }))}
                className="relative h-5 w-5 accent-[var(--accent)]"
              />
              <span className="relative">
                <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Incluir equipamiento base</span>
                <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Bomba y filtro predeterminados del modelo.</span>
              </span>
            </label>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              disabled={saving}
              className="min-h-11"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="min-h-11">
              {saving ? 'Guardando…' : editingProject ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(projectPendingDelete)}
        onClose={() => {
          if (!deletingProjectId) setProjectPendingDelete(null);
        }}
        title="Eliminar proyecto"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex gap-3">
            <HdAlertTriangle size={22} className="shrink-0" style={{ color: 'var(--bad)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Esta acción no se puede deshacer.</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                Se eliminará {projectPendingDelete?.name} y la información asociada al proyecto.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setProjectPendingDelete(null)} disabled={Boolean(deletingProjectId)} className="min-h-11">
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmDelete()} disabled={Boolean(deletingProjectId)} className="min-h-11">
              <HdTrash size={16} />
              {deletingProjectId ? 'Eliminando…' : 'Eliminar proyecto'}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
};
