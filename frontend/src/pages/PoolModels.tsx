import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { poolPresetService } from '@/services/poolPresetService';
import { PoolPreset, PoolShape } from '@/types';
import { Plus, Edit, Trash2, Upload, X, Waves, Layers, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import FlipCard from '@/components/ui/FlipCard';
import { getImageUrl } from '@/utils/imageUtils';
import { ImageHoverZoom } from '@/components/ui/ImageHoverZoom';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

// Componente de Card individual con FlipCard
const PoolPresetCard: React.FC<{
  preset: PoolPreset;
  onEdit: (preset: PoolPreset) => void;
  onDelete: (id: string) => void;
}> = ({ preset, onEdit, onDelete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Logo por defecto si no hay imágenes adicionales
  const defaultBackImage = publicAssetUrl('logo-isotipo.png');
  const additionalImages = preset.additionalImages && preset.additionalImages.length > 0
    ? preset.additionalImages
    : [defaultBackImage];

  const hasAdditionalContent = preset.backDescription || (preset.additionalImages && preset.additionalImages.length > 0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % additionalImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + additionalImages.length) % additionalImages.length);
  };

  return (
    <div style={{ height: '600px' }}>
      <FlipCard
        disabled={!hasAdditionalContent}
        className="h-full"
        front={
          <div className="group relative overflow-hidden rounded-lg bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 h-full">
            {/* Imagen con zoom hover */}
            {preset.imageUrl && (
              <div className="relative w-full h-48 bg-gray-100">
                <ImageHoverZoom
                  src={getImageUrl(preset.imageUrl) || ''}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
                {hasAdditionalContent && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg z-10 pointer-events-none">
                    Click para más
                  </div>
                )}
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {preset.name}
                  </h3>
                  {preset.description && (
                    <p className="text-sm text-gray-700 mt-1">{preset.description}</p>
                  )}
                </div>
              </div>

              {/* Dimensiones */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-600 text-xs mb-1 font-medium">Dimensiones</p>
                  <p className="text-gray-900 font-bold text-sm">
                    {preset.length}m x {preset.width}m x {preset.depth}m
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-600 text-xs mb-1 font-medium">Forma</p>
                  <p className="text-gray-900 font-bold text-sm capitalize">
                    {preset.shape.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Features Tags */}
              <div className="flex flex-wrap gap-2">
                {preset.hasWetDeck && (
                  <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full font-semibold">
                    Playa humeda
                  </span>
                )}
                {preset.hasSkimmer && (
                  <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full font-semibold">
                    Skimmer x{preset.skimmerCount}
                  </span>
                )}
                {preset.hasBottomDrain && (
                  <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs rounded-full font-semibold">
                    Toma de fondo
                  </span>
                )}
                {preset.hasVacuumIntake && (
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full font-semibold">
                    Barrefondo x{preset.vacuumIntakeCount}
                  </span>
                )}
                {preset.hasHydroJets && (
                  <span className="px-2.5 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs rounded-full font-semibold">
                    Hidrojets x{preset.hydroJetsCount}
                  </span>
                )}
                {preset.hasLighting && (
                  <span className="px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-full font-semibold">
                    Luces x{preset.lightingCount}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(preset);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Edit size={16} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(preset.id);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all duration-200 flex items-center justify-center shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
      }
      back={
        <div className="relative overflow-hidden rounded-lg bg-white border border-gray-200 shadow-md h-full flex flex-col">
          {/* Carrusel de imágenes */}
          <div className="relative w-full h-64 bg-gray-100">
            {additionalImages[currentImageIndex] && (
              <img
                src={getImageUrl(additionalImages[currentImageIndex]) || additionalImages[currentImageIndex]}
                alt={`${preset.name} - Imagen ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}

            {/* Controles de carrusel */}
            {additionalImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  {additionalImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-blue-600 w-6' : 'bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
              Click para volver
            </div>
          </div>

          {/* Descripción del reverso */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">{preset.name}</h3>
            </div>

            {preset.backDescription ? (
              <p className="text-gray-700 text-sm leading-relaxed flex-1">
                {preset.backDescription}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic flex-1">
                Planos y vistas adicionales del modelo {preset.name}.
              </p>
            )}

            <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
              {additionalImages.length > 1
                ? `${additionalImages.length} imágenes disponibles`
                : '1 imagen disponible'}
            </div>
          </div>
        </div>
      }
    />
    </div>
  );
};

export const PoolModels: React.FC = () => {
  const [presets, setPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PoolPreset | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [existingAdditionalImageUrls, setExistingAdditionalImageUrls] = useState<string[]>([]); // URLs de imágenes existentes

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    backDescription: '',
    length: 0,
    width: 0,
    depth: 0,
    depthEnd: 0,
    shape: 'RECTANGULAR' as PoolShape,
    lateralCushionSpace: 0.15,
    floorCushionDepth: 0.10,
    hasWetDeck: false,
    hasStairsOnly: false,
    returnsCount: 2,
    hasHotWaterReturn: false,
    hasHydroJets: false,
    hydroJetsCount: 0,
    hasBottomDrain: true,
    hasVacuumIntake: true,
    vacuumIntakeCount: 1,
    hasSkimmer: true,
    skimmerCount: 1,
    hasLighting: false,
    lightingCount: 0,
    lightingType: '',
  });

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const data = await poolPresetService.getAll();
      setPresets(data);
    } catch (error) {
      console.error('Error al cargar modelos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAdditionalImageFiles(files);

      // Generar previews para todas las imágenes
      Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      ).then(setAdditionalImagePreviews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPreset) {
        await poolPresetService.update(
          editingPreset.id,
          formData,
          imageFile || undefined,
          additionalImageFiles.length > 0 ? additionalImageFiles : undefined,
          existingAdditionalImageUrls // Enviar URLs existentes a mantener
        );
      } else {
        await poolPresetService.create(
          formData,
          imageFile || undefined,
          additionalImageFiles.length > 0 ? additionalImageFiles : undefined
        );
      }
      setShowModal(false);
      resetForm();
      loadPresets();
    } catch (error) {
      console.error('Error al guardar modelo:', error);
    }
  };

  const handleEdit = (preset: PoolPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      backDescription: preset.backDescription || '',
      length: preset.length,
      width: preset.width,
      depth: preset.depth,
      depthEnd: preset.depthEnd || 0,
      shape: preset.shape,
      lateralCushionSpace: preset.lateralCushionSpace,
      floorCushionDepth: preset.floorCushionDepth,
      hasWetDeck: preset.hasWetDeck,
      hasStairsOnly: preset.hasStairsOnly,
      returnsCount: preset.returnsCount,
      hasHotWaterReturn: preset.hasHotWaterReturn,
      hasHydroJets: preset.hasHydroJets,
      hydroJetsCount: preset.hydroJetsCount,
      hasBottomDrain: preset.hasBottomDrain,
      hasVacuumIntake: preset.hasVacuumIntake,
      vacuumIntakeCount: preset.vacuumIntakeCount,
      hasSkimmer: preset.hasSkimmer,
      skimmerCount: preset.skimmerCount,
      hasLighting: preset.hasLighting,
      lightingCount: preset.lightingCount,
      lightingType: preset.lightingType || '',
    });
    if (preset.imageUrl) {
      setImagePreview(getImageUrl(preset.imageUrl) || '');
    }
    if (preset.additionalImages && preset.additionalImages.length > 0) {
      // Guardar las URLs existentes
      setExistingAdditionalImageUrls(preset.additionalImages);
      // Mostrar previews con URL completa para renderizar
      setAdditionalImagePreviews(preset.additionalImages.map(img => getImageUrl(img) || img));
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este modelo?')) {
      try {
        await poolPresetService.delete(id);
        loadPresets();
      } catch (error) {
        console.error('Error al eliminar modelo:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingPreset(null);
    setImageFile(null);
    setImagePreview(null);
    setAdditionalImageFiles([]);
    setAdditionalImagePreviews([]);
    setExistingAdditionalImageUrls([]);
    setFormData({
      name: '',
      description: '',
      backDescription: '',
      length: 0,
      width: 0,
      depth: 0,
      depthEnd: 0,
      shape: 'RECTANGULAR',
      lateralCushionSpace: 0.15,
      floorCushionDepth: 0.10,
      hasWetDeck: false,
      hasStairsOnly: false,
      returnsCount: 2,
      hasHotWaterReturn: false,
      hasHydroJets: false,
      hydroJetsCount: 0,
      hasBottomDrain: true,
      hasVacuumIntake: true,
      vacuumIntakeCount: 1,
      hasSkimmer: true,
      skimmerCount: 1,
      hasLighting: false,
      lightingCount: 0,
      lightingType: '',
    });
  };

  const shapeOptions = [
    { value: 'RECTANGULAR', label: 'Rectangular' },
    { value: 'CIRCULAR', label: 'Circular' },
    { value: 'OVAL', label: 'Ovalada' },
    { value: 'JACUZZI', label: 'Jacuzzi' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Cargando modelos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <Waves className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Modelos de Piscinas
                </h1>
                <p className="text-gray-700 mt-1 font-medium">
                  Administra los modelos completos de piscinas
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all duration-200 hover:shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              <span>Nuevo Modelo</span>
            </button>
          </div>
        </div>

        {/* Grid de Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset) => (
            <PoolPresetCard
              key={preset.id}
              preset={preset}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Modal */}
        <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingPreset ? 'Editar Modelo' : 'Nuevo Modelo'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Imagen del modelo
            </label>
            <div className="flex items-center space-x-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <Upload size={32} className="text-gray-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Upload size={16} className="mr-2" />
                  Subir imagen
                </label>
                <p className="text-xs text-gray-600 mt-2">
                  JPG, PNG, GIF o WEBP. Maximo 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre del modelo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Select
              label="Forma"
              options={shapeOptions}
              value={formData.shape}
              onChange={(e) => setFormData({ ...formData, shape: e.target.value as PoolShape })}
            />
          </div>

          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Imágenes adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Imágenes adicionales (reverso de la card)
            </label>
            <div className="space-y-4">
              {additionalImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={preview}
                        alt={`Additional ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const previewToRemove = additionalImagePreviews[idx];

                          // Si la preview es una URL (no un blob), es una imagen existente
                          if (previewToRemove.startsWith('http')) {
                            // Encontrar la URL original en existingAdditionalImageUrls
                            const urlWithoutBase = existingAdditionalImageUrls[idx];
                            // Eliminar de URLs existentes
                            setExistingAdditionalImageUrls(urls => urls.filter(url => url !== urlWithoutBase));
                          } else {
                            // Es una imagen nueva, eliminar del array de archivos
                            setAdditionalImageFiles(files => files.filter((_, i) => i !== idx));
                          }

                          // Eliminar preview
                          setAdditionalImagePreviews(previews => previews.filter((_, i) => i !== idx));
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesChange}
                  className="hidden"
                  id="additional-images-upload"
                />
                <label
                  htmlFor="additional-images-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Upload size={16} className="mr-2" />
                  Agregar imágenes (máx. 5)
                </label>
                <p className="text-xs text-gray-600 mt-2">
                  Planos, isométricos, vistas adicionales. JPG, PNG. Máximo 5 imágenes.
                </p>
              </div>
            </div>
          </div>

          {/* Descripción del reverso */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Descripción del reverso
            </label>
            <textarea
              value={formData.backDescription}
              onChange={(e) => setFormData({ ...formData, backDescription: e.target.value })}
              rows={3}
              placeholder="Descripción adicional para el reverso de la card..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <p className="text-xs text-gray-600 mt-1">
              Esta descripción se mostrará en el reverso de la card junto con las imágenes adicionales.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Dimensiones</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Largo (m)"
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) })}
                required
              />

              <Input
                label="Ancho (m)"
                type="number"
                step="0.01"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) })}
                required
              />

              <Input
                label="Profundidad inicial (m)"
                type="number"
                step="0.01"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: parseFloat(e.target.value) })}
                required
              />

              <Input
                label="Profundidad final (m) - opcional"
                type="number"
                step="0.01"
                value={formData.depthEnd}
                onChange={(e) => setFormData({ ...formData, depthEnd: parseFloat(e.target.value) })}
              />

              <Input
                label="Espacio lateral para colchón (m)"
                type="number"
                step="0.01"
                value={formData.lateralCushionSpace}
                onChange={(e) => setFormData({ ...formData, lateralCushionSpace: parseFloat(e.target.value) })}
              />

              <Input
                label="Cama de piso (m)"
                type="number"
                step="0.01"
                value={formData.floorCushionDepth}
                onChange={(e) => setFormData({ ...formData, floorCushionDepth: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Caracteristicas generales</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasWetDeck}
                  onChange={(e) => setFormData({ ...formData, hasWetDeck: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Playa humeda</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasStairsOnly}
                  onChange={(e) => setFormData({ ...formData, hasStairsOnly: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Solo escaleras</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Retornos e impulsion</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cantidad de retornos"
                type="number"
                value={formData.returnsCount}
                onChange={(e) => setFormData({ ...formData, returnsCount: parseInt(e.target.value) })}
                min="0"
              />

              <label className="flex items-center space-x-2 pt-7">
                <input
                  type="checkbox"
                  checked={formData.hasHotWaterReturn}
                  onChange={(e) => setFormData({ ...formData, hasHotWaterReturn: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Retorno agua caliente</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasHydroJets}
                  onChange={(e) => setFormData({ ...formData, hasHydroJets: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Boquillas hidrojets</span>
              </label>

              {formData.hasHydroJets && (
                <Input
                  label="Cantidad de hidrojets"
                  type="number"
                  value={formData.hydroJetsCount}
                  onChange={(e) => setFormData({ ...formData, hydroJetsCount: parseInt(e.target.value) })}
                  min="0"
                />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Desagues y limpieza</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasBottomDrain}
                  onChange={(e) => setFormData({ ...formData, hasBottomDrain: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Toma de fondo</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasVacuumIntake}
                  onChange={(e) => setFormData({ ...formData, hasVacuumIntake: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Toma de aspiracion/barrefondo</span>
              </label>

              {formData.hasVacuumIntake && (
                <Input
                  label="Cantidad de tomas de aspiración"
                  type="number"
                  value={formData.vacuumIntakeCount}
                  onChange={(e) => setFormData({ ...formData, vacuumIntakeCount: parseInt(e.target.value) })}
                  min="1"
                />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Skimmers</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasSkimmer}
                  onChange={(e) => setFormData({ ...formData, hasSkimmer: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Skimmer</span>
              </label>

              {formData.hasSkimmer && (
                <Input
                  label="Cantidad de skimmers"
                  type="number"
                  value={formData.skimmerCount}
                  onChange={(e) => setFormData({ ...formData, skimmerCount: parseInt(e.target.value) })}
                  min="1"
                />
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Iluminacion</h3>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasLighting}
                  onChange={(e) => setFormData({ ...formData, hasLighting: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Luces</span>
              </label>

              {formData.hasLighting && (
                <>
                  <Input
                    label="Cantidad de luces"
                    type="number"
                    value={formData.lightingCount}
                    onChange={(e) => setFormData({ ...formData, lightingCount: parseInt(e.target.value) })}
                    min="1"
                  />

                  <Input
                    label="Tipo de iluminación"
                    placeholder="LED, halógeno, fibra óptica"
                    value={formData.lightingType}
                    onChange={(e) => setFormData({ ...formData, lightingType: e.target.value })}
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md"
            >
              {editingPreset ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all duration-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
};
