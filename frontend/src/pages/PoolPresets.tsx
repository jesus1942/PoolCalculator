import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { poolPresetService } from '@/services/poolPresetService';
import { PoolPreset, PoolShape } from '@/types';
import { Plus, Edit, Trash2, Calculator, Filter } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUtils';
import { ImageHoverZoom } from '@/components/ui/ImageHoverZoom';

export const PoolPresets: React.FC = () => {
  const [presets, setPresets] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PoolPreset | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    length: 0,
    width: 0,
    depth: 0,
    depthEnd: 0,
    shape: 'RECTANGULAR' as PoolShape,
    hasWetDeck: false,
    hasStairsOnly: false,
    stairsCount: 0,
    canaletasCount: 0,
    returnsCount: 2,
    hasHotWaterReturn: false,
    hasBottomDrain: true,
    hasSkimmer: true,
    skimmerCount: 1,
  });

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const data = await poolPresetService.getAll();
      console.log('📊 Presets cargados:', data.length);

      // Debug: Ver cuántos tienen imageUrl
      const withImages = data.filter(p => p.imageUrl);
      console.log('🖼️  Presets con imageUrl:', withImages.length);

      // Debug: Ver los primeros 3 con vendor
      const withVendor = data.filter(p => p.vendor);
      console.log('🏷️  Presets con vendor:', withVendor.length);
      if (withVendor.length > 0) {
        console.log('📋 Primer preset con vendor:', {
          name: withVendor[0].name,
          vendor: withVendor[0].vendor,
          imageUrl: withVendor[0].imageUrl ? 'PRESENTE' : 'AUSENTE'
        });
      }

      setPresets(data);
    } catch (error) {
      console.error('Error al cargar presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPreset) {
        await poolPresetService.update(editingPreset.id, formData);
      } else {
        await poolPresetService.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadPresets();
    } catch (error) {
      console.error('Error al guardar preset:', error);
    }
  };

  const handleEdit = (preset: PoolPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      length: preset.length,
      width: preset.width,
      depth: preset.depth,
      depthEnd: preset.depthEnd || 0,
      shape: preset.shape,
      hasWetDeck: preset.hasWetDeck,
      hasStairsOnly: preset.hasStairsOnly,
      stairsCount: preset.stairsCount,
      canaletasCount: preset.canaletasCount,
      returnsCount: preset.returnsCount,
      hasHotWaterReturn: preset.hasHotWaterReturn,
      hasBottomDrain: preset.hasBottomDrain,
      hasSkimmer: preset.hasSkimmer,
      skimmerCount: preset.skimmerCount,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este preset?')) {
      try {
        await poolPresetService.delete(id);
        loadPresets();
      } catch (error) {
        console.error('Error al eliminar preset:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingPreset(null);
    setFormData({
      name: '',
      description: '',
      length: 0,
      width: 0,
      depth: 0,
      depthEnd: 0,
      shape: 'RECTANGULAR',
      hasWetDeck: false,
      hasStairsOnly: false,
      stairsCount: 0,
      canaletasCount: 0,
      returnsCount: 2,
      hasHotWaterReturn: false,
      hasBottomDrain: true,
      hasSkimmer: true,
      skimmerCount: 1,
    });
  };

  const shapeOptions = [
    { value: 'RECTANGULAR', label: 'Rectangular' },
    { value: 'CIRCULAR', label: 'Circular' },
    { value: 'OVAL', label: 'Ovalada' },
    { value: 'JACUZZI', label: 'Jacuzzi' },
  ];

  // Obtener lista única de fabricantes
  const vendors = useMemo(() => {
    const vendorSet = new Set<string>();
    presets.forEach(preset => {
      if (preset.vendor) {
        vendorSet.add(preset.vendor);
      }
    });
    return Array.from(vendorSet).sort();
  }, [presets]);

  // Filtrar presets por fabricante seleccionado
  const filteredPresets = useMemo(() => {
    if (selectedVendor === 'all') {
      return presets;
    }
    return presets.filter(preset => preset.vendor === selectedVendor);
  }, [presets, selectedVendor]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Presets de Piscinas</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Administrá los modelos de piscinas</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex w-full items-center justify-center space-x-2 sm:w-auto">
          <Plus size={20} />
          <span>Nuevo Preset</span>
        </Button>
      </div>

      {/* Filtro por fabricante */}
      {vendors.length > 0 && (
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Filter size={20} className="text-gray-500" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedVendor('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedVendor === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({presets.length})
            </button>
            {vendors.map((vendor) => (
              <button
                key={vendor}
                onClick={() => setSelectedVendor(vendor)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedVendor === vendor
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {vendor} ({presets.filter(p => p.vendor === vendor).length})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPresets.map((preset) => (
          <Card key={preset.id} className="hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Imagen del modelo con zoom hover */}
              {preset.imageUrl && (
                <div className="w-full h-48 bg-gray-100 rounded-lg">
                  <ImageHoverZoom
                    src={getImageUrl(preset.imageUrl) || ''}
                    alt={preset.name}
                    className="w-full h-full object-cover rounded-lg"
                    containerClassName="w-full h-full"
                  />
                </div>
              )}

              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{preset.name}</h3>
                  {preset.vendor && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {preset.vendor}
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Largo</p>
                  <p className="font-semibold">{preset.length}m</p>
                </div>
                <div>
                  <p className="text-gray-600">Ancho</p>
                  <p className="font-semibold">{preset.width}m</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Equipamiento base</p>
                  <p className="font-semibold">
                    {preset.defaultPump?.model || 'Sin bomba'} · {preset.defaultFilter?.model || 'Sin filtro'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Profundidad</p>
                  <p className="font-semibold">{preset.depth}m</p>
                </div>
                <div>
                  <p className="text-gray-600">Forma</p>
                  <p className="font-semibold">{preset.shape}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {preset.hasWetDeck && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Playa húmeda
                  </span>
                )}
                {preset.hasSkimmer && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Skimmer x{preset.skimmerCount}
                  </span>
                )}
                {preset.stairsCount > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                    Escalones x{preset.stairsCount}
                  </span>
                )}
                {preset.canaletasCount > 0 && (
                  <span className="px-2 py-1 bg-sky-100 text-sky-800 text-xs rounded">
                    Canaletas x{preset.canaletasCount}
                  </span>
                )}
                {preset.hasBottomDrain && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                    Toma de fondo
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t sm:flex-row">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(preset)}
                  className="flex-1 flex items-center justify-center space-x-1"
                >
                  <Edit size={16} />
                  <span>Editar</span>
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(preset.id)}
                  className="flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingPreset ? 'Editar Preset' : 'Nuevo Preset'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <Select
            label="Forma"
            options={shapeOptions}
            value={formData.shape}
            onChange={(e) => setFormData({ ...formData, shape: e.target.value as PoolShape })}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasWetDeck}
                onChange={(e) => setFormData({ ...formData, hasWetDeck: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Playa húmeda</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasStairsOnly}
                onChange={(e) => setFormData({ ...formData, hasStairsOnly: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Solo escaleras</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasBottomDrain}
                onChange={(e) => setFormData({ ...formData, hasBottomDrain: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Toma de fondo</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasHotWaterReturn}
                onChange={(e) => setFormData({ ...formData, hasHotWaterReturn: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Retorno agua caliente</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasSkimmer}
                onChange={(e) => setFormData({ ...formData, hasSkimmer: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Skimmer</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad de retornos"
              type="number"
              value={formData.returnsCount}
              onChange={(e) => setFormData({ ...formData, returnsCount: parseInt(e.target.value) })}
              min="0"
            />

            {formData.hasSkimmer && (
              <Input
                label="Cantidad de skimmers"
                type="number"
                value={formData.skimmerCount}
                onChange={(e) => setFormData({ ...formData, skimmerCount: parseInt(e.target.value) })}
                min="1"
              />
            )}

            <Input
              label="Cantidad de escalones"
              type="number"
              value={formData.stairsCount}
              onChange={(e) => setFormData({ ...formData, stairsCount: parseInt(e.target.value) || 0 })}
              min="0"
            />

            <Input
              label="Cantidad de canaletas"
              type="number"
              value={formData.canaletasCount}
              onChange={(e) => setFormData({ ...formData, canaletasCount: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <Button type="submit" className="flex-1">
              {editingPreset ? 'Actualizar' : 'Crear'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
