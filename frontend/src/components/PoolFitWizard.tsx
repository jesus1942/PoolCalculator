import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { poolPresetService } from '@/services/poolPresetService';
import { projectService } from '@/services/projectService';
import { PoolPreset } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Ruler,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Maximize,
  Layout,
  Sparkles
} from 'lucide-react';

interface TerrainMeasurements {
  length: number;
  width: number;
  minLateralSpace: number;
  minFrontalSpace: number;
  minBackSpace: number;
}

interface PoolFitResult {
  preset: PoolPreset;
  fitScore: number;
  position: {
    x: number;
    y: number;
    rotation: 0 | 90;
  };
  remainingSpace: {
    left: number;
    right: number;
    front: number;
    back: number;
  };
  excavationDimensions: {
    length: number;
    width: number;
  };
}

export const PoolFitWizard: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [poolPresets, setPoolPresets] = useState<PoolPreset[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolPreset | null>(null);

  // Datos del terreno
  const [terrain, setTerrain] = useState<TerrainMeasurements>({
    length: 10,
    width: 8,
    minLateralSpace: 0.5,
    minFrontalSpace: 1,
    minBackSpace: 1,
  });

  // Datos del proyecto
  const [projectData, setProjectData] = useState({
    name: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    location: '',
  });

  // Resultados de la búsqueda
  const [fitResults, setFitResults] = useState<PoolFitResult[]>([]);

  useEffect(() => {
    loadPoolPresets();
  }, []);

  const loadPoolPresets = async () => {
    try {
      console.log('[PoolFitWizard] Cargando modelos de piscinas...');
      const presets = await poolPresetService.getAll();
      console.log('[PoolFitWizard] Modelos cargados:', presets.length);
      setPoolPresets(presets);
    } catch (error) {
      console.error('[PoolFitWizard] Error al cargar modelos:', error);
      alert('Error al cargar los modelos de piscinas. Verifica que el backend esté funcionando.');
    }
  };

  // Algoritmo de búsqueda de mejor ajuste
  const findBestFit = () => {
    console.log('[PoolFitWizard] Iniciando búsqueda de mejor ajuste...');
    console.log('[PoolFitWizard] Terreno:', terrain);
    console.log('[PoolFitWizard] Modelos a evaluar:', poolPresets.length);

    if (poolPresets.length === 0) {
      alert('No hay modelos de piscinas disponibles. Por favor, crea al menos un modelo primero.');
      return;
    }

    setLoading(true);
    const results: PoolFitResult[] = [];

    for (const preset of poolPresets) {
      // Calcular dimensiones de excavación
      const excavationLength = preset.length + (preset.lateralCushionSpace * 2);
      const excavationWidth = preset.width + (preset.lateralCushionSpace * 2);

      // Intentar orientación normal (0°)
      const normalFit = calculateFit(
        preset,
        excavationLength,
        excavationWidth,
        0
      );

      if (normalFit) {
        results.push(normalFit);
      }

      // Intentar orientación rotada (90°)
      const rotatedFit = calculateFit(
        preset,
        excavationWidth,
        excavationLength,
        90
      );

      if (rotatedFit) {
        results.push(rotatedFit);
      }
    }

    // Ordenar por mejor ajuste (fit score más alto)
    results.sort((a, b) => b.fitScore - a.fitScore);

    console.log('[PoolFitWizard] Resultados encontrados:', results.length);
    console.log('[PoolFitWizard] Mejor ajuste:', results[0]?.fitScore.toFixed(1) + '%');

    setFitResults(results);
    setLoading(false);
    setCurrentStep(3);
  };

  const calculateFit = (
    preset: PoolPreset,
    excavationLength: number,
    excavationWidth: number,
    rotation: 0 | 90
  ): PoolFitResult | null => {
    // Verificar si cabe en el terreno
    const totalLengthNeeded = excavationLength + terrain.minFrontalSpace + terrain.minBackSpace;
    const totalWidthNeeded = excavationWidth + (terrain.minLateralSpace * 2);

    if (totalLengthNeeded > terrain.length || totalWidthNeeded > terrain.width) {
      return null; // No cabe
    }

    // Calcular posición centrada
    const x = (terrain.width - excavationWidth) / 2;
    const y = terrain.minFrontalSpace;

    // Calcular espacios restantes
    const remainingSpace = {
      left: x,
      right: terrain.width - excavationWidth - x,
      front: y,
      back: terrain.length - excavationLength - y,
    };

    // Calcular score de ajuste (0-100)
    // Factores:
    // 1. Utilización del espacio (cuanto más use, mejor, pero sin pasarse)
    // 2. Balance de espacios laterales
    // 3. Cumplimiento de espacios mínimos

    const spaceUtilization = ((excavationLength * excavationWidth) / (terrain.length * terrain.width)) * 100;
    const lateralBalance = 100 - (Math.abs(remainingSpace.left - remainingSpace.right) / terrain.width) * 100;
    const minSpaceCompliance =
      Math.min(remainingSpace.left / terrain.minLateralSpace, 1) * 100 +
      Math.min(remainingSpace.right / terrain.minLateralSpace, 1) * 100 +
      Math.min(remainingSpace.front / terrain.minFrontalSpace, 1) * 100 +
      Math.min(remainingSpace.back / terrain.minBackSpace, 1) * 100;

    const fitScore = (
      spaceUtilization * 0.4 +
      lateralBalance * 0.3 +
      (minSpaceCompliance / 4) * 0.3
    );

    return {
      preset,
      fitScore,
      position: { x, y, rotation },
      remainingSpace,
      excavationDimensions: {
        length: excavationLength,
        width: excavationWidth,
      },
    };
  };

  const handleCreateProject = async () => {
    if (!selectedPool) return;

    try {
      setLoading(true);
      const project = await projectService.create({
        ...projectData,
        poolPresetId: selectedPool.id,
        status: 'DRAFT',
      });

      alert('¡Proyecto creado exitosamente!');
      setIsOpen(false);
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      alert('Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedPool(null);
    setFitResults([]);
    setProjectData({
      name: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      location: '',
    });
  };

  const handleOpenWizard = () => {
    console.log('[PoolFitWizard] Abriendo asistente inteligente...');
    console.log('[PoolFitWizard] Modelos disponibles:', poolPresets.length);
    resetWizard();
    setIsOpen(true);
    console.log('[PoolFitWizard] Modal abierto');
  };

  return (
    <>
      {/* Card de acción en el Dashboard - Estilo Strudel */}
      <div className="group relative cursor-pointer" onClick={handleOpenWizard}>
        <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-md opacity-50"></div>
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl shadow-purple-500/50">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-light text-white tracking-wide mb-2">Asistente Inteligente</h3>
                  <p className="text-sm text-zinc-400 font-light">Encuentra la piscina perfecta para tu terreno</p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowRight className="text-purple-400" size={32} />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
        </div>
      </div>

      {/* Modal del Wizard */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Asistente Inteligente de Proyectos"
      >
        <div className="space-y-6">
          {/* Indicador de pasos */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep >= step
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      currentStep > step ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* PASO 1: Medidas del terreno */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="text-purple-600" size={24} />
                <h3 className="text-lg font-bold">Medidas del Terreno</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Largo del terreno (m) *"
                  type="number"
                  value={terrain.length}
                  onChange={(e) => setTerrain({ ...terrain, length: parseFloat(e.target.value) || 0 })}
                  min={1}
                  step={0.1}
                />
                <Input
                  label="Ancho del terreno (m) *"
                  type="number"
                  value={terrain.width}
                  onChange={(e) => setTerrain({ ...terrain, width: parseFloat(e.target.value) || 0 })}
                  min={1}
                  step={0.1}
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-800">
                  💡 <strong>Tip:</strong> Ingresá las medidas exactas de tu terreno. El sistema buscará automáticamente los modelos que mejor se ajusten.
                </p>
              </div>

              <Button onClick={() => setCurrentStep(2)} className="w-full mt-4">
                Continuar
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          )}

          {/* PASO 2: Espacios mínimos */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Layout className="text-purple-600" size={24} />
                <h3 className="text-lg font-bold">Espacios Mínimos Requeridos</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Definí los espacios mínimos que necesitás alrededor de la piscina para circulación, equipamiento, etc.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Espacio lateral (m)"
                  type="number"
                  value={terrain.minLateralSpace}
                  onChange={(e) => setTerrain({ ...terrain, minLateralSpace: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                />
                <Input
                  label="Espacio frontal (m)"
                  type="number"
                  value={terrain.minFrontalSpace}
                  onChange={(e) => setTerrain({ ...terrain, minFrontalSpace: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                />
              </div>

              <Input
                label="Espacio trasero (m)"
                type="number"
                value={terrain.minBackSpace}
                onChange={(e) => setTerrain({ ...terrain, minBackSpace: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📏 <strong>Recomendación:</strong> Dejá al menos 0.5m en los laterales y 1m en frente y atrás para colocación de equipamiento y circulación.
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={() => setCurrentStep(1)} className="flex-1">
                  <ArrowLeft size={20} className="mr-2" />
                  Atrás
                </Button>
                <Button onClick={findBestFit} className="flex-1" disabled={loading}>
                  {loading ? 'Buscando...' : 'Buscar Modelos'}
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: Resultados */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Maximize className="text-purple-600" size={24} />
                <h3 className="text-lg font-bold">Modelos Disponibles</h3>
              </div>

              {fitResults.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="text-orange-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No se encontraron modelos que se ajusten</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Probá aumentando las dimensiones del terreno o reduciendo los espacios mínimos.
                  </p>
                  <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft size={20} className="mr-2" />
                    Ajustar Parámetros
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Encontramos <strong>{fitResults.length} modelos</strong> que se ajustan a tu terreno. Seleccioná el que más te guste.
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {fitResults.slice(0, 10).map((result, index) => (
                      <div
                        key={`${result.preset.id}-${result.position.rotation}`}
                        onClick={() => {
                          setSelectedPool(result.preset);
                          setCurrentStep(4);
                        }}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          index === 0
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-purple-400 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {index === 0 && <CheckCircle size={20} className="text-green-600" />}
                              <h4 className="font-bold">{result.preset.name}</h4>
                              {result.position.rotation === 90 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                  Rotada 90°
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {result.preset.length}m × {result.preset.width}m × {result.preset.depth}m
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">
                              {result.fitScore.toFixed(0)}%
                            </div>
                            <p className="text-xs text-gray-500">ajuste</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-xs mt-3">
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-gray-600">Izq.</p>
                            <p className="font-semibold">{result.remainingSpace.left.toFixed(1)}m</p>
                          </div>
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-gray-600">Der.</p>
                            <p className="font-semibold">{result.remainingSpace.right.toFixed(1)}m</p>
                          </div>
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-gray-600">Frente</p>
                            <p className="font-semibold">{result.remainingSpace.front.toFixed(1)}m</p>
                          </div>
                          <div className="bg-white rounded p-2 text-center">
                            <p className="text-gray-600">Atrás</p>
                            <p className="font-semibold">{result.remainingSpace.back.toFixed(1)}m</p>
                          </div>
                        </div>

                        {index === 0 && (
                          <div className="mt-3 bg-green-100 border border-green-300 rounded px-3 py-2">
                            <p className="text-xs text-green-800 font-medium">
                              ⭐ Mejor opción - Máximo aprovechamiento del espacio
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button variant="secondary" onClick={() => setCurrentStep(2)} className="w-full mt-4">
                    <ArrowLeft size={20} className="mr-2" />
                    Ajustar Parámetros
                  </Button>
                </>
              )}
            </div>
          )}

          {/* PASO 4: Datos del proyecto y visualización */}
          {currentStep === 4 && selectedPool && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="text-green-600" size={24} />
                <h3 className="text-lg font-bold">Crear Proyecto</h3>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Modelo seleccionado: <strong>{selectedPool.name}</strong>
                </p>
                <p className="text-xs text-green-700">
                  {selectedPool.length}m × {selectedPool.width}m × {selectedPool.depth}m
                </p>
              </div>

              {/* Visualización 2D mejorada */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 mb-4">
                <p className="text-sm font-semibold text-gray-700 text-center mb-4">Vista Superior del Terreno</p>
                {(() => {
                  const result = fitResults.find(r => r.preset.id === selectedPool.id);
                  if (!result) return null;

                  // Calcular dimensiones del contenedor manteniendo proporciones
                  const maxContainerWidth = 400;
                  const maxContainerHeight = 300;
                  const terrainRatio = terrain.length / terrain.width;

                  let containerWidth = maxContainerWidth;
                  let containerHeight = containerWidth * terrainRatio;

                  if (containerHeight > maxContainerHeight) {
                    containerHeight = maxContainerHeight;
                    containerWidth = containerHeight / terrainRatio;
                  }

                  // Escalas para convertir metros a píxeles
                  const scaleX = containerWidth / terrain.width;
                  const scaleY = containerHeight / terrain.length;

                  // Dimensiones y posición de la piscina en píxeles
                  const poolWidthPx = result.excavationDimensions.width * scaleX;
                  const poolLengthPx = result.excavationDimensions.length * scaleY;
                  const poolX = result.position.x * scaleX;
                  const poolY = result.position.y * scaleY;

                  return (
                    <>
                      <div
                        className="relative bg-white rounded-lg border-2 border-gray-400 mx-auto shadow-inner overflow-hidden"
                        style={{
                          width: `${containerWidth}px`,
                          height: `${containerHeight}px`,
                        }}
                      >
                        {/* Etiquetas de dimensiones del terreno */}
                        <div className="absolute -top-6 left-0 right-0 text-center">
                          <span className="text-xs font-medium text-gray-600">{terrain.width}m</span>
                        </div>
                        <div className="absolute top-0 bottom-0 -left-12 flex items-center">
                          <span className="text-xs font-medium text-gray-600 transform -rotate-90">{terrain.length}m</span>
                        </div>

                        {/* Piscina */}
                        <div
                          className="absolute bg-gradient-to-br from-blue-400 to-blue-500 bg-opacity-70 border-3 border-blue-700 rounded-md flex flex-col items-center justify-center shadow-lg"
                          style={{
                            left: `${poolX}px`,
                            top: `${poolY}px`,
                            width: `${poolWidthPx}px`,
                            height: `${poolLengthPx}px`,
                          }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-md">PISCINA</span>
                          <span className="text-[10px] text-blue-100 mt-1">
                            {selectedPool.length}m × {selectedPool.width}m
                          </span>
                        </div>

                        {/* Líneas de referencia para espacios */}
                        {result.remainingSpace.left > 0.3 && (
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-400 opacity-50"
                            style={{ left: `${poolX}px` }}
                          />
                        )}
                        {result.remainingSpace.front > 0.3 && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-dashed border-orange-400 opacity-50"
                            style={{ top: `${poolY}px` }}
                          />
                        )}
                      </div>

                      {/* Información de espacios */}
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white rounded-lg p-2 border border-gray-300">
                          <p className="text-[10px] text-gray-600 mb-1">Izq.</p>
                          <p className="text-sm font-bold text-gray-800">{result.remainingSpace.left.toFixed(2)}m</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-300">
                          <p className="text-[10px] text-gray-600 mb-1">Der.</p>
                          <p className="text-sm font-bold text-gray-800">{result.remainingSpace.right.toFixed(2)}m</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-300">
                          <p className="text-[10px] text-gray-600 mb-1">Frente</p>
                          <p className="text-sm font-bold text-gray-800">{result.remainingSpace.front.toFixed(2)}m</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-gray-300">
                          <p className="text-[10px] text-gray-600 mb-1">Atrás</p>
                          <p className="text-sm font-bold text-gray-800">{result.remainingSpace.back.toFixed(2)}m</p>
                        </div>
                      </div>

                      {/* Información de excavación */}
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800 font-medium mb-1">
                          Dimensiones de Excavación:
                        </p>
                        <p className="text-sm text-blue-900">
                          {result.excavationDimensions.length.toFixed(2)}m × {result.excavationDimensions.width.toFixed(2)}m
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <Input
                label="Nombre del Proyecto *"
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                placeholder="Ej: Proyecto Familia Gómez"
              />

              <Input
                label="Nombre del Cliente *"
                value={projectData.clientName}
                onChange={(e) => setProjectData({ ...projectData, clientName: e.target.value })}
                placeholder="Ej: Juan Gómez"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={projectData.clientEmail}
                  onChange={(e) => setProjectData({ ...projectData, clientEmail: e.target.value })}
                  placeholder="juan@ejemplo.com"
                />
                <Input
                  label="Teléfono"
                  value={projectData.clientPhone}
                  onChange={(e) => setProjectData({ ...projectData, clientPhone: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>

              <Input
                label="Ubicación"
                value={projectData.location}
                onChange={(e) => setProjectData({ ...projectData, location: e.target.value })}
                placeholder="Dirección del proyecto"
              />

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setCurrentStep(3)} className="flex-1">
                  <ArrowLeft size={20} className="mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleCreateProject}
                  className="flex-1"
                  disabled={!projectData.name || !projectData.clientName || loading}
                >
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                  <CheckCircle size={20} className="ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
