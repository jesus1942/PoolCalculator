import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { API_BASE_URL } from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

interface TimelineItem {
  id: string;
  type?: string;
  createdAt: string;
  title: string;
  description?: string | null;
  category?: string;
  images?: string[];
}

interface ProjectData {
  projectName: string;
  clientName: string;
  updates?: TimelineItem[];
  timeline?: TimelineItem[];
}

const CATEGORY_DOT: Record<string, string> = {
  PROGRESS:   'bg-blue-400',
  MILESTONE:  'bg-emerald-400',
  ISSUE:      'bg-rose-400',
  NOTE:       'bg-zinc-500',
  INSPECTION: 'bg-violet-400',
  DELIVERY:   'bg-amber-400',
  OTHER:      'bg-zinc-500',
};

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-700 border-t-cyan-400" />
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-white/5 rounded-2xl p-8 max-w-sm w-full text-center border border-white/10">
          <p className="text-white font-semibold mb-2">Acceso no disponible</p>
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

  const projectName = projectData.projectName || 'Proyecto';
  const source = projectData.timeline || projectData.updates || [];
  const items = source.filter((item: any) => !item.type || item.type === 'PROJECT_UPDATE');
  const exportUrl = shareToken ? `${API_BASE_URL}/api/public/timeline/${shareToken}/export` : '';

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 shrink-0">
            <img src={publicAssetUrl('logo-isotipo.png')} alt="Pool Installer" className="h-4 w-auto" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-zinc-600 leading-none mb-0.5 uppercase tracking-wider">Pool Installer</p>
            <h1 className="text-sm font-semibold text-white truncate leading-tight">{projectName}</h1>
          </div>
          {exportUrl && items.length > 0 && (
            <a
              href={exportUrl}
              className="shrink-0 text-xs text-zinc-500 hover:text-cyan-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              Exportar
            </a>
          )}
        </div>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-lg px-4 py-6 pb-16">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 font-medium mb-1">Sin actualizaciones aún</p>
            <p className="text-zinc-600 text-sm">El equipo irá publicando novedades a medida que avance la obra.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gradient-to-b from-cyan-500/40 via-white/6 to-transparent" />

            <div className="space-y-5">
              {items.map((item, index) => {
                const dotColor = CATEGORY_DOT[item.category ?? 'OTHER'] ?? 'bg-zinc-500';
                const isLatest = index === 0;

                return (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Dot */}
                    <div className="shrink-0 mt-3.5 relative z-10">
                      <div className={`h-[18px] w-[18px] rounded-full ${dotColor} ring-2 ring-zinc-950`} />
                    </div>

                    {/* Card */}
                    <div className={`flex-1 min-w-0 rounded-xl border p-4 ${
                      isLatest
                        ? 'border-cyan-400/25 bg-cyan-500/5'
                        : 'border-white/7 bg-white/3'
                    }`}>

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
                        {isLatest && (
                          <span className="shrink-0 text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-2 py-0.5">
                            Nuevo
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-500 mb-3">{formatDate(item.createdAt)}</p>

                      {item.description && (
                        <p className="text-sm text-zinc-300 leading-relaxed mb-3 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}

                      {item.images && item.images.length > 0 && (
                        <div className={`grid gap-2 ${item.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {(item.images as string[]).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedImage(img)}
                              className="relative aspect-video rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
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

        <p className="text-center text-zinc-700 text-xs mt-10">
          © {new Date().getFullYear()} Pool Installer
        </p>
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 rounded-full p-2 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
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
