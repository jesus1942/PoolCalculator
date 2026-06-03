import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Project, TilePreset } from '@/types';
import { tilePresetService } from '@/services/tilePresetService';
import { productImageService } from '@/services/productImageService';
import { PoolVisualizationCanvas, exportCanvasToImage } from '@/components/PoolVisualizationCanvas';
import { HdSave, HdRotateCcw, HdCalculator, HdLayers, HdDownload, HdEye, HdGrid } from '@/components/ui/HandDrawnIcons';

interface TileEditorProps {
  project: Project;
  onSave: (tileConfig: any) => void;
}

interface SideConfig {
  firstRingType: string;
  rows: number;
  selectedTileId: string;
}

interface TileEditorConfig {
  north: SideConfig;
  south: SideConfig;
  east: SideConfig;
  west: SideConfig;
  arcLayoutMode?: 'follow' | 'square_off';
  arcCurvedRowsLimit?: number;
}

const isRomanArchPool = (project: Project) => {
  const preset = project.poolPreset;
  const romanSignals = [preset?.name, preset?.description, (preset as any)?.backDescription]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return romanSignals.includes('arco romano') || romanSignals.includes('escalera romana');
};

export const TileEditor: React.FC<TileEditorProps> = ({ project, onSave }) => {
  const [tilePresets, setTilePresets] = useState<TilePreset[]>([]);
  const [calculationMode, setCalculationMode] = useState<'automatic' | 'manual'>('automatic');
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [viewMode, setViewMode] = useState<'planta' | 'cad'>('planta');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // NO hay orientación variable - siempre es fija como en Kotlin
  // Skimmer = Oeste (izquierda)
  // Escalera = Este (derecha)
  // Izquierdo = Norte (arriba)
  // Derecho = Sur (abajo)

  const [config, setConfig] = useState<TileEditorConfig>({
    north: { firstRingType: '', rows: 2, selectedTileId: '' },
    south: { firstRingType: '', rows: 2, selectedTileId: '' },
    east: { firstRingType: '', rows: 2, selectedTileId: '' },
    west: { firstRingType: '', rows: 2, selectedTileId: '' },
    arcLayoutMode: 'follow',
    arcCurvedRowsLimit: 2,
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
        setConfig({
          arcLayoutMode: 'follow',
          arcCurvedRowsLimit: saved?.east?.rows || 1,
          ...saved,
        });
      }
    }
  };

  const handleSideChange = (side: keyof typeof config, field: keyof SideConfig, value: any) => {
    const nextConfig = {
      ...config,
      [side]: {
        ...config[side],
        [field]: value,
      },
    };

    if (side === 'east' && field === 'rows') {
      const eastRows = Math.max(0, Number(value) || 0);
      nextConfig.arcCurvedRowsLimit = Math.min(
        Math.max(0, nextConfig.arcCurvedRowsLimit || eastRows),
        eastRows
      );
    }

    setConfig(nextConfig);
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
      arcLayoutMode: 'follow',
      arcCurvedRowsLimit: 2,
    });
  };

  const handleExportVisualization = () => {
    if (canvasRef.current) {
      exportCanvasToImage(canvasRef.current, `pool-${project.name.replace(/\s+/g, '-')}-visualization.png`);
    }
  };

  // Mapeo FIJO como en Kotlin
  // Skimmer = Oeste (izquierda)
  // Escalera = Este (derecha)
  // Izquierdo = Norte (arriba)
  // Derecho = Sur (abajo)
  const getSideLabel = (side: 'north' | 'south' | 'east' | 'west'): string => {
    const labels = {
      north: 'Izquierdo (Cabecera Superior)',
      south: 'Derecho (Cabecera Inferior)',
      west: 'Skimmer (Lateral Izquierdo)',
      east: 'Escalera (Lateral Derecho)'
    };
    return labels[side];
  };

  const poolLength = project.poolPreset?.length || 8;
  const poolWidth = project.poolPreset?.width || 4;
  const scale = 40; // píxeles por metro
  const romanArch = isRomanArchPool(project);

  const firstRingOptions = [
    { value: '', label: 'Seleccionar tipo' },
    { value: 'LOMO_BALLENA', label: 'Lomo de Ballena' },
    { value: 'L_FINISH', label: 'Terminación L' },
    { value: 'PERIMETER', label: 'Perímetro estándar' },
  ];

  const formatDimensionCm = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return `${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })} cm`;
  };

  const formatTileDimensions = (width?: number | null, length?: number | null) =>
    `${formatDimensionCm(width)} x ${formatDimensionCm(length)}`;

  const hasSuspiciousTileUnits = (width?: number | null, length?: number | null) => {
    const values = [width, length].filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
    return values.some((value) => value > 0 && value < 10);
  };

  const selectableCommonTiles = tilePresets.filter((tile) => tile.type === 'COMMON' && !tile.isForFirstRing);

  const tileOptions = [
    { value: '', label: 'Seleccionar loseta' },
    ...selectableCommonTiles.map((t) => ({
      value: t.id,
      label: `${t.name} (${formatTileDimensions(t.width, t.length)}${hasSuspiciousTileUnits(t.width, t.length) ? ' · revisar unidad' : ''})`,
    })),
  ];

  const getSideColor = (side: keyof typeof config) => {
    if (!config[side].firstRingType) return '#e5e7eb';
    return config[side].rows > 0 ? '#3b82f6' : '#94a3b8';
  };

  return (
    <div className="space-y-6">
      {/* Header informativo */}
      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <div className="flex items-start gap-3">
          <Calculator size={24} className="text-zinc-200 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">Configurador Visual de Losetas</h3>
            <p className="text-base text-zinc-300">
              Configure cada lateral de la piscina seleccionando el tipo de primer anillo y la cantidad de filas adicionales.
              Los cálculos se realizan automáticamente considerando las dimensiones reales de cada loseta.
            </p>
            <p className="mt-2 text-sm text-amber-300">
              Las dimensiones del catálogo están expresadas en centímetros. Ejemplo: 50 = 50 cm, 120 = 1,20 m.
            </p>
          </div>
        </div>
      </Card>


      {/* Configurador Visual */}
      <>
          {/* Vista de Configuración Simple o Detallada */}
          <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Vista de la Piscina con Losetas</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showDetailedView ? 'primary' : 'secondary'}
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="flex items-center gap-2"
            >
              <Eye size={16} />
              {showDetailedView ? 'Vista Detallada' : 'Vista Simple'}
            </Button>
            {showDetailedView && (
              <>
                <Button
                  size="sm"
                  variant={viewMode === 'cad' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode(viewMode === 'planta' ? 'cad' : 'planta')}
                  className="flex items-center gap-2"
                >
                  <Grid3x3 size={16} />
                  {viewMode === 'planta' ? 'Vista CAD' : 'Vista Planta'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportVisualization}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Exportar Imagen
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          {showDetailedView ? (
            <PoolVisualizationCanvas
              ref={canvasRef}
              project={project}
              tileConfig={config}
              width={1120}
              height={760}
              showMeasurements={true}
              viewMode={viewMode}
              renderQuality={2.25}
            />
          ) : (
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
          )}
        </div>

        {showDetailedView && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Vista Detallada:</strong> Cada loseta se dibuja individualmente con sus juntas.
              Las losetas son de 50cm x 50cm con junta de 3mm. El rectángulo azul central representa
              la piscina con sus dimensiones exactas.
            </p>
          </div>
        )}
      </Card>

      {/* Configuración por Lateral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['north', 'south', 'east', 'west'] as const).map((side) => (
          <Card key={side}>
            <h3 className="text-lg font-semibold mb-4">
              Lado {getSideLabel(side)}
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

              {/* Mostrar imagen de loseta seleccionada */}
              {config[side].selectedTileId && tilePresets.find(t => t.id === config[side].selectedTileId)?.imageUrl && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <img
                      src={productImageService.getImageUrl(
                        tilePresets.find(t => t.id === config[side].selectedTileId)?.imageUrl
                      ) || undefined}
                      alt="Loseta seleccionada"
                      className="w-16 h-16 object-contain rounded border"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {tilePresets.find(t => t.id === config[side].selectedTileId)?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTileDimensions(
                          tilePresets.find(t => t.id === config[side].selectedTileId)?.width,
                          tilePresets.find(t => t.id === config[side].selectedTileId)?.length
                        )}
                      </p>
                      {hasSuspiciousTileUnits(
                        tilePresets.find(t => t.id === config[side].selectedTileId)?.width,
                        tilePresets.find(t => t.id === config[side].selectedTileId)?.length
                      ) && (
                        <p className="text-xs text-amber-600">Revisar unidad: parece una medida cargada en metros.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

      {romanArch && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Configuración del Arco Romano</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tratamiento del lado del arco"
              options={[
                { value: 'follow', label: 'Seguir arco en todas las corridas' },
                { value: 'square_off', label: 'Recuadrar después de cierta corrida' },
              ]}
              value={config.arcLayoutMode || 'follow'}
              onChange={(e) => setConfig((prev) => ({
                ...prev,
                arcLayoutMode: e.target.value as 'follow' | 'square_off',
              }))}
            />

            <Input
              type="number"
              label="Corridas curvas máximas del arco"
              min={0}
              max={Math.max(0, config.east.rows || 0)}
              value={Math.min(Math.max(0, config.arcCurvedRowsLimit || 0), Math.max(0, config.east.rows || 0))}
              onChange={(e) => setConfig((prev) => ({
                ...prev,
                arcCurvedRowsLimit: Math.min(
                  Math.max(0, parseInt(e.target.value) || 0),
                  Math.max(0, prev.east.rows || 0)
                ),
              }))}
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              El lado derecho de la vista corresponde al arco romano. Puede seguir la curva en todas las corridas o recuadrarse
              a partir de una corrida exterior, manteniendo las medidas del modelo del catálogo.
            </p>
          </div>
        </Card>
      )}

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
