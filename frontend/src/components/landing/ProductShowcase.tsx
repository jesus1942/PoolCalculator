import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ClipboardList, FileText, FolderOpen, Share2 } from 'lucide-react';
import { CarouselControls, TiltCard, useLandingCarousel } from './LandingMotion';
import { clientStoryDemoImage, clientStoryDemoProject } from '@/data/clientStoryDemo';

const features = [
  {
    id: 'projects', short: 'Organizá', title: 'Tu próxima obra empieza con orden.', icon: FolderOpen,
    description: 'Reuní el cliente, el modelo y el estado del proyecto en una misma ficha. Volvé a cada obra con su contexto a mano.',
    highlights: ['Una ficha por proyecto', 'Modelos y medidas vinculados', 'Estados para seguir el avance'],
  },
  {
    id: 'budget', short: 'Presupuestá', title: 'Cada partida tiene su lugar.', icon: FileText,
    description: 'Revisá materiales, equipos y mano de obra dentro del proyecto. Armá un presupuesto con el detalle que necesitás compartir.',
    highlights: ['Materiales y equipos organizados', 'Costos asociados a la obra', 'Exportación de documentación'],
  },
  {
    id: 'team', short: 'Coordiná', title: 'El equipo sabe qué sigue.', icon: ClipboardList,
    description: 'Organizá las tareas del proyecto y consultá su estado. Los pendientes dejan de depender de una conversación suelta.',
    highlights: ['Tareas dentro del proyecto', 'Responsables y estados', 'Agenda para organizar el trabajo'],
  },
  {
    id: 'share', short: 'Compartí', title: 'Cada piscina tiene una historia.', icon: Share2,
    description: 'Invitá a tu cliente a vivir la transformación de su patio. Las fotos y los avances se convierten en un diario de su propia obra.',
    highlights: ['Fotos reales en cada capítulo', 'Un diario para volver a recorrer', 'Conversaciones con el equipo'],
  },
];

