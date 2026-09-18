import React from 'react';
import { ArrowUpRight, Check, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Presentación comercial sin precios, límites ni pruebas aún no implementados. */
export const PricingSection: React.FC = () => (
  <div className="pl-commercial">
    <div>
      <p className="pl-kicker">HABLEMOS DE TU FORMA DE TRABAJAR</p>
      <h2>Tu oficio.<br />Tu equipo.<br /><span>Tu espacio de trabajo.</span></h2>
      <p>Contanos cómo organizás tus obras y qué necesitás resolver. Te mostramos la aplicación y conversamos sobre las condiciones para tu empresa.</p>
      <a className="pl-button pl-button--primary" href="#contact">Consultar planes <ArrowUpRight size={18} /></a>
    </div>
    <div className="pl-commercial-note rough-panel">
      <Users size={30} />
      <h3>Conocé la aplicación antes de decidir.</h3>
      <ul><li><Check size={17} />Explorá el recorrido interactivo.</li><li><Check size={17} />Probá el catálogo y el buscador.</li><li><Check size={17} />Consultá el alcance para tu equipo.</li></ul>
      <p>Los precios y las condiciones de suscripción se confirman por contacto comercial. Esta página no realiza cobros.</p>
      <Link to="/register" className="pl-text-link">Crear una cuenta <ArrowUpRight size={18} /></Link>
    </div>
  </div>
);
