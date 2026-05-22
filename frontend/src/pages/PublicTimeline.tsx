import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Clock, AlertTriangle, CheckCircle, FileText, Eye, Package, Home, Calendar, MessageCircle, Download } from 'lucide-react';
import { API_BASE_URL } from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category: 'PROGRESS' | 'MILESTONE' | 'ISSUE' | 'NOTE' | 'INSPECTION' | 'DELIVERY' | 'OTHER';
  images: string[];
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface TimelineItem {
  id: string;
  type: 'PROJECT_UPDATE' | 'AGENDA_EVENT' | 'AGENDA_MESSAGE';
  createdAt: string;
  title: string;
  description?: string | null;
  category?: ProjectUpdate['category'];
  images?: string[];
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
    user?: { id: string; name?: string | null; email?: string | null; role?: string | null };
  };
}

interface ProjectData {
  projectName: string;
  clientName: string;
  updates: ProjectUpdate[];
  timeline?: TimelineItem[];
  showCosts: boolean;
  showDetails: boolean;
}

export const PublicTimeline: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si hay token de cliente en sessionStorage
    const clientToken = sessionStorage.getItem('clientShareToken');

    // Si no hay token o no coincide con el shareToken de la URL, redirigir al login
    if (!clientToken || clientToken !== shareToken) {
      navigate(`/client-login?returnUrl=/timeline/${shareToken}`);
      return;
    }

    loadTimeline();
  }, [shareToken, navigate]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/timeline/${shareToken}`);
      setProjectData(response.data);
    } catch (error: any) {
      console.error('Error loading timeline:', error);
      setError(error.response?.data?.error || 'No se pudo cargar el timeline del proyecto');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (category: ProjectUpdate['category']) => {
    const categories = {
      PROGRESS: { label: 'Progreso', icon: Clock, color: 'blue' },
      MILESTONE: { label: 'Hito', icon: CheckCircle, color: 'green' },
      ISSUE: { label: 'Problema', icon: AlertTriangle, color: 'red' },
      NOTE: { label: 'Nota', icon: FileText, color: 'gray' },
      INSPECTION: { label: 'Inspección', icon: Eye, color: 'purple' },
      DELIVERY: { label: 'Entrega', icon: Package, color: 'orange' },
      OTHER: { label: 'Otro', icon: FileText, color: 'gray' },
    };
    return categories[category] || categories.OTHER;
  };

  const getTimelineInfo = (item: TimelineItem) => {
    if (item.type === 'PROJECT_UPDATE') {
      return getCategoryInfo(item.category || 'OTHER');
    }
    if (item.type === 'AGENDA_MESSAGE') {
      return { label: 'Mensaje', icon: MessageCircle, color: 'emerald' };
    }
    return { label: 'La Agenda', icon: Calendar, color: 'indigo' };
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

  const timelineSource = projectData?.timeline || projectData?.updates || [];
  const timelineItems = timelineSource.filter((item: any) => !item?.type || item.type === 'PROJECT_UPDATE');
  const exportUrl = shareToken
    ? `${API_BASE_URL}/api/public/timeline/${shareToken}/export`
    : '';

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
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-300 mx-auto"></div>
          <p className="text-zinc-300 mt-4 text-lg">Cargando timeline del proyecto...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-white/5 rounded-lg shadow-2xl p-8 max-w-md text-center border border-white/10">
          <AlertTriangle size={64} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-zinc-400 mb-6">
            {error || 'No se pudo cargar el timeline. Verifica que el enlace sea correcto.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-300 transition-colors font-semibold"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const projectName = projectData.projectName || (projectData as any).project?.name || 'Proyecto';
  const clientName = projectData.clientName || (projectData as any).project?.clientName || 'Cliente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">{projectName}</h1>
              <p className="mt-1 text-sm text-zinc-400 sm:text-base">Cliente: {clientName}</p>
            </div>
            <div className="flex items-center gap-3 text-cyan-300 sm:justify-end">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black">
                <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-5 w-auto" />
              </div>
              <span className="text-base font-semibold text-white sm:text-lg">Pool Installer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="mb-2 text-2xl font-bold text-white">Timeline del Proyecto</h2>
            <p className="text-sm text-zinc-400 sm:text-base">
              Registro cronológico de actualizaciones y eventos del proyecto
            </p>
            {timelineItems.length > 0 && (
              <p className="text-sm text-zinc-500 mt-2">
                Total de items: {timelineItems.length}
              </p>
            )}
          </div>

          {timelineItems.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-lg border border-white/10">
              <Clock size={64} className="mx-auto text-zinc-500 mb-4" />
              <p className="text-zinc-300 text-lg mb-2">No hay actualizaciones registradas</p>
              <p className="text-sm text-zinc-500">
                El constructor agregará actualizaciones a medida que avance el proyecto
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-cyan-500/40 via-blue-500/30 to-transparent sm:left-8"></div>

              {/* Lista de actualizaciones */}
              <div className="space-y-8">
                {timelineItems.map((item, index) => {
                  const categoryInfo = getTimelineInfo(item);
                  const CategoryIcon = categoryInfo.icon;
                  const isFirst = index === 0;

                  return (
                    <div key={item.id} className="relative pl-12 sm:pl-20">
                      {/* Icono en la línea del timeline */}
                      <div
                        className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-zinc-950 shadow-md sm:left-4 ${
                          categoryInfo.color === 'blue' ? 'bg-blue-500/20' :
                          categoryInfo.color === 'green' ? 'bg-emerald-500/20' :
                          categoryInfo.color === 'red' ? 'bg-rose-500/20' :
                          categoryInfo.color === 'purple' ? 'bg-indigo-500/20' :
                          categoryInfo.color === 'orange' ? 'bg-amber-500/20' :
                          'bg-white/10'
                        }`}
                      >
                        <CategoryIcon
                          size={16}
                          className={`${
                            categoryInfo.color === 'blue' ? 'text-blue-200' :
                            categoryInfo.color === 'green' ? 'text-emerald-200' :
                            categoryInfo.color === 'red' ? 'text-rose-200' :
                            categoryInfo.color === 'purple' ? 'text-indigo-200' :
                            categoryInfo.color === 'orange' ? 'text-amber-200' :
                            'text-zinc-300'
                          }`}
                        />
                      </div>

                      {/* Contenido de la actualización */}
                      <div className={`rounded-lg border bg-white/5 p-4 shadow-md transition-all hover:shadow-xl sm:p-6 ${
                        isFirst ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-white/10'
                      }`}>
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <h3 className="text-base font-bold text-white sm:text-lg">{item.title}</h3>
                              <span
                                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                                  categoryInfo.color === 'blue' ? 'bg-blue-500/15 text-blue-200' :
                                  categoryInfo.color === 'green' ? 'bg-emerald-500/15 text-emerald-200' :
                                  categoryInfo.color === 'red' ? 'bg-rose-500/15 text-rose-200' :
                                  categoryInfo.color === 'purple' ? 'bg-indigo-500/15 text-indigo-200' :
                                  categoryInfo.color === 'orange' ? 'bg-amber-500/15 text-amber-200' :
                                  'bg-white/10 text-zinc-200'
                                }`}
                              >
                                {categoryInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400">{formatDate(item.createdAt)}</p>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-zinc-200 mb-4 leading-relaxed">{item.description}</p>
                        )}

                        {item.event && (
                          <div className="text-sm text-zinc-300 bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                            <div className="font-medium text-white">Evento</div>
                            <div className="mt-1">
                              {new Date(item.event.startAt).toLocaleString('es-AR')} -{' '}
                              {new Date(item.event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {item.event.location && (
                              <div className="mt-1 text-xs text-zinc-500">Ubicación: {item.event.location}</div>
                            )}
                            <div className="mt-1 text-xs text-zinc-500">
                              {item.event.type} · {item.event.status}
                            </div>
                          </div>
                        )}

                        {item.message && (
                          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-lg p-3 mb-4 text-sm text-emerald-100">
                            <div className="font-medium">Mensaje</div>
                            {item.message.user && (
                              <div className="text-xs text-emerald-200 mt-1">
                                {item.message.user.name || item.message.user.email || 'Usuario'}{item.message.user.role ? ` · ${getRoleLabel(item.message.user.role)}` : ''}
                              </div>
                            )}
                            <div className="mt-1">{item.message.body}</div>
                          </div>
                        )}

                        {/* Galería de imágenes */}
                        {item.images && item.images.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {(item.images as string[]).map((image, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
                                onClick={() => setSelectedImage(image)}
                              >
                                <img
                                  src={image}
                                  alt={`${item.title} - ${imgIndex + 1}`}
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
          {exportUrl && timelineItems.length > 0 && (
            <div className="mt-8 flex justify-stretch sm:justify-end">
              <button
                onClick={() => {
                  window.location.href = exportUrl;
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-zinc-950 transition hover:bg-cyan-300 sm:w-auto"
              >
                <Download size={16} />
                Descargar CSV
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 text-white mt-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Pool Installer</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Sistema completo de cálculo de materiales para montaje de piscinas de fibra de vidrio
            </p>
            <div className="border-t border-white/10 pt-6">
              <p className="text-zinc-400 text-sm mb-2">
                © {new Date().getFullYear()} Pool Installer. Todos los derechos reservados.
              </p>
              <p className="text-zinc-500 text-xs">
                Desarrollado por <span className="font-semibold text-cyan-300">Jesús Olguín</span> - Domotics & IoT Solutions
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal para ver imagen completa */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/10 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors shadow-lg border border-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Vista completa"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
