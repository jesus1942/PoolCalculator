/**
 * Sistema profesional de cálculos hidráulicos para piscinas
 * Incluye: pérdida de carga, dimensionamiento de bomba, validación de velocidades
 */

import { Project, EquipmentPreset, PoolPreset } from '@prisma/client';

// ==================== INTERFACES ====================

export interface PipeSection {
  name: string;
  diameter: number;        // mm
  length: number;          // metros
  flowRate: number;        // m³/h
  material: 'PVC' | 'PP' | 'COPPER';
  fittings: PipeFittings;
}

export interface PipeFittings {
  elbows90: number;        // Codos 90° (K=0.9)
  elbows45: number;        // Codos 45° (K=0.4)
  tees: number;            // Tees (K=1.8)
  valves: number;          // Válvulas de bola (K=0.2)
  checkValves: number;     // Válvulas check (K=2.5)
  filters: number;         // Filtros (K=5.0)
}

export interface PipingSystemData {
  suctionLine: PipeSection;
  returnLine: PipeSection;
  hydrojetLine?: PipeSection;
  mainPipeDiameter: number;      // mm
  requiredFlowRate: number;      // m³/h
  distanceToEquipment: number;   // metros
  staticLift: number;            // altura de aspiración (metros)
}

export interface HydraulicCalculationResult {
  // Pérdidas de carga
  frictionLoss: {
    suction: number;     // metros
    return: number;      // metros
    hydrojet?: number;   // metros
    total: number;       // metros
  };
  singularLoss: {
    suction: number;     // metros
    return: number;      // metros
    hydrojet?: number;   // metros
    total: number;       // metros
  };
  totalDynamicHead: number;      // TDH en metros

  // Velocidades
  velocityChecks: VelocityCheck[];

  // Bomba recomendada
  recommendedPump: EquipmentPreset | null;
  pumpSelectionDetails: {
    requiredFlowRate: number;    // m³/h
    requiredHead: number;        // metros
    safetyFactor: number;        // factor aplicado
  };

