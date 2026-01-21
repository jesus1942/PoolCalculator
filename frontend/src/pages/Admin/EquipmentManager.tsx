import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductImageUploader } from '@/components/ProductImageUploader';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { EquipmentPreset, EquipmentType } from '@/types';
import { productImageService } from '@/services/productImageService';
import { Plus, Edit, Trash2, Image, X } from 'lucide-react';

export const EquipmentManager: React.FC = () => {
  const [equipment, setEquipment] = useState<EquipmentPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentPreset | null>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [filterType, setFilterType] = useState<EquipmentType | 'ALL'>('ALL');

  const [formData, setFormData] = useState<Partial<EquipmentPreset>>({
    name: '',
    type: 'PUMP',
    brand: '',
    model: '',
    power: 0,
    capacity: 0,
    voltage: 220,
    pricePerUnit: 0,
    description: '',
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const data = await equipmentPresetService.getAll();
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await equipmentPresetService.update(editingId, formData);
      } else {
        await equipmentPresetService.create(formData);
      }

      await loadEquipment();
      resetForm();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Error al guardar el equipo');
    }
  };

  const handleEdit = (item: EquipmentPreset) => {
    setFormData({
      name: item.name,
      type: item.type,
      brand: item.brand,
      model: item.model,
      power: item.power,
      capacity: item.capacity,
      voltage: item.voltage,
      pricePerUnit: item.pricePerUnit,
      description: item.description,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este equipo?')) {
      return;
    }

    try {
      await equipmentPresetService.delete(id);
      await loadEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Error al eliminar el equipo');
    }
  };

  const handleManageImages = (item: EquipmentPreset) => {
    setSelectedEquipment(item);
    setShowImageManager(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PUMP',
      brand: '',
      model: '',
      power: 0,
      capacity: 0,
      voltage: 220,
      pricePerUnit: 0,
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredEquipment = filterType === 'ALL'
    ? equipment
    : equipment.filter(e => e.type === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Equipos</h1>
          <p className="text-gray-600">Administra bombas, filtros, calentadores y más</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Equipo
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filtrar por tipo:</span>
          <Button
            variant={filterType === 'ALL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('ALL')}
          >
            Todos
          </Button>
          <Button
            variant={filterType === 'PUMP' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('PUMP')}
          >
            Bombas
          </Button>
          <Button
            variant={filterType === 'FILTER' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('FILTER')}
          >
            Filtros
          </Button>
          <Button
            variant={filterType === 'HEATER' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('HEATER')}
          >
            Calentadores
          </Button>
          <Button
            variant={filterType === 'CHLORINATOR' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('CHLORINATOR')}
          >
            Cloradores
          </Button>
          <Button
            variant={filterType === 'LIGHTING' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterType('LIGHTING')}
          >
            Iluminación
          </Button>
        </div>
      </Card>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <Card key={item.id} className="p-6">
            {/* Image */}
            <div className="mb-4 h-48 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {item.imageUrl ? (
                <img
                  src={productImageService.getImageUrl(item.imageUrl) || undefined}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Image className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              )}
            </div>

            {/* Info */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {item.brand} {item.model && `- ${item.model}`}
            </p>
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium">{item.type}</span>
              </div>
              {item.power && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Potencia:</span>
                  <span className="font-medium">{item.power} HP</span>
                </div>
              )}
              {item.capacity && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacidad:</span>
                  <span className="font-medium">{item.capacity}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Precio:</span>
                <span className="font-medium">${item.pricePerUnit.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManageImages(item)}
                className="flex-1"
              >
                <Image className="w-4 h-4 mr-1" />
                Imágenes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(item)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No hay equipos registrados</p>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {editingId ? 'Editar Equipo' : 'Nuevo Equipo'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as EquipmentType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="PUMP">Bomba</option>
                      <option value="FILTER">Filtro</option>
                      <option value="HEATER">Calentador</option>
                      <option value="CHLORINATOR">Clorador</option>
                      <option value="LIGHTING">Iluminación</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Potencia (HP)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.power}
                      onChange={(e) => setFormData({ ...formData, power: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidad
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voltaje (V)
                    </label>
                    <input
                      type="number"
                      value={formData.voltage}
                      onChange={(e) => setFormData({ ...formData, voltage: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingId ? 'Actualizar' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Image Manager Modal */}
      {showImageManager && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Gestión de Imágenes: {selectedEquipment.name}</h2>
                <button
                  onClick={() => {
                    setShowImageManager(false);
                    setSelectedEquipment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <ProductImageUploader
                productType="equipment"
                productId={selectedEquipment.id}
                currentImageUrl={selectedEquipment.imageUrl}
                currentAdditionalImages={selectedEquipment.additionalImages}
                onImageUploaded={() => loadEquipment()}
                onAdditionalImagesUploaded={() => loadEquipment()}
                onImageDeleted={() => loadEquipment()}
                onAdditionalImageDeleted={() => loadEquipment()}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EquipmentManager;
