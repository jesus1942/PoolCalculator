import { randomUUID } from 'crypto';
import { findMatchingRole } from './laborReferences';

interface PoolPreset {
  shape: string;
  length: number;
  width: number;
  depth: number;
  depthEnd?: number | null;
  lateralCushionSpace?: number;
  floorCushionDepth?: number;
  hasWetDeck: boolean;
  hasStairsOnly: boolean;
  hasHydroJets: boolean;
  hydroJetsCount: number;
  hasBottomDrain: boolean;
  hasVacuumIntake: boolean;
  vacuumIntakeCount: number;
  hasSkimmer: boolean;
  skimmerCount: number;
  hasLighting: boolean;
  lightingCount: number;
  returnsCount: number;
}

interface TaskDetail {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  laborCost: number;
  quantity?: number;
  unit?: string;
  bocaType?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedRole?: string;
  assignedRoleId?: string;
  category: string;
  suggestedRoleType?: string; // Tipo de rol sugerido (ej: "Excavador", "Plomero", etc)
}

interface RoleRate {
  id: string;
  name: string;
  hourlyRate?: number;
  dailyRate?: number;
  billingType?: 'HOUR' | 'DAY' | 'M2' | 'ML' | 'BOCA';
  ratePerUnit?: number;
  bocaRates?: any;
}

interface BaseInstallationPricingRule {
  totalLaborCost: number;
  lengthBand: 'up_to_7m' | 'over_7m';
  depthProfile: 'uniform' | 'sloped';
}

/**
 * Genera tareas automáticas según las características de la piscina
 * @param roles - Array opcional de roles con sus tarifas para calcular laborCost
 */
