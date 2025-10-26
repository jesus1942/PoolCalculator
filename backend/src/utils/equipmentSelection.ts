import { EquipmentPreset } from '@prisma/client';

export interface EquipmentRecommendation {
  pump: EquipmentPreset;
  filter: EquipmentPreset;
  requiredAccessories: EquipmentPreset[];
  heatingOptions: EquipmentPreset[];
  optionalAccessories: EquipmentPreset[];
  electricalSpecs: ElectricalSpecification;
}

export interface ElectricalSpecification {
  totalWatts: number;
  totalAmps: number;
  recommendedBreaker: number; // Térmica en Amperes
  recommendedRCD: number; // Diferencial en Amperes
  cableSection: string; // Sección de cable recomendada
  consumptionBreakdown: ConsumptionItem[];
}

export interface ConsumptionItem {
  item: string;
  watts: number;
  quantity: number;
  totalWatts: number;
}

/**
 * Selecciona la bomba adecuada según el volumen de la piscina
 */
export function selectPump(poolVolume: number, pumps: EquipmentPreset[]): EquipmentPreset | null {
  // Filtrar solo bombas activas y de tipo REQUIRED
  const validPumps = pumps.filter(
    (p) => p.type === 'PUMP' && p.category === 'REQUIRED' && p.isActive
  );

  // Buscar la bomba que tenga el rango adecuado
  const suitablePump = validPumps.find(
    (p) =>
      p.minPoolVolume !== null &&
      p.maxPoolVolume !== null &&
      poolVolume >= p.minPoolVolume &&
      poolVolume <= p.maxPoolVolume
  );

  if (suitablePump) return suitablePump;

  // Si no hay una exacta, buscar la más cercana por encima
  const pumpAbove = validPumps
    .filter((p) => p.minPoolVolume !== null && poolVolume < p.minPoolVolume)
    .sort((a, b) => (a.minPoolVolume || 0) - (b.minPoolVolume || 0))[0];

  return pumpAbove || null;
}

/**
 * Selecciona el filtro adecuado según el volumen de la piscina
 */
export function selectFilter(poolVolume: number, filters: EquipmentPreset[]): EquipmentPreset | null {
  // Filtrar solo filtros activos y de tipo REQUIRED
  const validFilters = filters.filter(
    (f) => f.type === 'FILTER' && f.category === 'REQUIRED' && f.isActive
  );

  // Buscar el filtro que tenga el rango adecuado
  const suitableFilter = validFilters.find(
    (f) =>
      f.minPoolVolume !== null &&
      f.maxPoolVolume !== null &&
      poolVolume >= f.minPoolVolume &&
      poolVolume <= f.maxPoolVolume
  );

  if (suitableFilter) return suitableFilter;

  // Si no hay uno exacto, buscar el más cercano por encima
  const filterAbove = validFilters
    .filter((f) => f.minPoolVolume !== null && poolVolume < f.minPoolVolume)
    .sort((a, b) => (a.minPoolVolume || 0) - (b.minPoolVolume || 0))[0];

  return filterAbove || null;
}

/**
 * Selecciona accesorios obligatorios basados en la configuración de la piscina
 */
export function selectRequiredAccessories(
  poolConfig: {
    hasSkimmer: boolean;
    skimmerCount: number;
    hasLighting: boolean;
    lightingCount: number;
    returnsCount: number;
    hasVacuumIntake: boolean;
    vacuumIntakeCount: number;
  },
  accessories: EquipmentPreset[]
): EquipmentPreset[] {
  const required: EquipmentPreset[] = [];

  // Skimmers
  if (poolConfig.hasSkimmer && poolConfig.skimmerCount > 0) {
    const skimmer = accessories.find(
      (a) => a.type === 'SKIMMER' && a.model === 'Standard' && a.isActive
    );
    if (skimmer) {
      // Crear copia con cantidad
      required.push({ ...skimmer, capacity: poolConfig.skimmerCount });
    }
  }

  // Retornos
  if (poolConfig.returnsCount > 0) {
    const returnItem = accessories.find(
      (a) => a.type === 'RETURN' && a.model === 'Orientable' && a.isActive
    );
    if (returnItem) {
      required.push({ ...returnItem, capacity: poolConfig.returnsCount });
    }
  }

  // Luces + Transformador
  if (poolConfig.hasLighting && poolConfig.lightingCount > 0) {
    const light = accessories.find(
      (a) => a.type === 'LIGHTING' && a.voltage === 12 && a.isActive
    );
    if (light) {
      required.push({ ...light, capacity: poolConfig.lightingCount });
    }

    // Transformador necesario para las luces
    const transformer = accessories.find(
      (a) => a.type === 'TRANSFORMER' && a.isActive
    );
    if (transformer) {
      required.push({ ...transformer, capacity: 1 });
    }
  }

  // Toma de barrefondo
  if (poolConfig.hasVacuumIntake && poolConfig.vacuumIntakeCount > 0) {
    const vacuumIntake = accessories.find(
      (a) => a.type === 'VACUUM_INTAKE' && a.isActive
    );
    if (vacuumIntake) {
      required.push({ ...vacuumIntake, capacity: poolConfig.vacuumIntakeCount });
    }
  }

  return required;
}

