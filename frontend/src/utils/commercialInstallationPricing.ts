import { Project } from '@/types';

export const BASE_INSTALLATION_SCOPE = [
  'Excavación del pozo',
  'Instalación del casco',
  '4 retornos orientables',
  '2 retornos en escalera',
  '2 retornos bajo skimmer para retorno de agua caliente',
];

export const BASE_INSTALLATION_EXCLUSIONS = [
  'No incluye transporte',
  'No incluye materiales',
  'No incluye grúa, de ser necesaria',
];

export const HEATING_INSTALLATION_EXTRAS = [
  'Acometida de gas en gabinete',
  'Luz',
  'Jornada de 2 personas',
  'Aproximadamente 2 jornadas y media de instalador',
];

export const HEATING_INSTALLATION_SURCHARGE = 600_000;

const normalizeCommercialText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getAdditionalName = (additional: any): string =>
  additional?.customName ||
  additional?.accessory?.name ||
  additional?.equipment?.name ||
  additional?.material?.name ||
  '';

const getPlumbingItemName = (item: any): string =>
  item?.itemName ||
  item?.name ||
  item?.label ||
  item?.description ||
  '';

const approximatelyEqual = (left?: number, right?: number, tolerance = 0.05) =>
  typeof left === 'number' &&
  typeof right === 'number' &&
  Math.abs(left - right) <= tolerance;

const isCirconModel = (project: Project | any) => {
  const preset = (project as any)?.poolPreset;
  if (!preset) return false;

  const normalizedName = normalizeCommercialText(preset.name || '');
  if (normalizedName.includes('circon')) return true;

  return (
    normalizeCommercialText(preset.shape || '') === 'rectangular' &&
    approximatelyEqual(preset.length, 5.5) &&
    approximatelyEqual(preset.width, 2.8)
  );
};

export const hasHeatingInstallation = (project: Project | any) => {
  const additionals = [((project as any)?.additionals || []), ((project as any)?.projectAdditionals || [])]
    .flat()
    .filter(Boolean);
  const plumbingItems = Array.isArray((project as any)?.plumbingConfig?.selectedItems)
    ? (project as any).plumbingConfig.selectedItems
    : [];

  const names = [
    ...additionals.map((additional) => getAdditionalName(additional)),
    ...plumbingItems.map((item) => getPlumbingItemName(item)),
  ].map((name) => normalizeCommercialText(String(name || '')));

  return names.some((name) =>
    name.includes('calef') ||
    name.includes('calent') ||
    name.includes('heater') ||
    name.includes('heat pump') ||
    name.includes('intercambiador') ||
    name.includes('bomba de calor') ||
    name.includes('caldera') ||
    name.includes('caldaia')
  );
};

export const getCommercialBaseInstallationLabor = (project: Project | any) => {
  if (isCirconModel(project)) {
    return {
      amount: 4_000_000,
      source: 'model_pricing' as const,
      rule: 'circon_base_installation',
    };
  }

  const tasks = ((project as any)?.tasks || {}) as Record<string, any[]>;
  const tasksLaborCost = Object.entries(tasks).reduce((sum, [category, categoryTasks]) => {
    if (category === 'additionals' || !Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.reduce((inner: number, task: any) => inner + (task?.laborCost || 0), 0);
  }, 0);

  return {
    amount: tasksLaborCost > 0 ? tasksLaborCost : Number((project as any)?.laborCost || 0),
    source: 'task_pricing' as const,
    rule: 'legacy_task_labor',
  };
};

export const getProjectPipeSystemLabel = (project: Project | any): string => {
  const config = (project as any)?.plumbingConfig;
  const pipeSystem = String((config && typeof config === 'object' ? config.pipeSystem : '') || 'PVC').toUpperCase();
  if (pipeSystem === 'TERMOFUSION') return 'Termofusión';
  if (pipeSystem === 'ELECTROFUSION') return 'Electrofusión';
  return 'PVC pegado';
};

/**
 * Líneas de alcance derivadas del sistema de unión de cañerías y las
 * condiciones de obra configuradas en plumbingConfig, para que la propuesta
 * económica refleje lo que realmente se cotiza (termofusión, izaje, etc.).
 */
export const getInstallationConditionHighlights = (project: Project | any): string[] => {
  const config = (project as any)?.plumbingConfig;
  const plumbingConfig = config && typeof config === 'object' ? config : {};
  const factors = plumbingConfig.installationFactors && typeof plumbingConfig.installationFactors === 'object'
    ? plumbingConfig.installationFactors
    : {};
  const lines: string[] = [];

  const pipeSystem = String(plumbingConfig.pipeSystem || 'PVC').toUpperCase();
  if (pipeSystem === 'TERMOFUSION') {
    lines.push('Cañería hidráulica por termofusión (PP, uniones soldadas con termofusora)');
  } else if (pipeSystem === 'ELECTROFUSION') {
    lines.push('Cañería hidráulica por electrofusión (accesorios electrosoldables)');
  }

  if (factors.craneLiftOverStructure) {
    lines.push('Coordinación y responsabilidad de la maniobra de izaje del casco con grúa sobre la vivienda');
  }
  if (factors.confinedEquipmentSpace) {
    lines.push('Montaje de equipos adaptado a espacio reducido predeterminado');
  }
  if (factors.hydrojetDedicatedPump) {
    lines.push('Instalación de bomba dedicada para el circuito de hidrojets');
  }

  return lines;
};

export const getCommercialInstallationProfile = (project: Project | any) => {
  const basePricing = getCommercialBaseInstallationLabor(project);
  const includesHeating = hasHeatingInstallation(project);
  const heatingLaborCost = includesHeating ? HEATING_INSTALLATION_SURCHARGE : 0;
  const conditionHighlights = getInstallationConditionHighlights(project);

  return {
    baseLaborCost: basePricing.amount,
    heatingLaborCost,
    totalLaborCost: basePricing.amount + heatingLaborCost,
    includesHeating,
    pricingSource: basePricing.source,
    pricingRule: basePricing.rule,
    baseScope: [...BASE_INSTALLATION_SCOPE, ...conditionHighlights],
    exclusions: BASE_INSTALLATION_EXCLUSIONS,
    heatingExtras: includesHeating ? HEATING_INSTALLATION_EXTRAS : [],
  };
};
