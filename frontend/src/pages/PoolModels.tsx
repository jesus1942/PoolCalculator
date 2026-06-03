import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { poolPresetService } from '@/services/poolPresetService';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { EquipmentPreset, PoolPreset, PoolShape } from '@/types';
import { HdPlus, HdEdit, HdTrash, HdUpload, HdX, HdWaves, HdChevronLeft, HdChevronRight, HdImage, HdSearch } from '@/components/ui/HandDrawnIcons';
import { Layers } from 'lucide-react';
import FlipCard from '@/components/ui/FlipCard';
import { getImageUrl } from '@/utils/imageUtils';
import { ImageHoverZoom } from '@/components/ui/ImageHoverZoom';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

// Componente de Card individual con FlipCard
const PoolPresetCard: React.FC<{
  preset: PoolPreset;
  presetIndex: number;
  galleryImages: string[];
  galleryLabels: string[];
  onEdit: (preset: PoolPreset) => void;
  onDelete: (id: string) => void;
}> = ({ preset, presetIndex, galleryImages, galleryLabels, onEdit, onDelete }) => {
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
    <div className="h-[640px] sm:h-[680px]">
      <FlipCard
        disabled={!hasAdditionalContent}
        className="h-full"
        front={
          <div className="group relative overflow-hidden rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 h-full flex flex-col">
            {/* Imagen con zoom hover */}
            <div className="relative w-full aspect-[16/10] bg-zinc-800 overflow-hidden">
              {preset.imageUrl ? (
                <ImageHoverZoom
                  src={getImageUrl(preset.imageUrl) || ''}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                  fullscreenImages={galleryImages}
                  fullscreenLabels={galleryLabels}
                  fullscreenIndex={presetIndex}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                  <HdImage size={40} className="h-10 w-10" />
                </div>
              )}
              {hasAdditionalContent && (
                <div className="absolute top-2 right-2 bg-blue-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg z-10 pointer-events-none">
                  Click para más
                </div>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-start gap-3 min-h-[68px]">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 flex-shrink-0">
                  <Layers className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white leading-tight">
                    {preset.name}
                  </h3>
                  {preset.description && (
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{preset.description}</p>
                  )}
                </div>
              </div>

              {/* Dimensiones */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700">
                  <p className="text-zinc-500 text-xs mb-1 font-medium">Dimensiones</p>
                  <p className="text-zinc-100 font-bold text-sm">
                    {preset.length}m x {preset.width}m x {preset.depth}m
                  </p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700">
                  <p className="text-zinc-500 text-xs mb-1 font-medium">Forma</p>
                  <p className="text-zinc-100 font-bold text-sm capitalize">
                    {preset.shape.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-3">
                {(preset.defaultPump || preset.defaultFilter) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Bomba base</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-200 leading-tight break-words line-clamp-2">
                        {preset.defaultPump?.model || preset.defaultPump?.name || 'Sin bomba'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Filtro base</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-200 leading-tight break-words line-clamp-2">
                        {preset.defaultFilter?.model || preset.defaultFilter?.name || 'Sin filtro'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap content-start gap-2">
                  {preset.hasWetDeck && (
                    <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs rounded-full font-semibold">
                      Playa humeda
                    </span>
                  )}
                  {preset.hasSkimmer && (
                    <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/30 text-green-300 text-xs rounded-full font-semibold">
                      Skimmer x{preset.skimmerCount}
                    </span>
                  )}
                  {preset.hasBottomDrain && (
                    <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs rounded-full font-semibold">
                      Toma de fondo
                    </span>
                  )}
                  {preset.hasVacuumIntake && (
                    <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-full font-semibold">
                      Barrefondo x{preset.vacuumIntakeCount}
                    </span>
                  )}
                  {preset.hasHydroJets && (
                    <span className="px-2.5 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs rounded-full font-semibold">
                      Hidrojets x{preset.hydroJetsCount}
                    </span>
                  )}
                  {preset.stairsCount > 0 && (
                    <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-full font-semibold">
                      Escalones x{preset.stairsCount}
                    </span>
                  )}
                  {preset.canaletasCount > 0 && (
                    <span className="px-2.5 py-1 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs rounded-full font-semibold">
                      Canaletas x{preset.canaletasCount}
                    </span>
                  )}
                  {preset.hasLighting && (
                    <span className="px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs rounded-full font-semibold">
                      Luces x{preset.lightingCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 mt-auto border-t border-zinc-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(preset);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <HdEdit size={16} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(preset.id);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-red-600/80 text-white font-semibold hover:bg-red-600 transition-all duration-200 flex items-center justify-center"
                >
                  <HdTrash size={16} />
                </button>
              </div>
            </div>
          </div>
      }
      back={
        <div className="relative overflow-hidden rounded-lg bg-zinc-900/80 border border-zinc-800 h-full flex flex-col">
          {/* Carrusel de imágenes */}
          <div className="relative w-full aspect-[16/10] bg-zinc-800">
            {additionalImages[currentImageIndex] && (
              <img
                src={getImageUrl(additionalImages[currentImageIndex]) || additionalImages[currentImageIndex]}
                alt={`${preset.name} - Imagen ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Controles de carrusel */}
            {additionalImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all"
                >
                  <HdChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all"
                >
                  <HdChevronRight size={20} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  {additionalImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-blue-400 w-6' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-2 right-2 bg-blue-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
              Click para volver
            </div>
          </div>

          {/* Descripción del reverso */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <HdImage size={20} className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">{preset.name}</h3>
            </div>

            {preset.backDescription ? (
              <p className="text-zinc-300 text-sm leading-relaxed flex-1">
                {preset.backDescription}
              </p>
            ) : (
              <p className="text-zinc-500 text-sm italic flex-1">
                Planos y vistas adicionales del modelo {preset.name}.
              </p>
            )}

            <div className="text-xs text-zinc-600 mt-4 pt-4 border-t border-zinc-800">
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
  const [equipmentPresets, setEquipmentPresets] = useState<EquipmentPreset[]>([]);
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
    stairsCount: 0,
    canaletasCount: 0,
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
    defaultPumpId: '',
    defaultFilterId: '',
  });

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const [presetsData, equipmentData] = await Promise.all([
        poolPresetService.getAll(),
        equipmentPresetService.getAll(),
      ]);
      setPresets(presetsData);
      setEquipmentPresets(equipmentData);
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
      stairsCount: preset.stairsCount,
      canaletasCount: preset.canaletasCount,
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
      defaultPumpId: preset.defaultPumpId || '',
      defaultFilterId: preset.defaultFilterId || '',
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
      stairsCount: 0,
      canaletasCount: 0,
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
      defaultPumpId: '',
      defaultFilterId: '',
    });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [shapeFilter, setShapeFilter] = useState('');

  const shapeOptions = [
    { value: 'RECTANGULAR', label: 'Rectangular' },
    { value: 'CIRCULAR', label: 'Circular' },
    { value: 'OVAL', label: 'Ovalada' },
    { value: 'JACUZZI', label: 'Jacuzzi' },
  ];

  const filteredPresets = useMemo(() => {
    let result = presets;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    if (shapeFilter) {
      result = result.filter(p => p.shape === shapeFilter);
    }
    return result;
  }, [presets, searchTerm, shapeFilter]);
  const availablePumps = equipmentPresets.filter((item) => item.type === 'PUMP' && item.isActive !== false);
  const availableFilters = equipmentPresets.filter((item) => item.type === 'FILTER' && item.isActive !== false);

  const galleryFallbackImage = publicAssetUrl('logo-isotipo.png');
  const galleryImages = presets.map((preset) => getImageUrl(preset.imageUrl || '') || galleryFallbackImage);
  const galleryLabels = presets.map((preset) => preset.name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400 text-lg font-medium">Cargando modelos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <HdWaves size={28} className="h-7 w-7 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Modelos de Piscinas
                </h1>
                <p className="mt-1 text-sm sm:text-base text-zinc-400">
                  {presets.length} modelo{presets.length !== 1 ? 's' : ''} disponible{presets.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold transition-all duration-200 hover:bg-blue-500 sm:w-auto"
            >
              <HdPlus size={20} />
              <span>Nuevo Modelo</span>
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <HdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', 'RECTANGULAR', 'CIRCULAR', 'OVAL', 'JACUZZI'].map((shape) => (
                <button
                  key={shape}
                  onClick={() => setShapeFilter(shape)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    shapeFilter === shape
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  {shape === '' ? 'Todos' : shape.charAt(0) + shape.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {(searchTerm || shapeFilter) && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                {filteredPresets.length} de {presets.length} modelos
              </span>
              <button
                onClick={() => { setSearchTerm(''); setShapeFilter(''); }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Grid de Modelos */}
        {filteredPresets.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <HdWaves size={48} className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No hay modelos que coincidan</p>
            <p className="text-sm mt-1">Probá con otro término o limpiá los filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresets.map((preset, index) => (
              <PoolPresetCard
                key={preset.id}
                preset={preset}
                presetIndex={index}
                galleryImages={galleryImages}
                galleryLabels={galleryLabels}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => { setShowModal(false); resetForm(); }}
          title={editingPreset ? 'Editar Modelo' : 'Nuevo Modelo'}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-2">Imagen del modelo</label>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-zinc-700" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-500">
                      <HdX size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center bg-zinc-800/50">
                    <HdUpload size={32} className="text-zinc-600" />
                  </div>
                )}
                <div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-colors">
                    <HdUpload size={16} className="mr-2" />Subir imagen
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">JPG, PNG, GIF o WEBP. Máximo 5MB.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nombre del modelo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <Select label="Forma" options={shapeOptions} value={formData.shape} onChange={(e) => setFormData({ ...formData, shape: e.target.value as PoolShape })} />
            </div>

            <Input label="Descripción" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

            {/* Imágenes adicionales */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-2">Imágenes adicionales (reverso de la card)</label>
              <div className="space-y-3">
                {additionalImagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {additionalImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt={`Additional ${idx + 1}`} className="w-24 h-24 object-cover rounded-lg border border-zinc-700" />
                        <button type="button" onClick={() => {
                          const previewToRemove = additionalImagePreviews[idx];
                          if (previewToRemove.startsWith('http')) {
                            const urlWithoutBase = existingAdditionalImageUrls[idx];
                            setExistingAdditionalImageUrls(urls => urls.filter(url => url !== urlWithoutBase));
                          } else {
                            setAdditionalImageFiles(files => files.filter((_, i) => i !== idx));
                          }
                          setAdditionalImagePreviews(previews => previews.filter((_, i) => i !== idx));
                        }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-500">
                          <HdX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <input type="file" accept="image/*" multiple onChange={handleAdditionalImagesChange} className="hidden" id="additional-images-upload" />
                  <label htmlFor="additional-images-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-colors">
                    <HdUpload size={16} className="mr-2" />Agregar imágenes (máx. 5)
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">Planos, isométricos, vistas adicionales. JPG, PNG. Máximo 5 imágenes.</p>
                </div>
              </div>
            </div>

            {/* Descripción del reverso */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-2">Descripción del reverso</label>
              <textarea value={formData.backDescription} onChange={(e) => setFormData({ ...formData, backDescription: e.target.value })} rows={3} placeholder="Descripción adicional para el reverso de la card..." className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 text-sm" />
              <p className="text-xs text-zinc-500 mt-1">Se mostrará en el reverso de la card junto con las imágenes adicionales.</p>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Dimensiones</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Largo (m)" type="number" step="0.01" value={formData.length} onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) })} required />
                <Input label="Ancho (m)" type="number" step="0.01" value={formData.width} onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) })} required />
                <Input label="Profundidad inicial (m)" type="number" step="0.01" value={formData.depth} onChange={(e) => setFormData({ ...formData, depth: parseFloat(e.target.value) })} required />
                <Input label="Profundidad final (m) - opcional" type="number" step="0.01" value={formData.depthEnd} onChange={(e) => setFormData({ ...formData, depthEnd: parseFloat(e.target.value) })} />
                <Input label="Espacio lateral para colchón (m)" type="number" step="0.01" value={formData.lateralCushionSpace} onChange={(e) => setFormData({ ...formData, lateralCushionSpace: parseFloat(e.target.value) })} />
                <Input label="Cama de piso (m)" type="number" step="0.01" value={formData.floorCushionDepth} onChange={(e) => setFormData({ ...formData, floorCushionDepth: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Características generales</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasWetDeck} onChange={(e) => setFormData({ ...formData, hasWetDeck: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Playa húmeda</span></label>
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasStairsOnly} onChange={(e) => setFormData({ ...formData, hasStairsOnly: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Solo escaleras</span></label>
                <Input label="Cantidad de escalones" type="number" value={formData.stairsCount} onChange={(e) => setFormData({ ...formData, stairsCount: parseInt(e.target.value) || 0 })} min="0" />
                <Input label="Cantidad de canaletas" type="number" value={formData.canaletasCount} onChange={(e) => setFormData({ ...formData, canaletasCount: parseInt(e.target.value) || 0 })} min="0" />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Retornos e impulsión</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Cantidad de retornos" type="number" value={formData.returnsCount} onChange={(e) => setFormData({ ...formData, returnsCount: parseInt(e.target.value) })} min="0" />
                <label className="flex items-center space-x-2 pt-7 cursor-pointer"><input type="checkbox" checked={formData.hasHotWaterReturn} onChange={(e) => setFormData({ ...formData, hasHotWaterReturn: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Retorno agua caliente</span></label>
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasHydroJets} onChange={(e) => setFormData({ ...formData, hasHydroJets: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Boquillas hidrojets</span></label>
                {formData.hasHydroJets && <Input label="Cantidad de hidrojets" type="number" value={formData.hydroJetsCount} onChange={(e) => setFormData({ ...formData, hydroJetsCount: parseInt(e.target.value) })} min="0" />}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Desagües y limpieza</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasBottomDrain} onChange={(e) => setFormData({ ...formData, hasBottomDrain: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Toma de fondo</span></label>
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasVacuumIntake} onChange={(e) => setFormData({ ...formData, hasVacuumIntake: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Toma de aspiración/barrefondo</span></label>
                {formData.hasVacuumIntake && <Input label="Cantidad de tomas de aspiración" type="number" value={formData.vacuumIntakeCount} onChange={(e) => setFormData({ ...formData, vacuumIntakeCount: parseInt(e.target.value) })} min="1" />}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Skimmers</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasSkimmer} onChange={(e) => setFormData({ ...formData, hasSkimmer: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Skimmer</span></label>
                {formData.hasSkimmer && <Input label="Cantidad de skimmers" type="number" value={formData.skimmerCount} onChange={(e) => setFormData({ ...formData, skimmerCount: parseInt(e.target.value) })} min="1" />}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-3">Iluminación</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.hasLighting} onChange={(e) => setFormData({ ...formData, hasLighting: e.target.checked })} className="rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-800" /><span className="text-sm text-zinc-300">Luces</span></label>
                {formData.hasLighting && <>
                  <Input label="Cantidad de luces" type="number" value={formData.lightingCount} onChange={(e) => setFormData({ ...formData, lightingCount: parseInt(e.target.value) })} min="1" />
                  <Input label="Tipo de iluminación" placeholder="LED, halógeno, fibra óptica" value={formData.lightingType} onChange={(e) => setFormData({ ...formData, lightingType: e.target.value })} />
                </>}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-semibold text-zinc-200 mb-1">Equipamiento base del modelo</h3>
              <p className="text-sm text-zinc-500 mb-4">Opcional. Si lo dejás vacío, el modelo queda disponible para vender casco solo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Bomba base" options={[{ value: '', label: 'Sin bomba base' }, ...availablePumps.map((pump) => ({ value: pump.id, label: `${pump.name}${pump.flowRate ? ` · ${pump.flowRate} m³/h` : ''}${pump.power ? ` · ${pump.power} HP` : ''}` }))]} value={formData.defaultPumpId} onChange={(e) => setFormData({ ...formData, defaultPumpId: e.target.value })} />
                <Select label="Filtro base" options={[{ value: '', label: 'Sin filtro base' }, ...availableFilters.map((filter) => ({ value: filter.id, label: `${filter.name}${filter.capacity ? ` · ${filter.capacity} m³/h` : ''}${filter.filterDiameter ? ` · Ø${filter.filterDiameter} mm` : ''}` }))]} value={formData.defaultFilterId} onChange={(e) => setFormData({ ...formData, defaultFilterId: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 border-t border-zinc-800 sm:flex-row">
              <button type="submit" className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all duration-200">
                {editingPreset ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-6 py-3 rounded-lg bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-all duration-200">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