/** Vista de muestra: los ejemplos ilustran la interfaz y no son clientes reales. */
function ShowcasePreview({ featureId }: { featureId: string }) {
  return (
    <div className="pl-preview">
      <div className="pl-preview-header"><span>POOL INSTALLER</span><span className="pl-example">DATOS DE EJEMPLO</span></div>
      <div className="pl-preview-body">
        <div className="pl-preview-caption">{featureId === 'share' ? 'El cuaderno del cliente' : 'Mi espacio de trabajo'}</div>
        <h4>{featureId === 'projects' ? 'Cada obra, en su lugar' : featureId === 'budget' ? 'Presupuesto de obra' : featureId === 'team' ? 'Próximas tareas' : clientStoryDemoProject.name}</h4>
        {featureId === 'projects' && <>
          <div className="pl-preview-counts"><div><strong>03</strong><span>Proyectos</span></div><div><strong>02</strong><span>En curso</span></div><div><strong>01</strong><span>Por aprobar</span></div></div>
          <div className="pl-project-row"><FolderOpen size={19} /><div><strong>Patio residencial</strong><span>Ficha del proyecto · actualizada</span></div><span className="pl-status">En curso</span></div>
          <div className="pl-project-row"><FolderOpen size={19} /><div><strong>Casa de fin de semana</strong><span>Presupuesto en revisión</span></div><span className="pl-status pl-status--warm">Por aprobar</span></div>
          <div className="pl-project-row"><FolderOpen size={19} /><div><strong>Renovación de jardín</strong><span>Equipo asignado</span></div><span className="pl-status">En curso</span></div>
        </>}
        {featureId === 'budget' && <>
          <p className="pl-preview-note">Patio residencial · revisión 01</p>
          <table className="pl-budget-table"><thead><tr><th>Partida</th><th>Estado</th></tr></thead><tbody>
            <tr><td>Materiales</td><td><Check size={15} /> Cargados</td></tr>
            <tr><td>Equipos</td><td><Check size={15} /> Vinculados</td></tr>
            <tr><td>Mano de obra</td><td>En revisión</td></tr>
            <tr><td>Adicionales</td><td>Por definir</td></tr>
          </tbody></table>
          <div className="pl-preview-summary"><FileText size={20} /><div><strong>Documentación de la obra</strong><span>Revisá el detalle antes de compartirlo.</span></div></div>
        </>}
        {featureId === 'team' && <>
          <p className="pl-preview-note">Patio residencial · tablero de tareas</p>
          <div className="pl-task-row"><Check size={18} /><div><strong>Relevamiento del proyecto</strong><span>Finalizado · equipo de obra</span></div><span className="pl-status">Listo</span></div>
          <div className="pl-task-row"><ClipboardList size={18} /><div><strong>Revisar presupuesto</strong><span>Administración</span></div><span className="pl-status pl-status--warm">En curso</span></div>
          <div className="pl-task-row"><ClipboardList size={18} /><div><strong>Coordinar entrega</strong><span>Logística</span></div><span className="pl-status">Pendiente</span></div>
          <div className="pl-preview-summary"><strong>Lo próximo, a la vista.</strong><span>Una tarea. Un responsable. Un estado.</span></div>
        </>}
        {featureId === 'share' && <>
          <figure className="pl-story-teaser-photo">
            <img src={clientStoryDemoImage} alt="Jardín con piscina al atardecer, imagen ilustrativa de la historia de ejemplo" loading="lazy" width="1672" height="941" />
            <figcaption>IMAGEN ILUSTRATIVA · HISTORIA FICTICIA</figcaption>
          </figure>
          <div className="pl-story-teaser-entry"><span>CAPÍTULO 01</span><strong>Antes del agua, una idea.</strong><p>Un rincón del patio. Una conversación. Y las ganas de imaginar los días de verano.</p></div>
          <Link to="/demo/historia" className="pl-story-teaser-link">Abrir el diario del cliente <ArrowUpRight size={16} /></Link>
        </>}
      </div>
      <div className="pl-preview-footer"><span>Una misma obra. Toda la información.</span><span>PI / 01</span></div>
    </div>
  );
}

/** Recorrido interactivo con perspectiva suave, sin rotación automática. */
export const ProductShowcase: React.FC = () => {
  const carousel = useLandingCarousel(features.length);
  const feature = features[carousel.index];
  return (
    <div className="pl-showcase" role="region" aria-roledescription="carrusel" aria-label="Recorrido por Pool Installer" tabIndex={0} {...carousel.handlers}>
      <div className="pl-showcase-tabs" aria-label="Elegir una función">
        {features.map((item, index) => <button key={item.id} type="button" onClick={() => carousel.select(index)} aria-pressed={carousel.index === index} aria-controls="product-showcase-panel"><span>0{index + 1}</span><item.icon size={18} />{item.short}</button>)}
      </div>
      <div id="product-showcase-panel" className="pl-showcase-content">
        <div className="pl-showcase-copy" aria-live="polite" aria-atomic="true">
          <p className="pl-kicker">DEL PRIMER DATO AL ÚLTIMO PENDIENTE</p>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <ul>{feature.highlights.map(item => <li key={item}><Check size={17} />{item}</li>)}</ul>
          {feature.id === 'share'
            ? <Link className="pl-text-link" to="/demo/historia">Viví la historia de ejemplo <ArrowUpRight size={18} /></Link>
            : <a className="pl-text-link" href="#calculator">Probá el buscador de modelos <ArrowUpRight size={18} /></a>}
        </div>
        <div className="pl-deck-stage">
          <TiltCard className="pl-deck-card">
            <div key={feature.id} className="pl-slide" style={{ '--slide-direction': carousel.direction } as React.CSSProperties}>
              <ShowcasePreview featureId={feature.id} />
            </div>
          </TiltCard>
        </div>
      </div>
      <div className="pl-showcase-bottom"><span>Pasá de una función a otra. A tu ritmo.</span><CarouselControls {...carousel} count={features.length} label="función" /></div>
    </div>
  );
};
