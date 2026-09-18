import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Download, Heart, MessageCircle, Send, Waves, X, ZoomIn } from 'lucide-react';
import type { ClientStoryComment, ClientStoryEntry, ClientStoryProps } from './types';
import { useInitialPagePosition } from '@/hooks/useInitialPagePosition';
import '@/theme/client-story.css';

export type { ClientStoryProject, ClientStoryEntry, ClientStoryComment, ClientStoryProps } from './types';

const CATEGORIES: Record<string, string> = {
  PROGRESS: 'Avance de obra', MILESTONE: 'Un hito en la historia', ISSUE: 'Novedad de la obra',
  NOTE: 'Nota del equipo', INSPECTION: 'Revisión', DELIVERY: 'Entrega', OTHER: 'En el cuaderno',
};
const STATUSES: Record<string, string> = {
  DRAFT: 'En preparación', BUDGETED: 'Presupuestado', APPROVED: 'Aprobado',
  IN_PROGRESS: 'En obra', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado',
};
const KINDS: { id: ClientStoryComment['kind']; label: string }[] = [
  { id: 'COMMENT', label: 'Comentario' }, { id: 'QUESTION', label: 'Consulta' },
  { id: 'PRAISE', label: 'Felicitación' }, { id: 'SUGGESTION', label: 'Sugerencia' },
];
const dateValue = (value: string) => Number.isNaN(Date.parse(value)) ? 0 : Date.parse(value);
const dateLabel = (value?: string, options?: Intl.DateTimeFormatOptions) => {
  if (!value || !dateValue(value)) return 'Fecha no disponible';
  return new Date(value).toLocaleDateString('es-AR', options || { day: 'numeric', month: 'long', year: 'numeric' });
};

function StoryPhoto({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="cs-photo-unavailable"><Camera aria-hidden="true" size={26} />Esta fotografía no está disponible</span>
    : <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}

interface Photo { src: string; title: string; date: string; number: number }
function PhotoGallery({ photos, index, onIndex, onClose, demo }: { photos: Photo[]; index: number; onIndex: (index: number) => void; onClose: () => void; demo: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const photo = photos[index];
  if (!photo) return null;
  const changePhoto = (delta: number) => onIndex((index + delta + photos.length) % photos.length);
  return <dialog ref={dialogRef} className="cs-gallery" aria-label="Álbum de la obra" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); changePhoto(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); changePhoto(1); }
  }}>
    <div className="cs-gallery-inner">
      <div className="cs-gallery-top"><span className="cs-eyebrow">El álbum de tu piscina · {index + 1} / {photos.length}</span><button ref={closeRef} className="cs-icon-button" onClick={onClose} aria-label="Cerrar galería"><X size={23} /></button></div>
      <div className="cs-gallery-photo"><StoryPhoto key={photo.src} src={photo.src} alt={demo ? `${photo.title}. Imagen ilustrativa de una historia ficticia.` : `${photo.title}. Fotografía ${photo.number}.`} eager /></div>
      <div className="cs-gallery-bottom"><div aria-live="polite"><p>{photo.title}</p><span>{demo ? 'Imagen ilustrativa — historia ficticia' : `${dateLabel(photo.date)} · Foto ${photo.number}`}</span></div>{photos.length > 1 && <div className="cs-gallery-controls"><button className="cs-icon-button" aria-label="Fotografía anterior" onClick={() => changePhoto(-1)}><ChevronLeft /></button><button className="cs-icon-button" aria-label="Fotografía siguiente" onClick={() => changePhoto(1)}><ChevronRight /></button></div>}</div>
    </div>
  </dialog>;
}

