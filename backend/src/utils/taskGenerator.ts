import { v4 as uuidv4 } from 'uuid';

interface PoolPreset {
  shape: string;
  length: number;
  width: number;
  depth: number;
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
}

/**
 * Genera tareas automáticas según las características de la piscina
 * @param roles - Array opcional de roles con sus tarifas para calcular laborCost
 */
export function generateDefaultTasks(
  poolPreset: PoolPreset,
  volume: number,
  perimeter: number,
  roles: RoleRate[] = []
): Record<string, TaskDetail[]> {
  // Helper function to calculate labor cost
  const calculateLaborCost = (hours: number, suggestedRoleType?: string): number => {
    if (!suggestedRoleType || roles.length === 0) return 0;

    // Buscar el rol por nombre (case-insensitive)
    const role = roles.find(r =>
      r.name.toLowerCase().includes(suggestedRoleType.toLowerCase()) ||
      suggestedRoleType.toLowerCase().includes(r.name.toLowerCase())
    );

    if (!role) return 0;

    // Preferir hourlyRate, si no existe usar dailyRate / 8
    const hourlyRate = role.hourlyRate || (role.dailyRate ? role.dailyRate / 8 : 0);
    return hours * hourlyRate;
  };
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
  const excavationVolume = volume * 1.5; // Volumen con colchón

  tasks.excavation.push({
    id: uuidv4(),
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
    id: uuidv4(),
    name: 'Excavación de terreno',
    description: `Excavación de aproximadamente ${excavationVolume.toFixed(2)}m³ (incluye colchones)`,
    estimatedHours: excavationHours,
    laborCost: calculateLaborCost(excavationHours, 'Excavador'),
    status: 'pending',
    category: 'excavation',
    suggestedRoleType: 'Excavador',
  });

  tasks.excavation.push({
    id: uuidv4(),
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
  const hydraulicBaseHours = 8;
  let hydraulicExtraHours = 0;

  if (poolPreset.hasSkimmer) {
    const skimmerHours = 2 * poolPreset.skimmerCount;
    hydraulicExtraHours += skimmerHours;
    tasks.hydraulic.push({
      id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
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
    id: uuidv4(),
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
      id: uuidv4(),
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
    id: uuidv4(),
    name: 'Tendido de cañerías principales',
    description: 'Instalación de cañerías de impulsión y succión',
    estimatedHours: hydraulicBaseHours,
    laborCost: calculateLaborCost(hydraulicBaseHours, 'Plomero'),
    status: 'pending',
    category: 'hydraulic',
    suggestedRoleType: 'Plomero',
  });

  tasks.hydraulic.push({
    id: uuidv4(),
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
    const lightingHours = 3 * poolPreset.lightingCount;
    tasks.electrical.push({
      id: uuidv4(),
      name: `Instalación de ${poolPreset.lightingCount} luz(ces)`,
      description: `Instalación eléctrica de iluminación LED`,
      estimatedHours: lightingHours,
      laborCost: calculateLaborCost(lightingHours, 'Electricista'),
      status: 'pending',
      category: 'electrical',
      suggestedRoleType: 'Electricista',
    });
  }

  tasks.electrical.push({
    id: uuidv4(),
    name: 'Tendido de cableado eléctrico',
    description: 'Instalación de cableado para bombas y equipamiento',
    estimatedHours: 6,
    laborCost: calculateLaborCost(6, 'Electricista'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  tasks.electrical.push({
    id: uuidv4(),
    name: 'Conexión de tablero eléctrico',
    description: 'Instalación y configuración del tablero de comando',
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Electricista'),
    status: 'pending',
    category: 'electrical',
    suggestedRoleType: 'Electricista',
  });

  tasks.electrical.push({
    id: uuidv4(),
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
  const floorHours = Math.ceil(floorArea * 0.5); // 0.5 horas por m²
  const geomembraneHours = Math.ceil(floorHours * 0.3);
  const meshHours = Math.ceil(floorHours * 0.2);

  tasks.floor.push({
    id: uuidv4(),
    name: 'Colocación de geomembrana',
    description: `Instalación de geomembrana en ${floorArea.toFixed(2)}m²`,
    estimatedHours: geomembraneHours,
    laborCost: calculateLaborCost(geomembraneHours, 'Albañil'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  tasks.floor.push({
    id: uuidv4(),
    name: 'Colocación de malla electrosoldada',
    description: 'Instalación de malla de refuerzo',
    estimatedHours: meshHours,
    laborCost: calculateLaborCost(meshHours, 'Albañil'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  tasks.floor.push({
    id: uuidv4(),
    name: 'Preparación y colado de cama de arena-cemento',
    description: `Preparación de ${(floorArea * 0.1).toFixed(2)}m³ de mezcla y colado`,
    estimatedHours: floorHours,
    laborCost: calculateLaborCost(floorHours, 'Albañil'),
    status: 'pending',
    category: 'floor',
    suggestedRoleType: 'Albañil',
  });

  // ========================
  // COLOCACIÓN DE PISCINA Y LOSETAS
  // ========================
  tasks.tiles.push({
    id: uuidv4(),
    name: 'Colocación de piscina de fibra',
    description: `Posicionamiento y nivelación de piscina ${poolPreset.shape}`,
    estimatedHours: 8,
    laborCost: calculateLaborCost(8, 'Capataz'),
    status: 'pending',
    category: 'tiles',
    suggestedRoleType: 'Capataz',
  });

  const tileHours = Math.ceil(perimeter * 0.8); // 0.8 horas por metro lineal
  tasks.tiles.push({
    id: uuidv4(),
    name: 'Colocación de losetas perimetrales',
    description: `Colocación de losetas en ${perimeter.toFixed(2)}m de perímetro`,
    estimatedHours: tileHours,
    laborCost: calculateLaborCost(tileHours, 'Colocador'),
    status: 'pending',
    category: 'tiles',
    suggestedRoleType: 'Colocador',
  });

  if (poolPreset.hasWetDeck) {
    tasks.tiles.push({
      id: uuidv4(),
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
    id: uuidv4(),
    name: 'Pastinado de juntas',
    description: 'Terminación de juntas entre losetas',
    estimatedHours: groutingHours,
    laborCost: calculateLaborCost(groutingHours, 'Colocador'),
    status: 'pending',
    category: 'finishes',
    suggestedRoleType: 'Colocador',
  });

  tasks.finishes.push({
    id: uuidv4(),
    name: 'Limpieza final de obra',
    description: 'Limpieza general del área de trabajo',
    estimatedHours: 4,
    laborCost: calculateLaborCost(4, 'Ayudante'),
    status: 'pending',
    category: 'finishes',
    suggestedRoleType: 'Ayudante',
  });

  tasks.finishes.push({
    id: uuidv4(),
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

/**
 * Genera una tarea automática al agregar un adicional
 */
export function generateTaskFromAdditional(
  additionalName: string,
  additionalType: string,
  quantity: number,
  suggestedCategory: string = 'other',
  roles: RoleRate[] = []
): TaskDetail {
  // Helper function to calculate labor cost
  const calculateLaborCost = (hours: number, suggestedRoleType?: string): number => {
    if (!suggestedRoleType || roles.length === 0) return 0;

    const role = roles.find(r =>
      r.name.toLowerCase().includes(suggestedRoleType.toLowerCase()) ||
      suggestedRoleType.toLowerCase().includes(r.name.toLowerCase())
    );

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

  return {
    id: uuidv4(),
    name: `Instalación/Colocación: ${additionalName}`,
    description: `Tarea generada automáticamente por adicional: ${additionalName} (x${quantity})`,
    estimatedHours: finalHours,
    laborCost: calculateLaborCost(finalHours, suggestedRole),
    status: 'pending',
    category: suggestedCategory,
    suggestedRoleType: suggestedRole,
  };
}
