import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Project } from '@/types';
import { additionalsService } from '@/services/additionalsService';
import { accessoryPresetService } from '@/services/accessoryPresetService';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { constructionMaterialService } from '@/services/constructionMaterialService';
import { Plus, Trash2, Package, AlertCircle } from 'lucide-react';

interface ProjectAdditional {
  id: string;
  accessoryId?: string;
  materialId?: string;
  equipmentId?: string;
  customName?: string;
  customCategory?: string;
  customUnit?: string;
  customPricePerUnit?: number;
  customLaborCost?: number;
  baseQuantity: number;
  newQuantity: number;
  dependencies: any[];
  notes?: string;
  accessory?: any;
  material?: any;
  equipment?: any;
}

interface AdditionalsManagerProps {
  project: Project;
}

export const AdditionalsManager: React.FC<AdditionalsManagerProps> = ({ project }) => {
  const [additionals, setAdditionals] = useState<ProjectAdditional[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessories, setAccessories] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [useCustom, setUseCustom] = useState(false);

  const [formData, setFormData] = useState({
    type: 'accessory' as 'accessory' | 'material' | 'equipment' | 'custom',
    itemId: '',
    customName: '',
    customCategory: '',
    customUnit: 'unidad',
    customPricePerUnit: 0,
    customLaborCost: 0,
    baseQuantity: 0,
    newQuantity: 1,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [additionalsData, accessoriesData, equipmentData, materialsData] = await Promise.all([
        additionalsService.getProjectAdditionals(project.id),
        accessoryPresetService.getAll(),
        equipmentPresetService.getAll(),
        constructionMaterialService.getAll(),
      ]);

      setAdditionals(additionalsData);
      setAccessories(accessoriesData);
      setEquipment(equipmentData);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdditional = () => {
    setFormData({
      type: 'accessory',
      itemId: '',
      customName: '',
      customCategory: '',
      customUnit: 'unidad',
      customPricePerUnit: 0,
      customLaborCost: 0,
      baseQuantity: 0,
      newQuantity: 1,
      notes: '',
    });
    setUseCustom(false);
    setShowModal(true);
  };

  const handleSaveAdditional = async () => {
    // Validación
    if (useCustom) {
      if (!formData.customName || !formData.customCategory || formData.newQuantity <= 0) {
        alert('Por favor completa todos los campos requeridos (nombre, categoría y cantidad)');
        return;
      }
    } else {
      if (!formData.itemId || formData.newQuantity <= 0) {
        alert('Por favor selecciona un item y especifica la cantidad');
        return;
      }
    }

    try {
      const modification: any = {
        baseQuantity: formData.baseQuantity,
        newQuantity: formData.newQuantity,
        notes: formData.notes,
      };

      if (useCustom) {
        // Item personalizado
        modification.customName = formData.customName;
        modification.customCategory = formData.customCategory;
        modification.customUnit = formData.customUnit;
        modification.customPricePerUnit = formData.customPricePerUnit;
        modification.customLaborCost = formData.customLaborCost;
      } else {
        // Item de preset
        modification[`${formData.type}Id`] = formData.itemId;
      }

      await additionalsService.processAdditionals(project.id, {
        modifications: [modification]
      });

      await loadData();
      setShowModal(false);
      alert('Adicional agregado exitosamente');
    } catch (error) {
      console.error('Error saving additional:', error);
      alert('Error al guardar el adicional');
    }
  };

  const handleDeleteAdditional = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este adicional?')) return;

    try {
      await additionalsService.deleteAdditional(id);
      await loadData();
      alert('Adicional eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting additional:', error);
      alert('Error al eliminar el adicional');
    }
  };

  const getItemOptions = () => {
    switch (formData.type) {
      case 'accessory':
        return accessories.map(a => ({ value: a.id, label: `${a.name} - ${a.type}` }));
      case 'equipment':
        return equipment.map(e => ({ value: e.id, label: `${e.name} - ${e.brand || ''}` }));
      case 'material':
        return materials.map(m => ({ value: m.id, label: `${m.name} - ${m.type}` }));
      default:
        return [];
    }
  };

  const getItemName = (additional: ProjectAdditional) => {
    if (additional.customName) return additional.customName;
    if (additional.accessory) return additional.accessory.name;
    if (additional.equipment) return additional.equipment.name;
    if (additional.material) return additional.material.name;
    return 'Sin nombre';
  };

  const getItemType = (additional: ProjectAdditional) => {
    if (additional.customCategory) return `Personalizado - ${additional.customCategory}`;
    if (additional.accessory) return 'Accesorio';
    if (additional.equipment) return 'Equipamiento';
    if (additional.material) return 'Material';
    return '';
  };

  const getItemCost = (additional: ProjectAdditional) => {
    const quantity = additional.newQuantity;
    let materialCost = 0;
    let laborCost = 0;

    if (additional.customPricePerUnit) {
      materialCost = additional.customPricePerUnit * quantity;
      laborCost = (additional.customLaborCost || 0) * quantity;
    } else if (additional.accessory) {
      materialCost = additional.accessory.pricePerUnit * quantity;
    } else if (additional.equipment) {
      materialCost = additional.equipment.pricePerUnit * quantity;
    } else if (additional.material) {
      materialCost = additional.material.pricePerUnit * quantity;
    }

    return { materialCost, laborCost, total: materialCost + laborCost };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Materiales y Equipamiento Adicional</h3>
          <p className="text-sm text-gray-600 mt-1">
            Agrega items adicionales al preset base del proyecto
          </p>
        </div>
        <Button onClick={handleAddAdditional}>
          <Plus size={20} className="mr-2" />
          Agregar Adicional
        </Button>
      </div>

      {additionals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay adicionales en este proyecto</p>
            <p className="text-sm text-gray-500 mt-2">
              Los adicionales te permiten agregar items extra al preset base
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            {additionals.map(additional => {
              const costs = getItemCost(additional);
              return (
                <div key={additional.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-medium">{getItemName(additional)}</h5>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {getItemType(additional)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <span>Cantidad: <strong>{additional.newQuantity} {additional.customUnit || 'unidades'}</strong></span>
                        <span>Material: <strong>${costs.materialCost.toLocaleString('es-AR')}</strong></span>
                        {costs.laborCost > 0 && (
                          <span>M.O.: <strong>${costs.laborCost.toLocaleString('es-AR')}</strong></span>
                        )}
                        <span className="text-green-600">Total: <strong>${costs.total.toLocaleString('es-AR')}</strong></span>
                      </div>

                      {additional.notes && (
                        <p className="text-sm text-gray-600 italic mb-2">Nota: {additional.notes}</p>
                      )}

                      {additional.dependencies && additional.dependencies.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-800 mb-1">
                                Dependencias detectadas:
                              </p>
                              <ul className="text-xs text-yellow-700 space-y-1">
                                {additional.dependencies.map((dep: any, idx: number) => (
                                  <li key={idx}>
                                    {dep.type === 'material' && `• ${dep.name}: ${dep.quantity} ${dep.unit} (${dep.reason})`}
                                    {dep.type === 'accessory' && `• ${dep.name}: ${dep.quantity} unidades (${dep.reason})`}
                                    {dep.type === 'pump_check' && `• Verificar bomba: +${dep.additionalGPM} GPM requeridos (${dep.reason})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteAdditional(additional.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Agregar Adicional"
      >
        <div className="space-y-4">
          {/* Toggle: Preset vs Custom */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={!useCustom}
                onChange={() => setUseCustom(false)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Usar preset existente</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={useCustom}
                onChange={() => setUseCustom(true)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Crear item personalizado</span>
            </label>
          </div>

          {!useCustom ? (
            // Formulario para preset
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Item</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any, itemId: '' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="accessory">Accesorio</option>
                  <option value="equipment">Equipamiento</option>
                  <option value="material">Material de Construcción</option>
                </select>
              </div>

              <Select
                label="Item *"
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                options={[
                  { value: '', label: 'Selecciona un item...' },
                  ...getItemOptions()
                ]}
              />
            </>
          ) : (
            // Formulario personalizado
            <>
              <Input
                label="Nombre del Item *"
                value={formData.customName}
                onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                placeholder="Ej: Bomba especial marca X"
              />

              <Input
                label="Categoría *"
                value={formData.customCategory}
                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                placeholder="Ej: Equipamiento, Material, Accesorio"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Unidad de Medida *"
                  value={formData.customUnit}
                  onChange={(e) => setFormData({ ...formData, customUnit: e.target.value })}
                  placeholder="Ej: unidad, kg, m"
                />

                <Input
                  label="Precio por Unidad *"
                  type="number"
                  value={formData.customPricePerUnit}
                  onChange={(e) => setFormData({ ...formData, customPricePerUnit: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.01}
                />
              </div>

              <Input
                label="Costo Mano de Obra por Unidad"
                type="number"
                value={formData.customLaborCost}
                onChange={(e) => setFormData({ ...formData, customLaborCost: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.01}
              />
            </>
          )}

          {/* Campos comunes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Cantidad Base"
                type="number"
                value={formData.baseQuantity}
                onChange={(e) => setFormData({ ...formData, baseQuantity: parseInt(e.target.value) || 0 })}
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">Cantidad original del preset</p>
            </div>

            <div>
              <Input
                label="Cantidad Nueva *"
                type="number"
                value={formData.newQuantity}
                onChange={(e) => setFormData({ ...formData, newQuantity: parseInt(e.target.value) || 0 })}
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">Nueva cantidad requerida</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Razón del cambio o notas adicionales..."
            />
          </div>

          {!useCustom && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El sistema calculará automáticamente las dependencias
                según las reglas de negocio configuradas (cables, transformadores, etc.)
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSaveAdditional} className="flex-1">
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