  // Validaciones
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export interface VelocityCheck {
  section: string;
  velocity: number;              // m/s
  diameter: number;              // mm
  flowRate: number;              // m³/h
  isValid: boolean;
  recommendation: string;
}

export interface ProjectPipingData {
  skimmers: Array<{ diameter: number; count: number }>;
  returns: Array<{ diameter: number; count: number }>;
  hydrojets: Array<{ diameter: number; count: number }>;
  drains: Array<{ diameter: number; count: number }>;
  selectedPipes: Array<{ diameter: number; type: string; length?: number }>;
  selectedEquipment: Array<{
    name: string;
    connectionSize?: string;
    flowRate?: number;
    maxHead?: number;
  }>;
}

// ==================== CONSTANTES ====================

const PIPE_ROUGHNESS_COEFFICIENT = {
  PVC: 150,          // Coeficiente C de Hazen-Williams
  PP: 140,           // Polipropileno
  COPPER: 130        // Cobre
};

const FITTING_K_VALUES = {
  elbow90: 0.9,
  elbow45: 0.4,
  tee: 1.8,
  valve: 0.2,
  checkValve: 2.5,
  filter: 5.0,
  skimmer: 1.5,
  return: 0.8
};

const VELOCITY_LIMITS = {
  min: 1.5,          // m/s - mínimo para evitar sedimentación
  max: 2.5,          // m/s - máximo para evitar ruido y erosión
  optimal: 2.0       // m/s - velocidad óptima
};

const SAFETY_FACTORS = {
  tdh: 1.15,         // 15% factor de seguridad en TDH
  pump: 1.10         // 10% margen en selección de bomba
};

// ==================== FUNCIONES DE CÁLCULO ====================

/**
 * Extrae los datos reales de tuberías y accesorios del proyecto
 */
export function extractProjectPipingData(
  project: Project & {
    poolPreset: PoolPreset;
    projectAdditionals?: any[];
  }
): ProjectPipingData {
  const data: ProjectPipingData = {
    skimmers: [],
    returns: [],
    hydrojets: [],
    drains: [],
    selectedPipes: [],
    selectedEquipment: []
  };

  // Extraer datos del preset
  const preset = project.poolPreset;

  if (preset.hasSkimmer && preset.skimmerCount > 0) {
    data.skimmers.push({ diameter: 50, count: preset.skimmerCount }); // Default 50mm
  }

  if (preset.returnsCount > 0) {
    data.returns.push({ diameter: 40, count: preset.returnsCount }); // Default 40mm
  }

  if (preset.hasHydroJets && preset.hydroJetsCount > 0) {
    data.hydrojets.push({ diameter: 40, count: preset.hydroJetsCount });
  }

  if (preset.hasBottomDrain) {
    data.drains.push({ diameter: 50, count: 1 });
  }

  // Extraer datos de adicionales
  if (project.projectAdditionals && Array.isArray(project.projectAdditionals)) {
    project.projectAdditionals.forEach((additional: any) => {
      // Equipos con datos técnicos
      if (additional.equipment) {
        const equip = additional.equipment;
        data.selectedEquipment.push({
          name: equip.name,
          connectionSize: equip.connectionSize,
          flowRate: equip.flowRate,
          maxHead: equip.maxHead
        });
      }

      // TODO: Extraer datos de PlumbingItems cuando estén disponibles
    });
  }

  // Extraer de plumbingConfig si existe
  if (project.plumbingConfig && typeof project.plumbingConfig === 'object') {
    const config = project.plumbingConfig as any;
    if (config.selectedItems && Array.isArray(config.selectedItems)) {
      config.selectedItems.forEach((item: any) => {
        if (item.diameter && item.category === 'PIPE') {
          const diameterNum = parseDiameter(item.diameter);
          if (diameterNum > 0) {
            data.selectedPipes.push({
              diameter: diameterNum,
              type: item.itemName || 'PVC',
              length: item.quantity
            });
          }
        }
      });
    }
  }

  return data;
}

/**
 * Parsea un string de diámetro a número en mm
 * Ejemplos: "50mm", "2\"", "1 1/2\"", "63mm (2.5\")"
 */
function parseDiameter(diameterStr: string): number {
  if (!diameterStr) return 0;

  // Buscar número seguido de "mm"
  const mmMatch = diameterStr.match(/(\d+\.?\d*)\s*mm/i);
  if (mmMatch) {
    return parseFloat(mmMatch[1]);
  }

  // Convertir pulgadas a mm (1" = 25.4mm)
  const inchMatch = diameterStr.match(/(\d+\.?\d*)\s*"/);
  if (inchMatch) {
    return parseFloat(inchMatch[1]) * 25.4;
  }

  // Fracciones de pulgada (ej: "1 1/2")
  const fractionMatch = diameterStr.match(/(\d+)\s+(\d+)\/(\d+)\s*"/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1]);
    const num = parseInt(fractionMatch[2]);
    const den = parseInt(fractionMatch[3]);
    return (whole + num / den) * 25.4;
  }

  return 0;
}

/**
 * Calcula la pérdida de carga por fricción usando la fórmula de Hazen-Williams
 * hf = 10.67 × Q^1.85 × L / (C^1.85 × D^4.87)
 */
export function calculateFrictionLoss(
  flowRate: number,        // m³/h
  pipeLength: number,      // metros
  pipeDiameter: number,    // mm
  material: 'PVC' | 'PP' | 'COPPER' = 'PVC'
): number {
  if (flowRate <= 0 || pipeLength <= 0 || pipeDiameter <= 0) return 0;

  const C = PIPE_ROUGHNESS_COEFFICIENT[material];
  const Q = flowRate / 3600;           // m³/h a m³/s
  const D = pipeDiameter / 1000;       // mm a metros
  const L = pipeLength;

  // Fórmula de Hazen-Williams
  const hf = 10.67 * Math.pow(Q, 1.85) * L /
             (Math.pow(C, 1.85) * Math.pow(D, 4.87));

  return hf; // metros de columna de agua
}

/**
 * Calcula la pérdida de carga singular por accesorios
 * hs = K × v² / (2g)
 */
export function calculateSingularLoss(
  velocity: number,        // m/s
  fittings: PipeFittings
): number {
  if (velocity <= 0) return 0;

  const K_total =
    fittings.elbows90 * FITTING_K_VALUES.elbow90 +
    fittings.elbows45 * FITTING_K_VALUES.elbow45 +
    fittings.tees * FITTING_K_VALUES.tee +
    fittings.valves * FITTING_K_VALUES.valve +
    fittings.checkValves * FITTING_K_VALUES.checkValve +
    fittings.filters * FITTING_K_VALUES.filter;

  const g = 9.81; // m/s²
  const hs = K_total * Math.pow(velocity, 2) / (2 * g);

  return hs; // metros
}

/**
 * Calcula la velocidad del agua en una tubería
 * v = Q / A, donde A = π × (D/2)²
 */
export function calculateFlowVelocity(
  flowRate: number,        // m³/h
  diameter: number         // mm
): number {
  if (flowRate <= 0 || diameter <= 0) return 0;

  const Q = flowRate / 3600;           // m³/h a m³/s
  const D = diameter / 1000;           // mm a metros
  const area = Math.PI * Math.pow(D / 2, 2); // m²

  return Q / area; // m/s
}

/**
 * Valida si la velocidad del agua está en el rango óptimo
 */
export function validateFlowVelocity(
  flowRate: number,        // m³/h
  diameter: number         // mm
): VelocityCheck {
  const velocity = calculateFlowVelocity(flowRate, diameter);

  let isValid = true;
  let recommendation = 'Velocidad óptima';

  if (velocity < VELOCITY_LIMITS.min) {
    isValid = false;
    recommendation = `Velocidad muy baja (${velocity.toFixed(2)} m/s). Riesgo de sedimentación. Reducir diámetro o aumentar caudal.`;
  } else if (velocity > VELOCITY_LIMITS.max) {
    isValid = false;
    recommendation = `Velocidad muy alta (${velocity.toFixed(2)} m/s). Riesgo de ruido, erosión y cavitación. Aumentar diámetro o reducir caudal.`;
  } else if (Math.abs(velocity - VELOCITY_LIMITS.optimal) > 0.3) {
    recommendation = `Velocidad aceptable pero no óptima (${velocity.toFixed(2)} m/s). Óptimo: ${VELOCITY_LIMITS.optimal} m/s`;
  }

  return {
    section: '',
    velocity,
    diameter,
    flowRate,
    isValid,
    recommendation
  };
}

/**
 * Calcula el TDH total (Total Dynamic Head)
 * TDH = Altura estática + Pérdida fricción + Pérdida singular + Presión requerida
 */
export function calculateTotalDynamicHead(
  staticLift: number,        // altura de aspiración (m)
  frictionLoss: number,      // pérdida por fricción (m)
  singularLoss: number,      // pérdida por accesorios (m)
  pressureRequired: number = 10  // presión mínima en filtro (m)
): number {
  const TDH = staticLift + frictionLoss + singularLoss + pressureRequired;
  return TDH * SAFETY_FACTORS.tdh; // Con factor de seguridad
}

/**
 * Estima accesorios basándose en la distancia y configuración
 */
export function estimateFittings(
  distanceToEquipment: number,
  accessoryCount: number
): PipeFittings {
  // Por cada accesorio (skimmer, retorno, etc.), estimar accesorios de conexión
  const elbowsPer = 4;  // 4 codos por accesorio (subida, bajada, conexiones)
  const teesPer = accessoryCount > 1 ? 1 : 0; // 1 tee por accesorio adicional

  // Accesorios por distancia (cada 3m, aproximadamente 1 codo)
  const elbowsByDistance = Math.ceil(distanceToEquipment / 3);

  return {
    elbows90: accessoryCount * elbowsPer + elbowsByDistance,
    elbows45: 0,
    tees: accessoryCount > 1 ? accessoryCount - 1 : 0,
    valves: 1,
    checkValves: 1,
    filters: 1
  };
}

/**
 * Selecciona la bomba adecuada según caudal y TDH requerido
 */
export function selectPumpByTDH(
  requiredFlowRate: number,    // m³/h
  totalHead: number,           // metros
  pumps: EquipmentPreset[]
): { pump: EquipmentPreset | null; details: any } {
  if (!pumps || pumps.length === 0) {
    return { pump: null, details: { error: 'No hay bombas disponibles' } };
  }

  // Filtrar bombas activas de tipo PUMP
  const validPumps = pumps.filter(
    p => p.type === 'PUMP' && p.isActive && p.flowRate && p.maxHead
  );

  if (validPumps.length === 0) {
    return { pump: null, details: { error: 'No hay bombas válidas con datos técnicos' } };
  }

  // Aplicar factor de seguridad
  const requiredFlowRateWithMargin = requiredFlowRate * SAFETY_FACTORS.pump;
  const totalHeadWithMargin = totalHead * SAFETY_FACTORS.pump;

  // Buscar bombas que cumplan AMBOS requisitos: caudal Y altura
  const suitablePumps = validPumps.filter(
    p => p.flowRate! >= requiredFlowRateWithMargin &&
         p.maxHead! >= totalHeadWithMargin
  );

  if (suitablePumps.length > 0) {
    // Ordenar por precio (más barata primero) y luego por exceso de capacidad
    const bestPump = suitablePumps.sort((a, b) => {
      // Prioridad 1: Precio (más barata mejor)
      const priceDiff = a.pricePerUnit - b.pricePerUnit;
      if (Math.abs(priceDiff) > 10000) return priceDiff;

      // Prioridad 2: Menor exceso de capacidad (más eficiente)
      const excessA = (a.flowRate! / requiredFlowRate) + (a.maxHead! / totalHead);
      const excessB = (b.flowRate! / requiredFlowRate) + (b.maxHead! / totalHead);
      return excessA - excessB;
    })[0];

    return {
      pump: bestPump,
      details: {
        requiredFlowRate,
        requiredHead: totalHead,
        selectedFlowRate: bestPump.flowRate,
        selectedMaxHead: bestPump.maxHead,
        margin: {
          flow: ((bestPump.flowRate! / requiredFlowRate - 1) * 100).toFixed(1) + '%',
          head: ((bestPump.maxHead! / totalHead - 1) * 100).toFixed(1) + '%'
        }
      }
    };
  }

  // Si no hay exacta, buscar la más cercana por encima
  const pumpsSortedByFlow = validPumps
    .filter(p => p.flowRate! >= requiredFlowRateWithMargin)
    .sort((a, b) => a.flowRate! - b.flowRate!);

  if (pumpsSortedByFlow.length > 0) {
    const closestPump = pumpsSortedByFlow[0];
    return {
      pump: closestPump,
      details: {
        requiredFlowRate,
        requiredHead: totalHead,
        selectedFlowRate: closestPump.flowRate,
        selectedMaxHead: closestPump.maxHead,
        warning: closestPump.maxHead! < totalHeadWithMargin
          ? 'Bomba seleccionada puede no tener suficiente altura'
          : null
      }
    };
  }

  return {
    pump: null,
    details: {
      error: `No hay bomba disponible para caudal ${requiredFlowRate.toFixed(1)} m³/h y altura ${totalHead.toFixed(1)} m`
    }
  };
}

/**
 * Calcula el sistema hidráulico completo del proyecto
 */
export function calculateHydraulicSystem(
  project: Project & { poolPreset: PoolPreset; projectAdditionals?: any[] },
  distanceToEquipment: number,
  staticLift: number,
  availablePumps: EquipmentPreset[]
): HydraulicCalculationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const velocityChecks: VelocityCheck[] = [];

  // Extraer datos del proyecto
  const pipingData = extractProjectPipingData(project);

  // PRIORIDAD 1: Buscar bomba en projectAdditionals (equipos seleccionados del catálogo)
  let configuredPump: EquipmentPreset | null = null;

  if (project.projectAdditionals && Array.isArray(project.projectAdditionals)) {
    const pumpAdditional = project.projectAdditionals.find(
      (additional: any) => additional.equipment && additional.equipment.type === 'PUMP'
    );

    if (pumpAdditional && pumpAdditional.equipment) {
      configuredPump = { ...pumpAdditional.equipment } as EquipmentPreset;

      if (!configuredPump.flowRate && configuredPump.capacity) {
        configuredPump.flowRate = configuredPump.capacity;
      }

      if (!configuredPump.maxHead && configuredPump.power) {
        configuredPump.maxHead = configuredPump.power * 10;
      }

      if (!configuredPump.flowRate || !configuredPump.maxHead) {
        warnings.push(
          `La bomba seleccionada (${configuredPump.name}) no tiene datos técnicos suficientes ` +
          'de caudal/altura. Se usará la recomendación automática del catálogo.'
        );
        configuredPump = null;
      } else {
        console.log(`[HYDRAULIC] Usando bomba del catálogo: ${configuredPump.name}`);
      }
    }
  }

  // PRIORIDAD 2: Si no hay bomba en projectAdditionals, buscar en electricalConfig
  if (!configuredPump && project.electricalConfig && typeof project.electricalConfig === 'object') {
    const electricalConfig = project.electricalConfig as any;
    if (electricalConfig.pumps && Array.isArray(electricalConfig.pumps) && electricalConfig.pumps.length > 0) {
      const pumpConfig = electricalConfig.pumps[0];

      // Crear un objeto EquipmentPreset "virtual" con los datos de la bomba configurada
      if (pumpConfig.flowRate && pumpConfig.power) {
        configuredPump = {
          id: pumpConfig.id || 'configured-pump',
          name: pumpConfig.name || 'Bomba configurada',
          type: 'PUMP',
          brand: 'Configurada en proyecto',
          model: '',
          power: pumpConfig.hp || (pumpConfig.power / 746),
          capacity: pumpConfig.flowRate,
          voltage: pumpConfig.voltage || 220,
          flowRate: pumpConfig.flowRate,
          maxHead: null,
          pricePerUnit: 0,
          description: pumpConfig.notes || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as EquipmentPreset;

        // Estimar maxHead basado en la potencia (HP)
        if (!configuredPump.maxHead && configuredPump.power) {
          configuredPump.maxHead = configuredPump.power * 10;
        }

        console.log(`[HYDRAULIC] Usando bomba de electricalConfig: ${configuredPump.name}`);
      }
    }
  }

  // Determinar diámetros principales
  const mainSuctionDiameter = pipingData.selectedPipes.find(p => p.diameter >= 50)?.diameter || 50;
  const mainReturnDiameter = pipingData.selectedPipes.find(p => p.diameter >= 40 && p.diameter < 50)?.diameter || 40;

  // Calcular caudal requerido
  const volume = project.volume; // m³
  const circulationTime = 8; // horas (por defecto)
  const requiredFlowRate = (volume / circulationTime) * 1.2; // Con 20% margen

  // LÍNEA DE SUCCIÓN
  const suctionAccessoryCount =
    (pipingData.skimmers[0]?.count || 0) +
    (pipingData.drains[0]?.count || 0);

  const suctionFittings = estimateFittings(distanceToEquipment, suctionAccessoryCount);
  const suctionVelocity = calculateFlowVelocity(requiredFlowRate, mainSuctionDiameter);
  const suctionFrictionLoss = calculateFrictionLoss(
    requiredFlowRate,
    distanceToEquipment,
    mainSuctionDiameter,
    'PVC'
  );
  const suctionSingularLoss = calculateSingularLoss(suctionVelocity, suctionFittings);

  const suctionVelocityCheck = validateFlowVelocity(requiredFlowRate, mainSuctionDiameter);
  suctionVelocityCheck.section = 'Línea de Succión';
  velocityChecks.push(suctionVelocityCheck);

  if (!suctionVelocityCheck.isValid) {
    warnings.push(suctionVelocityCheck.recommendation);
  }

  // LÍNEA DE RETORNO
  const returnAccessoryCount = pipingData.returns[0]?.count || 0;
  const returnFittings = estimateFittings(distanceToEquipment, returnAccessoryCount);
  const returnVelocity = calculateFlowVelocity(requiredFlowRate, mainReturnDiameter);
  const returnFrictionLoss = calculateFrictionLoss(
    requiredFlowRate,
    distanceToEquipment,
    mainReturnDiameter,
    'PVC'
  );
  const returnSingularLoss = calculateSingularLoss(returnVelocity, returnFittings);

  const returnVelocityCheck = validateFlowVelocity(requiredFlowRate, mainReturnDiameter);
  returnVelocityCheck.section = 'Línea de Retorno';
  velocityChecks.push(returnVelocityCheck);

  if (!returnVelocityCheck.isValid) {
    warnings.push(returnVelocityCheck.recommendation);
  }

  // LÍNEA DE HIDROJETS (si existe)
  let hydrojetFrictionLoss = 0;
  let hydrojetSingularLoss = 0;
  if (pipingData.hydrojets.length > 0 && pipingData.hydrojets[0].count > 0) {
    const hydrojetDiameter = 40;
    const hydrojetAccessoryCount = pipingData.hydrojets[0].count;
    const hydrojetFittings = estimateFittings(distanceToEquipment, hydrojetAccessoryCount);
    const hydrojetVelocity = calculateFlowVelocity(requiredFlowRate * 0.5, hydrojetDiameter);

    hydrojetFrictionLoss = calculateFrictionLoss(
      requiredFlowRate * 0.5,
      distanceToEquipment,
      hydrojetDiameter,
      'PVC'
    );
    hydrojetSingularLoss = calculateSingularLoss(hydrojetVelocity, hydrojetFittings);

    const hydrojetVelocityCheck = validateFlowVelocity(requiredFlowRate * 0.5, hydrojetDiameter);
    hydrojetVelocityCheck.section = 'Línea de Hidrojets';
    velocityChecks.push(hydrojetVelocityCheck);
  }

  // CÁLCULO DE TDH TOTAL
  const totalFrictionLoss = suctionFrictionLoss + returnFrictionLoss + hydrojetFrictionLoss;
  const totalSingularLoss = suctionSingularLoss + returnSingularLoss + hydrojetSingularLoss;

  const totalDynamicHead = calculateTotalDynamicHead(
    staticLift,
    totalFrictionLoss,
    totalSingularLoss,
    10 // presión mínima en filtro
  );

  // SELECCIÓN DE BOMBA
  // Priorizar la bomba configurada en el proyecto sobre la búsqueda en base de datos
  let pumpSelection: { pump: EquipmentPreset | null; details: any };

  // Validar si la bomba configurada cumple los requisitos
  const requiredFlowRateWithMargin = requiredFlowRate * SAFETY_FACTORS.pump;
  const totalHeadWithMargin = totalDynamicHead * SAFETY_FACTORS.pump;

  let useConfiguredPump = false;

  if (configuredPump) {
    const flowRateOk = configuredPump.flowRate! >= requiredFlowRateWithMargin;
    const headOk = configuredPump.maxHead! >= totalHeadWithMargin;

    if (flowRateOk && headOk) {
      // La bomba configurada cumple requisitos, usarla
      useConfiguredPump = true;
      pumpSelection = {
        pump: configuredPump,
        details: {
          requiredFlowRate,
          requiredHead: totalDynamicHead,
          selectedFlowRate: configuredPump.flowRate,
          selectedMaxHead: configuredPump.maxHead,
          source: 'Bomba configurada en el proyecto (cumple requisitos)',
          margin: {
            flow: ((configuredPump.flowRate! / requiredFlowRate - 1) * 100).toFixed(1) + '%',
            head: configuredPump.maxHead ? ((configuredPump.maxHead / totalDynamicHead - 1) * 100).toFixed(1) + '%' : 'N/A'
          }
        }
      };
    } else {
      // La bomba configurada NO cumple requisitos, buscar una mejor
      if (!flowRateOk) {
        warnings.push(
          `Tu bomba seleccionada (${configuredPump.name}) tiene caudal insuficiente: ` +
          `${configuredPump.flowRate!.toFixed(1)} m³/h vs ${requiredFlowRateWithMargin.toFixed(1)} m³/h requerido`
        );
      }

      if (!headOk) {
        warnings.push(
          `Tu bomba seleccionada (${configuredPump.name}) no tiene suficiente altura: ` +
          `${configuredPump.maxHead!.toFixed(1)} m vs ${totalHeadWithMargin.toFixed(1)} m requerido`
        );
      }

      // Buscar una bomba adecuada en el catálogo
      pumpSelection = selectPumpByTDH(requiredFlowRate, totalDynamicHead, availablePumps);

      if (pumpSelection.pump) {
        warnings.push(
          `Recomendamos cambiar a ${pumpSelection.pump.name} que cumple los requisitos del proyecto`
        );
      } else {
        errors.push('Tu bomba seleccionada es insuficiente y no hay bombas disponibles en el catálogo que cumplan los requisitos');
      }
    }
  } else {
    // Si no hay bomba configurada, buscar en la base de datos
    pumpSelection = selectPumpByTDH(requiredFlowRate, totalDynamicHead, availablePumps);

    if (!pumpSelection.pump) {
      errors.push(pumpSelection.details.error || 'No se pudo seleccionar una bomba adecuada');
    }

    if (pumpSelection.details.warning) {
      warnings.push(pumpSelection.details.warning);
    }
  }

  // Validar altura de aspiración
  if (staticLift > 3) {
    warnings.push(`Altura de aspiración elevada (${staticLift.toFixed(1)}m). Riesgo de cavitación. Considerar bomba más cerca de la piscina.`);
  }

  return {
    frictionLoss: {
      suction: suctionFrictionLoss,
      return: returnFrictionLoss,
      hydrojet: hydrojetFrictionLoss > 0 ? hydrojetFrictionLoss : undefined,
      total: totalFrictionLoss
    },
    singularLoss: {
      suction: suctionSingularLoss,
      return: returnSingularLoss,
      hydrojet: hydrojetSingularLoss > 0 ? hydrojetSingularLoss : undefined,
      total: totalSingularLoss
    },
    totalDynamicHead,
    velocityChecks,
    recommendedPump: pumpSelection.pump,
    pumpSelectionDetails: {
      requiredFlowRate,
      requiredHead: totalDynamicHead,
      safetyFactor: SAFETY_FACTORS.pump
    },
    warnings,
    errors,
    isValid: errors.length === 0
  };
}
