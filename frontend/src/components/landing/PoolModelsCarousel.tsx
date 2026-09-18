import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Droplet, Ruler, Waves } from 'lucide-react';
import { poolPresetService } from '@/services/poolPresetService';
import { getImageUrl } from '@/utils/imageUtils';
import { PoolPreset } from '@/types';
import { CarouselControls, TiltCard, useLandingCarousel } from './LandingMotion';

/** Fotografía del catálogo, con alternativa explícita si la imagen no carga. */
function ModelImage({ model }: { model: PoolPreset }) {
  const [failed, setFailed] = useState(false);
  return model.imageUrl && !failed
    ? <img src={getImageUrl(model.imageUrl)} alt={`Modelo de piscina ${model.name}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <div className="pl-model-no-image"><Waves size={54} /><span>Modelo {model.name}</span><small>Fotografía no disponible</small></div>;
}

/** Publica únicamente los modelos recibidos del catálogo, sin cifras fijas. */
export const PoolModelsCarousel: React.FC = () => {
  const [models, setModels] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const carousel = useLandingCarousel(models.length);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    poolPresetService.getAll().then(data => {
      if (!cancelled) setModels(data);
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  if (loading) return <div className="pl-loading" role="status">Cargando el catálogo…</div>;
  if (error) return <div className="pl-empty" role="status"><Waves size={30} /><h3>No pudimos cargar el catálogo.</h3><p>Podés volver a intentarlo sin salir de esta página.</p><button className="pl-button pl-button--secondary" type="button" onClick={() => setAttempt(n => n + 1)}>Reintentar</button></div>;
  if (!models.length) return <div className="pl-empty"><Waves size={30} /><h3>El catálogo todavía no tiene modelos disponibles.</h3><a className="pl-text-link" href="#contact">Consultar por la aplicación <ArrowUpRight size={18} /></a></div>;

  const model = models[carousel.index];
  const shapes: Record<string, string> = { RECTANGULAR: 'Rectangular', CIRCULAR: 'Circular', OVAL: 'Ovalada', JACUZZI: 'Jacuzzi' };
  return (
    <div className="pl-model-carousel" role="region" aria-roledescription="carrusel" aria-label="Modelos del catálogo" tabIndex={0} {...carousel.handlers}>
      <div className="pl-model-toolbar"><span>{models.length} modelos en el catálogo</span><label className="pl-model-select">Ir a un modelo<select value={model.id} onChange={event => carousel.select(models.findIndex(item => item.id === event.target.value))}>{models.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
      <div className="pl-model-stage">
        <TiltCard>
          <article key={model.id} className="pl-model-card pl-slide" style={{ '--slide-direction': carousel.direction } as React.CSSProperties} aria-label={`Modelo ${carousel.index + 1} de ${models.length}: ${model.name}`}>
            <div className="pl-model-image"><ModelImage model={model} /><span className="pl-model-image-tag">{shapes[model.shape] || model.shape}</span></div>
            <div className="pl-model-info">
              <p className="pl-kicker">FICHA DEL CATÁLOGO</p><h3>{model.name}</h3>
              {model.description && <p className="pl-model-description">{model.description}</p>}
              <dl className="pl-model-specs"><div><Ruler size={21} /><div><dt>Largo × ancho</dt><dd>{model.length} × {model.width} m</dd></div></div><div><Droplet size={21} /><div><dt>Profundidad del modelo</dt><dd>{model.depth}{model.depthEnd && model.depthEnd !== model.depth ? `–${model.depthEnd}` : ''} m</dd></div></div></dl>
              <p className="pl-small">Explorá las fichas para conocer los modelos que podés usar en tus proyectos.</p>
              <a className="pl-button pl-button--secondary" href="#calculator">Probar el buscador <ArrowUpRight size={18} /></a>
            </div>
          </article>
        </TiltCard>
      </div>
      <div className="pl-showcase-bottom"><span>Deslizá, usá las flechas o elegí un modelo.</span><CarouselControls {...carousel} count={models.length} label="modelo" /></div>
    </div>
  );
};
