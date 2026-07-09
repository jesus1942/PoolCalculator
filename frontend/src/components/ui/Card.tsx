import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

// Tarjeta del sistema "Artesanal Sobrio": el borde/fondo vive en una capa
// separada con el filtro de trazo a mano (#pcRough) para que el contenido
// no se distorsione.
export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`rough-panel rounded-2xl ${className}`}>
      <div className="p-6 relative">
        {title && <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
};
