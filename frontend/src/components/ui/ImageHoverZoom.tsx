import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageHoverZoomProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  images?: string[]; // Array de imágenes para navegación
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export const ImageHoverZoom: React.FC<ImageHoverZoomProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  images = [],
  currentIndex = 0,
  onNavigate,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);

  const hasMultipleImages = images.length > 1;
  const displayImages = images.length > 0 ? images : [src];
  const currentSrc = displayImages[currentImageIndex] || src;

  // Hook para cerrar con ESC y navegar con flechas
  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
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
    const newIndex = (currentImageIndex + 1) % displayImages.length;
    setCurrentImageIndex(newIndex);
    if (onNavigate) onNavigate(newIndex);
  };

  const navigatePrevious = () => {
    const newIndex = (currentImageIndex - 1 + displayImages.length) % displayImages.length;
    setCurrentImageIndex(newIndex);
    if (onNavigate) onNavigate(newIndex);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
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
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[10000] bg-black bg-opacity-95 flex items-center justify-center p-8 animate-fade-in"
          onClick={closeFullscreen}
        >
          {/* Botón cerrar */}
          <button
            onClick={closeFullscreen}
            className="absolute top-6 right-6 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-200 backdrop-blur-sm hover:scale-110"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
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
              <ChevronLeft className="w-8 h-8" />
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
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Imagen centrada con animación suave */}
          <div className="relative max-w-[85vw] max-h-[85vh] flex items-center justify-center">
            <img
              src={currentSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in-smooth"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Indicador de imagen actual */}
          {hasMultipleImages && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              {currentImageIndex + 1} / {displayImages.length}
            </div>
          )}

          {/* Nombre de la imagen */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-full text-base backdrop-blur-sm max-w-[80vw] truncate">
            {alt}
          </div>

          {/* Hints de navegación */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm">
            {hasMultipleImages ? '← → para navegar • ' : ''}ESC para cerrar
          </div>
        </div>
      )}

      <style>{`
        @keyframes zoom-in-smooth {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
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

        .animate-zoom-in-smooth {
          animation: zoom-in-smooth 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
