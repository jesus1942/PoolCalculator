import React from 'react';
import { Landing } from '@/pages/Landing';
import { Footer } from '@/components/layout/Footer';

/**
 * Mantiene el contenido comercial existente y sustituye únicamente el footer
 * legado por la firma técnica V2. Así la migración visual puede avanzar sin
 * duplicar ni romper calculador, testimonios, precios o formularios actuales.
 */
export const LandingExperience: React.FC = () => (
  <div className="landing-experience-v2">
    <div className="landing-experience-v2__legacy">
      <Landing />
    </div>
    <Footer />
  </div>
);
