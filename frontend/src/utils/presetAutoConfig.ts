/**
 * Utilidades para auto-configurar pestañas de proyecto basándose en el modelo de piscina
 */

import { PoolPreset } from '@/types';

/**
 * Genera configuración eléctrica automática basándose en el preset y adicionales
 */
export function generateElectricalConfigFromPresetWithAdditionals(
  preset: PoolPreset,
  additionals: any[] = []
): any {
  const config = generateElectricalConfigFromPreset(preset);

  // Procesar adicionales eléctricos
  additionals.forEach((additional) => {
    const itemName = additional.customName || additional.equipment?.name || additional.accessory?.name || '';
    const itemType = additional.equipment?.type || additional.customCategory || '';
    const newQuantity = additional.newQuantity || 0;
    const baseQuantity = additional.baseQuantity || 0;
    const addedQuantity = newQuantity - baseQuantity;

    if (addedQuantity <= 0) return; // No se agregaron items

    const nameLower = itemName.toLowerCase();

    // LUCES
    if (nameLower.includes('luz') || nameLower.includes('light') || nameLower.includes('iluminación') || itemType === 'LIGHTING') {
      for (let i = 0; i < addedQuantity; i++) {
        const isLED = nameLower.includes('led');
        config.lights.push({
          id: `light-additional-${config.lights.length + 1}`,
          name: `${itemName} ${i + 1}`,
          type: isLED ? 'LED' : 'Halógeno',
          power: isLED ? 15 : 50,
          voltage: 12,
          location: `Adicional - ${itemName}`,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // BOMBAS
    else if (nameLower.includes('bomba') || nameLower.includes('pump') || itemType === 'PUMP') {
      for (let i = 0; i < addedQuantity; i++) {
        const isHydro = nameLower.includes('hidrojet') || nameLower.includes('hidromasaje') || nameLower.includes('hydro');
        const isHeating = nameLower.includes('calor') || nameLower.includes('calefac') || nameLower.includes('térmico');

        config.pumps.push({
          id: `pump-additional-${config.pumps.length + 1}`,
          name: `${itemName} ${i + 1}`,
          type: isHydro ? 'Hidromasaje' : isHeating ? 'Calefacción' : 'Filtración',
          power: isHydro ? 1500 : isHeating ? 2000 : 1100,
          voltage: 220,
          hp: isHydro ? 2 : isHeating ? 2.5 : 1.5,
          flowRate: isHydro ? 15 : 12,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // CALENTADORES
    else if (nameLower.includes('calentador') || nameLower.includes('heater') || nameLower.includes('calefactor') || itemType === 'HEATER') {
      for (let i = 0; i < addedQuantity; i++) {
        const isElectric = nameLower.includes('eléctric') || nameLower.includes('electric');
        config.heaters.push({
          id: `heater-additional-${config.heaters.length + 1}`,
          name: `${itemName} ${i + 1}`,
          type: isElectric ? 'Eléctrico' : 'Gas/Solar',
          power: isElectric ? 12000 : 0, // Calentador eléctrico consume mucho
          voltage: isElectric ? 220 : 0,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // OTROS EQUIPOS ELÉCTRICOS
    else if (nameLower.includes('control') || nameLower.includes('timer') || nameLower.includes('automatización')) {
      for (let i = 0; i < addedQuantity; i++) {
        config.other.push({
          id: `other-additional-${config.other.length + 1}`,
          name: `${itemName} ${i + 1}`,
          type: 'Control/Automatización',
          power: 50, // Consumo típico de controladores
          voltage: 220,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }
  });

  // Recalcular potencia total
  config.totalPower =
    config.lights.reduce((sum: number, light: any) => sum + (light.power * light.quantity), 0) +
    config.pumps.reduce((sum: number, pump: any) => sum + (pump.power * pump.quantity), 0) +
    config.heaters.reduce((sum: number, heater: any) => sum + (heater.power * heater.quantity), 0) +
    config.other.reduce((sum: number, item: any) => sum + (item.power * item.quantity), 0);

  // Recalcular costos
  const circuitsNeeded = config.lights.length + config.pumps.length + config.heaters.length + config.other.length;
  config.estimatedInstallationCost =
    circuitsNeeded * 50000 + // $50k por circuito
    config.lights.length * 15000 + // $15k por luz instalada
    config.pumps.length * 80000 + // $80k por bomba instalada
    config.heaters.length * 100000; // $100k por calentador instalado

  return config;
}

/**
 * Genera configuración eléctrica automática basándose en el preset (sin adicionales)
 */
export function generateElectricalConfigFromPreset(preset: PoolPreset): any {
  const config: any = {
    lights: [],
    pumps: [],
    heaters: [],
    other: [],
    totalPower: 0,
    estimatedInstallationCost: 0
  };

  // Auto-configurar luces
  if (preset.hasLighting && preset.lightingCount > 0) {
    for (let i = 0; i < preset.lightingCount; i++) {
      config.lights.push({
        id: `light-${i + 1}`,
        name: `Luz ${i + 1}`,
        type: preset.lightingType || 'LED',
        power: preset.lightingType?.toLowerCase().includes('led') ? 15 : 50, // LED: 15W, Halógeno: 50W
        voltage: 12, // Por defecto 12V para seguridad
        location: i === 0 ? 'Pared frontal' : i === 1 ? 'Pared posterior' : `Posición ${i + 1}`,
        quantity: 1,
        notes: `Luz configurada automáticamente desde modelo ${preset.name}`
      });
    }
  }

  // Auto-configurar bomba (siempre hay al menos una)
  config.pumps.push({
    id: 'pump-main',
    name: 'Bomba de filtración principal',
    type: 'Filtración',
    power: calculatePumpPower(preset), // Calcular según volumen
    voltage: 220,
    hp: calculatePumpHP(preset),
    flowRate: calculateFlowRate(preset),
    quantity: 1,
    notes: `Bomba dimensionada automáticamente para ${preset.length}x${preset.width}x${preset.depth}m`
  });

  // Auto-configurar bomba para hidromasaje si aplica
  if (preset.hasHydroJets && preset.hydroJetsCount > 0) {
    config.pumps.push({
      id: 'pump-hydro',
      name: 'Bomba de hidromasaje',
      type: 'Hidromasaje',
      power: 1500, // Típicamente 1.5-2 HP
      voltage: 220,
      hp: 2,
      flowRate: 15, // m³/h
      quantity: 1,
      notes: `Bomba para ${preset.hydroJetsCount} jets de hidromasaje`
    });
  }

  // Calcular potencia total
  config.totalPower = config.lights.reduce((sum: number, light: any) => sum + (light.power * light.quantity), 0) +
                      config.pumps.reduce((sum: number, pump: any) => sum + pump.power, 0);

  // Estimación de costo de instalación (ARS)
  const circuitsNeeded = config.lights.length + config.pumps.length;
  config.estimatedInstallationCost = circuitsNeeded * 50000 + // $50k por circuito
                                     config.lights.length * 15000 + // $15k por luz instalada
                                     config.pumps.length * 80000; // $80k por bomba instalada

  return config;
}

/**
 * Genera configuración hidráulica automática basándose en el preset y adicionales
 */
export function generatePlumbingConfigFromPresetWithAdditionals(
  preset: PoolPreset,
  additionals: any[] = []
): any {
  const config = generatePlumbingConfigFromPreset(preset);

  // Procesar adicionales hidráulicos
  additionals.forEach((additional) => {
    const itemName = additional.customName || additional.equipment?.name || additional.accessory?.name || '';
    const itemType = additional.equipment?.type || additional.customCategory || '';
    const newQuantity = additional.newQuantity || 0;
    const baseQuantity = additional.baseQuantity || 0;
    const addedQuantity = newQuantity - baseQuantity;

    if (addedQuantity <= 0) return; // No se agregaron items

    // Detectar tipo de componente hidráulico por nombre o tipo
    const nameLower = itemName.toLowerCase();

    // RETORNOS (normales o agua caliente)
    if (nameLower.includes('retorno') || itemType === 'RETURN_ITEM') {
      const isHotWater = nameLower.includes('agua caliente') || nameLower.includes('térmico') || nameLower.includes('calefacción');

      for (let i = 0; i < addedQuantity; i++) {
        const returnId = `return-additional-${config.returns.length + 1}`;
        config.returns.push({
          id: returnId,
          name: isHotWater ? `Retorno agua caliente ${i + 1}` : `Retorno adicional ${i + 1}`,
          type: isHotWater ? 'Retorno térmico' : 'Retorno de impulsión',
          diameter: '50mm',
          location: `Adicional - ${itemName}`,
          depth: preset.depth - 0.3,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true,
          isHotWater
        });
      }
    }

    // SKIMMERS
    else if (nameLower.includes('skimmer') || itemType === 'SKIMMER_ITEM') {
      for (let i = 0; i < addedQuantity; i++) {
        config.skimmers.push({
          id: `skimmer-additional-${config.skimmers.length + 1}`,
          name: `Skimmer adicional ${i + 1}`,
          type: 'Skimmer de superficie',
          diameter: '110mm',
          location: `Adicional - ${itemName}`,
          depth: 0.15,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // HIDROJETS
    else if (nameLower.includes('jet') || nameLower.includes('hidrojet') || nameLower.includes('hidro')) {
      for (let i = 0; i < addedQuantity; i++) {
        config.jets.push({
          id: `jet-additional-${config.jets.length + 1}`,
          name: `Jet adicional ${i + 1}`,
          type: 'Jet regulable',
          diameter: '50mm',
          location: `Adicional - ${itemName}`,
          depth: 0.5,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // TOMAS DE ASPIRACIÓN
    else if (nameLower.includes('aspiración') || nameLower.includes('vacuum') || nameLower.includes('barrefondo')) {
      for (let i = 0; i < addedQuantity; i++) {
        config.vacuumIntakes.push({
          id: `vacuum-additional-${config.vacuumIntakes.length + 1}`,
          name: `Toma aspiración adicional ${i + 1}`,
          type: 'Toma de limpieza',
          diameter: '38mm',
          location: `Adicional - ${itemName}`,
          depth: preset.depth / 2,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }

    // DRENES
    else if (nameLower.includes('dren') || nameLower.includes('drain') || itemType === 'DRAIN_ITEM') {
      for (let i = 0; i < addedQuantity; i++) {
        config.drains.push({
          id: `drain-additional-${config.drains.length + 1}`,
          name: `Dren adicional ${i + 1}`,
          type: 'Dren secundario',
          diameter: '110mm',
          location: `Adicional - ${itemName}`,
          depth: preset.depth,
          quantity: 1,
          notes: `Agregado como adicional: ${itemName}`,
          isAdditional: true
        });
      }
    }
  });

  // Recalcular totales y notas
  const totalComponents = config.returns.length + config.skimmers.length +
                          config.drains.length + config.vacuumIntakes.length +
                          config.jets.length;

  config.notes = [
    `Configuración hidráulica para modelo ${preset.name}`,
    `Componentes base del modelo: ${preset.returnsCount} retornos, ${preset.skimmerCount} skimmers`,
    `Total de componentes (incluyendo adicionales): ${totalComponents}`,
    `Longitud estimada de tuberías: ${config.pipes.reduce((sum: any, pipe: any) => sum + (pipe.length || 0), 0)}m`
  ];

  return config;
}

/**
 * Genera configuración hidráulica automática basándose en el preset (sin adicionales)
 */
export function generatePlumbingConfigFromPreset(preset: PoolPreset): any {
  const config: any = {
    returns: [],
    skimmers: [],
    drains: [],
    vacuumIntakes: [],
    jets: [],
    pipes: [],
    valves: [],
    estimatedMaterialCost: 0,
    notes: []
  };

  // Auto-configurar retornos
  if (preset.returnsCount > 0) {
    for (let i = 0; i < preset.returnsCount; i++) {
      config.returns.push({
        id: `return-${i + 1}`,
        name: `Retorno ${i + 1}`,
        type: 'Retorno de impulsión',
        diameter: '50mm', // 2" típico
        location: i === 0 ? 'Pared frontal' : i === 1 ? 'Pared lateral derecha' : `Posición ${i + 1}`,
        depth: preset.depth - 0.3, // 30cm bajo superficie
        quantity: 1,
        notes: `Retorno configurado desde modelo ${preset.name}`
      });
    }
  }

  // Auto-configurar retorno de agua caliente
  if (preset.hasHotWaterReturn) {
    config.returns.push({
      id: 'return-hot',
      name: 'Retorno de agua caliente',
      type: 'Retorno térmico',
      diameter: '50mm',
      location: 'Pared frontal (inferior)',
      depth: preset.depth - 0.2,
      quantity: 1,
      notes: 'Para sistema de calefacción'
    });
  }

  // Auto-configurar skimmers
  if (preset.hasSkimmer && preset.skimmerCount > 0) {
    for (let i = 0; i < preset.skimmerCount; i++) {
      config.skimmers.push({
        id: `skimmer-${i + 1}`,
        name: `Skimmer ${i + 1}`,
        type: 'Skimmer de superficie',
        diameter: '110mm', // 4" típico para skimmer
        location: i === 0 ? 'Pared lateral izquierda' : `Pared ${i + 1}`,
        depth: 0.15, // 15cm bajo línea de agua
        quantity: 1,
        notes: `Skimmer de ${preset.name}`
      });
    }
  }

  // Auto-configurar dren de fondo
  if (preset.hasBottomDrain) {
    config.drains.push({
      id: 'drain-bottom',
      name: 'Dren de fondo',
      type: 'Dren principal',
      diameter: '110mm', // 4"
      location: 'Centro del fondo',
      depth: preset.depth,
      quantity: 1,
      notes: 'Dren central para limpieza y vaciado'
    });
  }

  // Auto-configurar tomas de aspiración
  if (preset.hasVacuumIntake && preset.vacuumIntakeCount > 0) {
    for (let i = 0; i < preset.vacuumIntakeCount; i++) {
      config.vacuumIntakes.push({
        id: `vacuum-${i + 1}`,
        name: `Toma de aspiración ${i + 1}`,
        type: 'Toma de limpieza',
        diameter: '38mm', // 1.5"
        location: i === 0 ? 'Pared frontal' : `Pared ${i + 1}`,
        depth: preset.depth / 2,
        quantity: 1,
        notes: 'Para barrefondo manual'
      });
    }
  }

  // Auto-configurar jets de hidromasaje
  if (preset.hasHydroJets && preset.hydroJetsCount > 0) {
    for (let i = 0; i < preset.hydroJetsCount; i++) {
      config.jets.push({
        id: `jet-${i + 1}`,
        name: `Jet hidromasaje ${i + 1}`,
        type: 'Jet regulable',
        diameter: '50mm',
        location: i < 2 ? 'Pared posterior (bancos)' : 'Paredes laterales',
        depth: 0.5,
        quantity: 1,
        notes: `Jet ${i + 1} de ${preset.hydroJetsCount}`
      });
    }
  }

  // Auto-configurar tuberías principales
  const totalComponents = config.returns.length + config.skimmers.length +
                          config.drains.length + config.vacuumIntakes.length +
                          config.jets.length;

  // Tubería de impulsión (desde bomba a retornos)
  config.pipes.push({
    id: 'pipe-pressure',
    name: 'Tubería de impulsión',
    type: 'PVC presión',
    diameter: '50mm',
    length: Math.ceil(preset.perimeter / 2), // Aproximado
    notes: 'Desde bomba hasta retornos'
  });

  // Tubería de aspiración (desde skimmers/dren a bomba)
  config.pipes.push({
    id: 'pipe-suction',
    name: 'Tubería de aspiración',
    type: 'PVC presión',
    diameter: '63mm', // Mayor diámetro para aspiración
    length: Math.ceil(preset.perimeter / 2),
    notes: 'Desde elementos de aspiración a bomba'
  });

  // Auto-configurar válvulas
  config.valves.push({
    id: 'valve-main',
    name: 'Válvula de 3 vías',
    type: 'Válvula selectora',
    diameter: '50mm',
    location: 'Sala de máquinas',
    quantity: 1,
    notes: 'Para selección de aspiración (skimmer/dren)'
  });

  if (preset.hasHydroJets) {
    config.valves.push({
      id: 'valve-hydro',
      name: 'Válvula para hidromasaje',
      type: 'Válvula de bola',
      diameter: '50mm',
      location: 'Línea de hidromasaje',
      quantity: 1,
      notes: 'Control de circuito de hidromasaje'
    });
  }

  // Estimación de costos de materiales (ARS)
  config.estimatedMaterialCost =
    config.returns.length * 5000 + // Retornos
    config.skimmers.length * 25000 + // Skimmers
    config.drains.length * 30000 + // Drenes
    config.vacuumIntakes.length * 8000 + // Tomas
    config.jets.length * 15000 + // Jets
    config.pipes.reduce((sum: any, pipe: any) => sum + (pipe.length * 1500), 0) + // Tuberías
    config.valves.length * 12000; // Válvulas

  // Notas generales
  config.notes.push(`Configuración hidráulica generada automáticamente para modelo ${preset.name}`);
  config.notes.push(`Total de componentes hidráulicos: ${totalComponents}`);
  config.notes.push(`Longitud estimada de tuberías: ${config.pipes.reduce((sum: any, pipe: any) => sum + pipe.length, 0)}m`);

  return config;
}

/**
 * Calcula la potencia de bomba necesaria según el volumen
 */
function calculatePumpPower(preset: PoolPreset): number {
  const volume = preset.length * preset.width * preset.depth;

  if (volume < 30) return 550; // 0.75 HP
  if (volume < 50) return 750; // 1 HP
  if (volume < 80) return 1100; // 1.5 HP
  return 1500; // 2 HP
}

/**
 * Calcula los HP de la bomba
 */
function calculatePumpHP(preset: PoolPreset): number {
  const power = calculatePumpPower(preset);
  return power / 745.7; // Conversión W a HP
}

/**
 * Calcula el caudal requerido
 */
function calculateFlowRate(preset: PoolPreset): number {
  const volume = preset.length * preset.width * preset.depth;
  // Todo el volumen debe circular en 6-8 horas
  return (volume / 6) * 1.2; // +20% margen
}

/**
 * Genera configuración de losetas automática basándose en el preset
 */
export function generateTileConfigFromPreset(preset: PoolPreset): any {
  // Si el preset ya tiene configuración de losetas, devolverla
  if (preset.tileConfig) {
    return preset.tileConfig;
  }

  // Configuración por defecto
  const defaultTileConfig = {
    north: {
      rows: calculateDefaultRows(preset),
      firstRing: 'LOMO_BALLENA' as const,
      tileType: 'COMMON' as const
    },
    south: {
      rows: calculateDefaultRows(preset),
      firstRing: 'LOMO_BALLENA' as const,
      tileType: 'COMMON' as const
    },
    east: {
      rows: calculateDefaultRows(preset),
      firstRing: 'LOMO_BALLENA' as const,
      tileType: 'COMMON' as const
    },
    west: {
      rows: calculateDefaultRows(preset),
      firstRing: 'LOMO_BALLENA' as const,
      tileType: 'COMMON' as const
    }
  };

  return defaultTileConfig;
}

/**
 * Calcula el número de filas de losetas por defecto
 */
function calculateDefaultRows(preset: PoolPreset): number {
  // Por defecto solo 1 fila (el usuario puede agregar más manualmente)
  return 1;
}
