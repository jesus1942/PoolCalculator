import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { HdPlus, HdImage, HdX, HdClock, HdFileText, HdAlertTriangle, HdCheck, HdPackage, HdEye, HdEyeOff, HdTrash, HdEdit, HdShare, HdCalendar, HdMessageBubble } from '@/components/ui/HandDrawnIcons';
import api from '@/services/api';
import { ShareTimelineModal } from './ShareTimelineModal';

interface ProjectUpdateAuthor {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category: 'PROGRESS' | 'MILESTONE' | 'ISSUE' | 'NOTE' | 'INSPECTION' | 'DELIVERY' | 'OTHER';
  images: string[];
  metadata?: any;
  isPublic: boolean;
  createdById?: string | null;
  createdBy?: ProjectUpdateAuthor | null;
  author?: ProjectUpdateAuthor | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTimelineProps {
  projectId: string;
  projectName?: string;
  clientName?: string;
  onTimelineChanged?: () => void;
}

interface TimelineItem {
  id: string;
  type: 'PROJECT_UPDATE' | 'AGENDA_EVENT' | 'AGENDA_MESSAGE';
  createdAt: string;
  title: string;
  description?: string | null;
  category?: ProjectUpdate['category'];
  images?: string[];
  isPublic?: boolean;
  author?: ProjectUpdateAuthor | null;
  createdBy?: ProjectUpdateAuthor | null;
  event?: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    type: string;
    location?: string | null;
  };
  message?: {
    id: string;
    body: string;
    images: string[];
    visibility?: 'ALL' | 'ADMIN_ONLY';
    user?: { id: string; name?: string | null; email?: string | null; role?: string | null };
  };
}

