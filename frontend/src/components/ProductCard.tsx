import React, { useState } from 'react';
import { productImageService } from '@/services/productImageService';
import { Edit, Trash2, Package, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ProductCardProps {
  name: string;
  type: string;
  imageUrl?: string | null;
  additionalImages?: string[];
  price: number;
  details: Array<{ label: string; value: string | null | undefined }>;
  badges?: (string | false | undefined | null)[];
  onEdit: () => void;
  onDelete: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  type,
  imageUrl,
  additionalImages = [],
  price,
  details,
  badges = [],
  onEdit,
  onDelete
}) => {
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // All images (main + additional)
  const allImages = [imageUrl, ...additionalImages].filter((url): url is string => !!url);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    return productImageService.getImageUrl(url);
  };

  const handleImageClick = () => {
    if (allImages.length > 0) {
      setShowGallery(true);
      setCurrentImageIndex(0);
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const filteredBadges = badges.filter((badge): badge is string => !!badge);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-4 md:p-6">
          {/* Layout: Horizontal on desktop, vertical on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Image Section */}
            <div className="flex-shrink-0">
              <div
                onClick={handleImageClick}
                className={`w-full sm:w-28 h-28 rounded-lg border-2 border-gray-200 overflow-hidden ${
                  allImages.length > 0 ? 'cursor-pointer hover:border-blue-400 transition-all' : ''
                }`}
              >
                {imageUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={getImageUrl(imageUrl) || undefined}
                      alt={name}
                      className="w-full h-full object-contain bg-gray-50 group-hover:scale-105 transition-transform"
                    />
                    {additionalImages.length > 0 && (
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        +{additionalImages.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <Package className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Sin imagen</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{name}</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {type}
                    </span>
                    {filteredBadges.map((badge, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={onEdit}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-3">
                {details
                  .filter(detail => detail.value)
                  .map((detail, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <span className="text-gray-600 mr-2">{detail.label}:</span>
                      <span className="text-gray-900 font-medium">{detail.value}</span>
                    </div>
                  ))}
              </div>

              {/* Price */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Precio:</span>
                  <span className="text-lg font-bold text-blue-600">{formatPrice(price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Image Gallery Modal */}
      {showGallery && allImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGallery(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowGallery(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Image */}
            <div className="bg-white rounded-lg p-4">
              <img
                src={getImageUrl(allImages[currentImageIndex]) || undefined}
                alt={`${name} - Imagen ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />

              {/* Navigation */}
              {allImages.length > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={handlePrevImage}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <span className="text-sm text-gray-600">
                    {currentImageIndex + 1} / {allImages.length}
                  </span>

                  <button
                    onClick={handleNextImage}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
