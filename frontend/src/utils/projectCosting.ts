import { Project } from '@/types';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getProjectAdditionals = (project: Project | any): any[] =>
  ((project as any)?.additionals || (project as any)?.projectAdditionals || []) as any[];

export const getAdditionalName = (additional: any): string =>
  additional.customName ||
  additional.accessory?.name ||
  additional.equipment?.name ||
  additional.material?.name ||
  'Item adicional';

export const isBaseModelAdditional = (project: Project | any, additional: any): boolean => {
  const poolPreset = (project as any)?.poolPreset;
  const equipmentId = additional?.equipmentId || additional?.equipment?.id;

  if (!poolPreset || !equipmentId) return false;

  return equipmentId === poolPreset.defaultPumpId || equipmentId === poolPreset.defaultFilterId;
};

export const calculateAdditionalCosts = (additionals: any[]) =>
  additionals.reduce(
    (acc, additional) => {
      const quantity = additional.newQuantity || 0;
      let materialCost = 0;
      let laborCost = 0;

      if (typeof additional.customPricePerUnit === 'number' && additional.customPricePerUnit > 0) {
        materialCost = additional.customPricePerUnit * quantity;
      } else if (additional.accessory) {
        materialCost = (additional.accessory.pricePerUnit || 0) * quantity;
      } else if (additional.equipment) {
        materialCost = (additional.equipment.pricePerUnit || 0) * quantity;
      } else if (additional.material) {
        materialCost = (additional.material.pricePerUnit || 0) * quantity;
      }

      if (typeof additional.customLaborCost === 'number' && additional.customLaborCost > 0) {
        laborCost = additional.customLaborCost * quantity;
      }

      acc.materialCost += materialCost;
      acc.laborCost += laborCost;
      return acc;
    },
    { materialCost: 0, laborCost: 0 }
  );

export const getTasksLaborCost = (tasks: any, options?: { excludeAdditionals?: boolean }) => {
  const excludeAdditionals = options?.excludeAdditionals ?? false;
  return Object.entries(tasks || {}).reduce((sum: number, [category, categoryTasks]: [string, any]) => {
    if (excludeAdditionals && category === 'additionals') return sum;
    if (!Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.reduce((inner: number, task: any) => inner + (task.laborCost || 0), 0);
  }, 0);
};

export const calculateProjectFinancials = (project: Project | any, additionalsInput?: any[]) => {
  const additionals = (additionalsInput || getProjectAdditionals(project)).filter(
    (additional) => !isBaseModelAdditional(project, additional)
  );
  const additionalsCosts = calculateAdditionalCosts(additionals);
  const tasks = (project.tasks as any) || {};
  const tasksLaborCost = getTasksLaborCost(tasks, { excludeAdditionals: true });
  const additionalsTaskLaborCost = getTasksLaborCost(tasks) - tasksLaborCost;
  const baseLaborCost = tasksLaborCost > 0 ? tasksLaborCost : (project.laborCost || 0);
  const effectiveAdditionalsLaborCost = Math.max(additionalsCosts.laborCost, additionalsTaskLaborCost, 0);

  const plumbingConfig = (project.plumbingConfig as any) || {};
  const plumbingCosts = plumbingConfig?.selectedItems
    ? plumbingConfig.selectedItems.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0)
    : 0;

  const electricalConfig = (project.electricalConfig as any) || {};
  const electricalCosts = electricalConfig?.items
    ? electricalConfig.items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0)
    : 0;

  const baseMaterialCost = (project.materialCost || 0) + plumbingCosts + electricalCosts;
  const totalMaterialCost = baseMaterialCost + additionalsCosts.materialCost;
  const totalLaborCost = baseLaborCost + effectiveAdditionalsLaborCost;

  return {
    additionals,
    additionalsCosts: {
      ...additionalsCosts,
      laborCost: effectiveAdditionalsLaborCost,
    },
    plumbingCosts,
    electricalCosts,
    baseMaterialCost,
    baseLaborCost,
    additionalsTaskLaborCost,
    totalMaterialCost,
    totalLaborCost,
    grandTotal: totalMaterialCost + totalLaborCost,
  };
};

const detectHydraulicKind = (
  additional: any
): 'skimmer' | 'return' | 'hydrojet' | 'bottom_drain' | 'vacuum' | 'pump' | 'filter' | 'heater' | 'light' | 'panel' | 'premium_accessory' | 'other' => {
  const name = normalize(getAdditionalName(additional));
  const category = normalize(additional.customCategory || additional.accessory?.type || additional.equipment?.type || additional.material?.type || '');

  if (name.includes('skimmer') || category.includes('skimmer')) return 'skimmer';
  if (name.includes('retorno') || name.includes('return') || category.includes('return')) return 'return';
  if (name.includes('hidrojet') || name.includes('hydrojet') || name.includes('hidromas') || category.includes('hydro')) return 'hydrojet';
  if (name.includes('dren') || name.includes('desague fondo') || category.includes('drain')) return 'bottom_drain';
  if (name.includes('aspira') || name.includes('vacuum') || name.includes('limpiafondo')) return 'vacuum';
  if (name.includes('pasamanos') || name.includes('cascada')) return 'premium_accessory';
  if (category === 'pump' || name.includes('bomba')) return 'pump';
  if (category === 'filter' || name.includes('filtro')) return 'filter';
  if (category === 'heater' || category === 'heat_pump' || name.includes('calent') || name.includes('intercambiador')) return 'heater';
  if (category === 'lighting' || name.includes('luz')) return 'light';
  if (name.includes('tablero') || category.includes('transformer')) return 'panel';
  return 'other';
};

