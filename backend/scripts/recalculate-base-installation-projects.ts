import 'dotenv/config';
import prisma from '../src/config/database';
import { calculatePerimeter, calculateWaterMirrorArea, calculateVolume } from '../src/utils/calculations';
import { calculateTileMaterials } from '../src/utils/tileCalculations';
import { calculateBedMaterials } from '../src/utils/bedCalculations';
import { generateCatalogInstallationTasks } from '../src/utils/taskGenerator';
import { findMatchingRole } from '../src/utils/laborReferences';

type RoleRate = {
  id: string;
  name: string;
  hourlyRate?: number;
  dailyRate?: number;
  billingType?: 'HOUR' | 'DAY' | 'M2' | 'ML' | 'BOCA';
  ratePerUnit?: number;
  bocaRates?: any;
};

const TARGET_PROJECT_IDS = [
  'a5905985-9105-4d9d-b314-b2e5c0a5b770',
  '38be45c3-caf9-4acf-b7ae-4aac8b13c3a9',
];
const AUTO_TASK_CATEGORIES = ['excavation', 'hydraulic', 'electrical', 'floor', 'tiles', 'finishes'];

const getAdditionalName = (additional: any) =>
  additional?.customName ||
  additional?.accessory?.name ||
  additional?.equipment?.name ||
  additional?.material?.name ||
  'Item adicional';

const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const detectAdditionalKind = (additional: any) => {
  const name = normalizeSearchValue(getAdditionalName(additional));
  const category = normalizeSearchValue(
    additional?.customCategory ||
    additional?.accessory?.type ||
    additional?.equipment?.type ||
    additional?.material?.type ||
    ''
  );

  if (name.includes('skimmer') || category.includes('skimmer')) return 'skimmer';
  if (name.includes('retorno') || name.includes('return') || category.includes('return')) return 'return';
  if (name.includes('hidrojet') || name.includes('hydrojet') || name.includes('hidromas') || category.includes('hydro')) return 'hydrojet';
  if (name.includes('dren') || name.includes('desague fondo') || category.includes('drain')) return 'bottom_drain';
  if (name.includes('aspira') || name.includes('vacuum') || name.includes('barrefondo')) return 'vacuum';
  if (category === 'lighting' || name.includes('luz')) return 'light';
  return 'other';
};

const getAdditionalDeltaQuantity = (additional: any) => {
  const newQuantity = Number(additional?.newQuantity || 0);
  const baseQuantity = Number(additional?.baseQuantity || 0);
  return Math.max(0, newQuantity - baseQuantity);
};

const buildEffectivePoolPreset = (poolPreset: any, projectAdditionals: any[] = []) => {
  const effectivePoolPreset = { ...poolPreset };

  projectAdditionals.forEach((additional) => {
    const delta = getAdditionalDeltaQuantity(additional);
    if (!delta) return;

    switch (detectAdditionalKind(additional)) {
      case 'skimmer':
        effectivePoolPreset.hasSkimmer = true;
        effectivePoolPreset.skimmerCount = Number(effectivePoolPreset.skimmerCount || 0) + delta;
        break;
      case 'return':
        effectivePoolPreset.returnsCount = Number(effectivePoolPreset.returnsCount || 0) + delta;
        break;
      case 'hydrojet':
        effectivePoolPreset.hasHydroJets = true;
        effectivePoolPreset.hydroJetsCount = Number(effectivePoolPreset.hydroJetsCount || 0) + delta;
        break;
      case 'bottom_drain':
        effectivePoolPreset.hasBottomDrain = true;
        break;
      case 'vacuum':
        effectivePoolPreset.hasVacuumIntake = true;
        effectivePoolPreset.vacuumIntakeCount = Number(effectivePoolPreset.vacuumIntakeCount || 0) + delta;
        break;
      case 'light':
        effectivePoolPreset.hasLighting = true;
        effectivePoolPreset.lightingCount = Number(effectivePoolPreset.lightingCount || 0) + delta;
        break;
      default:
        break;
    }
  });

  return effectivePoolPreset;
};

const mapRoleRates = (rolesRaw: Array<{
  id: string;
  name: string;
  hourlyRate: number | null;
  dailyRate: number | null;
  billingType: any;
  ratePerUnit: number | null;
  bocaRates: any;
}>): RoleRate[] => rolesRaw.map((role) => ({
  id: role.id,
  name: role.name,
  hourlyRate: role.hourlyRate ?? undefined,
  dailyRate: role.dailyRate ?? undefined,
  billingType: role.billingType,
  ratePerUnit: role.ratePerUnit ?? undefined,
  bocaRates: role.bocaRates ?? undefined,
}));

const assignRolesIfMissing = (tasks: Record<string, any[]>, roles: RoleRate[]) => {
  Object.values(tasks).forEach((categoryTasks) => {
    if (!Array.isArray(categoryTasks)) return;
    categoryTasks.forEach((task) => {
      if (task.assignedRoleId || !task.suggestedRoleType) return;
      const role = findMatchingRole(roles, task.suggestedRoleType);
      if (role) {
        task.assignedRoleId = role.id;
        task.assignedRole = role.name;
      }
    });
  });
  return tasks;
};

