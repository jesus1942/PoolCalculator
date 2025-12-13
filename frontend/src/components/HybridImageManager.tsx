import React, { useState } from 'react';
import { ProductImageUploader } from './ProductImageUploader';
import { productImageService, ProductType } from '@/services/productImageService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link, Upload, X, Check, AlertCircle, Loader } from 'lucide-react';

interface HybridImageManagerProps {
  productType: ProductType;
  productId?: string;
  currentImageUrl?: string | null;
  currentAdditionalImages?: string[];
  onImageUploaded?: (imageUrl: string) => void;
  onImageDeleted?: () => void;
  onAdditionalImagesUploaded?: (imageUrls: string[]) => void;
  onAdditionalImageDeleted?: (index: number) => void;
  onImageUrlChanged?: (url: string) => void;
  onAdditionalImageUrlsChanged?: (urls: string[]) => void;
  mode?: 'create' | 'edit';
}

export const HybridImageManager: React.FC<HybridImageManagerProps> = ({
  productType,
  productId,
  currentImageUrl,
  currentAdditionalImages = [],
  onImageUploaded,
  onImageDeleted,
  onAdditionalImagesUploaded,
  onAdditionalImageDeleted,
  onImageUrlChanged,
  onAdditionalImageUrlsChanged,
  mode = 'edit'
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(['']);
  const [savingMainUrl, setSavingMainUrl] = useState(false);
  const [savingAdditionalUrls, setSavingAdditionalUrls] = useState(false);
  const [validatingMainUrl, setValidatingMainUrl] = useState(false);
  const [mainUrlValid, setMainUrlValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate main image URL
  const handleValidateMainUrl = async (url: string) => {
    setMainImageUrl(url);
    setMainUrlValid(null);

    const validation = productImageService.validateUrlFormat(url);
    if (!validation.valid) {
      setMainUrlValid(false);
      return;
    }

    setValidatingMainUrl(true);
    const isValid = await productImageService.validateImageUrl(url);
    setMainUrlValid(isValid);
    setValidatingMainUrl(false);
  };

  // Save main image URL
  const handleSaveMainImageUrl = async () => {
    if (!mainImageUrl || !productId) return;

    const validation = productImageService.validateUrlFormat(mainImageUrl);
    if (!validation.valid) {
      setError(validation.error || 'URL inválida');
      return;
    }

    setSavingMainUrl(true);
    setError(null);

    try {
      if (mode === 'edit' && productId) {
        await productImageService.saveImageUrl(productType, productId, mainImageUrl);
        onImageUploaded?.(mainImageUrl);
        setMainImageUrl('');
        setMainUrlValid(null);
      } else {
        onImageUrlChanged?.(mainImageUrl);
      }
    } catch (err: any) {
      console.error('Error saving image URL:', err);
      setError(err.response?.data?.error || 'Error al guardar URL de imagen');
    } finally {
      setSavingMainUrl(false);
    }
  };

  // Add additional URL input
  const handleAddAdditionalUrl = () => {
    if (additionalUrls.length < 5) {
      setAdditionalUrls([...additionalUrls, '']);
    }
  };

  // Remove additional URL input
  const handleRemoveAdditionalUrl = (index: number) => {
    setAdditionalUrls(additionalUrls.filter((_, i) => i !== index));
  };

  // Update additional URL
  const handleUpdateAdditionalUrl = (index: number, value: string) => {
    const newUrls = [...additionalUrls];
    newUrls[index] = value;
    setAdditionalUrls(newUrls);
  };

  // Save additional image URLs
  const handleSaveAdditionalUrls = async () => {
    const validUrls = additionalUrls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Ingrese al menos una URL');
      return;
    }

    const validation = productImageService.validateUrlsFormat(validUrls);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    setSavingAdditionalUrls(true);
    setError(null);

    try {
      if (mode === 'edit' && productId) {
        await productImageService.saveAdditionalImageUrls(productType, productId, validUrls);
        onAdditionalImagesUploaded?.(validUrls);
        setAdditionalUrls(['']);
      } else {
        onAdditionalImageUrlsChanged?.(validUrls);
      }
    } catch (err: any) {
      console.error('Error saving additional URLs:', err);
      setError(err.response?.data?.error || 'Error al guardar URLs de imágenes');
    } finally {
      setSavingAdditionalUrls(false);
    }
  };

  // Show message for create mode
  if (mode === 'create') {
    return (
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">Guardar producto primero</p>
            <p className="text-sm text-blue-700">
              Para agregar imágenes, primero guarda el producto y luego podrás editarlo para agregar imágenes.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show message if no productId
  if (!productId) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">ID de producto requerido</p>
            <p className="text-sm text-amber-700">
              No se puede agregar imágenes sin un ID de producto válido.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-1 font-medium text-sm transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Subir Archivo
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-1 font-medium text-sm transition-colors ${
              activeTab === 'url'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4 inline mr-2" />
            Ingresar URL
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? (
        // Upload Tab - Use existing ProductImageUploader
        <ProductImageUploader
          productType={productType}
          productId={productId}
          currentImageUrl={currentImageUrl}
          currentAdditionalImages={currentAdditionalImages}
          onImageUploaded={onImageUploaded}
          onImageDeleted={onImageDeleted}
          onAdditionalImagesUploaded={onAdditionalImagesUploaded}
          onAdditionalImageDeleted={onAdditionalImageDeleted}
        />
      ) : (
        // URL Tab
        <div className="space-y-6">
          {/* Main Image URL */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold mb-4">Imagen Principal - URL</h4>

            {currentImageUrl && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">URL actual:</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-800 truncate flex-1 mr-2">{currentImageUrl}</p>
                  {currentImageUrl && (
                    <img
                      src={productImageService.getImageUrl(currentImageUrl) || undefined}
                      alt="Actual"
                      className="w-16 h-16 object-contain rounded border"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="url"
                  value={mainImageUrl}
                  onChange={(e) => handleValidateMainUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                {validatingMainUrl && (
                  <Loader className="absolute right-3 top-3 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {!validatingMainUrl && mainUrlValid === true && (
                  <Check className="absolute right-3 top-3 w-5 h-5 text-green-600" />
                )}
                {!validatingMainUrl && mainUrlValid === false && mainImageUrl && (
                  <X className="absolute right-3 top-3 w-5 h-5 text-red-600" />
                )}
              </div>

              <p className="text-xs text-gray-500">
                Ingrese la URL completa de la imagen (ej: https://ejemplo.com/imagen.jpg)
              </p>

              <Button
                onClick={handleSaveMainImageUrl}
                disabled={!mainImageUrl || mainUrlValid === false || savingMainUrl}
                variant="primary"
              >
                {savingMainUrl ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar URL
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Additional Images URLs */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold mb-4">Imágenes Adicionales - URLs</h4>

            {currentAdditionalImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">URLs actuales ({currentAdditionalImages.length}):</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {currentAdditionalImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={productImageService.getImageUrl(url) || undefined}
                        alt={`Adicional ${index + 1}`}
                        className="w-full h-24 object-contain rounded border bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1 truncate">{url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {additionalUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUpdateAdditionalUrl(index, e.target.value)}
                    placeholder={`URL imagen ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {additionalUrls.length > 1 && (
                    <button
                      onClick={() => handleRemoveAdditionalUrl(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              {additionalUrls.length < 5 && (
                <Button
                  onClick={handleAddAdditionalUrl}
                  variant="outline"
                  size="sm"
                >
                  + Agregar otra URL
                </Button>
              )}

              <p className="text-xs text-gray-500">
                Puedes agregar hasta 5 URLs de imágenes adicionales
              </p>

              <Button
                onClick={handleSaveAdditionalUrls}
                disabled={savingAdditionalUrls}
                variant="primary"
              >
                {savingAdditionalUrls ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar URLs
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
