import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { plumbingItemService, PlumbingItem } from '@/services/plumbingItemService';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';

export const PlumbingManager: React.FC = () => {
  const [items, setItems] = useState<PlumbingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PlumbingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlumbingItem | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'PIPE' as PlumbingItem['category'],
    type: 'PVC' as PlumbingItem['type'],
    diameter: '',
    length: '',
    unit: '',
    pricePerUnit: '',
    brand: '',
    description: '',
  });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, searchTerm, categoryFilter, typeFilter]);

  const loadItems = async () => {
    try {
      const data = await plumbingItemService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar items:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.diameter?.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term)
      );
    }

    // Filtro de categoría
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Filtro de tipo
    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    setFilteredItems(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        length: formData.length ? parseFloat(formData.length) : undefined,
        pricePerUnit: parseFloat(formData.pricePerUnit),
      };

      if (editingItem) {
        await plumbingItemService.update(editingItem.id, data);
      } else {
        await plumbingItemService.create(data);
      }
      
      setShowModal(false);
      resetForm();
      loadItems();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar item');
    }
  };

  const handleEdit = (item: PlumbingItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      type: item.type,
      diameter: item.diameter || '',
      length: item.length?.toString() || '',
      unit: item.unit,
      pricePerUnit: item.pricePerUnit.toString(),
      brand: item.brand || '',
      description: item.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      try {
        await plumbingItemService.delete(id);
        loadItems();
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'PIPE',
      type: 'PVC',
      diameter: '',
      length: '',
      unit: '',
      pricePerUnit: '',
      brand: '',
      description: '',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setTypeFilter('');
  };

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    { value: 'PIPE', label: 'Cañería' },
    { value: 'FITTING', label: 'Accesorios' },
    { value: 'VALVE', label: 'Válvulas' },
    { value: 'ACCESSORY', label: 'Otros Accesorios' },
  ];

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'PVC', label: 'PVC' },
    { value: 'FUSION_FUSION', label: 'Fusión-Fusión' },
    { value: 'FUSION_ROSCA', label: 'Fusión-Rosca' },
    { value: 'POLIPROPILENO', label: 'Polipropileno' },
    { value: 'COBRE', label: 'Cobre' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const formCategoryOptions = categoryOptions.filter(opt => opt.value !== '');
  const formTypeOptions = typeOptions.filter(opt => opt.value !== '');

  const getCategoryLabel = (category: string) => {
    return categoryOptions.find(c => c.value === category)?.label || category;
  };

  const getTypeLabel = (type: string) => {
    return typeOptions.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return <div className="animate-pulse">Cargando items de plomería...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header con botón */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Cañería y Accesorios Hidráulicos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Administrá cañerías, accesorios, válvulas y otros items de plomería
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-2" />
          Nuevo Item
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search size={20} className="text-gray-400" />
            <h3 className="font-semibold">Filtros de Búsqueda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Input
                placeholder="Buscar por nombre, diámetro, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
            
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>

          {(searchTerm || categoryFilter || typeFilter) && (
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-sm text-gray-600">
                Mostrando {filteredItems.length} de {items.length} items
              </p>
              <Button size="sm" variant="secondary" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de items */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Filter size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {items.length === 0 ? 'No hay items configurados' : 'No se encontraron resultados'}
          </h3>
          <p className="text-gray-600 mb-6">
            {items.length === 0 
              ? 'Creá tu primer item de plomería para comenzar'
              : 'Intentá ajustar los filtros de búsqueda'
            }
          </p>
          {items.length === 0 && (
            <Button onClick={() => setShowModal(true)}>
              Crear Primer Item
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  {item.diameter && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diámetro:</span>
                      <span className="font-medium">{item.diameter}</span>
                    </div>
                  )}
                  {item.length && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Largo:</span>
                      <span className="font-medium">{item.length}m</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unidad:</span>
                    <span className="font-medium">{item.unit}</span>
                  </div>
                  {item.brand && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Marca:</span>
                      <span className="font-medium">{item.brand}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Precio:</span>
                    <span className="font-bold text-primary-600">
                      ${item.pricePerUnit.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-600 border-t pt-2">
                    {item.description}
                  </p>
                )}

                <div className="flex space-x-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(item)}
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingItem ? 'Editar Item' : 'Nuevo Item de Plomería'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="ej: Caño PVC 110mm, Codo 90° 50mm"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoría"
              options={formCategoryOptions}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            />

            <Select
              label="Tipo de Material"
              options={formTypeOptions}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Diámetro (opcional)"
              value={formData.diameter}
              onChange={(e) => setFormData({ ...formData, diameter: e.target.value })}
              placeholder='ej: 110mm, 3/4", 50mm'
            />

            <Input
              label="Largo (metros, opcional)"
              type="number"
              step="0.01"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              placeholder="Para cañería"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unidad"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
              placeholder="unidad, metro, juego"
            />

            <Input
              label="Precio por Unidad"
              type="number"
              step="0.01"
              value={formData.pricePerUnit}
              onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
              required
            />
          </div>

          <Input
            label="Marca (opcional)"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="Tigre, Awaduct, etc."
          />

          <Input
            label="Descripción (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detalles adicionales"
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingItem ? 'Actualizar' : 'Crear Item'}
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