const calculateTasksLaborCost = (tasks: Record<string, any[]>) =>
  Object.values(tasks).reduce((sum, categoryTasks) => {
    if (!Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.reduce((inner, task) => inner + Number(task?.laborCost || 0), 0);
  }, 0);

const mergeManualCategories = (existingTasks: Record<string, any>, generatedTasks: Record<string, any[]>) => {
  const merged: Record<string, any[]> = { ...generatedTasks };

  for (const [category, categoryTasks] of Object.entries(existingTasks || {})) {
    if (AUTO_TASK_CATEGORIES.includes(category)) continue;
    merged[category] = Array.isArray(categoryTasks) ? categoryTasks : [];
  }

  if (!merged.additionals) merged.additionals = Array.isArray(existingTasks?.additionals) ? existingTasks.additionals : [];
  if (!merged.other) merged.other = Array.isArray(existingTasks?.other) ? existingTasks.other : [];

  return merged;
};

async function recalculateProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      poolPreset: true,
      user: {
        include: {
          calculationSettings: true,
        },
      },
      projectAdditionals: {
        include: {
          accessory: true,
          equipment: true,
          material: true,
        },
      },
    },
  });

  if (!project) {
    console.log(`No encontré proyecto con ID ${projectId}`);
    return;
  }

  const dimensions = {
    length: project.poolPreset.length,
    width: project.poolPreset.width,
    depth: project.poolPreset.depth,
    depthEnd: project.poolPreset.depthEnd || undefined,
    shape: project.poolPreset.shape,
  };

  const perimeter = calculatePerimeter(dimensions);
  const waterMirrorArea = calculateWaterMirrorArea(dimensions);
  const volume = calculateVolume(dimensions);
  const deepestDepth = Math.max(project.poolPreset.depth, project.poolPreset.depthEnd || project.poolPreset.depth);
  const excavationLength = project.poolPreset.length + (project.poolPreset.lateralCushionSpace * 2);
  const excavationWidth = project.poolPreset.width + (project.poolPreset.lateralCushionSpace * 2);
  const excavationDepth = deepestDepth + project.poolPreset.floorCushionDepth;

  const rolesRaw = await prisma.professionRole.findMany({
    where: { userId: project.userId },
    select: {
      id: true,
      name: true,
      hourlyRate: true,
      dailyRate: true,
      billingType: true,
      ratePerUnit: true,
      bocaRates: true,
    },
  });
  const roles = mapRoleRates(rolesRaw);

  const generatedTasks = generateCatalogInstallationTasks(
    buildEffectivePoolPreset(project.poolPreset, project.projectAdditionals),
    perimeter,
    waterMirrorArea,
    roles,
  );
  const tasks = assignRolesIfMissing(
    mergeManualCategories((project.tasks as any) || {}, generatedTasks),
    roles,
  );
  const laborCost = calculateTasksLaborCost(tasks);

  let materialCost = Number(project.materialCost || 0);
  let materials = (project.materials as any) || {};
  let sidewalkArea = Number(project.sidewalkArea || 0);
  let totalTileArea = Number(project.totalTileArea || 0);

  const userSettings = project.user.calculationSettings;
  if (userSettings) {
    const materialPrices = await prisma.constructionMaterialPreset.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        pricePerUnit: true,
        unit: true,
        bagWeight: true,
      },
    });

    const bedCalc = calculateBedMaterials(
      project.poolPreset,
      userSettings as any,
      materialPrices as any,
    );

    let tileCalc: any = null;
    const tileConfig = project.tileCalculation as any;
    if (tileConfig && Object.keys(tileConfig).length > 0) {
      const tilePresets = await prisma.tilePreset.findMany();
      tileCalc = calculateTileMaterials(
        project.poolPreset,
        tileConfig,
        tilePresets,
        userSettings as any,
        materialPrices as any,
      );
    }

    materials = {
      ...bedCalc.bedMaterials,
      ...(tileCalc?.materials || {}),
      ...(tileCalc?.tiles ? { tiles: tileCalc.tiles } : {}),
    };
    materialCost = bedCalc.totalBedMaterialCost + Number(tileCalc?.totalMaterialCost || 0);
    sidewalkArea = Number(tileCalc?.sidewalkArea || project.sidewalkArea || 0);
    totalTileArea = Number(tileCalc?.sidewalkArea || project.totalTileArea || 0);
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      perimeter: Number(perimeter.toFixed(2)),
      waterMirrorArea: Number(waterMirrorArea.toFixed(2)),
      volume: Number(volume.toFixed(2)),
      excavationLength: Number(excavationLength.toFixed(2)),
      excavationWidth: Number(excavationWidth.toFixed(2)),
      excavationDepth: Number(excavationDepth.toFixed(2)),
      tasks: tasks as any,
      laborCost,
      materialCost,
      totalCost: laborCost + materialCost,
      materials: materials as any,
      sidewalkArea,
      totalTileArea,
      exportSettings: {
        ...((project.exportSettings as any) || {}),
        taskAutomationLocked: true,
        taskTemplate: 'catalog_installation_base_v1',
      } as any,
    },
  });

  console.log(`Proyecto recalculado: ${project.name}`);
  console.log(`  Cliente: ${project.clientName}`);
  console.log(`  ID: ${project.id}`);
  console.log(`  M.O.: $${laborCost.toLocaleString('es-AR')}`);
  console.log(`  Materiales base: $${materialCost.toLocaleString('es-AR')}`);
  console.log(`  Total base persistido: $${(laborCost + materialCost).toLocaleString('es-AR')}`);
}

async function main() {
  try {
    for (const projectId of TARGET_PROJECT_IDS) {
      await recalculateProject(projectId);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
