import React from 'react';
import { Landing } from '@/pages/Landing';
import { Footer } from '@/components/layout/Footer';

/**
 * Mantiene el contenido comercial existente y sustituye únicamente el footer
 * legado por la firma técnica V2. La landing usa la variante showcase para
 * que la escena 3D sea una pieza protagonista y no una miniatura decorativa.
 */
export const LandingExperience: React.FC = () => (
  <div className="landing-experience-v2">
    <div className="landing-experience-v2__legacy">
      <Landing />
    </div>
    <Footer showcase />
  </div>
);
