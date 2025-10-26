import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { tilePresetService } from '@/services/tilePresetService';
import { accessoryPresetService } from '@/services/accessoryPresetService';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { constructionMaterialService } from '@/services/constructionMaterialService';
import { calculationSettingsService, CalculationSettings } from '@/services/calculationSettingsService';
import { 
  TilePreset, 
  AccessoryPreset, 
  EquipmentPreset, 
  ConstructionMaterialPreset,
  AccessoryType,
  TileType,
  EquipmentType,
  MaterialType
} from '@/types';
import { Plus, Edit, Trash2, Settings as SettingsIcon, Save, Search, Filter } from 'lucide-react';
import { PlumbingManager } from '@/components/PlumbingManager';

type TabType = 'tiles' | 'accessories' | 'equipment' | 'materials' | 'plumbing' | 'calculations';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tiles');
  
  // Estados para configuración de cálculos
  const [calcSettings, setCalcSettings] = useState<CalculationSettings | null>(null);
  const [calcFormData, setCalcFormData] = useState<Partial<CalculationSettings>>({});
  
  // Estados para losetas
  const [tiles, setTiles] = useState<TilePreset[]>([]);
  const [filteredTiles, setFilteredTiles] = useState<TilePreset[]>([]);
  const [tileSearchTerm, setTileSearchTerm] = useState('');
  const [tileTypeFilter, setTileTypeFilter] = useState('');
  const [showTileModal, setShowTileModal] = useState(false);
  const [editingTile, setEditingTile] = useState<TilePreset | null>(null);
  const [tileFormData, setTileFormData] = useState({
    name: '',
    type: 'COMMON' as TileType,
    width: 0,
    length: 0,
    pricePerUnit: 0,
    brand: '',
    description: '',
    hasCorner: false,
    cornerPricePerUnit: 0,
    cornersPerTile: 0,
    isForFirstRing: false,
  });

  // Estados para accesorios
  const [accessories, setAccessories] = useState<AccessoryPreset[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<AccessoryPreset[]>([]);
  const [accessorySearchTerm, setAccessorySearchTerm] = useState('');
  const [accessoryTypeFilter, setAccessoryTypeFilter] = useState('');
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoryPreset | null>(null);
  const [accessoryFormData, setAccessoryFormData] = useState({
    name: '',
    type: 'CORNER' as AccessoryType,
    unit: '',
    pricePerUnit: 0,
    description: '',
  });

  // Estados para equipos
  const [equipment, setEquipment] = useState<EquipmentPreset[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentPreset[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentPreset | null>(null);
  const [equipmentFormData, setEquipmentFormData] = useState({
    name: '',
    type: 'PUMP' as EquipmentType,
    brand: '',
    model: '',
    power: 0,
    capacity: 0,
    voltage: 220,
    pricePerUnit: 0,
    description: '',
  });

  // Estados para materiales
  const [materials, setMaterials] = useState<ConstructionMaterialPreset[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<ConstructionMaterialPreset[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ConstructionMaterialPreset | null>(null);
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    type: 'CEMENT' as MaterialType,
    unit: '',
    pricePerUnit: 0,
    brand: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Filtros para Losetas
  useEffect(() => {
    let filtered = [...tiles];
    if (tileSearchTerm) {
      const term = tileSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }
    if (tileTypeFilter) {
      filtered = filtered.filter(item => item.type === tileTypeFilter);
    }
    setFilteredTiles(filtered);
  }, [tiles, tileSearchTerm, tileTypeFilter]);

  // Filtros para Accesorios
  useEffect(() => {
    let filtered = [...accessories];
    if (accessorySearchTerm) {
      const term = accessorySearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }
    if (accessoryTypeFilter) {
      filtered = filtered.filter(item => item.type === accessoryTypeFilter);
    }
    setFilteredAccessories(filtered);
  }, [accessories, accessorySearchTerm, accessoryTypeFilter]);

  // Filtros para Equipos
  useEffect(() => {
    let filtered = [...equipment];
    if (equipmentSearchTerm) {
      const term = equipmentSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.model?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }
    if (equipmentTypeFilter) {
      filtered = filtered.filter(item => item.type === equipmentTypeFilter);
    }
    setFilteredEquipment(filtered);
  }, [equipment, equipmentSearchTerm, equipmentTypeFilter]);

  // Filtros para Materiales
  useEffect(() => {
    let filtered = [...materials];
    if (materialSearchTerm) {
      const term = materialSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }
    if (materialTypeFilter) {
      filtered = filtered.filter(item => item.type === materialTypeFilter);
    }
    setFilteredMaterials(filtered);
  }, [materials, materialSearchTerm, materialTypeFilter]);

  const loadData = async () => {
    try {
      const [tilesData, accessoriesData, equipmentData, materialsData, calcData] = await Promise.all([
        tilePresetService.getAll(),
        accessoryPresetService.getAll(),
        equipmentPresetService.getAll(),
        constructionMaterialService.getAll(),
        calculationSettingsService.get(),
      ]);
      setTiles(tilesData);
      setAccessories(accessoriesData);
      setEquipment(equipmentData);
      setMaterials(materialsData);
      setCalcSettings(calcData);
      setCalcFormData(calcData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  // Handlers para guardar configuración de cálculos
  const handleSaveCalculations = async () => {
    try {
      await calculationSettingsService.update(calcFormData);
      alert('Configuración de cálculos guardada exitosamente');
      loadData();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar configuración');
    }
  };

  // Handlers de Losetas
  const handleTileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTile) {
        await tilePresetService.update(editingTile.id, tileFormData);
      } else {
        await tilePresetService.create(tileFormData);
      }
      setShowTileModal(false);
      resetTileForm();
      loadData();
    } catch (error) {
      console.error('Error al guardar loseta:', error);
    }
  };

  const handleEditTile = (tile: TilePreset) => {
    setEditingTile(tile);
    setTileFormData({
      name: tile.name,
      type: tile.type,
      width: tile.width,
      length: tile.length,
      pricePerUnit: tile.pricePerUnit,
      brand: tile.brand || '',
      description: tile.description || '',
      hasCorner: tile.hasCorner || false,
      cornerPricePerUnit: tile.cornerPricePerUnit || 0,
      cornersPerTile: tile.cornersPerTile || 0,
      isForFirstRing: tile.isForFirstRing || false,
    });
    setShowTileModal(true);
  };

  const handleDeleteTile = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta loseta?')) {
      try {
        await tilePresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar loseta:', error);
      }
    }
  };

  const resetTileForm = () => {
    setEditingTile(null);
    setTileFormData({
      name: '',
      type: 'COMMON',
      width: 0,
      length: 0,
      pricePerUnit: 0,
      brand: '',
      description: '',
      hasCorner: false,
      cornerPricePerUnit: 0,
      cornersPerTile: 0,
      isForFirstRing: false,
    });
  };

  const clearTileFilters = () => {
    setTileSearchTerm('');
    setTileTypeFilter('');
  };

  // Handlers de Accesorios
  const handleAccessorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccessory) {
        await accessoryPresetService.update(editingAccessory.id, accessoryFormData);
      } else {
        await accessoryPresetService.create(accessoryFormData);
      }
      setShowAccessoryModal(false);
      resetAccessoryForm();
      loadData();
    } catch (error) {
      console.error('Error al guardar accesorio:', error);
    }
  };

  const handleEditAccessory = (accessory: AccessoryPreset) => {
    setEditingAccessory(accessory);
    setAccessoryFormData({
      name: accessory.name,
      type: accessory.type,
      unit: accessory.unit,
      pricePerUnit: accessory.pricePerUnit,
      description: accessory.description || '',
    });
    setShowAccessoryModal(true);
  };

  const handleDeleteAccessory = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este accesorio?')) {
      try {
        await accessoryPresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar accesorio:', error);
      }
    }
  };

  const resetAccessoryForm = () => {
    setEditingAccessory(null);
    setAccessoryFormData({
      name: '',
      type: 'CORNER',
      unit: '',
      pricePerUnit: 0,
      description: '',
    });
  };

  const clearAccessoryFilters = () => {
    setAccessorySearchTerm('');
    setAccessoryTypeFilter('');
  };

  // Handlers de Equipos
  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        await equipmentPresetService.update(editingEquipment.id, equipmentFormData);
      } else {
        await equipmentPresetService.create(equipmentFormData);
      }
      setShowEquipmentModal(false);
      resetEquipmentForm();
      loadData();
    } catch (error) {
      console.error('Error al guardar equipo:', error);
    }
  };

  const handleEditEquipment = (equip: EquipmentPreset) => {
    setEditingEquipment(equip);
    setEquipmentFormData({
      name: equip.name,
      type: equip.type,
      brand: equip.brand || '',
      model: equip.model || '',
      power: equip.power || 0,
      capacity: equip.capacity || 0,
      voltage: equip.voltage || 220,
      pricePerUnit: equip.pricePerUnit,
      description: equip.description || '',
    });
    setShowEquipmentModal(true);
  };

  const handleDeleteEquipment = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este equipo?')) {
      try {
        await equipmentPresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar equipo:', error);
      }
    }
  };

  const resetEquipmentForm = () => {
    setEditingEquipment(null);
    setEquipmentFormData({
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
  };

  const clearEquipmentFilters = () => {
    setEquipmentSearchTerm('');
    setEquipmentTypeFilter('');
  };

  // Handlers de Materiales
  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await constructionMaterialService.update(editingMaterial.id, materialFormData);
      } else {
        await constructionMaterialService.create(materialFormData);
      }
      setShowMaterialModal(false);
      resetMaterialForm();
      loadData();
    } catch (error) {
      console.error('Error al guardar material:', error);
    }
  };

  const handleEditMaterial = (material: ConstructionMaterialPreset) => {
    setEditingMaterial(material);
    setMaterialFormData({
      name: material.name,
      type: material.type,
      unit: material.unit,
      pricePerUnit: material.pricePerUnit,
      brand: material.brand || '',
      description: material.description || '',
    });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este material?')) {
      try {
        await constructionMaterialService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar material:', error);
      }
    }
  };

  const resetMaterialForm = () => {
    setEditingMaterial(null);
    setMaterialFormData({
      name: '',
      type: 'CEMENT',
      unit: '',
      pricePerUnit: 0,
      brand: '',
      description: '',
    });
  };

  const clearMaterialFilters = () => {
    setMaterialSearchTerm('');
    setMaterialTypeFilter('');
  };

  const tabs = [
    { id: 'tiles', label: 'Losetas' },
    { id: 'accessories', label: 'Accesorios' },
    { id: 'equipment', label: 'Equipos' },
    { id: 'materials', label: 'Materiales' },
    { id: 'plumbing', label: 'Plomería' },
    { id: 'calculations', label: 'Config. Cálculos', icon: SettingsIcon },
  ];

  const tileTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'COMMON', label: 'Común' },
    { value: 'LOMO_BALLENA', label: 'Lomo de Ballena' },
    { value: 'L_FINISH', label: 'Terminación L' },
    { value: 'PERIMETER', label: 'Perímetro' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const accessoryTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'CORNER', label: 'Esquinero' },
    { value: 'TRIM', label: 'Remate' },
    { value: 'GRILL', label: 'Rejilla' },
    { value: 'BASEBOARD', label: 'Zócalo' },
    { value: 'SKIMMER_ITEM', label: 'Accesorio de Skimmer' },
    { value: 'RETURN_ITEM', label: 'Accesorio de Retorno' },
    { value: 'DRAIN_ITEM', label: 'Accesorio de Desagüe' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'PUMP', label: 'Bomba' },
    { value: 'FILTER', label: 'Filtro' },
    { value: 'HEATER', label: 'Calentador' },
    { value: 'CHLORINATOR', label: 'Clorador' },
    { value: 'LIGHTING', label: 'Iluminación' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const materialTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'CEMENT', label: 'Cemento' },
    { value: 'WHITE_CEMENT', label: 'Cemento Blanco' },
    { value: 'SAND', label: 'Arena' },
    { value: 'STONE', label: 'Piedra' },
    { value: 'GRAVEL', label: 'Grava' },
    { value: 'MARMOLINA', label: 'Marmolina' },
    { value: 'WIRE_MESH', label: 'Malla Metálica' },
    { value: 'WIRE', label: 'Alambre' },
    { value: 'NAILS', label: 'Clavos' },
    { value: 'WATERPROOFING', label: 'Impermeabilizante' },
    { value: 'GEOTEXTILE', label: 'Geotextil' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const formTileTypeOptions = tileTypeOptions.filter(opt => opt.value !== '');
  const formAccessoryTypeOptions = accessoryTypeOptions.filter(opt => opt.value !== '');
  const formEquipmentTypeOptions = equipmentTypeOptions.filter(opt => opt.value !== '');
  const formMaterialTypeOptions = materialTypeOptions.filter(opt => opt.value !== '');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <SettingsIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Configuración
              </h1>
              <p className="text-gray-700 mt-1 font-medium">
                Gestiona presets, materiales y configuraciones del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-700 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon && <tab.icon size={18} />}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content - Losetas */}
        {activeTab === 'tiles' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Losetas y Venecitas</h2>
                <p className="text-sm text-gray-700 mt-1">Administra los tipos de losetas disponibles</p>
              </div>
              <Button onClick={() => setShowTileModal(true)}>
                <Plus size={16} className="mr-2" />
                Nueva Loseta
              </Button>
            </div>

            {/* Filtros para Losetas */}
            <div className="mb-6 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Buscar por nombre, marca..."
                        value={tileSearchTerm}
                        onChange={(e) => setTileSearchTerm(e.target.value)}
                      />
                    </div>

                    <Select
                      options={tileTypeOptions}
                      value={tileTypeFilter}
                      onChange={(e) => setTileTypeFilter(e.target.value)}
                    />
                  </div>

                  {(tileSearchTerm || tileTypeFilter) && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Mostrando {filteredTiles.length} de {tiles.length} losetas
                      </p>
                      <Button size="sm" variant="secondary" onClick={clearTileFilters}>
                        Limpiar Filtros
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filteredTiles.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Filter size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tiles.length === 0 ? 'No hay losetas configuradas' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {tiles.length === 0
                      ? 'Crea tu primera loseta para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {tiles.length === 0 && (
                    <Button onClick={() => setShowTileModal(true)}>
                      Crear Primera Loseta
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTiles.map((tile) => (
                  <div key={tile.id} className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-600">
                    <div className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-gray-900">{tile.name}</h3>
                          {tile.isForFirstRing && (
                            <span className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold">
                              1er Anillo
                            </span>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <span className="inline-block px-3 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold mb-2">
                            {tile.type}
                          </span>
                          <p className="text-gray-700">
                            Dimensiones: {tile.width}m x {tile.length}m
                          </p>
                          <p className="font-bold text-gray-900 text-lg">
                            Loseta: ${tile.pricePerUnit.toLocaleString('es-AR')}
                          </p>
                          {tile.hasCorner && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
                              <p className="text-xs font-semibold text-blue-600">Con Esquineros</p>
                              <p className="text-xs text-gray-700">
                                {tile.cornersPerTile} esq. x ${tile.cornerPricePerUnit?.toLocaleString('es-AR')}
                              </p>
                            </div>
                          )}
                          {tile.brand && <p className="text-gray-700">Marca: {tile.brand}</p>}
                        </div>
                        <div className="flex space-x-2 pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditTile(tile)}
                            className="flex-1"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteTile(tile.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          <Modal
            isOpen={showTileModal}
            onClose={() => {
              setShowTileModal(false);
              resetTileForm();
            }}
            title={editingTile ? 'Editar Loseta' : 'Nueva Loseta'}
          >
            <form onSubmit={handleTileSubmit} className="space-y-4">
              <Input
                label="Nombre"
                value={tileFormData.name}
                onChange={(e) => setTileFormData({ ...tileFormData, name: e.target.value })}
                required
              />

              <Select
                label="Tipo"
                options={formTileTypeOptions}
                value={tileFormData.type}
                onChange={(e) => setTileFormData({ ...tileFormData, type: e.target.value as TileType })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ancho (metros)"
                  type="number"
                  step="0.01"
                  value={tileFormData.width}
                  onChange={(e) => setTileFormData({ ...tileFormData, width: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  label="Largo (metros)"
                  type="number"
                  step="0.01"
                  value={tileFormData.length}
                  onChange={(e) => setTileFormData({ ...tileFormData, length: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <Input
                label="Precio por Unidad (Loseta)"
                type="number"
                step="0.01"
                value={tileFormData.pricePerUnit}
                onChange={(e) => setTileFormData({ ...tileFormData, pricePerUnit: parseFloat(e.target.value) })}
                required
              />

              {/* Checkbox para primer anillo */}
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tileFormData.isForFirstRing}
                    onChange={(e) => setTileFormData({ ...tileFormData, isForFirstRing: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-sm text-gray-900">Es para primer anillo perimetral</p>
                    <p className="text-xs text-gray-700">Esta loseta se usa en la primera vuelta alrededor de la piscina</p>
                  </div>
                </label>
              </div>

              {/* Sección de Esquineros */}
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={tileFormData.hasCorner}
                    onChange={(e) => setTileFormData({ ...tileFormData, hasCorner: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-sm text-gray-900">Lleva Esquineros</p>
                    <p className="text-xs text-gray-700">Ej: Lomo Ballena lleva esquineros, Terminación L no</p>
                  </div>
                </label>

                {tileFormData.hasCorner && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-200">
                    <Input
                      label="Esquineros por Loseta"
                      type="number"
                      step="1"
                      value={tileFormData.cornersPerTile}
                      onChange={(e) => setTileFormData({ ...tileFormData, cornersPerTile: parseInt(e.target.value) || 0 })}
                      placeholder="Ej: 4"
                    />
                    <Input
                      label="Precio por Esquinero"
                      type="number"
                      step="0.01"
                      value={tileFormData.cornerPricePerUnit}
                      onChange={(e) => setTileFormData({ ...tileFormData, cornerPricePerUnit: parseFloat(e.target.value) || 0 })}
                      placeholder="Precio unitario"
                    />
                  </div>
                )}
              </div>

              <Input
                label="Marca (opcional)"
                value={tileFormData.brand}
                onChange={(e) => setTileFormData({ ...tileFormData, brand: e.target.value })}
              />

              <Input
                label="Descripción (opcional)"
                value={tileFormData.description}
                onChange={(e) => setTileFormData({ ...tileFormData, description: e.target.value })}
              />

              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingTile ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowTileModal(false);
                    resetTileForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

        {/* Tab Content - Accesorios */}
        {activeTab === 'accessories' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Accesorios</h2>
                <p className="text-sm text-gray-700 mt-1">Administra los accesorios y complementos</p>
              </div>
              <Button onClick={() => setShowAccessoryModal(true)}>
                <Plus size={16} className="mr-2" />
                Nuevo Accesorio
              </Button>
            </div>

            {/* Filtros para Accesorios */}
            <div className="mb-6 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Buscar por nombre, descripción..."
                        value={accessorySearchTerm}
                        onChange={(e) => setAccessorySearchTerm(e.target.value)}
                      />
                    </div>

                    <Select
                      options={accessoryTypeOptions}
                      value={accessoryTypeFilter}
                      onChange={(e) => setAccessoryTypeFilter(e.target.value)}
                    />
                  </div>

                  {(accessorySearchTerm || accessoryTypeFilter) && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Mostrando {filteredAccessories.length} de {accessories.length} accesorios
                      </p>
                      <Button size="sm" variant="secondary" onClick={clearAccessoryFilters}>
                        Limpiar Filtros
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filteredAccessories.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Filter size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {accessories.length === 0 ? 'No hay accesorios configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {accessories.length === 0
                      ? 'Crea tu primer accesorio para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {accessories.length === 0 && (
                    <Button onClick={() => setShowAccessoryModal(true)}>
                      Crear Primer Accesorio
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccessories.map((acc) => (
                  <div key={acc.id} className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-600">
                    <div className="p-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">{acc.name}</h3>
                        <div className="text-sm space-y-1">
                          <span className="inline-block px-3 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold mb-2">
                            {acc.type}
                          </span>
                          <p className="text-gray-700">Unidad: {acc.unit}</p>
                          <p className="font-bold text-gray-900 text-lg">
                            ${acc.pricePerUnit.toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="flex space-x-2 pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditAccessory(acc)}
                            className="flex-1"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteAccessory(acc.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          <Modal
            isOpen={showAccessoryModal}
            onClose={() => {
              setShowAccessoryModal(false);
              resetAccessoryForm();
            }}
            title={editingAccessory ? 'Editar Accesorio' : 'Nuevo Accesorio'}
          >
            <form onSubmit={handleAccessorySubmit} className="space-y-4">
              <Input
                label="Nombre"
                value={accessoryFormData.name}
                onChange={(e) => setAccessoryFormData({ ...accessoryFormData, name: e.target.value })}
                required
              />
              <Select
                label="Tipo"
                options={formAccessoryTypeOptions}
                value={accessoryFormData.type}
                onChange={(e) => setAccessoryFormData({ ...accessoryFormData, type: e.target.value as AccessoryType })}
              />
              <Input
                label="Unidad"
                value={accessoryFormData.unit}
                onChange={(e) => setAccessoryFormData({ ...accessoryFormData, unit: e.target.value })}
                placeholder="ej: unidad, metro, juego"
                required
              />
              <Input
                label="Precio por Unidad"
                type="number"
                step="0.01"
                value={accessoryFormData.pricePerUnit}
                onChange={(e) => setAccessoryFormData({ ...accessoryFormData, pricePerUnit: parseFloat(e.target.value) })}
                required
              />
              <Input
                label="Descripción (opcional)"
                value={accessoryFormData.description}
                onChange={(e) => setAccessoryFormData({ ...accessoryFormData, description: e.target.value })}
              />
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingAccessory ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAccessoryModal(false);
                    resetAccessoryForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

        {/* Tab Content - Equipos */}
        {activeTab === 'equipment' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Equipos</h2>
                <p className="text-sm text-gray-700 mt-1">Administra bombas, filtros, calentadores y mas</p>
              </div>
            <Button onClick={() => setShowEquipmentModal(true)}>
              <Plus size={16} className="mr-2" />
              Nuevo Equipo
            </Button>
          </div>

            {/* Filtros para Equipos */}
            <div className="mb-6 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Buscar por nombre, marca, modelo..."
                        value={equipmentSearchTerm}
                        onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                      />
                    </div>

                    <Select
                      options={equipmentTypeOptions}
                      value={equipmentTypeFilter}
                      onChange={(e) => setEquipmentTypeFilter(e.target.value)}
                    />
                  </div>

                  {(equipmentSearchTerm || equipmentTypeFilter) && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Mostrando {filteredEquipment.length} de {equipment.length} equipos
                      </p>
                      <Button size="sm" variant="secondary" onClick={clearEquipmentFilters}>
                        Limpiar Filtros
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filteredEquipment.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Filter size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {equipment.length === 0 ? 'No hay equipos configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {equipment.length === 0
                      ? 'Crea tu primer equipo para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {equipment.length === 0 && (
                    <Button onClick={() => setShowEquipmentModal(true)}>
                      Crear Primer Equipo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEquipment.map((equip) => (
                  <div key={equip.id} className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-600">
                    <div className="p-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">{equip.name}</h3>
                        <div className="text-sm space-y-1">
                          <span className="inline-block px-3 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold mb-2">
                            {equip.type}
                          </span>
                          {equip.brand && <p className="text-gray-700">Marca: {equip.brand}</p>}
                          {equip.model && <p className="text-gray-700">Modelo: {equip.model}</p>}
                          {equip.power && <p className="text-gray-700">Potencia: {equip.power} HP</p>}
                          <p className="font-bold text-gray-900 text-lg">
                            ${equip.pricePerUnit.toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="flex space-x-2 pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditEquipment(equip)}
                            className="flex-1"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteEquipment(equip.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          <Modal
            isOpen={showEquipmentModal}
            onClose={() => {
              setShowEquipmentModal(false);
              resetEquipmentForm();
            }}
            title={editingEquipment ? 'Editar Equipo' : 'Nuevo Equipo'}
          >
            <form onSubmit={handleEquipmentSubmit} className="space-y-4">
              <Input
                label="Nombre"
                value={equipmentFormData.name}
                onChange={(e) => setEquipmentFormData({ ...equipmentFormData, name: e.target.value })}
                required
              />
              <Select
                label="Tipo"
                options={formEquipmentTypeOptions}
                value={equipmentFormData.type}
                onChange={(e) => setEquipmentFormData({ ...equipmentFormData, type: e.target.value as EquipmentType })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Marca (opcional)"
                  value={equipmentFormData.brand}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, brand: e.target.value })}
                />
                <Input
                  label="Modelo (opcional)"
                  value={equipmentFormData.model}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, model: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Potencia (HP)"
                  type="number"
                  step="0.1"
                  value={equipmentFormData.power}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, power: parseFloat(e.target.value) })}
                />
                <Input
                  label="Capacidad"
                  type="number"
                  step="0.1"
                  value={equipmentFormData.capacity}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, capacity: parseFloat(e.target.value) })}
                />
                <Input
                  label="Voltaje"
                  type="number"
                  value={equipmentFormData.voltage}
                  onChange={(e) => setEquipmentFormData({ ...equipmentFormData, voltage: parseInt(e.target.value) })}
                />
              </div>
              <Input
                label="Precio por Unidad"
                type="number"
                step="0.01"
                value={equipmentFormData.pricePerUnit}
                onChange={(e) => setEquipmentFormData({ ...equipmentFormData, pricePerUnit: parseFloat(e.target.value) })}
                required
              />
              <Input
                label="Descripción (opcional)"
                value={equipmentFormData.description}
                onChange={(e) => setEquipmentFormData({ ...equipmentFormData, description: e.target.value })}
              />
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingEquipment ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEquipmentModal(false);
                    resetEquipmentForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

        {/* Tab Content - Materiales */}
        {activeTab === 'materials' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Materiales de Construcción</h2>
                <p className="text-sm text-gray-700 mt-1">Administra cemento, arena, piedra y mas</p>
              </div>
            <Button onClick={() => setShowMaterialModal(true)}>
              <Plus size={16} className="mr-2" />
              Nuevo Material
            </Button>
          </div>

            {/* Filtros para Materiales */}
            <div className="mb-6 rounded-lg bg-white border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Buscar por nombre, marca..."
                        value={materialSearchTerm}
                        onChange={(e) => setMaterialSearchTerm(e.target.value)}
                      />
                    </div>

                    <Select
                      options={materialTypeOptions}
                      value={materialTypeFilter}
                      onChange={(e) => setMaterialTypeFilter(e.target.value)}
                    />
                  </div>

                  {(materialSearchTerm || materialTypeFilter) && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Mostrando {filteredMaterials.length} de {materials.length} materiales
                      </p>
                      <Button size="sm" variant="secondary" onClick={clearMaterialFilters}>
                        Limpiar Filtros
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Filter size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {materials.length === 0 ? 'No hay materiales configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {materials.length === 0
                      ? 'Crea tu primer material para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {materials.length === 0 && (
                    <Button onClick={() => setShowMaterialModal(true)}>
                      Crear Primer Material
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMaterials.map((mat) => (
                  <div key={mat.id} className="rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-600">
                    <div className="p-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">{mat.name}</h3>
                        <div className="text-sm space-y-1">
                          <span className="inline-block px-3 py-1 text-xs rounded-md bg-blue-600 text-white font-semibold mb-2">
                            {mat.type}
                          </span>
                          <p className="text-gray-700">Unidad: {mat.unit}</p>
                          {mat.brand && <p className="text-gray-700">Marca: {mat.brand}</p>}
                          <p className="font-bold text-gray-900 text-lg">
                            ${mat.pricePerUnit.toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="flex space-x-2 pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditMaterial(mat)}
                            className="flex-1"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteMaterial(mat.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          <Modal
            isOpen={showMaterialModal}
            onClose={() => {
              setShowMaterialModal(false);
              resetMaterialForm();
            }}
            title={editingMaterial ? 'Editar Material' : 'Nuevo Material'}
          >
            <form onSubmit={handleMaterialSubmit} className="space-y-4">
              <Input
                label="Nombre"
                value={materialFormData.name}
                onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                required
              />
              <Select
                label="Tipo"
                options={formMaterialTypeOptions}
                value={materialFormData.type}
                onChange={(e) => setMaterialFormData({ ...materialFormData, type: e.target.value as MaterialType })}
              />
              <Input
                label="Unidad"
                value={materialFormData.unit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                placeholder="ej: kg, m³, bolsa, balde"
                required
              />
              <Input
                label="Precio por Unidad"
                type="number"
                step="0.01"
                value={materialFormData.pricePerUnit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, pricePerUnit: parseFloat(e.target.value) })}
                required
              />
              <Input
                label="Marca (opcional)"
                value={materialFormData.brand}
                onChange={(e) => setMaterialFormData({ ...materialFormData, brand: e.target.value })}
              />
              <Input
                label="Descripción (opcional)"
                value={materialFormData.description}
                onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
              />
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingMaterial ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowMaterialModal(false);
                    resetMaterialForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Tab Content - Plomería */}
      {activeTab === 'plumbing' && <PlumbingManager />}

        {/* Tab Content - Configuración de Cálculos MEJORADA */}
        {activeTab === 'calculations' && calcSettings && (
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
            <div className="p-8">
              <div className="space-y-8">
                <div className="pb-6 border-b border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Configuración de Cálculos Automáticos</h3>
                  <p className="text-sm text-gray-700">
                    Estos valores se usan para calcular automaticamente los materiales necesarios en cada proyecto.
                    Ajusta los parametros segun tus criterios de construccion.
                  </p>
                </div>

                {/* SECCIÓN 1: VEREDA Y SOLARIUM */}
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-gray-900 mb-1">VEREDA Y SOLARIUM</h4>
                    <p className="text-sm text-gray-700 mb-4">Configuración para el calculo de materiales de la vereda perimetral</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Adhesivo para Losetas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="number"
                        step="0.1"
                        label="Kilogramos de Pegamento por m²"
                        value={calcFormData.adhesiveKgPerM2}
                        onChange={(e) => setCalcFormData({...calcFormData, adhesiveKgPerM2: parseFloat(e.target.value)})}
                      />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-gray-700">Valor tipico: 3-5 kg/m² segun tipo de loseta</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Contrapiso de Vereda</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Espesor del Contrapiso (cm)"
                    value={calcFormData.sidewalkBaseThicknessCm}
                    onChange={(e) => setCalcFormData({...calcFormData, sidewalkBaseThicknessCm: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="10"
                    label="Kilogramos de Cemento por m³"
                    value={calcFormData.cementKgPerM3}
                    onChange={(e) => setCalcFormData({...calcFormData, cementKgPerM3: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    label="Metros cúbicos de Arena por m³"
                    value={calcFormData.sandM3PerM3}
                    onChange={(e) => setCalcFormData({...calcFormData, sandM3PerM3: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    label="Metros cúbicos de Piedra por m³"
                    value={calcFormData.gravelM3PerM3}
                    onChange={(e) => setCalcFormData({...calcFormData, gravelM3PerM3: parseFloat(e.target.value)})}
                  />
                </div>
                    <p className="text-xs text-gray-700 mt-2">Dosificacion tipica: 1:3:3 (cemento:arena:piedra) = 200 kg cemento/m³</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Pastina y Juntas</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Ancho de Junta (mm)"
                    value={calcFormData.groutJointWidthMm}
                    onChange={(e) => setCalcFormData({...calcFormData, groutJointWidthMm: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    label="Kg Cemento Blanco por metro lineal"
                    value={calcFormData.whiteCementKgPerLinealM}
                    onChange={(e) => setCalcFormData({...calcFormData, whiteCementKgPerLinealM: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    label="Kg Marmolina por metro lineal"
                    value={calcFormData.marmolinaKgPerLinealM}
                    onChange={(e) => setCalcFormData({...calcFormData, marmolinaKgPerLinealM: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Malla e Impermeabilizacion</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.05"
                    label="Factor de Malla (m² de malla por m² de superficie)"
                    value={calcFormData.wireMeshM2PerM2}
                    onChange={(e) => setCalcFormData({...calcFormData, wireMeshM2PerM2: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.1"
                    label="Kg Impermeabilizante por m²"
                    value={calcFormData.waterproofingKgPerM2}
                    onChange={(e) => setCalcFormData({...calcFormData, waterproofingKgPerM2: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="1"
                    label="Cantidad de Capas"
                    value={calcFormData.waterproofingCoats}
                    onChange={(e) => setCalcFormData({...calcFormData, waterproofingCoats: parseInt(e.target.value)})}
                  />
                </div>
                    <p className="text-xs text-gray-700 mt-2">Factor de malla incluye solapamiento (tipicamente 10-15%)</p>
                  </div>
                </div>

                {/* SECCIÓN 2: CAMA INTERNA DE PISCINA */}
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-gray-900 mb-1">CAMA INTERNA DE PISCINA</h4>
                    <p className="text-sm text-gray-700 mb-4">Configuración para el calculo de la cama de arena-cemento debajo del casco</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Dimensiones de Cama</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Espesor de Cama (cm)"
                    value={calcFormData.bedThicknessCm}
                    onChange={(e) => setCalcFormData({...calcFormData, bedThicknessCm: parseFloat(e.target.value)})}
                  />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-gray-700">Tipicamente 10cm de cama arena-cemento</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Cemento para Cama</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Bolsas de Cemento por m³ de arena"
                    value={calcFormData.bedCementBagsPerM3}
                    onChange={(e) => setCalcFormData({...calcFormData, bedCementBagsPerM3: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="5"
                    label="Peso de Bolsa de Cemento (kg)"
                    value={calcFormData.bedCementBagWeight}
                    onChange={(e) => setCalcFormData({...calcFormData, bedCementBagWeight: parseFloat(e.target.value)})}
                  />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-gray-700">Dosificacion tipica: 5 bolsas por m³</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Geomembrana y Mallas</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.05"
                    label="m² de Geomembrana por m² de superficie"
                    value={calcFormData.geomembraneM2PerM2}
                    onChange={(e) => setCalcFormData({...calcFormData, geomembraneM2PerM2: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    label="m² de Malla Electrosoldada por m² de superficie"
                    value={calcFormData.electroweldedMeshM2PerM2}
                    onChange={(e) => setCalcFormData({...calcFormData, electroweldedMeshM2PerM2: parseFloat(e.target.value)})}
                  />
                </div>
                    <p className="text-xs text-gray-700 mt-2">Geomembrana: 1.0 (sin solapamiento) | Malla: 1.15 (con solapamiento 15%)</p>
                  </div>
                </div>

                {/* SECCIÓN 3: SISTEMA DE DRENAJE */}
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-gray-900 mb-1">SISTEMA DE DRENAJE</h4>
                    <p className="text-sm text-gray-700 mb-4">Configuración para cunetas de drenaje perimetral</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-gray-900">Dimensiones de Cuneta</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="1"
                    label="Ancho de Cuneta (cm)"
                    value={calcFormData.drainTrenchWidthCm}
                    onChange={(e) => setCalcFormData({...calcFormData, drainTrenchWidthCm: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="1"
                    label="Profundidad de Cuneta (cm)"
                    value={calcFormData.drainTrenchDepthCm}
                    onChange={(e) => setCalcFormData({...calcFormData, drainTrenchDepthCm: parseFloat(e.target.value)})}
                  />
                </div>
                    <p className="text-xs text-gray-700 mt-2">Dimensiones tipicas: 15cm x 15cm para drenaje perimetral</p>
                  </div>
                </div>

                {/* BOTÓN GUARDAR */}
                <div className="pt-6 border-t border-gray-200 flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setCalcFormData(calcSettings)}
                  >
                    Restaurar Valores
                  </Button>
                  <Button
                    onClick={handleSaveCalculations}
                    className="flex items-center space-x-2"
                  >
                    <Save size={16} />
                    <span>Guardar Configuración</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export por defecto además del nombrado
export default Settings;
