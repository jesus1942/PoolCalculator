import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HdX, HdChevronLeft, HdChevronRight } from '@/components/ui/HandDrawnIcons';

interface ImageHoverZoomProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  images?: string[]; // Array de imágenes para navegación
  fullscreenImages?: string[];
  fullscreenLabels?: string[];
  fullscreenIndex?: number;
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export const ImageHoverZoom: React.FC<ImageHoverZoomProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  images = [],
  fullscreenImages = [],
  fullscreenLabels = [],
  fullscreenIndex,
  currentIndex = 0,
  onNavigate,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const inlineImages = images.length > 0 ? images : [src];
  const modalImages = fullscreenImages.length > 0 ? fullscreenImages : inlineImages;
  const initialIndex = fullscreenIndex ?? currentIndex;
  const hasMultipleImages = modalImages.length > 1;
  const currentSrc = src;
  const currentModalSrc = modalImages[currentImageIndex] || src;
  const currentModalLabel = fullscreenLabels[currentImageIndex] || alt;

  React.useEffect(() => {
    setCurrentImageIndex(initialIndex);
  }, [initialIndex, isFullscreen]);

  React.useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  // Hook para cerrar con ESC y navegar con flechas
  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen();
      } else if (e.key === 'ArrowLeft' && hasMultipleImages) {
        navigatePrevious();
      } else if (e.key === 'ArrowRight' && hasMultipleImages) {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentImageIndex, hasMultipleImages]);

  const navigateNext = () => {
    const newIndex = (currentImageIndex + 1) % modalImages.length;
    setCurrentImageIndex(newIndex);
    if (onNavigate) onNavigate(newIndex);
  };

  const navigatePrevious = () => {
    const newIndex = (currentImageIndex - 1 + modalImages.length) % modalImages.length;
    setCurrentImageIndex(newIndex);
    if (onNavigate) onNavigate(newIndex);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageRef.current) {
      setOriginRect(imageRef.current.getBoundingClientRect());
    }
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setOriginRect(null);
  };

  const getLightboxAnimationStyle = (): React.CSSProperties | undefined => {
    if (!originRect || typeof window === 'undefined') {
      return undefined;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetWidth = Math.min(viewportWidth * 0.9, viewportHeight * 1.25, 1200);
    const targetHeight = Math.min(viewportHeight * 0.88, viewportWidth * 0.8, 900);
    const scaleX = originRect.width / targetWidth;
    const scaleY = originRect.height / targetHeight;
    const translateX = originRect.left + originRect.width / 2 - viewportWidth / 2;
    const translateY = originRect.top + originRect.height / 2 - viewportHeight / 2;

    return {
      '--lightbox-origin-x': `${translateX}px`,
      '--lightbox-origin-y': `${translateY}px`,
      '--lightbox-scale-x': `${scaleX}`,
      '--lightbox-scale-y': `${scaleY}`,
    } as React.CSSProperties;
  };

  return (
    <>
      {/* Imagen normal con hover suave */}
      <div
        className={`relative ${containerClassName}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          ref={imageRef}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`transition-all duration-300 cursor-zoom-in ${className} ${
            isHovered ? 'brightness-105 scale-105' : ''
          }`}
          onClick={handleImageClick}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* Indicador de hover */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 pointer-events-none rounded-lg">
            <div className="bg-white bg-opacity-90 px-4 py-2 rounded-full text-sm font-medium text-gray-800 shadow-lg">
              Click para ampliar
            </div>
          </div>
        )}
      </div>

      {/* Modal fullscreen con animación suave */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-8 animate-fade-in backdrop-blur-md"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
          onClick={closeFullscreen}
        >
          {/* Botón cerrar */}
          <button
            onClick={closeFullscreen}
            className="absolute top-6 right-6 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-200 backdrop-blur-sm hover:scale-110"
            aria-label="Cerrar"
          >
            <HdX size={24} className="w-6 h-6" />
          </button>

          {/* Navegación izquierda */}
          {hasMultipleImages && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigatePrevious();
              }}
              className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-4 transition-all duration-200 backdrop-blur-sm hover:scale-110"
              aria-label="Anterior"
            >
              <HdChevronLeft size={32} className="w-8 h-8" />
            </button>
          )}

          {/* Navegación derecha */}
          {hasMultipleImages && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateNext();
              }}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-4 transition-all duration-200 backdrop-blur-sm hover:scale-110"
              aria-label="Siguiente"
            >
              <HdChevronRight size={32} className="w-8 h-8" />
            </button>
          )}

          {/* Imagen centrada con animación suave */}
          <div
            className="relative flex max-w-[90vw] max-h-[88vh] items-center justify-center"
            style={getLightboxAnimationStyle()}
          >
            <img
              src={currentModalSrc}
              alt={currentModalLabel}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/20 animate-lightbox-in-from-origin"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Indicador de imagen actual */}
          {hasMultipleImages && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              {currentImageIndex + 1} / {modalImages.length}
            </div>
          )}

          {/* Nombre de la imagen */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-full text-base backdrop-blur-sm max-w-[80vw] truncate">
            {currentModalLabel}
          </div>

          {/* Hints de navegación */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm">
            {hasMultipleImages ? '← → para navegar • ' : ''}ESC para cerrar
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes lightbox-in-from-origin {
          from {
            opacity: 0;
            transform:
              translate(var(--lightbox-origin-x, 0), var(--lightbox-origin-y, 24px))
              scale(var(--lightbox-scale-x, 0.88), var(--lightbox-scale-y, 0.88));
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1, 1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-lightbox-in-from-origin {
          transform-origin: center center;
          animation: lightbox-in-from-origin 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .cursor-zoom-in {
          cursor: zoom-in;
        }
      `}</style>
    </>
  );
};
