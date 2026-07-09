import React from 'react';
import { HdX } from '@/components/ui/HandDrawnIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  // Ventana emergente "Artesanal Sobrio": panel = tarjeta (--card) con borde
  // fuerte sobre el velo (--overlay); título en mono como en los mockups.
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 transition-opacity"
          style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(1.5px)' }}
          onClick={onClose}
        />

        <div className={`relative z-[1001] w-full ${sizeClasses[size]}`}>
          <div
            className="max-h-[90vh] overflow-hidden rounded-2xl"
            style={{ backgroundColor: 'var(--card)', border: '1.6px solid var(--hair-strong)' }}
          >
            <div className="max-h-[90vh] overflow-y-auto px-4 pt-5 pb-4 sm:p-8" style={{ color: 'var(--ink)' }}>
              <div className="flex items-center justify-between gap-3 mb-6">
                <h3
                  className="text-xl sm:text-2xl font-semibold"
                  style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--ink-soft)' }}
                  aria-label="Cerrar"
                >
                  <HdX size={24} />
                </button>
              </div>
              <div style={{ color: 'var(--ink)' }}>
                {children}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
