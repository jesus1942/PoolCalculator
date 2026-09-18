import React from 'react';
import { Landing } from '@/pages/Landing';
import { Footer } from '@/components/layout/Footer';

/** Composición única: escena en el hero y un solo pie compartido con la aplicación. */
export const LandingExperience: React.FC = () => (
  <div className="landing-experience-v3">
    <Landing />
    <Footer />
  </div>
);
