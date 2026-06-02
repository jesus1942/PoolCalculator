import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Clock, AlertTriangle, CheckCircle, FileText, Eye, Package, Calendar, MessageCircle, Download, X } from 'lucide-react';
import { API_BASE_URL } from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { DeveloperCredit } from '@/components/DeveloperCredit';

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

const CATEGORY_MAP = {
  PROGRESS:   { label: 'Progreso',    icon: Clock,          dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  MILESTONE:  { label: 'Hito',        icon: CheckCircle,    dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  ISSUE:      { label: 'Problema',    icon: AlertTriangle,  dot: 'bg-rose-400',    badge: 'bg-rose-400/10 text-rose-300 border-rose-400/20' },
  NOTE:       { label: 'Nota',        icon: FileText,       dot: 'bg-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
  INSPECTION: { label: 'Inspección',  icon: Eye,            dot: 'bg-violet-400',  badge: 'bg-violet-400/10 text-violet-300 border-violet-400/20' },
  DELIVERY:   { label: 'Entrega',     icon: Package,        dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  OTHER:      { label: 'Novedad',     icon: FileText,       dot: 'bg-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/20' },
} as const;

const TIMELINE_TYPE_MAP = {
  AGENDA_MESSAGE: { label: 'Mensaje', icon: MessageCircle, dot: 'bg-teal-400',   badge: 'bg-teal-400/10 text-teal-300 border-teal-400/20' },
  AGENDA_EVENT:   { label: 'Evento',  icon: Calendar,      dot: 'bg-indigo-400', badge: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20' },
};

function getItemMeta(item: TimelineItem) {
  if (item.type === 'PROJECT_UPDATE') {
    return CATEGORY_MAP[item.category ?? 'OTHER'] ?? CATEGORY_MAP.OTHER;
  }
  return TIMELINE_TYPE_MAP[item.type as keyof typeof TIMELINE_TYPE_MAP] ?? CATEGORY_MAP.OTHER;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'Hace menos de 1 hora';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const PublicTimeline: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const clientToken = sessionStorage.getItem('clientShareToken');
    if (!clientToken || clientToken !== shareToken) {
      navigate(`/client-login?returnUrl=/timeline/${shareToken}`);
      return;
    }
    api.get(`/public/timeline/${shareToken}`)
      .then(r => setProjectData(r.data))
      .catch(e => setError(e.response?.data?.error || 'No se pudo cargar el timeline'))
      .finally(() => setLoading(false));
  }, [shareToken, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
          <p className="text-zinc-400 mt-4 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-white/5 rounded-2xl p-8 max-w-sm w-full text-center border border-white/10">
          <AlertTriangle size={40} className="mx-auto text-rose-400 mb-4" />
          <p className="text-white font-semibold mb-1">Acceso no disponible</p>
          <p className="text-zinc-400 text-sm mb-6">{error || 'Verificá que el enlace sea correcto.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 bg-cyan-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-cyan-300 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const projectName = projectData.projectName || (projectData as any).project?.name || 'Proyecto';
  const timelineSource = projectData.timeline || projectData.updates || [];
  const items = timelineSource.filter((item: any) => !item?.type || item.type === 'PROJECT_UPDATE');
  const exportUrl = shareToken ? `${API_BASE_URL}/api/public/timeline/${shareToken}/export` : '';

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header sticky compacto */}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 shrink-0">
            <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-4 w-auto" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 leading-none mb-0.5">Pool Installer</p>
            <h1 className="text-sm font-semibold text-white truncate">{projectName}</h1>
          </div>
          {exportUrl && items.length > 0 && (
            <button
              onClick={() => { window.location.href = exportUrl; }}
              className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cyan-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}
        </div>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Clock size={40} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-300 font-medium mb-1">Sin actualizaciones aún</p>
            <p className="text-zinc-500 text-sm">El equipo irá agregando novedades a medida que avance la obra.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-white/8 to-transparent" />

            <div className="space-y-4">
              {items.map((item, index) => {
                const meta = getItemMeta(item);
                const Icon = meta.icon;
                const isLatest = index === 0;

                return (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Dot */}
                    <div className={`relative z-10 mt-3.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-950 ${meta.dot} bg-opacity-20`}
                         style={{ background: 'var(--dot-bg)' }}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center ${meta.dot.replace('bg-', 'bg-').replace('-400', '-400/15')}`}>
                        <Icon size={13} className={meta.dot.replace('bg-', 'text-')} />
                      </div>
                    </div>

                    {/* Card */}
                    <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-colors ${
                      isLatest ? 'border-cyan-400/30 bg-cyan-500/5' : 'border-white/8 bg-white/3 hover:bg-white/5'
                    }`}>
                      {/* Título + badge + fecha */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
                        {isLatest && (
                          <span className="shrink-0 text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2 py-0.5">
                            Nuevo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[11px] font-medium border rounded-full px-2 py-0.5 ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-zinc-500">{formatDate(item.createdAt)}</span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-zinc-300 leading-relaxed mb-3">{item.description}</p>
                      )}

                      {/* Evento: solo hora y lugar, sin tipo/estado interno */}
                      {item.event && (
                        <div className="text-xs text-zinc-400 bg-white/5 border border-white/8 rounded-lg p-3 mb-3 space-y-0.5">
                          <p className="text-zinc-200 font-medium">
                            {new Date(item.event.startAt).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </p>
                          <p>
                            {new Date(item.event.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(item.event.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {item.event.location && <p className="text-zinc-500">{item.event.location}</p>}
                        </div>
                      )}

                      {/* Mensaje: sin rol interno */}
                      {item.message && (
                        <div className="text-sm bg-teal-500/8 border border-teal-400/15 rounded-lg p-3 mb-3">
                          {item.message.user?.name && (
                            <p className="text-xs text-teal-300 font-medium mb-1">{item.message.user.name}</p>
                          )}
                          <p className="text-zinc-200 leading-relaxed">{item.message.body}</p>
                        </div>
                      )}

                      {/* Imágenes */}
                      {item.images && item.images.length > 0 && (
                        <div className={`grid gap-2 ${item.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                          {(item.images as string[]).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedImage(img)}
                              className="relative aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
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

        {/* Footer mínimo */}
        <div className="mt-12 pt-6 border-t border-white/8 flex flex-col items-center gap-3">
          <DeveloperCredit variant="compact" />
          <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} Pool Installer</p>
        </div>
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={selectedImage}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
