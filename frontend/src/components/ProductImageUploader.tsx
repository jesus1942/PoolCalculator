import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { productImageService, ProductType } from '@/services/productImageService';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';

interface ProductImageUploaderProps {
  productType: ProductType;
  productId: string;
  currentImageUrl?: string | null;
  currentAdditionalImages?: string[];
  onImageUploaded?: (imageUrl: string) => void;
  onAdditionalImagesUploaded?: (imageUrls: string[]) => void;
  onImageDeleted?: () => void;
  onAdditionalImageDeleted?: (index: number) => void;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productType,
  productId,
  currentImageUrl,
  currentAdditionalImages = [],
  onImageUploaded,
  onAdditionalImagesUploaded,
  onImageDeleted,
  onAdditionalImageDeleted,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = productImageService.validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Archivo no válido');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await productImageService.uploadMainImage(productType, productId, file);
      setError(null);
      onImageUploaded?.(result.imageUrl);

      // Reset input
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.error || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleAdditionalImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validation = productImageService.validateImageFiles(files);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    setUploadingMultiple(true);
    setError(null);

    try {
      const result = await productImageService.uploadAdditionalImages(productType, productId, files);
      setError(null);
      onAdditionalImagesUploaded?.(result.imageUrls);

      // Reset input
      if (additionalImagesInputRef.current) {
        additionalImagesInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading additional images:', err);
      setError(err.response?.data?.error || 'Error al subir las imágenes adicionales');
    } finally {
      setUploadingMultiple(false);
    }
  };

  const handleDeleteMainImage = async () => {
    if (!window.confirm('¿Está seguro de eliminar la imagen principal?')) {
      return;
    }

    try {
      await productImageService.deleteMainImage(productType, productId);
      onImageDeleted?.();
    } catch (err: any) {
      console.error('Error deleting image:', err);
      setError(err.response?.data?.error || 'Error al eliminar la imagen');
    }
  };

  const handleDeleteAdditionalImage = async (index: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta imagen?')) {
      return;
    }

    try {
      await productImageService.deleteAdditionalImage(productType, productId, index);
      onAdditionalImageDeleted?.(index);
    } catch (err: any) {
      console.error('Error deleting additional image:', err);
      setError(err.response?.data?.error || 'Error al eliminar la imagen adicional');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Main Image Section */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
          Imagen Principal
        </h4>

        <div className="space-y-4">
          {currentImageUrl ? (
            <div className="relative inline-block">
              <img
                src={productImageService.getImageUrl(currentImageUrl) || undefined}
                alt="Imagen principal"
                className="w-64 h-64 object-contain rounded-lg border-2 border-gray-300"
              />
              <button
                type="button"
                onClick={handleDeleteMainImage}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
                title="Eliminar imagen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Sin imagen</p>
              </div>
            </div>
          )}

          <div>
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleMainImageUpload}
              className="hidden"
              id="main-image-upload"
            />
            <Button
              as="label"
              htmlFor="main-image-upload"
              variant="outline"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {currentImageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Formatos: JPEG, PNG, GIF, WebP. Tamaño máximo: 5MB
            </p>
          </div>
        </div>
      </Card>

      {/* Additional Images Section */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-purple-600" />
          Imágenes Adicionales
        </h4>

        {currentAdditionalImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {currentAdditionalImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={productImageService.getImageUrl(imageUrl) || undefined}
                  alt={`Imagen adicional ${index + 1}`}
                  className="w-full h-32 object-contain rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteAdditionalImage(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Eliminar imagen"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {currentAdditionalImages.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay imágenes adicionales</p>
          </div>
        )}

        <div className="mt-4">
          <input
            ref={additionalImagesInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={handleAdditionalImagesUpload}
            className="hidden"
            id="additional-images-upload"
          />
          <Button
            as="label"
            htmlFor="additional-images-upload"
            variant="outline"
            disabled={uploadingMultiple}
          >
            {uploadingMultiple ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir Imágenes Adicionales
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Seleccione hasta 5 imágenes. Formatos: JPEG, PNG, GIF, WebP. Tamaño máximo: 5MB cada una
          </p>
        </div>
      </Card>
    </div>
  );
};