export function generateDefaultTasks(
  poolPreset: PoolPreset,
  volume: number,
  perimeter: number,
  roles: RoleRate[] = [],
  context: {
    distanceToEquipment?: number;
    distanceToPanel?: number;
    hydraulicItemsCount?: number;
    electricalItemsCount?: number;
    equipmentCount?: number;
  } = {}
): Record<string, TaskDetail[]> {
  // Helper function to calculate labor cost
  const calculateLaborCost = (
    hours: number,
    suggestedRoleType?: string,
    quantity?: number,
    unit?: string,
    bocaType?: string
  ): number => {
    if (!suggestedRoleType || roles.length === 0) return 0;

    // Buscar el rol por nombre (case-insensitive)
    const role = findMatchingRole(roles, suggestedRoleType);

    if (!role) return 0;

    const billingType = role.billingType || 'HOUR';
    if (billingType === 'M2' || billingType === 'ML') {
      if (!quantity || !role.ratePerUnit) return 0;
      return quantity * role.ratePerUnit;
    }
    if (billingType === 'BOCA') {
      if (!quantity || !bocaType || !role.bocaRates) return 0;
      const rate = Array.isArray(role.bocaRates)
        ? role.bocaRates.find((item: any) => item.label === bocaType)?.price
        : 0;
      if (!rate) return 0;
      return quantity * rate;
    }

    // Preferir hourlyRate, si no existe usar dailyRate / 8
    const hourlyRate = role.hourlyRate || (role.dailyRate ? role.dailyRate / 8 : 0);
    return hours * hourlyRate;
  };

  const distanceToEquipment = Math.max(0, context.distanceToEquipment || 0);
  const distanceToPanel = Math.max(0, context.distanceToPanel || distanceToEquipment || 0);
  const hydraulicItemsCount = Math.max(0, context.hydraulicItemsCount || 0);
  const electricalItemsCount = Math.max(0, context.electricalItemsCount || 0);
  const equipmentCount = Math.max(2, context.equipmentCount || 2);
  const tasks: Record<string, TaskDetail[]> = {
    excavation: [],
    hydraulic: [],
    electrical: [],
    floor: [],
    tiles: [],
    finishes: [],
    other: [],
  };

  // ========================
  // EXCAVACIÓN
  // ========================
  const deepestDepth = Math.max(poolPreset.depth, poolPreset.depthEnd || poolPreset.depth);
  const excavationLength = poolPreset.length + ((poolPreset.lateralCushionSpace || 0.15) * 2);
  const excavationWidth = poolPreset.width + ((poolPreset.lateralCushionSpace || 0.15) * 2);
  const excavationDepth = deepestDepth + (poolPreset.floorCushionDepth || 0.1);
  const excavationVolume = excavationLength * excavationWidth * excavationDepth;

  tasks.excavation.push({
    id: randomUUID(),
    name: 'Replanteo y marcación del terreno',
    description: `Marcación de ${poolPreset.length}m x ${poolPreset.width}m con colchones laterales`,
    estimatedHours: 2,
    laborCost: calculateLaborCost(2, 'Capataz'),
    status: 'pending',
    category: 'excavation',
    suggestedRoleType: 'Capataz',
  });

  // Calcular horas de excavación: ~0.8 horas por m³
  const excavationHours = Math.ceil(excavationVolume * 0.8);
  tasks.excavation.push({
    id: randomUUID(),
    name: 'Excavación de terreno',
    description: `Excavación de aproximadamente ${excavationVolume.toFixed(2)}m³ (${excavationLength.toFixed(2)}m x ${excavationWidth.toFixed(2)}m x ${excavationDepth.toFixed(2)}m)`,
    estimatedHours: excavationHours,
    laborCost: calculateLaborCost(excavationHours, 'Excavador'),
    status: 'pending',
    category: 'excavation',
    suggestedRoleType: 'Excavador',
  });

  tasks.excavation.push({
    id: randomUUID(),
    name: 'Nivelación y compactación del fondo',
    description: 'Preparación del terreno para colocación de piscina',
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Excavador'),
    status: 'pending',
    category: 'excavation',
    suggestedRoleType: 'Excavador',
  });

  // ========================
  // INSTALACIÓN HIDRÁULICA
  // ========================
  const hydraulicBaseHours = 6 + Math.ceil(distanceToEquipment / 4);
  let hydraulicExtraHours = 0;

  if (poolPreset.hasSkimmer) {
    const skimmerHours = 2 * poolPreset.skimmerCount;
    hydraulicExtraHours += skimmerHours;
    tasks.hydraulic.push({
      id: randomUUID(),
      name: `Instalación de ${poolPreset.skimmerCount} skimmer(s)`,
      description: 'Colocación y conexión de skimmers',
      estimatedHours: skimmerHours,
      laborCost: calculateLaborCost(skimmerHours, 'Plomero'),
      status: 'pending',
      category: 'hydraulic',
      suggestedRoleType: 'Plomero',
    });
  }

  if (poolPreset.hasBottomDrain) {
    hydraulicExtraHours += 3;
    tasks.hydraulic.push({
      id: randomUUID(),
      name: 'Instalación de desagüe de fondo',
      description: 'Colocación y conexión del desagüe principal',
      estimatedHours: 3,
      laborCost: calculateLaborCost(3, 'Plomero'),
      status: 'pending',
      category: 'hydraulic',
      suggestedRoleType: 'Plomero',
    });
  }

  if (poolPreset.hasVacuumIntake) {
    const vacuumHours = 1.5 * poolPreset.vacuumIntakeCount;
    hydraulicExtraHours += vacuumHours;
    tasks.hydraulic.push({
      id: randomUUID(),
      name: `Instalación de ${poolPreset.vacuumIntakeCount} toma(s) de barrefondo`,
      description: 'Colocación de tomas para barrefondo',
      estimatedHours: vacuumHours,
      laborCost: calculateLaborCost(vacuumHours, 'Plomero'),
      status: 'pending',
      category: 'hydraulic',
      suggestedRoleType: 'Plomero',
    });
  }

  const returnsHours = 1.5 * poolPreset.returnsCount;
  tasks.hydraulic.push({
    id: randomUUID(),
    name: `Instalación de ${poolPreset.returnsCount} retorno(s)`,
    description: 'Instalación de retornos de agua',
    estimatedHours: returnsHours,
    laborCost: calculateLaborCost(returnsHours, 'Plomero'),
    status: 'pending',
    category: 'hydraulic',
    suggestedRoleType: 'Plomero',
  });

  if (poolPreset.hasHydroJets) {
    const hydroJetsHours = 2 * poolPreset.hydroJetsCount;
    hydraulicExtraHours += hydroJetsHours;
    tasks.hydraulic.push({
      id: randomUUID(),
      name: `Instalación de ${poolPreset.hydroJetsCount} hidrojet(s)`,
      description: 'Colocación y conexión de hidromasaje',
      estimatedHours: hydroJetsHours,
      laborCost: calculateLaborCost(hydroJetsHours, 'Plomero'),
      status: 'pending',
      category: 'hydraulic',
      suggestedRoleType: 'Plomero',
    });
  }

  tasks.hydraulic.push({
    id: randomUUID(),
    name: 'Tendido de cañerías principales',
    description: distanceToEquipment > 0
      ? `Instalación de cañerías de impulsión y succión hasta cabecera a ${distanceToEquipment}m`
      : 'Instalación de cañerías de impulsión y succión',
    estimatedHours: hydraulicBaseHours,
    laborCost: calculateLaborCost(hydraulicBaseHours, 'Plomero'),
    status: 'pending',
    category: 'hydraulic',
    suggestedRoleType: 'Plomero',
  });

  if (distanceToEquipment > 0) {
    const interconnectionHours = Math.max(2, Math.ceil(distanceToEquipment / 3));
    tasks.hydraulic.push({
      id: randomUUID(),
      name: 'Interconexión hidráulica pileta-cabecera',
      description: `Tendido, pegado y ordenado de líneas hidráulicas para ${distanceToEquipment}m de distancia al equipo`,
      estimatedHours: interconnectionHours,
      quantity: Number(distanceToEquipment.toFixed(2)),
      unit: 'ml',
      laborCost: calculateLaborCost(interconnectionHours, 'Plomero'),
      status: 'pending',
      category: 'hydraulic',
      suggestedRoleType: 'Plomero',
    });
  }

  const hydraulicHeadAssemblyHours = Math.max(3, Math.ceil(equipmentCount * 1.5) + Math.ceil(hydraulicItemsCount / 6));
  tasks.hydraulic.push({
    id: randomUUID(),
    name: 'Montaje de cabecera y equipos hidráulicos',
    description: `Armado de cabecera, soporte, conexiones y montaje de ${equipmentCount} equipo(s) vinculados al circuito`,
    estimatedHours: hydraulicHeadAssemblyHours,
    laborCost: calculateLaborCost(hydraulicHeadAssemblyHours, 'Instalador de Equipos'),
    status: 'pending',
    category: 'hydraulic',
    suggestedRoleType: 'Instalador de Equipos',
  });

  tasks.hydraulic.push({
    id: randomUUID(),
    name: 'Prueba hidráulica y detección de fugas',
    description: 'Prueba de presión de todo el sistema hidráulico',
    estimatedHours: 2,
    laborCost: calculateLaborCost(2, 'Plomero'),
    status: 'pending',
    category: 'hydraulic',
    suggestedRoleType: 'Plomero',
  });

  // ========================
  // INSTALACIÓN ELÉCTRICA
  // ========================
  if (poolPreset.hasLighting) {
    const lightingHours = (2.5 * poolPreset.lightingCount) + Math.ceil(distanceToPanel / 10);
    tasks.electrical.push({
      id: randomUUID(),
      name: `Instalación de ${poolPreset.lightingCount} luz(ces)`,
      description: `Instalación eléctrica de iluminación LED`,
      estimatedHours: lightingHours,
      quantity: poolPreset.lightingCount,
      unit: 'boca',
      bocaType: 'Luz',
      laborCost: calculateLaborCost(lightingHours, 'Electricista', poolPreset.lightingCount, 'boca', 'Luz'),
      status: 'pending',
      category: 'electrical',
      suggestedRoleType: 'Electricista',
    });
  }

  const electricalWiringHours = 4 + Math.ceil(distanceToPanel / 5) + Math.ceil(electricalItemsCount / 4);
  tasks.electrical.push({
    id: randomUUID(),
    name: 'Tendido de cableado eléctrico',
    description: distanceToPanel > 0
      ? `Instalación de cableado para bombas y equipamiento con recorrido estimado de ${distanceToPanel}m`
      : 'Instalación de cableado para bombas y equipamiento',
    estimatedHours: electricalWiringHours,
    laborCost: calculateLaborCost(electricalWiringHours, 'Electricista'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  const electricalEquipmentHours = Math.max(2, equipmentCount + Math.ceil(electricalItemsCount / 3));
  tasks.electrical.push({
    id: randomUUID(),
    name: 'Conexión eléctrica de equipos de cabecera',
    description: `Cableado, maniobra y verificación de ${equipmentCount} equipo(s) asociados a la piscina`,
    estimatedHours: electricalEquipmentHours,
    laborCost: calculateLaborCost(electricalEquipmentHours, 'Electricista'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  tasks.electrical.push({
    id: randomUUID(),
    name: 'Conexión de tablero eléctrico',
    description: 'Instalación y configuración del tablero de comando',
    estimatedHours: 4,
    quantity: 1,
    unit: 'boca',
    bocaType: 'Tablero',
    laborCost: calculateLaborCost(4, 'Electricista', 1, 'boca', 'Tablero'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  tasks.electrical.push({
    id: randomUUID(),
    name: 'Prueba eléctrica y puesta en marcha',
    description: 'Verificación de todo el sistema eléctrico',
    estimatedHours: 2,
    laborCost: calculateLaborCost(2, 'Electricista'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  // ========================
  // SOLADO Y CAMA INTERNA
  // ========================
  const floorArea = poolPreset.length * poolPreset.width;
  const fillVolume = (excavationLength * excavationWidth * excavationDepth) - (poolPreset.length * poolPreset.width * deepestDepth);
  const floorHours = Math.ceil(floorArea * 0.5); // 0.5 horas por m²
  const geomembraneHours = Math.ceil(floorHours * 0.3);
  const meshHours = Math.ceil(floorHours * 0.2);

  tasks.floor.push({
    id: randomUUID(),
    name: 'Colocación de geomembrana',
    description: `Instalación de geomembrana en ${floorArea.toFixed(2)}m²`,
    estimatedHours: geomembraneHours,
    quantity: Number(floorArea.toFixed(2)),
    unit: 'm2',
    laborCost: calculateLaborCost(geomembraneHours, 'Albañil', floorArea, 'm2'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  tasks.floor.push({
    id: randomUUID(),
    name: 'Colocación de malla electrosoldada',
    description: 'Instalación de malla de refuerzo',
    estimatedHours: meshHours,
    quantity: Number(floorArea.toFixed(2)),
    unit: 'm2',
    laborCost: calculateLaborCost(meshHours, 'Albañil', floorArea, 'm2'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  tasks.floor.push({
    id: randomUUID(),
    name: 'Preparación y colado de cama de arena-cemento',
    description: `Preparación de ${fillVolume.toFixed(2)}m³ de mezcla/relleno`,
    estimatedHours: floorHours,
    quantity: Number(floorArea.toFixed(2)),
    unit: 'm2',
    laborCost: calculateLaborCost(floorHours, 'Albañil', floorArea, 'm2'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  // ========================
  // COLOCACIÓN DE PISCINA Y LOSETAS
  // ========================
  tasks.tiles.push({
    id: randomUUID(),
    name: 'Descarga, izaje y manipuleo del casco',
    description: `Descarga de la piscina, movimiento en obra y presentación sobre el pozo para piscina ${poolPreset.shape}`,
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Capataz'),
    status: 'pending',
    category: 'tiles',
    suggestedRoleType: 'Capataz',
  });

  tasks.tiles.push({
    id: randomUUID(),
    name: 'Alineación y nivelación del casco en pozo',
    description: 'Posicionamiento final, aplome y nivelación de la piscina antes del relleno y conexiones',
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Capataz'),
    status: 'pending',
    category: 'tiles',
    suggestedRoleType: 'Capataz',
  });

  const tileHours = Math.ceil(perimeter * 0.8); // 0.8 horas por metro lineal
  tasks.tiles.push({
    id: randomUUID(),
    name: 'Colocación de losetas perimetrales',
    description: `Colocación de losetas en ${perimeter.toFixed(2)}m de perímetro`,
    estimatedHours: tileHours,
    quantity: Number(perimeter.toFixed(2)),
    unit: 'ml',
    laborCost: calculateLaborCost(tileHours, 'Colocador', perimeter, 'ml'),
    status: 'pending',
    category: 'tiles',
    suggestedRoleType: 'Colocador',
  });

  if (poolPreset.hasWetDeck) {
    tasks.tiles.push({
      id: randomUUID(),
      name: 'Construcción de playa húmeda',
      description: 'Preparación y terminación de área de playa húmeda',
      estimatedHours: 12,
      laborCost: calculateLaborCost(12, 'Albañil'),
      status: 'pending',
      category: 'tiles',
      suggestedRoleType: 'Albañil',
    });
  }

  // ========================
  // TERMINACIONES
  // ========================
  const groutingHours = Math.ceil(perimeter * 0.3);
  tasks.finishes.push({
    id: randomUUID(),
    name: 'Pastinado de juntas',
    description: 'Terminación de juntas entre losetas',
    estimatedHours: groutingHours,
    laborCost: calculateLaborCost(groutingHours, 'Colocador'),
    status: 'pending',
    category: 'finishes',
    suggestedRoleType: 'Colocador',
  });

  tasks.finishes.push({
    id: randomUUID(),
    name: 'Limpieza final de obra',
    description: 'Limpieza general del área de trabajo',
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Ayudante'),
    status: 'pending',
    category: 'finishes',
    suggestedRoleType: 'Ayudante',
  });

  tasks.finishes.push({
    id: randomUUID(),
    name: 'Llenado inicial y balanceo químico',
    description: 'Primer llenado y ajuste de pH y cloro',
    estimatedHours: 2,
    laborCost: calculateLaborCost(2, 'Especialista'),
    status: 'pending',
    category: 'finishes',
    suggestedRoleType: 'Especialista',
  });

  return tasks;
}

const hasSlopedDepth = (poolPreset: PoolPreset) => {
  if (poolPreset.depthEnd === null || poolPreset.depthEnd === undefined) return false;
  return Math.abs(Number(poolPreset.depthEnd) - Number(poolPreset.depth)) >= 0.05;
};

const resolveBaseInstallationPricing = (poolPreset: PoolPreset): BaseInstallationPricingRule => {
  const sloped = hasSlopedDepth(poolPreset);
  const over7m = Number(poolPreset.length) > 7;

  if (over7m) {
    return {
      totalLaborCost: sloped ? 6_000_000 : 5_500_000,
      lengthBand: 'over_7m',
      depthProfile: sloped ? 'sloped' : 'uniform',
    };
  }

  return {
    totalLaborCost: sloped ? 4_000_000 : 3_500_000,
    lengthBand: 'up_to_7m',
    depthProfile: sloped ? 'sloped' : 'uniform',
  };
};

const buildFixedLaborCostAllocator = (totalLaborCost: number) => {
  let assigned = 0;

  return (share: number, isLast = false) => {
    if (isLast) {
      return totalLaborCost - assigned;
    }

    const amount = Math.round(totalLaborCost * share);
    assigned += amount;
    return amount;
  };
};

const buildBaseTask = (
  category: string,
  name: string,
  description: string,
  estimatedHours: number,
  suggestedRoleType: string,
  laborCost: number,
  roles: RoleRate[],
  extra: Partial<TaskDetail> = {}
): TaskDetail => {
  const matchedRole = findMatchingRole(roles, suggestedRoleType);

  return {
    id: randomUUID(),
    name,
    description,
    estimatedHours,
    laborCost,
    status: 'pending',
    category,
    suggestedRoleType,
    assignedRole: matchedRole?.name,
    assignedRoleId: matchedRole?.id,
    ...extra,
  };
};

export function generateCatalogInstallationTasks(
  poolPreset: PoolPreset,
  perimeter: number,
  waterMirrorArea: number,
  roles: RoleRate[] = []
): Record<string, TaskDetail[]> {
  const pricing = resolveBaseInstallationPricing(poolPreset);
  const assignCost = buildFixedLaborCostAllocator(pricing.totalLaborCost);
  const sloped = pricing.depthProfile === 'sloped';
  const longPool = pricing.lengthBand === 'over_7m';
  const floorArea = Math.max(1, Number(waterMirrorArea.toFixed(2)));
  const firstTileLoop = Math.max(1, Number(perimeter.toFixed(2)));
  const poolPlacementHours = longPool ? 10 : 8;
  const slopeExtraHours = sloped ? 2 : 0;

  return {
    excavation: [
      buildBaseTask(
        'excavation',
        'Replanteo y marcación de obra',
        `Marcación completa para piscina de ${poolPreset.length}m x ${poolPreset.width}m y nivel de implantación.`,
        longPool ? 4 : 3,
        'Capataz',
        assignCost(0.04),
        roles,
      ),
      buildBaseTask(
        'excavation',
        'Excavación y perfilado del pozo',
        sloped
          ? `Excavación para fondo inclinado / de menos a más, contemplando perfilado técnico y profundidades finales.`
          : `Excavación para fondo uniforme con perfilado final listo para base de apoyo.`,
        longPool ? 18 + slopeExtraHours : 14 + slopeExtraHours,
        'Excavador',
        assignCost(0.09),
        roles,
      ),
      buildBaseTask(
        'excavation',
        'Nivelación y compactación final',
        'Ajuste de cotas, compactación y control previo a la cama de apoyo.',
        longPool ? 8 : 6,
        'Excavador',
        assignCost(0.05),
        roles,
      ),
    ],
    hydraulic: [
      buildBaseTask(
        'hydraulic',
        'Instalación hidráulica base en casco',
        'Colocación de 1 skimmer, 2 retornos orientables, 1 toma de fondo y 1 toma de aspiración.',
        longPool ? 18 + slopeExtraHours : 15 + slopeExtraHours,
        'Plomero',
        assignCost(0.13),
        roles,
        { quantity: 5, unit: 'boca' }
      ),
      buildBaseTask(
        'hydraulic',
        'Tendido y pegado de cañerías hidráulicas',
        'Armado de líneas de impulsión, succión, limpieza, pruebas y ordenado general de la instalación.',
        longPool ? 20 : 16,
        'Plomero',
        assignCost(0.11),
        roles,
      ),
      buildBaseTask(
        'hydraulic',
        'Montaje de cabecera hidráulica básica',
        'Conexión de bomba, filtro y colectores base para dejar el sistema operativo.',
        longPool ? 12 : 10,
        'Instalador de Equipos',
        assignCost(0.05),
        roles,
      ),
    ],
    electrical: [
      buildBaseTask(
        'electrical',
        'Instalación de 2 luces y canalizaciones',
        'Montaje de 2 luces, nichos, cañerías y cajas asociadas.',
        longPool ? 12 : 10,
        'Electricista',
        assignCost(0.07),
        roles,
        { quantity: 2, unit: 'boca', bocaType: 'Luz' }
      ),
      buildBaseTask(
        'electrical',
        'Cableado, comando y pruebas eléctricas',
        'Cableado completo, conexionado al tablero y verificación de funcionamiento.',
        longPool ? 10 : 8,
        'Electricista',
        assignCost(0.04),
        roles,
      ),
    ],
    floor: [
      buildBaseTask(
        'floor',
        'Colocación de geomembrana',
        `Instalación de geomembrana en ${floorArea.toFixed(2)}m².`,
        longPool ? 6 : 5,
        'Albañil',
        assignCost(0.05),
        roles,
        { quantity: floorArea, unit: 'm2' }
      ),
      buildBaseTask(
        'floor',
        'Cama de apoyo y preparación de base',
        sloped
          ? 'Formación de cama, correcciones por pendiente y preparación final para apoyar el casco.'
          : 'Formación de cama y afinado final de base para apoyar el casco.',
        longPool ? 14 + slopeExtraHours : 11 + slopeExtraHours,
        'Albañil',
        assignCost(0.08),
        roles,
      ),
      buildBaseTask(
        'floor',
        'Posicionamiento y nivelación del casco',
        'Presentación, apoyo, aplomado y control de nivel de la piscina en su posición definitiva.',
        poolPlacementHours,
        'Capataz',
        assignCost(0.06),
        roles,
      ),
    ],
    tiles: [
      buildBaseTask(
        'tiles',
        'Primera vuelta de loseta perimetral',
        `Colocación de la primera vuelta de loseta sobre ${firstTileLoop.toFixed(2)} ml de perímetro.`,
        longPool ? 14 : 12,
        'Colocador',
        assignCost(0.07),
        roles,
        { quantity: firstTileLoop, unit: 'ml' }
      ),
      buildBaseTask(
        'tiles',
        'Ajustes y cortes de remate de primera vuelta',
        'Resolución de cortes, encuentros, remates y alineación de la vuelta inicial.',
        longPool ? 8 : 6,
        'Colocador',
        assignCost(0.04),
        roles,
      ),
    ],
    finishes: [
      buildBaseTask(
        'finishes',
        'Rellenos, terminación y limpieza técnica',
        'Cierre de instalación base, repasos, orden y limpieza técnica final.',
        longPool ? 12 : 10,
        'Ayudante',
        assignCost(0.05),
        roles,
      ),
      buildBaseTask(
        'finishes',
        'Pruebas hidráulicas, eléctricas y entrega técnica',
        'Puesta en marcha inicial, pruebas funcionales y validación final de la instalación base.',
        longPool ? 8 : 6,
        'Especialista',
        assignCost(0.07, true),
        roles,
      ),
    ],
    other: [],
  };
}

/**
 * Genera una tarea automática al agregar un adicional
 */
export function generateTaskFromAdditional(
  additionalName: string,
  additionalType: string,
  quantity: number,
  suggestedCategory: string = 'other',
  roles: RoleRate[] = [],
  laborCostOverridePerUnit?: number
): TaskDetail {
  // Helper function to calculate labor cost
  const calculateLaborCost = (hours: number, suggestedRoleType?: string): number => {
    if (!suggestedRoleType || roles.length === 0) return 0;

    const role = findMatchingRole(roles, suggestedRoleType);

    if (!role) return 0;

    const hourlyRate = role.hourlyRate || (role.dailyRate ? role.dailyRate / 8 : 0);
    return hours * hourlyRate;
  };

  // Estimar horas según tipo
  let estimatedHours = 2; // Por defecto
  let suggestedRole = 'Ayudante';

  if (additionalType.includes('Equipment') || additionalType.includes('Bomba') || additionalType.includes('Filtro')) {
    estimatedHours = 4;
    suggestedRole = 'Plomero';
  } else if (additionalType.includes('Lighting') || additionalType.includes('Luz')) {
    estimatedHours = 3;
    suggestedRole = 'Electricista';
  } else if (additionalType.includes('Material')) {
    estimatedHours = quantity * 0.5;
    suggestedRole = 'Albañil';
  }

  const finalHours = Math.max(1, Math.ceil(estimatedHours));
  const overrideLaborCost = laborCostOverridePerUnit && laborCostOverridePerUnit > 0
    ? laborCostOverridePerUnit * quantity
    : undefined;

  return {
    id: randomUUID(),
    name: `Instalación/Colocación: ${additionalName}`,
    description: `Tarea generada automáticamente por adicional: ${additionalName} (x${quantity})`,
    estimatedHours: finalHours,
    laborCost: overrideLaborCost ?? calculateLaborCost(finalHours, suggestedRole),
    status: 'pending',
    category: suggestedCategory,
    suggestedRoleType: suggestedRole,
  };
}