/**
 * Obtiene opciones de climatización según el volumen
 */
export function getHeatingOptions(poolVolume: number, heaters: EquipmentPreset[]): EquipmentPreset[] {
  const validHeaters = heaters.filter(
    (h) => (h.type === 'HEATER' || h.type === 'HEAT_PUMP') && h.category === 'HEATING' && h.isActive
  );

  return validHeaters.filter(
    (h) =>
      h.minPoolVolume !== null &&
      h.maxPoolVolume !== null &&
      poolVolume >= h.minPoolVolume &&
      poolVolume <= h.maxPoolVolume
  );
}

/**
 * Calcula especificaciones eléctricas basadas en equipos seleccionados
 */
export function calculateElectricalSpecs(
  equipment: {
    pump: EquipmentPreset;
    filter?: EquipmentPreset;
    accessories: EquipmentPreset[];
    heating?: EquipmentPreset;
  },
  distanceToPanel: number = 0
): ElectricalSpecification {
  const breakdown: ConsumptionItem[] = [];
  let totalWatts = 0;

  // Bomba
  if (equipment.pump.consumption) {
    breakdown.push({
      item: equipment.pump.name,
      watts: equipment.pump.consumption,
      quantity: 1,
      totalWatts: equipment.pump.consumption,
    });
    totalWatts += equipment.pump.consumption;
  }

  // Accesorios
  equipment.accessories.forEach((acc) => {
    if (acc.consumption) {
      const quantity = acc.capacity || 1;
      const itemWatts = acc.consumption * quantity;
      breakdown.push({
        item: acc.name,
        watts: acc.consumption,
        quantity,
        totalWatts: itemWatts,
      });
      totalWatts += itemWatts;
    }
  });

  // Calefacción (si se selecciona)
  if (equipment.heating && equipment.heating.consumption) {
    breakdown.push({
      item: equipment.heating.name,
      watts: equipment.heating.consumption,
      quantity: 1,
      totalWatts: equipment.heating.consumption,
    });
    totalWatts += equipment.heating.consumption;
  }

  // Cálculo eléctrico
  const totalAmps = totalWatts / 220;
  const recommendedBreaker = Math.ceil(totalAmps * 1.25); // Factor de seguridad 25%

  // Diferencial: redondear a valores estándar (16A, 25A, 40A, 63A)
  let recommendedRCD = 16;
  if (recommendedBreaker > 16) recommendedRCD = 25;
  if (recommendedBreaker > 25) recommendedRCD = 40;
  if (recommendedBreaker > 40) recommendedRCD = 63;

  // Sección de cable según distancia y amperaje
  let cableSection = '2.5mm²';
  if (distanceToPanel <= 15) {
    if (totalAmps <= 20) cableSection = '2.5mm²';
    else if (totalAmps <= 30) cableSection = '4mm²';
    else cableSection = '6mm²';
  } else if (distanceToPanel <= 30) {
    if (totalAmps <= 20) cableSection = '4mm²';
    else if (totalAmps <= 30) cableSection = '6mm²';
    else cableSection = '10mm²';
  } else {
    if (totalAmps <= 20) cableSection = '6mm²';
    else if (totalAmps <= 30) cableSection = '10mm²';
    else cableSection = '16mm²';
  }

  return {
    totalWatts,
    totalAmps,
    recommendedBreaker,
    recommendedRCD,
    cableSection,
    consumptionBreakdown: breakdown,
  };
}

/**
 * Genera recomendación completa de equipos para una piscina
 */
export function generateEquipmentRecommendation(
  poolVolume: number,
  poolConfig: {
    hasSkimmer: boolean;
    skimmerCount: number;
    hasLighting: boolean;
    lightingCount: number;
    returnsCount: number;
    hasVacuumIntake: boolean;
    vacuumIntakeCount: number;
  },
  allEquipment: EquipmentPreset[],
  distanceToPanel: number = 0
): EquipmentRecommendation | null {
  // Seleccionar bomba y filtro obligatorios
  const pump = selectPump(poolVolume, allEquipment);
  const filter = selectFilter(poolVolume, allEquipment);

  if (!pump || !filter) {
    return null; // No se puede generar recomendación sin bomba y filtro
  }

  // Accesorios obligatorios
  const requiredAccessories = selectRequiredAccessories(poolConfig, allEquipment);

  // Opciones de climatización
  const heatingOptions = getHeatingOptions(poolVolume, allEquipment);

  // Accesorios opcionales (todos los que no son REQUIRED ni HEATING)
  const optionalAccessories = allEquipment.filter(
    (e) =>
      e.category === 'OPTIONAL' &&
      e.isActive &&
      !['PUMP', 'FILTER'].includes(e.type)
    );

  // Calcular especificaciones eléctricas (sin climatización por defecto)
  const electricalSpecs = calculateElectricalSpecs(
    {
      pump,
      filter,
      accessories: requiredAccessories,
    },
    distanceToPanel
  );

  return {
    pump,
    filter,
    requiredAccessories,
    heatingOptions,
    optionalAccessories,
    electricalSpecs,
  };
}
