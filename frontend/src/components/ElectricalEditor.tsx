import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Project } from '@/types';
import { Zap, Lightbulb, Plus, Trash2, AlertCircle, Calculator, Settings } from 'lucide-react';

interface ElectricalItem {
  id: string;
  type: 'lighting' | 'pump' | 'heating' | 'automation' | 'cable' | 'breaker' | 'other';
  name: string;
  watts: number;
  voltage: number;
  quantity: number;
  cableType?: string;
  cableLength?: number;
  notes?: string;
}

interface ElectricalConfig {
  mainBreaker: number;
  distanceToPanel: number;
  items: ElectricalItem[];
  totalWatts: number;
  recommendedCableSection: string;
}

interface ElectricalEditorProps {
  project: Project;
  onSave: (electricalConfig: ElectricalConfig) => Promise<void>;
}

export const ElectricalEditor: React.FC<ElectricalEditorProps> = ({ project, onSave }) => {
  const [calculationMode, setCalculationMode] = useState<'automatic' | 'manual'>('automatic');
  const [config, setConfig] = useState<ElectricalConfig>({
    mainBreaker: 30,
    distanceToPanel: 0,
    items: [],
    totalWatts: 0,
    recommendedCableSection: '',
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ElectricalItem>>({
    type: 'lighting',
    name: '',
    watts: 0,
    voltage: 220,
    quantity: 1,
  });

  useEffect(() => {
    // Cargar configuración existente
    if (project.electricalConfig && typeof project.electricalConfig === 'object') {
      const savedConfig = project.electricalConfig as any;
      setConfig({
        mainBreaker: savedConfig.mainBreaker || 30,
        distanceToPanel: savedConfig.distanceToPanel || 0,
        items: Array.isArray(savedConfig.items) ? savedConfig.items : [],
        totalWatts: savedConfig.totalWatts || 0,
        recommendedCableSection: savedConfig.recommendedCableSection || '',
      });
    } else {
      // Inicializar con datos del preset de piscina
      initializeFromPreset();
    }
  }, [project]);

  useEffect(() => {
    calculateTotals();
  }, [config.items, config.distanceToPanel]);

  const initializeFromPreset = () => {
    const items: ElectricalItem[] = [];

    // Iluminación
    if (project.poolPreset?.hasLighting && project.poolPreset.lightingCount > 0) {
      items.push({
        id: 'lighting-1',
        type: 'lighting',
        name: `Luces LED ${project.poolPreset.lightingType || 'RGB'}`,
        watts: 50,
        voltage: 12,
        quantity: project.poolPreset.lightingCount,
      });
    }

    // Bomba de filtrado (estimada)
    items.push({
      id: 'pump-1',
      type: 'pump',
      name: 'Bomba de filtrado',
      watts: 750,
      voltage: 220,
      quantity: 1,
    });

    // Transformador para luces
    if (project.poolPreset?.hasLighting) {
      items.push({
        id: 'other-1',
        type: 'other',
        name: 'Transformador 220V a 12V',
        watts: 300,
        voltage: 220,
        quantity: 1,
      });
    }

    setConfig(prev => ({ ...prev, items }));
  };

  const calculateTotals = () => {
    const totalWatts = (config.items || []).reduce((sum, item) => {
      return sum + (item.watts * item.quantity);
    }, 0);

    const totalAmps = totalWatts / 220;
    let recommendedCableSection = '';

    // Cálculo de sección de cable según distancia y amperaje
    if (config.distanceToPanel <= 15) {
      recommendedCableSection = totalAmps <= 20 ? '2.5mm²' : totalAmps <= 30 ? '4mm²' : '6mm²';
    } else if (config.distanceToPanel <= 30) {
      recommendedCableSection = totalAmps <= 20 ? '4mm²' : totalAmps <= 30 ? '6mm²' : '10mm²';
    } else {
      recommendedCableSection = totalAmps <= 20 ? '6mm²' : totalAmps <= 30 ? '10mm²' : '16mm²';
    }

    setConfig(prev => ({
      ...prev,
      totalWatts,
      recommendedCableSection,
    }));
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.watts) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const item: ElectricalItem = {
      id: `item-${Date.now()}`,
      type: newItem.type || 'other',
      name: newItem.name,
      watts: newItem.watts || 0,
      voltage: newItem.voltage || 220,
      quantity: newItem.quantity || 1,
      notes: newItem.notes,
    };

    setConfig(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      type: 'lighting',
      name: '',
      watts: 0,
      voltage: 220,
      quantity: 1,
    });
    setShowAddModal(false);
  };

  const handleRemoveItem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const handleSave = async () => {
    try {
      await onSave(config);
    } catch (error) {
      console.error('Error saving electrical config:', error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'lighting': return 'LUZ';
      case 'pump': return 'BOMB';
      case 'heating': return 'CAL';
      case 'automation': return 'AUTO';
      case 'cable': return 'CAB';
      case 'breaker': return 'TERM';
      default: return 'ITEM';
    }
  };

  const totalAmps = config.totalWatts / 220;

  return (
    <div className="space-y-6">
      {/* Tabs de modo de cálculo */}
      <div className="bg-white border rounded-lg p-1 flex gap-2">
        <button
          onClick={() => setCalculationMode('automatic')}
          className={`flex-1 px-6 py-3 rounded-md font-medium transition-all ${
            calculationMode === 'automatic'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calculator size={20} />
            <span>Cálculo Automático</span>
          </div>
          <p className="text-xs mt-1 opacity-90">Recomendado - Basado en el preset de la piscina</p>
        </button>
        <button
          onClick={() => setCalculationMode('manual')}
          className={`flex-1 px-6 py-3 rounded-md font-medium transition-all ${
            calculationMode === 'manual'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Settings size={20} />
            <span>Configuración Manual</span>
          </div>
          <p className="text-xs mt-1 opacity-90">Agrega items eléctricos personalizados</p>
        </button>
      </div>

      {/* MODO AUTOMÁTICO */}
      {calculationMode === 'automatic' && (
        <>
          {/* Resumen de instalación */}
          <Card>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-yellow-600" size={24} />
          <h3 className="text-lg font-semibold">Resumen Eléctrico</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-blue-600">Potencia Total</p>
            <p className="text-2xl font-bold text-blue-900">{config.totalWatts}W</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-sm text-green-600">Amperaje</p>
            <p className="text-2xl font-bold text-green-900">{totalAmps.toFixed(1)}A</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-sm text-purple-600">Items</p>
            <p className="text-2xl font-bold text-purple-900">{config.items?.length || 0}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <p className="text-sm text-orange-600">Térmica Recomendada</p>
            <p className="text-2xl font-bold text-orange-900">{Math.ceil(totalAmps * 1.25)}A</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="number"
              label="Distancia al Tablero (metros)"
              value={config.distanceToPanel}
              onChange={(e) => setConfig({ ...config, distanceToPanel: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.5}
            />
          </div>
          <div>
            <Input
              type="number"
              label="Térmica Principal (Amperes)"
              value={config.mainBreaker}
              onChange={(e) => setConfig({ ...config, mainBreaker: parseInt(e.target.value) || 0 })}
              min={0}
            />
          </div>
        </div>

        {config.recommendedCableSection && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Sección de Cable Recomendada</p>
              <p className="text-sm text-yellow-700">
                Para {config.distanceToPanel}m y {totalAmps.toFixed(1)}A: <strong>{config.recommendedCableSection}</strong> (cable subterráneo tipo IRAM 2178)
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Lista de items eléctricos */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold">Items Eléctricos</h3>
          </div>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus size={16} className="mr-2" />
            Agregar Item
          </Button>
        </div>

        {(!config.items || config.items.length === 0) ? (
          <p className="text-gray-500 text-center py-8">No hay items agregados</p>
        ) : (
          <div className="space-y-2">
            {config.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 bg-gray-50 flex justify-between items-start">
                <div className="flex gap-3 flex-1">
                  <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">{getItemIcon(item.type)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>Potencia: {item.watts}W</span>
                      <span>Voltaje: {item.voltage}V</span>
                      <span>Cant: x{item.quantity}</span>
                      <span className="font-semibold text-blue-600">
                        Total: {item.watts * item.quantity}W
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal para agregar item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Agregar Item Eléctrico</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="lighting">Iluminación</option>
                  <option value="pump">Bomba</option>
                  <option value="heating">Calefacción</option>
                  <option value="automation">Automatización</option>
                  <option value="cable">Cableado</option>
                  <option value="breaker">Térmicas/Disyuntores</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <Input
                label="Nombre *"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Ej: Luz LED 12V RGB"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Potencia (Watts) *"
                  type="number"
                  value={newItem.watts || 0}
                  onChange={(e) => setNewItem({ ...newItem, watts: parseInt(e.target.value) || 0 })}
                  min={0}
                />
                <Input
                  label="Voltaje (V)"
                  type="number"
                  value={newItem.voltage || 220}
                  onChange={(e) => setNewItem({ ...newItem, voltage: parseInt(e.target.value) || 220 })}
                />
              </div>

              <Input
                label="Cantidad"
                type="number"
                value={newItem.quantity || 1}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                min={1}
              />

              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={newItem.notes || ''}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAddItem} className="flex-1">Agregar</Button>
                <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

          <div className="flex justify-end gap-3">
            <Button onClick={handleSave}>
              Guardar Configuración Eléctrica
            </Button>
          </div>
        </>
      )}

      {/* MODO MANUAL */}
      {calculationMode === 'manual' && (
        <Card>
          <div className="text-center py-16">
            <Settings size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Configuración Manual Personalizada</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Esta función permite configurar manualmente todos los componentes eléctricos sin usar los valores automáticos del preset.
            </p>
            <p className="text-sm text-gray-500 mt-4">Próximamente disponible</p>
          </div>
        </Card>
      )}
    </div>
  );
};
