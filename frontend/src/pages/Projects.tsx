import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { projectService } from '@/services/projectService';
import { poolPresetService } from '@/services/poolPresetService';
import { Project, PoolPreset, ProjectStatus } from '@/types';
import { Plus, Edit, Trash2, Eye, FileText, FolderOpen, Waves, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BASE_URL = API_URL.replace('/api', '');

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [poolPresets, setPoolPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    location: '',
    poolPresetId: '',
    status: 'DRAFT' as ProjectStatus,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, presetsData] = await Promise.all([
        projectService.getAll(),
        poolPresetService.getAll(),
      ]);
      setProjects(projectsData);
      setPoolPresets(presetsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await projectService.update(editingProject.id, formData);
      } else {
        await projectService.create(formData);
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
      status: project.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      try {
        await projectService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar proyecto:', error);
      }
    }
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
      status: 'DRAFT',
    });
  };

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
      DRAFT: 'bg-gray-100 text-gray-700 border border-gray-200',
      BUDGETED: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
      IN_PROGRESS: 'bg-purple-50 text-purple-700 border border-purple-200',
      COMPLETED: 'bg-green-50 text-green-700 border border-green-200',
      CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
    };
    return colors[status] || colors.DRAFT;
  };

  const getStatusIcon = (status: ProjectStatus) => {
    const icons = {
      DRAFT: FileText,
      BUDGETED: AlertCircle,
      APPROVED: CheckCircle2,
      IN_PROGRESS: Clock,
      COMPLETED: CheckCircle2,
      CANCELLED: XCircle,
    };
    return icons[status] || icons.DRAFT;
  };

  const getStatusLabel = (status: ProjectStatus) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Proyectos
                </h1>
                <p className="text-gray-500 mt-1">Administra todos tus proyectos de piscinas</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
            >
              <Plus size={20} />
              <span>Nuevo Proyecto</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-6 rounded-lg bg-gray-100 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No tenes proyectos todavia
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Empieza creando tu primer proyecto de piscina y gestiona todos los detalles de construccion
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                <span>Crear Primer Proyecto</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const StatusIcon = getStatusIcon(project.status);
              return (
                <div
                  key={project.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-500">{project.clientName}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 flex-shrink-0 ${getStatusColor(project.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        {getStatusLabel(project.status)}
                      </span>
                    </div>

                    {/* Pool Preset Info */}
                    {project.poolPreset && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Waves className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modelo de Piscina</p>
                        </div>
                        <p className="font-semibold text-gray-900">{project.poolPreset.name}</p>
                        <p className="text-sm text-gray-700 mt-1">
                          {project.poolPreset.length}m × {project.poolPreset.width}m × {project.poolPreset.depth}m
                        </p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-3">
                      {project.location && (
                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Ubicacion</p>
                          <p className="font-medium text-gray-900 text-sm truncate">{project.location}</p>
                        </div>
                      )}
                      {project.totalCost > 0 && (
                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Costo Total</p>
                          <p className="font-semibold text-green-600 text-sm">
                            ${project.totalCost.toLocaleString('es-AR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleView(project.id)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={() => handleEdit(project)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors duration-200 border border-gray-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 border border-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
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

                <div className="grid grid-cols-2 gap-4">
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

            <div className="flex space-x-3 pt-4">
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
      </div>
    </div>
  );
};