export const summarizeHydraulicSystem = (project: Project | any, additionalsInput?: any[]) => {
  const preset = project.poolPreset || {};
  const selectedItems = Array.isArray((project as any)?.plumbingConfig?.selectedItems)
    ? (project as any).plumbingConfig.selectedItems
    : [];
  const hydraulicPoints = Array.isArray((project as any)?.plumbingConfig?.hydraulicLayout?.points)
    ? (project as any).plumbingConfig.hydraulicLayout.points
    : [];
  const additionals = (additionalsInput || getProjectAdditionals(project)).filter(
    (additional) => !isBaseModelAdditional(project, additional)
  );

  const base = {
    skimmers: preset.hasSkimmer ? preset.skimmerCount || 0 : 0,
    returns: preset.returnsCount || 0,
    hydrojets: 0,
    bottomDrains: preset.hasBottomDrain ? 1 : 0,
    vacuumIntakes: preset.hasVacuumIntake ? preset.vacuumIntakeCount || 1 : 0,
    lights: preset.hasLighting ? preset.lightingCount || 0 : 0,
  };

  const added = {
    skimmers: 0,
    returns: 0,
    hydrojets: 0,
    bottomDrains: 0,
    vacuumIntakes: 0,
    pumps: 0,
    filters: 0,
    heaters: 0,
    lights: 0,
    panels: 0,
    premiumAccessories: 0,
    items: [] as Array<{ name: string; quantity: number; kind: string }>,
  };

  additionals.forEach((additional) => {
    const quantity = additional.newQuantity || 0;
    if (!quantity) return;
    const kind = detectHydraulicKind(additional);
    const name = getAdditionalName(additional);

    switch (kind) {
      case 'skimmer':
        added.skimmers += quantity;
        break;
      case 'return':
        added.returns += quantity;
        break;
      case 'hydrojet':
        added.hydrojets += quantity;
        break;
      case 'bottom_drain':
        added.bottomDrains += quantity;
        break;
      case 'vacuum':
        added.vacuumIntakes += quantity;
        break;
      case 'pump':
        added.pumps += quantity;
        break;
      case 'filter':
        added.filters += quantity;
        break;
      case 'heater':
        added.heaters += quantity;
        break;
      case 'light':
        added.lights += quantity;
        break;
      case 'panel':
        added.panels += quantity;
        break;
      case 'premium_accessory':
        added.premiumAccessories += quantity;
        break;
      default:
        break;
    }

    if (kind !== 'other') {
      added.items.push({ name, quantity, kind });
    }
  });

  const selectedCounts = selectedItems.reduce(
    (acc: { returns: number; skimmers: number; hydrojets: number; bottomDrains: number; vacuumIntakes: number }, item: any) => {
      const name = normalize(item?.itemName || item?.name || item?.label || item?.description || '');
      const quantity = Number(item?.quantity || 0);
      if (!quantity) return acc;

      if (name.includes('retorno')) {
        acc.returns = Math.max(acc.returns, quantity);
      } else if (name.includes('skimmer')) {
        acc.skimmers = Math.max(acc.skimmers, quantity);
      } else if (name.includes('hidromas') || name.includes('hidrojet')) {
        acc.hydrojets = Math.max(acc.hydrojets, quantity);
      } else if (name.includes('desague') || name.includes('dren')) {
        acc.bottomDrains = Math.max(acc.bottomDrains, quantity);
      } else if (name.includes('aspir') || name.includes('limpiafondo') || name.includes('barrefondo') || name.includes('toma de limpia')) {
        acc.vacuumIntakes = Math.max(acc.vacuumIntakes, quantity);
      }

      return acc;
    },
    { returns: 0, skimmers: 0, hydrojets: 0, bottomDrains: 0, vacuumIntakes: 0 }
  );

  const layoutCounts = hydraulicPoints.reduce(
    (acc: { returns: number; skimmers: number; hydrojets: number; bottomDrains: number; vacuumIntakes: number }, point: any) => {
      switch (point?.kind) {
        case 'return':
          acc.returns += 1;
          break;
        case 'skimmer':
          acc.skimmers += 1;
          break;
        case 'hydrojet':
          acc.hydrojets += 1;
          break;
        case 'bottom_drain':
          acc.bottomDrains += 1;
          break;
        case 'vacuum':
          acc.vacuumIntakes += 1;
          break;
        default:
          break;
      }

      return acc;
    },
    { returns: 0, skimmers: 0, hydrojets: 0, bottomDrains: 0, vacuumIntakes: 0 }
  );

  return {
    base,
    added,
    total: {
      skimmers: Math.max(base.skimmers + added.skimmers, selectedCounts.skimmers, layoutCounts.skimmers),
      returns: Math.max(base.returns + added.returns, selectedCounts.returns, layoutCounts.returns),
      hydrojets: Math.max(base.hydrojets + added.hydrojets, selectedCounts.hydrojets, layoutCounts.hydrojets),
      bottomDrains: Math.max(base.bottomDrains + added.bottomDrains, selectedCounts.bottomDrains, layoutCounts.bottomDrains),
      vacuumIntakes: Math.max(base.vacuumIntakes + added.vacuumIntakes, selectedCounts.vacuumIntakes, layoutCounts.vacuumIntakes),
      lights: base.lights + added.lights,
    },
  };
};
