import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Project, TilePreset } from '@/types';
import { tilePresetService } from '@/services/tilePresetService';
import { Save, RotateCcw, Calculator, Layers } from 'lucide-react';

interface TileEditorProps {
  project: Project;
  onSave: (tileConfig: any) => void;
}

interface SideConfig {
  firstRingType: string;
  rows: number;
  selectedTileId: string;
}

export const TileEditor: React.FC<TileEditorProps> = ({ project, onSave }) => {
  const [tilePresets, setTilePresets] = useState<TilePreset[]>([]);
  const [calculationMode, setCalculationMode] = useState<'automatic' | 'manual'>('automatic');
  const [config, setConfig] = useState<{
    north: SideConfig;
    south: SideConfig;
    east: SideConfig;
    west: SideConfig;
  }>({
    north: { firstRingType: '', rows: 2, selectedTileId: '' },
    south: { firstRingType: '', rows: 2, selectedTileId: '' },
    east: { firstRingType: '', rows: 2, selectedTileId: '' },
    west: { firstRingType: '', rows: 2, selectedTileId: '' },
  });

  useEffect(() => {
    loadTilePresets();
  }, []);

  useEffect(() => {
    loadExistingConfig();
  }, [project]);

  const loadTilePresets = async () => {
    try {
      const presets = await tilePresetService.getAll();
      setTilePresets(presets);
    } catch (error) {
      console.error('Error al cargar losetas:', error);
    }
  };

  const loadExistingConfig = () => {
    // Leer desde project.tileCalculation (no desde poolPreset.tileConfig)
    if (project.tileCalculation && typeof project.tileCalculation === 'object') {
      const saved = project.tileCalculation as any;
      if (saved.north || saved.south || saved.east || saved.west) {
        setConfig(saved);
      }
    }
  };

  const handleSideChange = (side: keyof typeof config, field: keyof SideConfig, value: any) => {
    setConfig({
      ...config,
      [side]: {
        ...config[side],
        [field]: value,
      },
    });
  };

  const handleSave = () => {
    onSave(config);
  };

  const handleReset = () => {
    setConfig({
      north: { firstRingType: '', rows: 2, selectedTileId: '' },
      south: { firstRingType: '', rows: 2, selectedTileId: '' },
      east: { firstRingType: '', rows: 2, selectedTileId: '' },
      west: { firstRingType: '', rows: 2, selectedTileId: '' },
    });
  };

  const poolLength = project.poolPreset?.length || 8;
  const poolWidth = project.poolPreset?.width || 4;
  const scale = 40; // píxeles por metro

  const firstRingOptions = [
    { value: '', label: 'Seleccionar tipo' },
    { value: 'LOMO_BALLENA', label: 'Lomo de Ballena' },
    { value: 'L_FINISH', label: 'Terminación L' },
    { value: 'PERIMETER', label: 'Perímetro estándar' },
  ];

  const tileOptions = [
    { value: '', label: 'Seleccionar loseta' },
    ...tilePresets.map(t => ({ value: t.id, label: `${t.name} (${t.width}x${t.length}cm)` })),
  ];

  const getSideColor = (side: keyof typeof config) => {
    if (!config[side].firstRingType) return '#e5e7eb';
    return config[side].rows > 0 ? '#3b82f6' : '#94a3b8';
  };

  return (
    <div className="space-y-6">
      {/* Header informativo */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Calculator size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Configurador Visual de Losetas</h3>
            <p className="text-sm text-blue-700">
              Configure cada lateral de la piscina seleccionando el tipo de primer anillo y la cantidad de filas adicionales.
              Los cálculos se realizan automáticamente considerando las dimensiones reales de cada loseta.
            </p>
          </div>
        </div>
      </Card>

      {/* Configurador Visual */}
      <>
          {/* Croquis Visual */}
          <Card>
        <h3 className="text-lg font-semibold mb-4">Croquis de la Piscina (Vista Superior)</h3>
        
        <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
          <div className="relative" style={{ 
            width: `${poolLength * scale + 100}px`,
            height: `${poolWidth * scale + 100}px`
          }}>
            {/* Etiqueta Norte */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-sm font-medium text-gray-600">
              Norte
            </div>

            {/* Lado Norte */}
            <div
              className="absolute top-0 left-0 right-0 h-12 border-t-4 rounded-t-lg transition-colors"
              style={{ 
                borderColor: getSideColor('north'),
                backgroundColor: `${getSideColor('north')}20`,
                marginLeft: '50px',
                marginRight: '50px'
              }}
            >
              <div className="text-center text-xs font-medium pt-1">
                {config.north.rows > 0 ? `${config.north.rows} filas` : 'Sin configurar'}
              </div>
            </div>

            {/* Lado Oeste */}
            <div
              className="absolute top-12 left-0 bottom-12 w-12 border-l-4 transition-colors"
              style={{ 
                borderColor: getSideColor('west'),
                backgroundColor: `${getSideColor('west')}20`,
                marginTop: '50px',
                marginBottom: '50px'
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium whitespace-nowrap">
                {config.west.rows > 0 ? `${config.west.rows} filas` : 'Sin configurar'}
              </div>
            </div>

            {/* Lado Este */}
            <div
              className="absolute top-12 right-0 bottom-12 w-12 border-r-4 transition-colors"
              style={{ 
                borderColor: getSideColor('east'),
                backgroundColor: `${getSideColor('east')}20`,
                marginTop: '50px',
                marginBottom: '50px'
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-xs font-medium whitespace-nowrap">
                {config.east.rows > 0 ? `${config.east.rows} filas` : 'Sin configurar'}
              </div>
            </div>

            {/* Lado Sur */}
            <div
              className="absolute bottom-0 left-0 right-0 h-12 border-b-4 rounded-b-lg transition-colors"
              style={{ 
                borderColor: getSideColor('south'),
                backgroundColor: `${getSideColor('south')}20`,
                marginLeft: '50px',
                marginRight: '50px'
              }}
            >
              <div className="text-center text-xs font-medium pt-1">
                {config.south.rows > 0 ? `${config.south.rows} filas` : 'Sin configurar'}
              </div>
            </div>

            {/* Etiqueta Oeste */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-sm font-medium text-gray-600">
              Oeste
            </div>

            {/* Etiqueta Este */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-sm font-medium text-gray-600">
              Este
            </div>

            {/* Etiqueta Sur */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-sm font-medium text-gray-600">
              Sur
            </div>

            {/* Espejo de agua (centro) */}
            <div
              className="absolute bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center"
              style={{
                top: '62px',
                left: '62px',
                right: '62px',
                bottom: '62px'
              }}
            >
              <div className="text-center text-blue-600">
                <div className="text-sm font-semibold">Espejo de Agua</div>
                <div className="text-xs">{poolLength}m x {poolWidth}m</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Configuración por Lateral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['north', 'south', 'east', 'west'] as const).map((side) => (
          <Card key={side}>
            <h3 className="text-lg font-semibold mb-4 capitalize">
              Lateral {side === 'north' ? 'Norte' : side === 'south' ? 'Sur' : side === 'east' ? 'Este' : 'Oeste'}
            </h3>
            
            <div className="space-y-4">
              <Select
                label="Tipo de Primer Anillo"
                options={firstRingOptions}
                value={config[side].firstRingType}
                onChange={(e) => handleSideChange(side, 'firstRingType', e.target.value)}
              />

              <Select
                label="Loseta para Filas Comunes"
                options={tileOptions}
                value={config[side].selectedTileId}
                onChange={(e) => handleSideChange(side, 'selectedTileId', e.target.value)}
              />

              <Input
                type="number"
                label="Cantidad de Filas"
                min={0}
                max={10}
                value={config[side].rows}
                onChange={(e) => handleSideChange(side, 'rows', parseInt(e.target.value) || 0)}
              />
            </div>
          </Card>
        ))}
      </div>

          {/* Acciones */}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw size={16} className="mr-2" />
              Resetear
            </Button>
            <Button onClick={handleSave}>
              <Save size={16} className="mr-2" />
              Guardar y Calcular Materiales
            </Button>
          </div>
        </>
    </div>
  );
};
