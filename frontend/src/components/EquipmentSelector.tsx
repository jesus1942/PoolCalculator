import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EquipmentPreset, ProjectAdditional } from '@/types';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { additionalsService } from '@/services/additionalsService';
import { Zap, Filter, Droplets, Sun, Trash2, Download, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface EquipmentSelectorProps {
  projectId: string;
  selectedEquipment: ProjectAdditional[];
  onUpdate: () => void;
}

const EQUIPMENT_TYPES = [
  { value: 'PUMP', label: 'Bombas', icon: Zap },
  { value: 'FILTER', label: 'Filtros', icon: Filter },
  { value: 'CHLORINATOR', label: 'Cloradores', icon: Droplets },
  { value: 'HEATER', label: 'Calefactores', icon: Sun },
  { value: 'HEAT_PUMP', label: 'Bombas de Calor', icon: Sun },
];

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  projectId,
  selectedEquipment,
  onUpdate
}) => {
  const [activeType, setActiveType] = useState<string>('PUMP');
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    loadAvailableEquipment();
  }, [activeType]);

  const loadAvailableEquipment = async () => {
    try {
      setLoading(true);
      const equipment = await equipmentPresetService.getAll();
      console.log('[EquipmentSelector] Total equipos cargados:', equipment.length);
      console.log('[EquipmentSelector] Filtrando por tipo:', activeType);

      const filtered = equipment.filter((e: EquipmentPreset) => e.type === activeType && e.isActive);
      console.log('[EquipmentSelector] Equipos filtrados:', filtered.length);

      if (filtered.length > 0) {
        console.log('[EquipmentSelector] Primer equipo:', filtered[0]);
      } else {
        console.log('[EquipmentSelector] Tipos disponibles:', [...new Set(equipment.map(e => e.type))]);
      }

      setAvailableEquipment(filtered);
    } catch (error) {
      console.error('[EquipmentSelector] Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (equipment: EquipmentPreset) => {
    try {
      // Enviar como array de modificaciones
      await additionalsService.processAdditionals(projectId, {
        modifications: [{
          equipmentId: equipment.id,
          baseQuantity: 0,
          newQuantity: 1,
          dependencies: {}
        }]
      });
      onUpdate();
      alert(`${equipment.name} agregado al proyecto`);
    } catch (error) {
      console.error('Error adding equipment:', error);
      alert('Error al agregar equipo');
    }
  };

  const handleRemoveEquipment = async (additionalId: string) => {
    if (!confirm('Eliminar este equipo del proyecto?')) return;

    try {
      await additionalsService.deleteAdditional(additionalId);
      onUpdate();
    } catch (error) {
      console.error('Error removing equipment:', error);
      alert('Error al eliminar equipo');
    }
  };

  const getSelectedEquipmentOfType = () => {
    return selectedEquipment.filter(
      (item: any) => item.equipment && item.equipment.type === activeType
    );
  };

  const activeTypeData = EQUIPMENT_TYPES.find(t => t.value === activeType);
  const Icon = activeTypeData?.icon || Zap;

  return (
    <div className="space-y-6">
      {/* Título y descripción */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Selección de Equipos del Proyecto
        </h3>
        <p className="text-sm text-gray-600">
          Selecciona los equipos específicos que vas a instalar en este proyecto.
          Cada equipo incluye foto, ficha técnica y datos completos para los cálculos profesionales.
        </p>
      </div>

      {/* Tabs de tipo de equipo */}
      <div className="flex space-x-2 border-b">
        {EQUIPMENT_TYPES.map((type) => {
          const TypeIcon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setActiveType(type.value)}
              className={`px-4 py-2 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${
                activeType === type.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TypeIcon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Equipos seleccionados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Icon className="w-5 h-5" />
            <span>{activeTypeData?.label} Seleccionados</span>
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCatalog(!showCatalog)}
          >
            {showCatalog ? 'Ocultar' : 'Ver'} Catálogo
          </Button>
        </div>

        {getSelectedEquipmentOfType().length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            <Icon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No hay {activeTypeData?.label.toLowerCase()} seleccionados</p>
            <p className="text-sm mt-1">Click en "Ver Catálogo" para agregar</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getSelectedEquipmentOfType().map((item: any) => (
              <EquipmentCard
                key={item.id}
                equipment={item.equipment}
                onRemove={() => handleRemoveEquipment(item.id)}
                isSelected={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Catálogo de equipos disponibles */}
      {showCatalog && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">
            Catálogo de {activeTypeData?.label}
          </h4>
          {loading ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">Cargando equipos...</p>
            </Card>
          ) : availableEquipment.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              <p>No hay {activeTypeData?.label.toLowerCase()} disponibles en el catálogo</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableEquipment.map((equipment) => {
                const isAlreadySelected = selectedEquipment.some(
                  (item: any) => item.equipmentId === equipment.id
                );
                return (
                  <EquipmentCard
                    key={equipment.id}
                    equipment={equipment}
                    onAdd={() => handleAddEquipment(equipment)}
                    isSelected={isAlreadySelected}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface EquipmentCardProps {
  equipment: EquipmentPreset;
  onAdd?: () => void;
  onRemove?: () => void;
  isSelected: boolean;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onAdd,
  onRemove,
  isSelected
}) => {
  return (
    <Card className={`overflow-hidden ${isSelected ? 'border-2 border-blue-500' : ''}`}>
      {/* Imagen del equipo */}
      <div className="h-48 bg-gray-100 relative">
        {equipment.imageUrl ? (
          <img
            src={productImageService.getImageUrl(equipment.imageUrl) || undefined}
            alt={equipment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
            SELECCIONADO
          </div>
        )}
      </div>

      {/* Información del equipo */}
      <div className="p-4 space-y-3">
        <div>
          <h5 className="font-semibold text-gray-900">{equipment.name}</h5>
          {equipment.brand && (
            <p className="text-sm text-gray-600">Marca: {equipment.brand}</p>
          )}
          {equipment.model && (
            <p className="text-sm text-gray-600">Modelo: {equipment.model}</p>
          )}
        </div>

        {/* Datos técnicos */}
        <div className="text-sm space-y-1">
          {equipment.power && (
            <div className="flex justify-between">
              <span className="text-gray-600">Potencia:</span>
              <span className="font-medium">{equipment.power} HP</span>
            </div>
          )}
          {equipment.flowRate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Caudal:</span>
              <span className="font-medium">{equipment.flowRate} m³/h</span>
            </div>
          )}
          {equipment.maxHead && (
            <div className="flex justify-between">
              <span className="text-gray-600">Altura máx:</span>
              <span className="font-medium">{equipment.maxHead} m</span>
            </div>
          )}
          {equipment.voltage && (
            <div className="flex justify-between">
              <span className="text-gray-600">Voltaje:</span>
              <span className="font-medium">{equipment.voltage}V</span>
            </div>
          )}
          {equipment.filterDiameter && (
            <div className="flex justify-between">
              <span className="text-gray-600">Diámetro:</span>
              <span className="font-medium">{equipment.filterDiameter} mm</span>
            </div>
          )}
        </div>

        {/* Precio */}
        {equipment.pricePerUnit > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Precio:</span>
              <span className="text-lg font-bold text-green-600">
                ${equipment.pricePerUnit.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Links a datasheet y catálogo */}
        <div className="flex space-x-2">
          {equipment.datasheet && (
            <a
              href={equipment.datasheet}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Ficha técnica</span>
            </a>
          )}
          {equipment.catalogPage && (
            <a
              href={equipment.catalogPage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
              title="Ver en catálogo"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Botones de acción */}
        <div className="pt-2">
          {!isSelected && onAdd && (
            <Button onClick={onAdd} className="w-full" size="sm">
              Agregar al Proyecto
            </Button>
          )}
          {isSelected && onRemove && (
            <Button
              onClick={onRemove}
              variant="outline"
              className="w-full text-red-600 hover:bg-red-50"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Quitar del Proyecto
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
