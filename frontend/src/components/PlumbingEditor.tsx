import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Project } from '@/types';
import { plumbingItemService, PlumbingItem } from '@/services/plumbingItemService';
import { plumbingCalculationService, PlumbingCalculationResult } from '@/services/plumbingCalculationService';
import { Save, Plus, Trash2, Search, Calculator, AlertTriangle } from 'lucide-react';

interface PlumbingEditorProps {
  project: Project;
  onSave: (plumbingConfig: any) => void;
}

interface SelectedItem {
  itemId: string;
  itemName: string;
  quantity: number;
  diameter?: string;
  category: string;
  pricePerUnit: number;
}

export const PlumbingEditor: React.FC<PlumbingEditorProps> = ({ project, onSave }) => {
  const [plumbingItems, setPlumbingItems] = useState<PlumbingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [distanceToEquipment, setDistanceToEquipment] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pipeCalculation, setPipeCalculation] = useState<PlumbingCalculationResult | null>(null);
  const [calculationMode, setCalculationMode] = useState<'automatic' | 'manual'>('automatic');

  useEffect(() => {
    loadPlumbingItems();
    loadExistingConfig();
  }, []);

  useEffect(() => {
    // Recalcular caños cuando cambie la distancia
    calculatePipes();
  }, [distanceToEquipment, project]);

  const calculatePipes = () => {
    try {
      const calculation = plumbingCalculationService.calculateFromProject(project, distanceToEquipment);
      setPipeCalculation(calculation);
    } catch (error) {
      console.error('Error calculating pipes:', error);
    }
  };

  const loadPlumbingItems = async () => {
    try {
      const items = await plumbingItemService.getAll();
      setPlumbingItems(items);
    } catch (error) {
      console.error('Error al cargar items de plomería:', error);
    }
  };

  const loadExistingConfig = () => {
    if (project.plumbingConfig && typeof project.plumbingConfig === 'object') {
      const config = project.plumbingConfig as any;
      if (config.selectedItems) {
        setSelectedItems(config.selectedItems);
      }
      if (config.distanceToEquipment) {
        setDistanceToEquipment(config.distanceToEquipment);
      }
    }
  };

  const handleAddItem = (item: PlumbingItem) => {
    const existing = selectedItems.find(si => si.itemId === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map(si =>
        si.itemId === item.id ? { ...si, quantity: si.quantity + 1 } : si
      ));
    } else {
      setSelectedItems([...selectedItems, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        diameter: item.diameter,
        category: item.category,
        pricePerUnit: item.pricePerUnit,
      }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(si => si.itemId !== itemId));
    } else {
      setSelectedItems(selectedItems.map(si =>
        si.itemId === itemId ? { ...si, quantity } : si
      ));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(si => si.itemId !== itemId));
  };

  const handleSave = () => {
    const config = {
      distanceToEquipment,
      selectedItems,
    };
    onSave(config);
  };

  const filteredItems = plumbingItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.diameter?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    { value: 'PIPE', label: 'Cañería' },
    { value: 'FITTING', label: 'Accesorios' },
    { value: 'VALVE', label: 'Válvulas' },
    { value: 'ACCESSORY', label: 'Otros' },
  ];

  const totalCost = selectedItems.reduce((sum, item) => 
    sum + (item.quantity * item.pricePerUnit), 0
  );

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
          <p className="text-xs mt-1 opacity-90">Recomendado - Calcula caños automáticamente</p>
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
            <Search size={20} />
            <span>Selección Manual</span>
          </div>
          <p className="text-xs mt-1 opacity-90">Selecciona items específicos del catálogo</p>
        </button>
      </div>

      {/* Información del sistema */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Información del Sistema Hidráulico</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Skimmers</p>
            <p className="text-2xl font-bold text-blue-900">{project.poolPreset?.skimmerCount || 0}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 mb-1">Retornos</p>
            <p className="text-2xl font-bold text-green-900">{project.poolPreset?.returnsCount || 0}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 mb-1">Hidrojets</p>
            <p className="text-2xl font-bold text-purple-900">{project.poolPreset?.hydroJetsCount || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="number"
              label="Distancia a Cabecera/Equipo (metros)"
              value={distanceToEquipment}
              onChange={(e) => setDistanceToEquipment(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
            <p className="text-xs text-gray-500 mt-1">Distancia desde el borde de la piscina hasta donde estará el equipo de filtrado</p>
          </div>
        </div>
      </Card>

      {/* Visualización de Instalación Hidráulica */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Esquema de Instalación Hidráulica</h3>

        <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
          <div className="relative" style={{
            width: '600px',
            height: '400px'
          }}>
            {/* Piscina (centro) */}
            <div
              className="absolute bg-blue-100 border-4 border-blue-400 rounded-lg flex items-center justify-center shadow-lg"
              style={{
                top: '100px',
                left: '200px',
                width: '250px',
                height: '150px'
              }}
            >
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-700">PISCINA</div>
                <div className="text-xs text-blue-600 mt-1">
                  {project.poolPreset?.length || 0}m x {project.poolPreset?.width || 0}m
                </div>

                {/* Indicadores internos */}
                <div className="flex items-center justify-center gap-3 mt-3 text-xs">
                  {(project.poolPreset?.skimmerCount || 0) > 0 && (
                    <div className="bg-blue-200 px-2 py-1 rounded">
                      <span className="font-medium">{project.poolPreset?.skimmerCount}</span> Skimmers
                    </div>
                  )}
                  {(project.poolPreset?.returnsCount || 0) > 0 && (
                    <div className="bg-green-200 px-2 py-1 rounded">
                      <span className="font-medium">{project.poolPreset?.returnsCount}</span> Retornos
                    </div>
                  )}
                </div>

                {(project.poolPreset?.hydroJetsCount || 0) > 0 && (
                  <div className="bg-purple-200 px-2 py-1 rounded text-xs mt-2 inline-block">
                    <span className="font-medium">{project.poolPreset?.hydroJetsCount}</span> Hidrojets
                  </div>
                )}
              </div>
            </div>

            {/* Línea de conexión a equipo */}
            <div
              className="absolute border-t-2 border-dashed border-gray-400"
              style={{
                top: '175px',
                left: '450px',
                width: `${distanceToEquipment * 20}px`,
              }}
            >
              {/* Etiqueta de distancia */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 bg-white px-2 py-1 rounded border text-xs font-medium text-gray-700">
                {distanceToEquipment}m
              </div>
            </div>

            {/* Área de Equipo de Filtrado */}
            <div
              className="absolute bg-orange-100 border-4 border-orange-400 rounded-lg shadow-lg"
              style={{
                top: '125px',
                left: `${450 + distanceToEquipment * 20}px`,
                width: '120px',
                height: '100px'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full text-center p-2">
                <div className="text-sm font-semibold text-orange-800">EQUIPO DE</div>
                <div className="text-sm font-semibold text-orange-800">FILTRADO</div>
                <div className="text-xs text-orange-600 mt-2">Bomba + Filtro</div>
              </div>
            </div>

            {/* Leyenda */}
            <div className="absolute bottom-4 left-4 text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                <span>Piscina</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                <span>Equipo de filtrado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-gray-400"></div>
                <span>Conexión hidráulica</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Este diagrama muestra la ubicación relativa del equipo de filtrado
            respecto a la piscina. Ajusta la distancia arriba para ver cómo cambia el layout.
          </p>
        </div>
      </Card>

      {/* MODO AUTOMÁTICO */}
      {calculationMode === 'automatic' && pipeCalculation && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold">Cálculo Automático de Caños</h3>
          </div>

          <>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Distancia Máxima</p>
                  <p className="text-2xl font-bold text-blue-900">{pipeCalculation.summary.maxDistance}m</p>
                  <p className="text-xs text-blue-600 mt-1">Desde extremo más alejado</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Total Accesorios</p>
                  <p className="text-2xl font-bold text-green-900">{pipeCalculation.summary.totalAccessories}</p>
                  <p className="text-xs text-green-600 mt-1">Skimmers, retornos, etc.</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-700 mb-1">Total Caños</p>
                  <p className="text-2xl font-bold text-purple-900">{pipeCalculation.summary.totalMeters}m</p>
                  <p className="text-xs text-purple-600 mt-1">Metros lineales estimados</p>
                </div>
              </div>

              {/* Desglose por tipo de línea */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 mb-2">Desglose por Tipo de Línea</h4>
                {pipeCalculation.pipeRequirements.map((req, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            req.lineType === 'SUCCION' ? 'bg-blue-100 text-blue-800' :
                            req.lineType === 'RETORNO' ? 'bg-green-100 text-green-800' :
                            req.lineType === 'HIDROJET' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {req.lineType}
                          </span>
                          <h5 className="font-medium text-gray-900">{req.description}</h5>
                        </div>
                        <p className="text-sm text-gray-600">
                          Diámetro recomendado: <strong>{req.diameter}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-600">{req.totalMeters}m</p>
                        <p className="text-xs text-gray-500">{req.accessoryCount} × {req.metersPerAccessory.toFixed(1)}m</p>
                      </div>
                    </div>

                    {req.recommendations.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-yellow-800 mb-1">Recomendaciones:</p>
                            <ul className="text-xs text-yellow-700 space-y-0.5">
                              {req.recommendations.map((rec, idx) => (
                                <li key={idx}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Nota explicativa */}
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-900 font-medium mb-2">Cómo se calculan estos valores:</p>
                <ul className="text-xs text-indigo-800 space-y-1">
                  <li>• Se toma la distancia desde el extremo más alejado de la piscina hasta el equipo</li>
                  <li>• Se calcula por cada accesorio (skimmer, retorno, hidrojet, etc.)</li>
                  <li>• Se incluye un 15% adicional para codos, subidas y conexiones</li>
                  <li>• Los diámetros se recomiendan según la cantidad de accesorios en cada línea</li>
                  <li>• Se consideran tanto los accesorios del preset como los adicionales agregados</li>
                </ul>
              </div>
            </>
        </Card>
      )}

      {/* MODO MANUAL */}
      {calculationMode === 'manual' && (
        <>
          {/* Catálogo de items */}
          <Card>
        <h3 className="text-lg font-semibold mb-4">Catálogo de Plomería</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Input
              placeholder="Buscar por nombre o diámetro..."
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
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No se encontraron items. Configurá items de plomería en Settings.
            </p>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.diameter && `Ø ${item.diameter} · `}
                    {item.category} · ${item.pricePerUnit.toLocaleString('es-AR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddItem(item)}
                >
                  <Plus size={14} className="mr-1" />
                  Agregar
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

          {/* Items seleccionados */}
          <Card>
        <h3 className="text-lg font-semibold mb-4">Items Seleccionados</h3>
        
        {selectedItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay items seleccionados. Agregá items del catálogo arriba.
          </p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {selectedItems.map(item => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.itemName}</p>
                    <p className="text-sm text-gray-600">
                      {item.diameter && `Ø ${item.diameter} · `}
                      ${item.pricePerUnit.toLocaleString('es-AR')} × {item.quantity} = ${(item.pricePerUnit * item.quantity).toLocaleString('es-AR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(item.itemId, parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-20"
                    />
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveItem(item.itemId)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Plomería:</span>
                <span className="text-xl font-bold text-primary-600">
                  ${totalCost.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </>
        )}
      </Card>
        </>
      )}

      {/* Acciones */}
      <div className="flex justify-end space-x-3">
        <Button onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
};