function StoryComments({ comments, demo, onSendComment }: Pick<ClientStoryProps, 'comments' | 'demo' | 'onSendComment'>) {
  const [kind, setKind] = useState<ClientStoryComment['kind']>('COMMENT');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const submissionRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (demo || !onSendComment || !body.trim() || submissionRef.current) return;
    submissionRef.current = true;
    setSending(true);
    setFeedback(null);
    try {
      await onSendComment({ body: body.trim(), kind });
      if (mountedRef.current) {
        setBody(''); setKind('COMMENT');
        setFeedback({ message: 'Tu mensaje quedó guardado para el equipo.', error: false });
      }
    } catch (error) {
      if (mountedRef.current) setFeedback({ message: error instanceof Error ? error.message : 'No pudimos guardar tu mensaje. Intentá otra vez.', error: true });
    } finally {
      submissionRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  };
  return <section className="cs-conversation" id="conversacion" aria-labelledby="cs-conversation-title">
    <div className="cs-conversation-heading"><span className="cs-eyebrow"><MessageCircle size={16} aria-hidden="true" /> La historia también la escribís vos</span><h2 id="cs-conversation-title">Un espacio<br />para conversar.</h2><p>Una pregunta, una idea o un mensaje para el equipo. Todo queda junto a la historia de tu piscina.</p><div className="cs-conversation-doodle" aria-hidden="true"><Heart size={45} strokeWidth={1.3} /><span>De cerca, en cada paso.</span></div></div>
    <div className="cs-conversation-content"><form className="cs-message-form" onSubmit={send}>
      {demo ? <p className="cs-demo-note">Estás explorando una historia de demostración. Los mensajes están deshabilitados.</p> : !onSendComment && <p className="cs-demo-note">Los mensajes no están disponibles en esta vista.</p>}
      <fieldset disabled={demo || !onSendComment || sending}><legend>¿Qué querés compartir?</legend><div className="cs-message-kinds">{KINDS.map(item => <label key={item.id} className={kind === item.id ? 'is-selected' : ''}><input type="radio" name="cs-comment-kind" value={item.id} checked={kind === item.id} onChange={() => setKind(item.id)} /><span>{item.label}</span></label>)}</div>
      <label className="cs-field-label" htmlFor="cs-comment-body">Tu mensaje para el equipo</label><textarea id="cs-comment-body" value={body} onChange={event => setBody(event.target.value)} maxLength={2000} rows={5} required placeholder="¿Qué te gustaría contarles?" aria-describedby="cs-comment-count" />
      <div className="cs-form-bottom"><span id="cs-comment-count">{body.length} / 2000</span><button type="submit" className="cs-button cs-button-primary" disabled={!body.trim() || sending}>{sending ? 'Guardando…' : 'Enviar mensaje'}<Send size={16} aria-hidden="true" /></button></div></fieldset>
      {feedback && <p className={`cs-feedback ${feedback.error ? 'is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{!feedback.error && <Check size={17} aria-hidden="true" />}{feedback.message}</p>}
    </form>
    {comments.length > 0 && <div className="cs-messages"><h3>La conversación</h3>{comments.map(comment => <article key={comment.id} className="cs-message"><header><strong>{comment.authorName || 'Cliente'}</strong><span>{KINDS.find(item => item.id === comment.kind)?.label || 'Comentario'}</span></header><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time><p>{comment.body}</p>{comment.reply && <div className="cs-team-reply"><span className="cs-eyebrow">Respuesta del equipo</span><p>{comment.reply}</p>{comment.repliedAt && <time dateTime={comment.repliedAt}>{dateLabel(comment.repliedAt)}</time>}</div>}</article>)}</div>}
    </div>
  </section>;
}

export function ClientStory({ project, entries, comments, onSendComment, exportUrl, demo = false, backHref = '/' }: ClientStoryProps) {
  const [order, setOrder] = useState<'oldest' | 'newest'>('oldest');
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [reading, setReading] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  useInitialPagePosition(pageRef);
  const chronological = useMemo(() => entries.filter(entry => !entry.type || entry.type === 'PROJECT_UPDATE').map(entry => ({ ...entry, images: (Array.isArray(entry.images) ? entry.images : []).filter(image => typeof image === 'string' && image.trim()) })).sort((a, b) => dateValue(a.createdAt) - dateValue(b.createdAt)), [entries]);
  const photos = useMemo(() => chronological.flatMap(entry => (entry.images || []).map((src, i) => ({ src, title: entry.title, date: entry.createdAt, number: i + 1 }))), [chronological]);
  const cover = [...chronological].reverse().find(entry => entry.images?.length);
  const visible = chronological.filter(entry => !onlyPhotos || entry.images?.length);
  const ordered = order === 'oldest' ? visible : [...visible].reverse();
  const latest = chronological[chronological.length - 1];
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const page = pageRef.current;
      if (!page) return;
      const bounds = page.getBoundingClientRect();
      const available = bounds.height - window.innerHeight;
      setReading(available > 0 ? Math.min(100, Math.max(0, Math.round(-bounds.top / available * 100))) : 100);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    if (pageRef.current) resizeObserver?.observe(pageRef.current);
    update();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); window.cancelAnimationFrame(frame); resizeObserver?.disconnect(); };
  }, []);
  const openPhoto = (entry: ClientStoryEntry, localIndex: number) => {
    let index = 0;
    for (const candidate of chronological) {
      if (candidate.id === entry.id) break;
      index += candidate.images?.length || 0;
    }
    setPhotoIndex(index + localIndex);
  };
  return <div className="client-story" ref={pageRef}>
    <a className="cs-skip" href="#historia">Ir a la historia</a>
    <header className="cs-topbar"><div className="cs-topbar-inner"><a href={backHref} className="cs-brand" aria-label={demo ? 'Volver a Pool Installer' : 'Volver al acceso de clientes'}><Waves size={29} strokeWidth={1.6} aria-hidden="true" /><span>pool<span className="cs-brand-light">installer</span><small>El cuaderno de tu piscina</small></span></a><div className="cs-header-actions">{demo && <span className="cs-demo-badge">Historia de ejemplo</span>}<a href="#conversacion" className="cs-header-chat"><MessageCircle size={17} aria-hidden="true" /><span>Hablemos</span></a>{exportUrl && chronological.length > 0 && <a href={exportUrl} className="cs-export" aria-label="Descargar avances en CSV"><Download size={17} aria-hidden="true" /><span>Exportar avances</span></a>}</div></div><div className="cs-reading-track" role="progressbar" aria-label="Lectura de la historia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={reading}><span style={{ width: `${reading}%` }} /></div></header>
    <main>
      <section className={`cs-hero ${cover ? 'cs-hero-with-photo' : 'cs-hero-type'}`} aria-labelledby="cs-title"><div className="cs-hero-copy"><div className="cs-eyebrow"><span className="cs-small-line" /> Un proyecto. Muchos recuerdos.</div><h1 id="cs-title">La historia<br />de <em>tu piscina.</em></h1><p className="cs-hero-intro">Cada paso tiene algo para contar.<br />Este es el cuaderno donde tu proyecto toma forma.</p><div className="cs-project-name"><span>Escrito para {project.clientName || 'vos'}</span><strong>{project.name}</strong></div><div className="cs-hero-actions"><a href="#historia" className="cs-button cs-button-primary">Recorrer la historia<ArrowDown size={17} aria-hidden="true" /></a>{project.status && <span className="cs-status"><span />{STATUSES[project.status] || project.status}</span>}</div></div>
      {cover ? <div className="cs-hero-art"><span className="cs-handnote cs-hero-note">Un instante de tu historia<ArrowDownRight size={42} strokeWidth={1.1} aria-hidden="true" /></span><button className="cs-cover-photo" onClick={() => openPhoto(cover, 0)} aria-label={`Ampliar portada: ${cover.title}`}><span className="cs-tape cs-tape-top" aria-hidden="true" /><span className="cs-cover-image"><StoryPhoto src={cover.images![0]} alt={demo ? `${cover.title}. Imagen ilustrativa de una historia ficticia.` : `${cover.title}. Fotografía de la obra.`} eager /><span className="cs-photo-zoom"><ZoomIn size={19} aria-hidden="true" /></span></span><span className="cs-cover-caption"><span>{demo ? 'Imagen ilustrativa — historia ficticia' : cover.title}</span><span>{demo ? 'Imagen ilustrativa' : dateLabel(cover.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></span></button><span className="cs-hero-stamp" aria-hidden="true">Hecho paso<br />a paso<Waves size={26} strokeWidth={1.3} /></span></div> : <div className="cs-type-art" aria-hidden="true"><span className="cs-type-art-number">01</span><Waves size={80} strokeWidth={1} /><span className="cs-handnote">Las grandes historias<br />tienen un comienzo.</span></div>}
      <div className="cs-hero-footer"><span><BookOpen size={16} aria-hidden="true" />{chronological.length} {chronological.length === 1 ? 'capítulo publicado' : 'capítulos publicados'}</span><span><Camera size={16} aria-hidden="true" />{photos.length} {photos.length === 1 ? 'fotografía' : 'fotografías'}</span>{latest && <span className="cs-latest-date">Última novedad: {dateLabel(latest.createdAt, { day: 'numeric', month: 'short' })}</span>}</div>
      </section>
      <section className="cs-story-section" id="historia" aria-labelledby="cs-history-title"><div className="cs-section-heading"><div><span className="cs-eyebrow">El diario de la obra</span><h2 id="cs-history-title">Así se va escribiendo.</h2></div><p>Fotos y novedades compartidas por tu equipo,<br className="cs-desktop-break" /> reunidas en un mismo lugar.</p></div>
        <div className="cs-story-toolbar"><div className="cs-order" role="group" aria-label="Orden de los capítulos"><button aria-pressed={order === 'oldest'} onClick={() => setOrder('oldest')}>Desde el inicio</button><button aria-pressed={order === 'newest'} onClick={() => setOrder('newest')}>Lo último primero</button></div><label className="cs-photo-filter"><input type="checkbox" checked={onlyPhotos} onChange={event => setOnlyPhotos(event.target.checked)} /><Camera size={16} aria-hidden="true" />Con fotografías</label><span className="cs-reading-label">Lectura {reading}%</span></div>
        <div className="cs-story-layout"><aside className="cs-index"><div className="cs-index-inner"><span className="cs-eyebrow">En este cuaderno</span><nav aria-label="Índice de capítulos"><ol>{ordered.map(entry => <li key={entry.id}><a href={`#capitulo-${entry.id}`}><span>{String(chronological.findIndex(item => item.id === entry.id) + 1).padStart(2, '0')}</span>{entry.title}</a></li>)}</ol></nav><a href="#conversacion" className="cs-index-conversation">Tu voz en esta historia<ArrowRight size={16} aria-hidden="true" /></a><div className="cs-index-doodle" aria-hidden="true"><Waves size={52} strokeWidth={1} /><p>Los detalles también<br />son parte del recuerdo.</p></div></div></aside>
        <div className="cs-chapters" aria-live="polite">{ordered.length === 0 ? <div className="cs-empty"><BookOpen size={38} strokeWidth={1.2} aria-hidden="true" /><h3>{onlyPhotos && chronological.length ? 'Las fotos tendrán su capítulo.' : 'El primer capítulo está por llegar.'}</h3><p>{onlyPhotos && chronological.length ? 'Todavía no hay capítulos con fotografías. Podés volver a ver todas las novedades.' : 'Cuando el equipo publique una novedad, la vas a encontrar acá. Este espacio guarda la historia de tu piscina.'}</p>{onlyPhotos && chronological.length > 0 && <button className="cs-button" onClick={() => setOnlyPhotos(false)}>Ver todos los capítulos<ArrowRight size={16} /></button>}</div> : ordered.map(entry => {
          const chapter = chronological.findIndex(item => item.id === entry.id) + 1;
          return <article className={`cs-chapter ${entry.images?.length ? 'cs-chapter-with-photos' : ''}`} key={entry.id} id={`capitulo-${entry.id}`}><div className="cs-chapter-meta"><span className="cs-chapter-number">{String(chapter).padStart(2, '0')}</span><div><span className="cs-eyebrow">{CATEGORIES[entry.category || 'OTHER'] || 'Novedad de la obra'}</span><time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time></div>{entry.id === latest?.id && <span className="cs-latest-badge">Última novedad</span>}</div><h3>{entry.title}</h3>{entry.description && <div className="cs-chapter-copy">{entry.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {!!entry.images?.length && <div className={`cs-chapter-photos ${entry.images.length === 1 ? 'cs-single-photo' : ''}`}>{entry.images.map((src, index) => <figure key={`${src}-${index}`} className="cs-polaroid"><button onClick={() => openPhoto(entry, index)} aria-label={`Ampliar fotografía ${index + 1} de ${entry.title}`}><StoryPhoto src={src} alt={demo ? `${entry.title}. Imagen ilustrativa de una historia ficticia.` : `${entry.title}. Fotografía ${index + 1} de la obra.`} /><span className="cs-photo-zoom"><ZoomIn size={18} aria-hidden="true" /></span></button><figcaption><span>{demo ? 'Imagen ilustrativa' : index === 0 ? 'En imágenes' : 'Otro detalle de este capítulo'}</span><span>{String(index + 1).padStart(2, '0')}</span></figcaption></figure>)}</div>}
          <div className="cs-chapter-signoff"><span /><span>Una página de tu piscina</span><Waves size={20} strokeWidth={1.4} aria-hidden="true" /></div></article>;
        })}</div></div>
      </section>
      <div className="cs-interlude"><Waves size={43} strokeWidth={1.1} aria-hidden="true" /><p>Una piscina se construye paso a paso.<br /><em>Un recorrido para volver a mirar.</em></p><span className="cs-eyebrow">Tu proyecto, de cerca.</span></div>
      <StoryComments comments={comments} onSendComment={onSendComment} demo={demo} />
    </main>
    <footer className="cs-footer"><a href={backHref}><ArrowLeft size={16} aria-hidden="true" />{demo ? 'Volver a Pool Installer' : 'Acceso de clientes'}</a><span>Un cuaderno de <strong>poolinstaller</strong></span><a href="#cs-title">Volver al comienzo<ArrowDown className="cs-arrow-up" size={16} aria-hidden="true" /></a></footer>
    {photoIndex !== null && photos[photoIndex] && <PhotoGallery photos={photos} index={photoIndex} onIndex={setPhotoIndex} onClose={() => setPhotoIndex(null)} demo={demo} />}
  </div>;
}
