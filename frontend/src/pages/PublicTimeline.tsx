import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, RefreshCw, Waves } from 'lucide-react';
import api, { API_BASE_URL } from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { ClientStory, type ClientStoryComment, type ClientStoryEntry, type ClientStoryProject } from '@/components/client-story/ClientStory';

interface ProjectData {
  project: ClientStoryProject;
  updates?: ClientStoryEntry[];
  timeline?: ClientStoryEntry[];
  comments?: ClientStoryComment[];
  config?: { showDetails?: boolean; showCosts?: boolean };
}

export const PublicTimeline = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadedToken, setLoadedToken] = useState<string>();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const activeToken = useRef(shareToken);
  activeToken.current = shareToken;
  const loginHref = `/client-login${shareToken ? `?returnUrl=${encodeURIComponent(`/timeline/${shareToken}`)}` : ''}`;

  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing || document.createElement('meta');
    const previous = meta.getAttribute('content');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    if (!existing) document.head.appendChild(meta);
    return () => {
      if (!existing) meta.remove();
      else if (previous === null) meta.removeAttribute('content');
      else meta.content = previous;
    };
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setProjectData(null); setError(null); setLoadedToken(undefined);
    let clientToken: string | null = null;
    try { clientToken = sessionStorage.getItem('clientShareToken'); } catch { /* The access screen can explain unavailable storage. */ }
    if (!shareToken || clientToken !== shareToken) {
      navigate(loginHref, { replace: true });
      return () => abort.abort();
    }
    api.get<ProjectData>(`/public/timeline/${encodeURIComponent(shareToken)}`, { signal: abort.signal })
      .then(response => {
        if (abort.signal.aborted) return;
        if (!response.data?.project?.name) throw new Error('La información de esta historia no está disponible.');
        setProjectData(response.data); setLoadedToken(shareToken);
      })
      .catch(error => {
        if (!abort.signal.aborted) setError(error.response?.data?.error || error.message || 'No pudimos abrir la historia. Intentá nuevamente.');
      })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [shareToken, loginHref, navigate, retry]);

  const sendComment = async (input: { body: string; kind: ClientStoryComment['kind'] }) => {
    const token = shareToken;
    if (!token || activeToken.current !== token) throw new Error('Volvé a abrir esta historia para enviar tu mensaje.');
    try {
      const response = await api.post<ClientStoryComment>(`/public/timeline/${encodeURIComponent(token)}/comments`, input);
      if (activeToken.current !== token) return;
      setProjectData(previous => previous ? { ...previous, comments: [response.data, ...(previous.comments || []).filter(comment => comment.id !== response.data.id)] } : previous);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'No pudimos guardar tu mensaje. Intentá nuevamente.');
    }
  };

  if (loading || (!error && loadedToken !== shareToken)) return <div className="client-story cs-access-screen"><Waves size={45} strokeWidth={1.2} aria-hidden="true" /><div className="cs-access-card" role="status"><BookOpen className="cs-loading-book" size={35} strokeWidth={1.3} aria-hidden="true" /><span className="cs-eyebrow">El cuaderno de tu piscina</span><h1>Estamos abriendo<br />tu historia.</h1><p>Un momento, buscamos las novedades de tu proyecto.</p></div></div>;
  if (error || !projectData) return <div className="client-story cs-access-screen"><Waves size={45} strokeWidth={1.2} aria-hidden="true" /><div className="cs-access-card"><span className="cs-eyebrow">El cuaderno de tu piscina</span><h1>No pudimos abrir<br />esta página.</h1><p role="alert">{error || 'Verificá el enlace con tu equipo.'}</p><button className="cs-button cs-button-primary" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Volver a intentar</button><Link className="cs-access-link" to={loginHref}><ArrowLeft size={16} aria-hidden="true" />Ir al acceso de clientes</Link></div></div>;

  // Server privacy is authoritative; this guard also prevents legacy DTOs from
  // displaying descriptions or photographs when detail sharing is disabled.
  const source = projectData.timeline || projectData.updates || [];
  const entries = (Array.isArray(source) ? source : []).filter(item => !item.type || item.type === 'PROJECT_UPDATE').map(item => projectData.config?.showDetails === false ? { ...item, description: null, images: [] } : { ...item, images: (Array.isArray(item.images) ? item.images : []).filter(image => typeof image === 'string').map(image => /^\/?(?:uploads|pool-images)\//.test(image) ? `${API_BASE_URL}/${image.replace(/^\//, '')}` : image) });
  const { totalCost: _total, materialCost: _material, laborCost: _labor, ...publicProject } = projectData.project;
  return <ClientStory key={shareToken} project={projectData.config?.showCosts ? projectData.project : publicProject} entries={entries} comments={projectData.comments || []} onSendComment={sendComment} exportUrl={shareToken ? `${API_BASE_URL}/api/public/timeline/${encodeURIComponent(shareToken)}/export` : undefined} backHref={`${publicAssetUrl('client-login')}${shareToken ? `?returnUrl=${encodeURIComponent(`/timeline/${shareToken}`)}` : ''}`} />;
};
