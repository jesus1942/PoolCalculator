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
  MaterialType,
  MaterialCategory
} from '@/types';
import { Plus, Edit, Trash2, Settings as SettingsIcon, Save, Search, Filter } from 'lucide-react';
import { PlumbingManager } from '@/components/PlumbingManager';
import { HybridImageManager } from '@/components/HybridImageManager';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/context/AuthContext';

type TabType = 'tiles' | 'accessories' | 'equipment' | 'materials' | 'plumbing' | 'calculations';

export const Settings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tiles');

  const formatDimensionCm = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return `${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })} cm`;
  };

  const formatTileDimensions = (width?: number | null, length?: number | null) => {
    return `${formatDimensionCm(width)} x ${formatDimensionCm(length)}`;
  };

  const hasSuspiciousTileUnits = (width?: number | null, length?: number | null) => {
    const values = [width, length].filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
    return values.some((value) => value > 0 && value < 10);
  };

  const getDefaultMaterialCategory = (type: MaterialType): MaterialCategory => {
    switch (type) {
      case 'SAND':
        return 'BED';
      case 'WHITE_CEMENT':
      case 'MARMOLINA':
        return 'JOINT';
      case 'WATERPROOFING':
        return 'WATERPROOFING';
      case 'GEOTEXTILE':
        return 'DRAINAGE';
      case 'WIRE_MESH':
      case 'WIRE':
      case 'NAILS':
        return 'REINFORCEMENT';
      case 'TILE':
        return 'TILES';
      default:
        return 'STRUCTURE';
    }
  };
  
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
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ConstructionMaterialPreset | null>(null);
  const [materialFormData, setMaterialFormData] = useState({
    name: '',
    category: getDefaultMaterialCategory('CEMENT') as MaterialCategory,
    type: 'CEMENT' as MaterialType,
    unit: '',
    pricePerUnit: 0,
    brand: '',
    description: '',
  });

  const catalogPermissionMessage = 'Solo administradores pueden crear, editar o eliminar presets e imágenes de catálogo.';

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.details ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
    );
  };

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
    if (materialCategoryFilter) {
      filtered = filtered.filter(item => item.category === materialCategoryFilter);
    }
    if (materialTypeFilter) {
      filtered = filtered.filter(item => item.type === materialTypeFilter);
    }
    setFilteredMaterials(filtered);
  }, [materials, materialSearchTerm, materialCategoryFilter, materialTypeFilter]);

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

      if (editingTile) {
        setEditingTile(tilesData.find((item) => item.id === editingTile.id) || null);
      }
      if (editingAccessory) {
        setEditingAccessory(accessoriesData.find((item) => item.id === editingAccessory.id) || null);
      }
      if (editingEquipment) {
        setEditingEquipment(equipmentData.find((item) => item.id === editingEquipment.id) || null);
      }
      if (editingMaterial) {
        setEditingMaterial(materialsData.find((item) => item.id === editingMaterial.id) || null);
      }
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    try {
      if (editingTile) {
        await tilePresetService.update(editingTile.id, tileFormData);
        await loadData();
        setShowTileModal(false);
        resetTileForm();
        alert('Loseta actualizada exitosamente');
      } else {
        const createdTile = await tilePresetService.create(tileFormData);
        await loadData();
        handleEditTile(createdTile);
        alert('Loseta creada. Ahora ya podés cargar imágenes en esta misma ventana.');
      }
    } catch (error) {
      console.error('Error al guardar loseta:', error);
      alert(getErrorMessage(error, 'No se pudo guardar la loseta'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    if (confirm('¿Estás seguro de eliminar esta loseta?')) {
      try {
        await tilePresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar loseta:', error);
        alert(getErrorMessage(error, 'No se pudo eliminar la loseta'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    try {
      if (editingAccessory) {
        await accessoryPresetService.update(editingAccessory.id, accessoryFormData);
        await loadData();
        setShowAccessoryModal(false);
        resetAccessoryForm();
        alert('Accesorio actualizado exitosamente');
      } else {
        const createdAccessory = await accessoryPresetService.create(accessoryFormData);
        await loadData();
        handleEditAccessory(createdAccessory);
        alert('Accesorio creado. Ahora ya podés cargar imágenes en esta misma ventana.');
      }
    } catch (error) {
      console.error('Error al guardar accesorio:', error);
      alert(getErrorMessage(error, 'No se pudo guardar el accesorio'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    if (confirm('¿Estás seguro de eliminar este accesorio?')) {
      try {
        await accessoryPresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar accesorio:', error);
        alert(getErrorMessage(error, 'No se pudo eliminar el accesorio'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    try {
      if (editingEquipment) {
        await equipmentPresetService.update(editingEquipment.id, equipmentFormData);
        await loadData();
        setShowEquipmentModal(false);
        resetEquipmentForm();
        alert('Equipo actualizado exitosamente');
      } else {
        const createdEquipment = await equipmentPresetService.create(equipmentFormData);
        await loadData();
        handleEditEquipment(createdEquipment);
        alert('Equipo creado. Ahora ya podés cargar imágenes en esta misma ventana.');
      }
    } catch (error) {
      console.error('Error al guardar equipo:', error);
      alert(getErrorMessage(error, 'No se pudo guardar el equipo'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    if (confirm('¿Estás seguro de eliminar este equipo?')) {
      try {
        await equipmentPresetService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar equipo:', error);
        alert(getErrorMessage(error, 'No se pudo eliminar el equipo'));
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
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    try {
      if (editingMaterial) {
        await constructionMaterialService.update(editingMaterial.id, materialFormData);
        await loadData();
        setShowMaterialModal(false);
        resetMaterialForm();
        alert('Material actualizado exitosamente');
      } else {
        const createdMaterial = await constructionMaterialService.create(materialFormData);
        await loadData();
        handleEditMaterial(createdMaterial);
        alert('Material creado. Ahora ya podés cargar imágenes en esta misma ventana.');
      }
    } catch (error) {
      console.error('Error al guardar material:', error);
      alert(getErrorMessage(error, 'No se pudo guardar el material'));
    }
  };

  const handleEditMaterial = (material: ConstructionMaterialPreset) => {
    setEditingMaterial(material);
    setMaterialFormData({
      name: material.name,
      category: material.category,
      type: material.type,
      unit: material.unit,
      pricePerUnit: material.pricePerUnit,
      brand: material.brand || '',
      description: material.description || '',
    });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!isAdmin) {
      alert(catalogPermissionMessage);
      return;
    }

    if (confirm('¿Estás seguro de eliminar este material?')) {
      try {
        await constructionMaterialService.delete(id);
        loadData();
      } catch (error) {
        console.error('Error al eliminar material:', error);
        alert(getErrorMessage(error, 'No se pudo eliminar el material'));
      }
    }
  };

  const resetMaterialForm = () => {
    setEditingMaterial(null);
    setMaterialFormData({
      name: '',
      category: getDefaultMaterialCategory('CEMENT'),
      type: 'CEMENT',
      unit: '',
      pricePerUnit: 0,
      brand: '',
      description: '',
    });
  };

  const clearMaterialFilters = () => {
    setMaterialSearchTerm('');
    setMaterialCategoryFilter('');
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

  const materialCategoryOptions = [
    { value: '', label: 'Todas las categorías' },
    { value: 'STRUCTURE', label: 'Estructura' },
    { value: 'BED', label: 'Cama / Relleno' },
    { value: 'JOINT', label: 'Juntas / Pastina' },
    { value: 'FINISH', label: 'Terminación' },
    { value: 'WATERPROOFING', label: 'Impermeabilización' },
    { value: 'DRAINAGE', label: 'Drenaje / Separación' },
    { value: 'REINFORCEMENT', label: 'Refuerzo' },
    { value: 'TILES', label: 'Losetas / Revestimientos' },
    { value: 'OTHER', label: 'Otra' },
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
    { value: 'TILE', label: 'Loseta / Revestimiento' },
    { value: 'OTHER', label: 'Otro' },
  ];

  const formTileTypeOptions = tileTypeOptions.filter(opt => opt.value !== '');
  const formAccessoryTypeOptions = accessoryTypeOptions.filter(opt => opt.value !== '');
  const formEquipmentTypeOptions = equipmentTypeOptions.filter(opt => opt.value !== '');
  const formMaterialCategoryOptions = materialCategoryOptions.filter(opt => opt.value !== '');
  const formMaterialTypeOptions = materialTypeOptions.filter(opt => opt.value !== '');

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="w-14 h-14 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <SettingsIcon className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Configuración
              </h1>
              <p className="mt-1 text-sm sm:text-base font-medium text-zinc-300">
                Gestiona presets, materiales y configuraciones del sistema
              </p>
            </div>
          </div>

          {!isAdmin && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-300">
              Estás viendo el catálogo en modo lectura. Para crear, editar, eliminar o subir imágenes necesitás un usuario administrador.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {tab.icon && <tab.icon size={15} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content - Losetas */}
        {activeTab === 'tiles' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Losetas y Venecitas</h2>
                <p className="text-sm text-zinc-300 mt-1">Administra los tipos de losetas disponibles</p>
              </div>
              <Button onClick={() => setShowTileModal(true)} disabled={!isAdmin}>
                <Plus size={16} className="mr-2" />
                Nueva Loseta
              </Button>
            </div>

            {/* Filtros para Losetas */}
            <div className="mb-6 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-400" />
                    <h3 className="font-semibold text-zinc-200">Filtros de Búsqueda</h3>
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
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <p className="text-sm text-zinc-400">
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
              <div className="rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Filter size={48} className="text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {tiles.length === 0 ? 'No hay losetas configuradas' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-zinc-300 mb-6">
                    {tiles.length === 0
                      ? 'Crea tu primera loseta para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {tiles.length === 0 && (
                    <Button onClick={() => setShowTileModal(true)} disabled={!isAdmin}>
                      Crear Primera Loseta
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTiles.map((tile) => (
                  <ProductCard
                    key={tile.id}
                    name={tile.name}
                    type={tile.type}
                    imageUrl={tile.imageUrl}
                    additionalImages={tile.additionalImages || []}
                    price={tile.pricePerUnit}
                    details={[
                      { label: 'Dimensiones', value: formatTileDimensions(tile.width, tile.length) },
                      { label: 'Marca', value: tile.brand },
                      ...(hasSuspiciousTileUnits(tile.width, tile.length)
                        ? [{ label: 'Observación', value: 'Medida menor a 10 cm. Revisar si fue cargada en metros por error.' }]
                        : []),
                      ...(tile.hasCorner ? [
                        { label: 'Esquineros', value: `${tile.cornersPerTile} x $${tile.cornerPricePerUnit?.toLocaleString('es-AR')}` }
                      ] : [])
                    ]}
                    badges={[
                      tile.isForFirstRing && '1er Anillo',
                      tile.hasCorner && 'Con Esquineros',
                      hasSuspiciousTileUnits(tile.width, tile.length) && 'Revisar unidad'
                    ]}
                    onEdit={() => isAdmin ? handleEditTile(tile) : alert(catalogPermissionMessage)}
                    onDelete={() => isAdmin ? handleDeleteTile(tile.id) : alert(catalogPermissionMessage)}
                  />
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
                  label="Ancho (cm)"
                  type="number"
                  step="0.01"
                  value={tileFormData.width}
                  onChange={(e) => setTileFormData({ ...tileFormData, width: parseFloat(e.target.value) })}
                  placeholder="Ej: 50"
                  required
                />
                <Input
                  label="Largo (cm)"
                  type="number"
                  step="0.01"
                  value={tileFormData.length}
                  onChange={(e) => setTileFormData({ ...tileFormData, length: parseFloat(e.target.value) })}
                  placeholder="Ej: 50 o 120"
                  required
                />
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-300">Cómo cargar dimensiones</p>
                <p className="mt-1 text-sm text-amber-300/80">
                  Ingresar siempre en centímetros. Ejemplos: `50` para 50 cm, `120` para 1,20 m. No usar `0.5` para 50 cm ni `1.2` para 1,20 m.
                </p>
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
              <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/30">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tileFormData.isForFirstRing}
                    onChange={(e) => setTileFormData({ ...tileFormData, isForFirstRing: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-sm text-zinc-200">Es para primer anillo perimetral</p>
                    <p className="text-xs text-zinc-400">Esta loseta se usa en la primera vuelta alrededor de la piscina</p>
                  </div>
                </label>
              </div>

              {/* Sección de Esquineros */}
              <div className="border rounded-lg p-4 bg-blue-500/10 border-blue-500/30">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={tileFormData.hasCorner}
                    onChange={(e) => setTileFormData({ ...tileFormData, hasCorner: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-sm text-zinc-200">Lleva Esquineros</p>
                    <p className="text-xs text-zinc-400">Ej: Lomo Ballena lleva esquineros, Terminación L no</p>
                  </div>
                </label>

                {tileFormData.hasCorner && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-500/30">
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

              {/* Sección de Imágenes */}
              {editingTile && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="font-semibold mb-3 text-white">Imágenes del Producto</h4>
                  <HybridImageManager
                    productType="tiles"
                    productId={editingTile.id}
                    currentImageUrl={editingTile.imageUrl}
                    currentAdditionalImages={editingTile.additionalImages || []}
                    onImageUploaded={() => loadData()}
                    onImageDeleted={() => loadData()}
                    onAdditionalImagesUploaded={() => loadData()}
                    onAdditionalImageDeleted={() => loadData()}
                    mode="edit"
                  />
                </div>
              )}

              {!editingTile && (
                <div className="pt-4 border-t border-zinc-800 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Nota:</strong> Primero guarda la loseta, luego podrás editarla para agregar imágenes.
                  </p>
                </div>
              )}

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
                <h2 className="text-2xl font-bold text-white">Accesorios</h2>
                <p className="text-sm text-zinc-300 mt-1">Administra los accesorios y complementos</p>
              </div>
              <Button onClick={() => setShowAccessoryModal(true)} disabled={!isAdmin}>
                <Plus size={16} className="mr-2" />
                Nuevo Accesorio
              </Button>
            </div>

            {/* Filtros para Accesorios */}
            <div className="mb-6 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-400" />
                    <h3 className="font-semibold text-zinc-200">Filtros de Búsqueda</h3>
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
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <p className="text-sm text-zinc-400">
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
              <div className="rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Filter size={48} className="text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {accessories.length === 0 ? 'No hay accesorios configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-zinc-300 mb-6">
                    {accessories.length === 0
                      ? 'Crea tu primer accesorio para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {accessories.length === 0 && (
                    <Button onClick={() => setShowAccessoryModal(true)} disabled={!isAdmin}>
                      Crear Primer Accesorio
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccessories.map((acc) => (
                  <ProductCard
                    key={acc.id}
                    name={acc.name}
                    type={acc.type}
                    imageUrl={acc.imageUrl}
                    additionalImages={acc.additionalImages || []}
                    price={acc.pricePerUnit}
                    details={[
                      { label: 'Unidad', value: acc.unit },
                      { label: 'Descripción', value: acc.description }
                    ]}
                    badges={[]}
                    onEdit={() => isAdmin ? handleEditAccessory(acc) : alert(catalogPermissionMessage)}
                    onDelete={() => isAdmin ? handleDeleteAccessory(acc.id) : alert(catalogPermissionMessage)}
                  />
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

              {/* Sección de Imágenes */}
              {editingAccessory && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="font-semibold mb-3 text-white">Imágenes del Producto</h4>
                  <HybridImageManager
                    productType="accessories"
                    productId={editingAccessory.id}
                    currentImageUrl={editingAccessory.imageUrl}
                    currentAdditionalImages={editingAccessory.additionalImages || []}
                    onImageUploaded={() => loadData()}
                    onImageDeleted={() => loadData()}
                    onAdditionalImagesUploaded={() => loadData()}
                    onAdditionalImageDeleted={() => loadData()}
                    mode="edit"
                  />
                </div>
              )}

              {!editingAccessory && (
                <div className="pt-4 border-t border-zinc-800 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Nota:</strong> Primero guarda el accesorio, luego podrás editarlo para agregar imágenes.
                  </p>
                </div>
              )}

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
                <h2 className="text-2xl font-bold text-white">Equipos</h2>
                <p className="text-sm text-zinc-300 mt-1">Administra bombas, filtros, calentadores y mas</p>
              </div>
            <Button onClick={() => setShowEquipmentModal(true)} disabled={!isAdmin}>
              <Plus size={16} className="mr-2" />
              Nuevo Equipo
            </Button>
          </div>

            {/* Filtros para Equipos */}
            <div className="mb-6 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-400" />
                    <h3 className="font-semibold text-zinc-200">Filtros de Búsqueda</h3>
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
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <p className="text-sm text-zinc-400">
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
              <div className="rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Filter size={48} className="text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {equipment.length === 0 ? 'No hay equipos configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-zinc-300 mb-6">
                    {equipment.length === 0
                      ? 'Crea tu primer equipo para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {equipment.length === 0 && (
                    <Button onClick={() => setShowEquipmentModal(true)} disabled={!isAdmin}>
                      Crear Primer Equipo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEquipment.map((equip) => (
                  <ProductCard
                    key={equip.id}
                    name={equip.name}
                    type={equip.type}
                    imageUrl={equip.imageUrl}
                    additionalImages={equip.additionalImages || []}
                    price={equip.pricePerUnit}
                    details={[
                      { label: 'Marca', value: equip.brand },
                      { label: 'Modelo', value: equip.model },
                      { label: 'Potencia', value: equip.power ? `${equip.power} HP` : null }
                    ]}
                    badges={[]}
                    onEdit={() => isAdmin ? handleEditEquipment(equip) : alert(catalogPermissionMessage)}
                    onDelete={() => isAdmin ? handleDeleteEquipment(equip.id) : alert(catalogPermissionMessage)}
                  />
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

              {/* Sección de Imágenes */}
              {editingEquipment && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="font-semibold mb-3 text-white">Imágenes del Producto</h4>
                  <HybridImageManager
                    productType="equipment"
                    productId={editingEquipment.id}
                    currentImageUrl={editingEquipment.imageUrl}
                    currentAdditionalImages={editingEquipment.additionalImages || []}
                    onImageUploaded={() => loadData()}
                    onImageDeleted={() => loadData()}
                    onAdditionalImagesUploaded={() => loadData()}
                    onAdditionalImageDeleted={() => loadData()}
                    mode="edit"
                  />
                </div>
              )}

              {!editingEquipment && (
                <div className="pt-4 border-t border-zinc-800 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Nota:</strong> Primero guarda el equipo, luego podrás editarlo para agregar imágenes.
                  </p>
                </div>
              )}

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
                <h2 className="text-2xl font-bold text-white">Materiales de Construcción</h2>
                <p className="text-sm text-zinc-300 mt-1">Administra materiales, consumibles y revestimientos como losetas</p>
              </div>
            <Button onClick={() => setShowMaterialModal(true)} disabled={!isAdmin}>
              <Plus size={16} className="mr-2" />
              Nuevo Material
            </Button>
          </div>

            {/* Filtros para Materiales */}
            <div className="mb-6 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search size={20} className="text-blue-400" />
                    <h3 className="font-semibold text-zinc-200">Filtros de Búsqueda</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Buscar por nombre, marca..."
                        value={materialSearchTerm}
                        onChange={(e) => setMaterialSearchTerm(e.target.value)}
                      />
                    </div>

                    <Select
                      options={materialCategoryOptions}
                      value={materialCategoryFilter}
                      onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                    />

                    <Select
                      options={materialTypeOptions}
                      value={materialTypeFilter}
                      onChange={(e) => setMaterialTypeFilter(e.target.value)}
                    />
                  </div>

                  {(materialSearchTerm || materialCategoryFilter || materialTypeFilter) && (
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <p className="text-sm text-zinc-400">
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
              <div className="rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Filter size={48} className="text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {materials.length === 0 ? 'No hay materiales configurados' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-zinc-300 mb-6">
                    {materials.length === 0
                      ? 'Crea tu primer material para comenzar'
                      : 'Intenta ajustar los filtros de busqueda'
                    }
                  </p>
                  {materials.length === 0 && (
                    <Button onClick={() => setShowMaterialModal(true)} disabled={!isAdmin}>
                      Crear Primer Material
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMaterials.map((mat) => (
                  <ProductCard
                    key={mat.id}
                    name={mat.name}
                    type={mat.type}
                    imageUrl={mat.imageUrl}
                    additionalImages={mat.additionalImages || []}
                    price={mat.pricePerUnit}
                    details={[
                      { label: 'Categoría', value: materialCategoryOptions.find((option) => option.value === mat.category)?.label || mat.category },
                      { label: 'Tipo', value: materialTypeOptions.find((option) => option.value === mat.type)?.label || mat.type },
                      { label: 'Unidad', value: mat.unit },
                      { label: 'Marca', value: mat.brand },
                      { label: 'Descripción', value: mat.description }
                    ]}
                    badges={[mat.category === 'TILES' && 'Revestimiento', mat.type === 'TILE' && 'Loseta']}
                    onEdit={() => isAdmin ? handleEditMaterial(mat) : alert(catalogPermissionMessage)}
                    onDelete={() => isAdmin ? handleDeleteMaterial(mat.id) : alert(catalogPermissionMessage)}
                  />
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
                label="Categoría"
                options={formMaterialCategoryOptions}
                value={materialFormData.category}
                onChange={(e) => setMaterialFormData({ ...materialFormData, category: e.target.value as MaterialCategory })}
              />
              <Select
                label="Tipo"
                options={formMaterialTypeOptions}
                value={materialFormData.type}
                onChange={(e) => {
                  const nextType = e.target.value as MaterialType;
                  setMaterialFormData({
                    ...materialFormData,
                    type: nextType,
                    category: getDefaultMaterialCategory(nextType),
                  });
                }}
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

              {/* Sección de Imágenes */}
              {editingMaterial && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="font-semibold mb-3 text-white">Imágenes del Producto</h4>
                  <HybridImageManager
                    productType="materials"
                    productId={editingMaterial.id}
                    currentImageUrl={editingMaterial.imageUrl}
                    currentAdditionalImages={editingMaterial.additionalImages || []}
                    onImageUploaded={() => loadData()}
                    onImageDeleted={() => loadData()}
                    onAdditionalImagesUploaded={() => loadData()}
                    onAdditionalImageDeleted={() => loadData()}
                    mode="edit"
                  />
                </div>
              )}

              {!editingMaterial && (
                <div className="pt-4 border-t border-zinc-800 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Nota:</strong> Primero guarda el material, luego podrás editarlo para agregar imágenes.
                  </p>
                </div>
              )}

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
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8">
              <div className="space-y-8">
                <div className="pb-6 border-b border-zinc-800">
                  <h3 className="text-2xl font-bold text-white mb-2">Configuración de Cálculos Automáticos</h3>
                  <p className="text-sm text-zinc-300">
                    Estos valores se usan para calcular automaticamente los materiales necesarios en cada proyecto.
                    Ajusta los parametros segun tus criterios de construccion.
                  </p>
                </div>

                {/* SECCIÓN 1: VEREDA Y SOLARIUM */}
                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-white mb-1">VEREDA Y SOLARIUM</h4>
                    <p className="text-sm text-zinc-300 mb-4">Configuración para el calculo de materiales de la vereda perimetral</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Adhesivo para Losetas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="number"
                        step="0.1"
                        label="Kilogramos de Pegamento por m²"
                        value={calcFormData.adhesiveKgPerM2}
                        onChange={(e) => setCalcFormData({...calcFormData, adhesiveKgPerM2: parseFloat(e.target.value)})}
                      />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-zinc-500">Valor tipico: 3-5 kg/m² segun tipo de loseta</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Contrapiso de Vereda</h5>
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
                    <p className="text-xs text-zinc-500 mt-2">Dosificacion tipica: 1:3:3 (cemento:arena:piedra) = 200 kg cemento/m³</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Pastina y Juntas</h5>
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
                    <h5 className="font-semibold mb-3 text-zinc-200">Malla e Impermeabilizacion</h5>
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
                    <p className="text-xs text-zinc-500 mt-2">Factor de malla incluye solapamiento (tipicamente 10-15%)</p>
                  </div>

                  {/* MANO DE OBRA — TASAS POR UNIDAD */}
                  <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-lg mt-4">
                    <h4 className="font-bold text-xl text-white mb-1">MANO DE OBRA — NOMENCLADOR</h4>
                    <p className="text-sm text-zinc-500 mb-4">Tasas de mano de obra por unidad. Se aplican automáticamente al calcular vereda y losetas. Se exportan separadas de los materiales.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Instalador de losetas y contrapiso ($ / m²)</label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                          value={calcFormData.tileInstallerRatePerM2 ?? 0}
                          onChange={(e) => setCalcFormData({...calcFormData, tileInstallerRatePerM2: parseFloat(e.target.value) || 0})}
                        />
                        <p className="text-xs text-zinc-500 mt-1">Se multiplica por los m² de vereda calculados</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Excavación ($ / m³)</label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                          value={calcFormData.excavationRatePerM3 ?? 0}
                          onChange={(e) => setCalcFormData({...calcFormData, excavationRatePerM3: parseFloat(e.target.value) || 0})}
                        />
                        <p className="text-xs text-zinc-500 mt-1">Se multiplica por el volumen de excavación</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Terminaciones ($ / m²)</label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                          value={calcFormData.finishingRatePerM2 ?? 0}
                          onChange={(e) => setCalcFormData({...calcFormData, finishingRatePerM2: parseFloat(e.target.value) || 0})}
                        />
                        <p className="text-xs text-zinc-500 mt-1">Se multiplica por el área de terminaciones</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: RELLENO Y FONDO */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-white mb-1">RELLENO Y FONDO DE PISCINA</h4>
                    <p className="text-sm text-zinc-300 mb-4">Estos valores alimentan el cálculo automático del relleno con arena terciada, el fondo y la mezcla seca con cemento.</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Separación de Relleno</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Separación lateral y fondo (cm)"
                    value={calcFormData.bedThicknessCm}
                    onChange={(e) => setCalcFormData({...calcFormData, bedThicknessCm: parseFloat(e.target.value)})}
                  />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-zinc-500">Se usa igual en laterales y fondo. Valor recomendado actual: 20 cm.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Dosificación de Cemento</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Kg de cemento por m³"
                    value={calcFormData.bedCementKgPerM3}
                    onChange={(e) => setCalcFormData({...calcFormData, bedCementKgPerM3: parseFloat(e.target.value)})}
                  />
                  <Input
                    type="number"
                    step="5"
                    label="Peso de Bolsa de Cemento (kg)"
                    value={calcFormData.bedCementBagWeight}
                    onChange={(e) => setCalcFormData({...calcFormData, bedCementBagWeight: parseFloat(e.target.value)})}
                  />
                      <div className="flex items-end pb-2">
                        <p className="text-xs text-zinc-500">La cantidad de bolsas surge de dividir los kg totales requeridos por el peso real de cada bolsa.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                    <h5 className="font-semibold text-zinc-200 mb-2">Fórmula aplicada hoy</h5>
                    <div className="space-y-1 text-sm text-zinc-300">
                      <p>Profundidad tomada: la más profunda de la pileta.</p>
                      <p>Excavación de cálculo: largo + 2 separaciones, ancho + 2 separaciones, profundidad + separación de fondo.</p>
                      <p>Arena terciada: volumen de excavación menos volumen del casco.</p>
                      <p>Bolsones: se muestran como referencia en unidades de 1 m³.</p>
                      <p>Cemento total: `m³ de arena × kg de cemento por m³`.</p>
                      <p>Bolsas de cemento: `ceil(kg totales / peso de bolsa)`.</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Geomembrana y Mallas</h5>
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
                    <p className="text-xs text-zinc-500 mt-2">Geomembrana: 1.0 (sin solapamiento) | Malla: 1.15 (con solapamiento 15%)</p>
                  </div>
                </div>

                {/* SECCIÓN 3: SISTEMA DE DRENAJE */}
                <div className="space-y-6 pt-6 border-t border-zinc-800">
                  <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-lg">
                    <h4 className="font-bold text-xl text-white mb-1">SISTEMA DE DRENAJE</h4>
                    <p className="text-sm text-zinc-300 mb-4">Configuración para cunetas de drenaje perimetral</p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3 text-zinc-200">Dimensiones de Cuneta</h5>
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
                    <p className="text-xs text-zinc-500 mt-2">Dimensiones tipicas: 15cm x 15cm para drenaje perimetral</p>
                  </div>
                </div>

                {/* BOTÓN GUARDAR */}
                <div className="pt-6 border-t border-zinc-800 flex justify-end space-x-3">
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
        )}
      </div>
    </div>
  );
};

// Export por defecto además del nombrado
export default Settings;