interface ClientComment {
  id: string;
  authorName: string;
  kind: 'COMMENT' | 'PRAISE' | 'SUGGESTION' | 'QUESTION';
  body: string;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

const CLIENT_COMMENT_KIND_INFO: Record<ClientComment['kind'], { label: string; badge: string }> = {
  PRAISE: { label: 'Felicitación', badge: 'bg-emerald-100 text-emerald-700' },
  SUGGESTION: { label: 'Sugerencia', badge: 'bg-amber-100 text-amber-700' },
  QUESTION: { label: 'Consulta', badge: 'bg-violet-100 text-violet-700' },
  COMMENT: { label: 'Comentario', badge: 'bg-cyan-100 text-cyan-700' },
};

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ projectId, projectName = 'Proyecto', clientName, onTimelineChanged }) => {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [clientComments, setClientComments] = useState<ClientComment[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [editingUpdate, setEditingUpdate] = useState<ProjectUpdate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PROGRESS' as ProjectUpdate['category'],
    images: [] as string[],
  });

  useEffect(() => {
    loadUpdates();
    loadClientComments();
  }, [projectId]);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/project-updates/project/${projectId}/timeline`);
      setUpdates(response.data.updates || []);
      setTimelineItems(response.data.timeline || []);
      onTimelineChanged?.();
    } catch (error) {
      console.error('Error loading updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientComments = async () => {
    try {
      const response = await api.get(`/project-share/comments/project/${projectId}`);
      setClientComments(response.data || []);
    } catch (error) {
      // Sin share o sin permisos de edición: la sección simplemente no se muestra
      setClientComments([]);
    }
  };

  const handleReplyToComment = async (commentId: string) => {
    const reply = (replyDrafts[commentId] || '').trim();
    if (!reply) return;
    try {
      setReplyingTo(commentId);
      const response = await api.post(`/project-share/comments/${commentId}/reply`, { reply });
      setClientComments(prev => prev.map(c => (c.id === commentId ? response.data : c)));
      setReplyDrafts(prev => ({ ...prev, [commentId]: '' }));
    } catch (error: any) {
      alert(error.response?.data?.error || 'No se pudo enviar la respuesta');
    } finally {
      setReplyingTo(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Eliminar este comentario del cliente?')) return;
    try {
      await api.delete(`/project-share/comments/${commentId}`);
      setClientComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      alert('No se pudo eliminar el comentario');
    }
  };

  const handleAddUpdate = async () => {
    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }

    try {
      // Validar tamaño total de las imágenes
      const totalSize = formData.images.reduce((sum, img) => sum + img.length, 0);
      if (totalSize > 5 * 1024 * 1024) { // 5MB total
        alert('El tamaño total de las imágenes es muy grande. Por favor reduce la cantidad o calidad.');
        return;
      }

      if (editingUpdate) {
        // Actualizar existente
        const response = await api.put(`/project-updates/${editingUpdate.id}`, formData);
        if (response.status === 200) {
          await loadUpdates();
          setShowAddModal(false);
          setEditingUpdate(null);
          setFormData({
            title: '',
            description: '',
            category: 'PROGRESS',
            images: [],
          });
          alert('Actualización modificada exitosamente');
        }
      } else {
        // Crear nueva
        const response = await api.post(`/project-updates/project/${projectId}`, formData);
        if (response.status === 201) {
          await loadUpdates();
          setShowAddModal(false);
          setFormData({
            title: '',
            description: '',
            category: 'PROGRESS',
            images: [],
          });
          alert('Actualización agregada exitosamente');
        }
      }
    } catch (error: any) {
      console.error('Error saving update:', error);
      const errorMessage = error.response?.data?.error || 'Error al guardar actualización. Verifica la conexión.';
      alert(errorMessage);
    }
  };

  const handleEditClick = (update: ProjectUpdate) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      description: update.description || '',
      category: update.category,
      images: update.images || [],
    });
    setShowAddModal(true);
  };

  const handleToggleVisibility = async (updateId: string) => {
    try {
      await api.patch(`/project-share/update/${updateId}/visibility`);
      await loadUpdates();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Error al cambiar la visibilidad');
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta actualización?')) return;

    try {
      await api.delete(`/project-updates/${id}`);
      await loadUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      alert('Error al eliminar actualización');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Validar tamaño y cantidad
    if (files.length + formData.images.length > 4) {
      alert('Máximo 4 imágenes por actualización');
      return;
    }

    // Convertir imágenes a base64 con compresión
    Array.from(files).forEach((file) => {
      // Validar tamaño (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`La imagen ${file.name} es muy grande. Máximo 10MB por imagen.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Comprimir imagen si es muy grande
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, compressedBase64],
          }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const getCategoryInfo = (category: ProjectUpdate['category']) => {
    const categories = {
      PROGRESS: { label: 'Progreso', icon: HdClock, color: 'blue' },
      MILESTONE: { label: 'Hito', icon: HdCheck, color: 'green' },
      ISSUE: { label: 'Problema', icon: HdAlertTriangle, color: 'red' },
      NOTE: { label: 'Nota', icon: HdFileText, color: 'gray' },
      INSPECTION: { label: 'Inspección', icon: HdEye, color: 'purple' },
      DELIVERY: { label: 'Entrega', icon: HdPackage, color: 'orange' },
      OTHER: { label: 'Otro', icon: HdFileText, color: 'gray' },
    };
    return categories[category] || categories.OTHER;
  };

  const getTimelineInfo = (item: TimelineItem) => {
    if (item.type === 'PROJECT_UPDATE') {
      return getCategoryInfo(item.category || 'OTHER');
    }
    if (item.type === 'AGENDA_MESSAGE') {
      return { label: 'Mensaje', icon: HdMessageBubble, color: 'emerald' };
    }
    return { label: 'La Agenda', icon: HdCalendar, color: 'indigo' };
  };

  const getRoleLabel = (role?: string | null) => {
    if (!role) return '';
    const map: Record<string, string> = {
      SUPERADMIN: 'Superadmin',
      ADMIN: 'Admin',
      INSTALLER: 'Instalador',
      USER: 'Usuario',
      VIEWER: 'Lector',
    };
    return map[role] || role;
  };

  const getUpdateAuthorLabel = (item: TimelineItem) => {
    const author = item.author || item.createdBy;
    if (!author) return 'Autor no registrado';

    const identity = author.name || author.email || 'Usuario';
    const role = getRoleLabel(author.role);
    return role ? `${identity} · ${role}` : identity;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      if (diffHours < 1) return 'Hace menos de 1 hora';
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Timeline del Proyecto</h3>
            <p className="text-sm text-gray-600">Registro cronológico de actualizaciones y eventos</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
            {timelineItems.length > 0 && (
              <Button variant="secondary" onClick={() => setShowExportModal(true)} className="w-full justify-center sm:w-auto">
                <HdShare size={18} className="mr-2" />
                Compartir Timeline
              </Button>
            )}
            <Button onClick={() => setShowAddModal(true)} className="w-full justify-center sm:w-auto">
              <HdPlus size={18} className="mr-2" />
              Agregar Actualización
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando actualizaciones...</p>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <HdClock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No hay actualizaciones registradas</p>
            <p className="text-sm text-gray-500">Comienza agregando la primera actualización del proyecto</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical del timeline */}
            <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-gray-200 sm:left-8"></div>

            {/* Lista de actualizaciones */}
            <div className="space-y-6">
              {timelineItems.map((item) => {
                const categoryInfo = getTimelineInfo(item);
                const CategoryIcon = categoryInfo.icon;

                return (
                  <div key={item.id} className="relative pl-11 sm:pl-20">
                    {/* Icono en la línea del timeline */}
                    <div className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-${categoryInfo.color}-100 sm:left-4`}>
                      <CategoryIcon size={16} className={`text-${categoryInfo.color}-600`} />
                    </div>

                    {/* Contenido de la actualización */}
                    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full bg-${categoryInfo.color}-100 text-${categoryInfo.color}-700`}>
                              {categoryInfo.label}
                            </span>
                            {item.type === 'PROJECT_UPDATE' && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${item.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {item.isPublic ? 'Público' : 'Privado'}
                              </span>
                            )}
                            {item.message?.visibility && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${item.message.visibility === 'ADMIN_ONLY' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {item.message.visibility === 'ADMIN_ONLY' ? 'Solo admin' : 'Visible'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                          {item.type === 'PROJECT_UPDATE' && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Cargado por {getUpdateAuthorLabel(item)}
                            </p>
                          )}
                        </div>
                        {item.type === 'PROJECT_UPDATE' && (
                          <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                            <button
                              onClick={() => handleToggleVisibility(item.id)}
                              className={`${item.isPublic ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'} p-1`}
                              title={item.isPublic ? 'Visible para clientes (click para ocultar)' : 'Oculto para clientes (click para mostrar)'}
                            >
                              {item.isPublic ? <HdEye size={16} /> : <HdEyeOff size={16} />}
                            </button>
                            <button
                              onClick={() => handleEditClick(item as unknown as ProjectUpdate)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Editar actualización"
                            >
                              <HdEdit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUpdate(item.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Eliminar actualización"
                            >
                              <HdTrash size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-700 mt-2 mb-3">{item.description}</p>
                      )}

                      {item.event && (
                        <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                          <div className="font-medium text-gray-800">Evento</div>
                          <div className="mt-1">
                            {new Date(item.event.startAt).toLocaleString('es-AR')} -{' '}
                            {new Date(item.event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {item.event.location && (
                            <div className="mt-1 text-gray-500">Ubicación: {item.event.location}</div>
                          )}
                          <div className="mt-1 text-gray-500">
                            {item.event.type} · {item.event.status}
                          </div>
                        </div>
                      )}

                      {item.message && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 text-sm text-emerald-900">
                          <div className="font-medium">Mensaje</div>
                          {item.message.user && (
                            <div className="text-xs text-emerald-700 mt-1">
                              {item.message.user.name || item.message.user.email || 'Usuario'}{item.message.user.role ? ` · ${getRoleLabel(item.message.user.role)}` : ''}
                            </div>
                          )}
                          <div className="mt-1">{item.message.body}</div>
                        </div>
                      )}

                      {/* Galería de imágenes */}
                      {item.images && item.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {(item.images as string[]).map((image, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setSelectedImages(item.images as string[]);
                                setShowImageModal(true);
                              }}
                            >
                              <img
                                src={image}
                                alt={`${item.title} - ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Comentarios del cliente (llegan desde el timeline compartido) */}
      {clientComments.length > 0 && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <HdMessageBubble size={20} className="text-cyan-600" />
              Comentarios del cliente
            </h3>
            <p className="text-sm text-gray-600">
              Mensajes que {clientName || 'el cliente'} dejó en su timeline compartido. Respondé desde acá: la respuesta le aparece en su vista.
            </p>
          </div>

          <div className="space-y-4">
            {clientComments.map((comment) => {
              const kindInfo = CLIENT_COMMENT_KIND_INFO[comment.kind] || CLIENT_COMMENT_KIND_INFO.COMMENT;
              return (
                <div key={comment.id} className="overflow-hidden rounded-lg border bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{comment.authorName}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${kindInfo.badge}`}>{kindInfo.label}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Eliminar comentario"
                    >
                      <HdTrash size={16} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-line">{comment.body}</p>

                  {comment.reply ? (
                    <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-cyan-700 mb-1">Tu respuesta</p>
                      <p className="text-sm text-cyan-900 whitespace-pre-line">{comment.reply}</p>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:flex">
                      <input
                        value={replyDrafts[comment.id] || ''}
                        onChange={(e) => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleReplyToComment(comment.id);
                          }
                        }}
                        placeholder="Responder al cliente…"
                        className="min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-base sm:flex-1 sm:text-sm"
                      />
                      <Button
                        onClick={() => handleReplyToComment(comment.id)}
                        disabled={replyingTo === comment.id || !(replyDrafts[comment.id] || '').trim()}
                      className="w-full justify-center sm:w-auto"
                      >
                        {replyingTo === comment.id ? 'Enviando…' : 'Responder'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal para agregar/editar actualización */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingUpdate(null);
          setFormData({
            title: '',
            description: '',
            category: 'PROGRESS',
            images: [],
          });
        }}
        title={editingUpdate ? 'Editar Actualización' : 'Agregar Actualización'}
      >
        <div className="space-y-4">
          <Input
            label="Título *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ej: Excavación completada"
          />

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectUpdate['category'] })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="PROGRESS">Progreso</option>
              <option value="MILESTONE">Hito</option>
              <option value="ISSUE">Problema</option>
              <option value="NOTE">Nota</option>
              <option value="INSPECTION">Inspección</option>
              <option value="DELIVERY">Entrega</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Imágenes</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <HdImage size={20} className="text-gray-400" />
              <span className="text-sm text-gray-600">Seleccionar imágenes</span>
            </label>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={image} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <HdX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleAddUpdate} className="flex-1">
              {editingUpdate ? 'Guardar Cambios' : 'Agregar'}
            </Button>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para ver imágenes */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Galería de Imágenes"
      >
        <div className="grid grid-cols-2 gap-4">
          {selectedImages.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Imagen ${index + 1}`}
              className="w-full rounded-lg"
            />
          ))}
        </div>
      </Modal>

      {/* Modal de compartir */}
      <ShareTimelineModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={projectId}
        updates={updates}
      />
    </div>
  );
};
