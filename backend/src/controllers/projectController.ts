import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  calculatePerimeter,
  calculateWaterMirrorArea,
  calculateVolume,
} from '../utils/calculations';
import { calculateTileMaterials } from '../utils/tileCalculations';
import { calculateBedMaterials } from '../utils/bedCalculations';
import { generateCatalogInstallationTasks, generateDefaultTasks } from '../utils/taskGenerator';
import { installationFactorsEqual, resolveInstallationFactors } from '../utils/installationFactors';
import { calculateHydraulicSystem } from '../utils/hydraulicCalculations';
import { calculateElectricalSystem } from '../utils/electricalCalculations';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { buildProjectCommercialProfile } from '../utils/projectCommercialProfile';
import { listConversationSummaries, syncProjectConversation } from '../services/conversationService';
import {
  buildProjectAccessContext,
  buildProjectAccessProfileFromContext,
  getAccessibleProjectIdsForUser,
  resolveProjectAccessProfile,
  sanitizeProjectForAccess,
} from '../utils/projectAccess';
import { getReferenceRoleBlueprints, getRoleAliases } from '../utils/laborReferences';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const quoteShellArg = (value: string) => `'${value.replace(/'/g, `'\"'\"'`)}'`;

const runPythonCommand = async (args: string[]) => {
  const pythonArgs = args.map(quoteShellArg).join(' ');
  const pythonPackagesDir = '/app/backend/.python-packages';
  const command = [
    `if [ -d ${quoteShellArg(pythonPackagesDir)} ]; then export PYTHONPATH=${quoteShellArg(pythonPackagesDir)}:$PYTHONPATH; fi;`,
    'if [ -n "${PYTHON_BIN:-}" ] && [ -x "${PYTHON_BIN}" ]; then PY="${PYTHON_BIN}";',
    'elif [ -x /root/.nix-profile/bin/python3 ]; then PY=/root/.nix-profile/bin/python3;',
    'elif [ -x /nix/var/nix/profiles/default/bin/python3 ]; then PY=/nix/var/nix/profiles/default/bin/python3;',
    'elif command -v python3 >/dev/null 2>&1; then PY=$(command -v python3);',
    'elif command -v python >/dev/null 2>&1; then PY=$(command -v python);',
    'else echo "python-runtime-not-found" >&2; exit 127; fi;',
    `exec "$PY" ${pythonArgs}`,
  ].join(' ');

  return execFileAsync('/bin/bash', ['-lc', command]);
};

const AUTO_TASK_CATEGORIES = ['excavation', 'hydraulic', 'electrical', 'floor', 'tiles', 'finishes'];

const normalizeTaskName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getAdditionalName = (additional: any) =>
  additional?.customName ||
  additional?.accessory?.name ||
  additional?.equipment?.name ||
  additional?.material?.name ||
  'Item adicional';

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
}>) => rolesRaw.map((r) => ({
  id: r.id,
  name: r.name,
  hourlyRate: r.hourlyRate ?? undefined,
  dailyRate: r.dailyRate ?? undefined,
  billingType: r.billingType,
  ratePerUnit: r.ratePerUnit ?? undefined,
  bocaRates: r.bocaRates ?? undefined,
}));

const normalizeRoleValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const ensureReferenceRolesForUser = async (userId: string) => {
  const existingRoles = await prisma.professionRole.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  const missingBlueprints = getReferenceRoleBlueprints().filter((blueprint) => {
    const aliases = [blueprint.name, ...getRoleAliases(blueprint.name), ...blueprint.aliases].map(normalizeRoleValue);
    return !existingRoles.some((role) => aliases.includes(normalizeRoleValue(role.name)));
  });

  if (missingBlueprints.length > 0) {
    await prisma.professionRole.createMany({
      data: missingBlueprints.map(({ aliases: _aliases, ...blueprint }) => ({
        ...blueprint,
        userId,
        bocaRates: blueprint.bocaRates || [],
      })),
    });
  }

  return prisma.professionRole.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
};

const buildTaskGenerationContext = (projectLike: { plumbingConfig?: any; electricalConfig?: any; projectAdditionals?: any[] }) => {
  const plumbingConfig = (projectLike.plumbingConfig as any) || {};
  const electricalConfig = (projectLike.electricalConfig as any) || {};
  const projectAdditionals = projectLike.projectAdditionals || [];
  const additionalsEquipmentCount = projectAdditionals.reduce((sum: number, item: any) => {
    if (!item?.equipmentId && !item?.equipment) return sum;
    return sum + Math.max(1, Number(item?.newQuantity || 1));
  }, 0);

  return {
    distanceToEquipment: Number(plumbingConfig.distanceToEquipment || 0),
    distanceToPanel: Number(electricalConfig.distanceToPanel || plumbingConfig.distanceToEquipment || 0),
    hydraulicItemsCount: Array.isArray(plumbingConfig.selectedItems) ? plumbingConfig.selectedItems.length : 0,
    electricalItemsCount: Array.isArray(electricalConfig.items) ? electricalConfig.items.length : 0,
    equipmentCount: Math.max(2, additionalsEquipmentCount + (Array.isArray(electricalConfig.items) ? electricalConfig.items.length : 0)),
    factors: resolveInstallationFactors(plumbingConfig),
  };
};

const calculateTasksLaborCost = (tasks: Record<string, any[]>) => {
  let totalLaborCost = 0;

  Object.values(tasks).forEach((categoryTasks: any) => {
    if (!Array.isArray(categoryTasks)) return;
    categoryTasks.forEach((task: any) => {
      totalLaborCost += task.laborCost || 0;
    });
  });

  return totalLaborCost;
};

const getProjectTaskAutomationLocked = (projectLike: { exportSettings?: any }) =>
  Boolean((projectLike.exportSettings as any)?.taskAutomationLocked);

const sanitizeFileSegment = (value: string, fallback = 'archivo') => {
  const source = value || fallback;
  const parsed = path.parse(source);
  const safeExtension = (parsed.ext || path.parse(fallback).ext || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]/g, '')
    .slice(0, 10);
  const maxBaseLength = Math.max(1, 120 - safeExtension.length);
  const safeBaseName = (parsed.name || path.parse(fallback).name || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, maxBaseLength);

  return `${safeBaseName || 'archivo'}${safeExtension}`;
};

const buildProjectCode = (projectId: string) =>
  `PC-${projectId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const ensureProjectCode = async <T extends { id: string; projectCode?: string | null }>(project: T): Promise<T & { projectCode: string }> => {
  const projectCode =
    typeof (project as any).projectCode === 'string' && (project as any).projectCode.trim()
      ? (project as any).projectCode.trim()
      : buildProjectCode(project.id);

  if ((project as any).projectCode === projectCode) {
    return project as T & { projectCode: string };
  }

  await prisma.$executeRaw`
    UPDATE "Project"
    SET "projectCode" = ${projectCode}
    WHERE "id" = ${project.id}
      AND ("projectCode" IS NULL OR "projectCode" = '')
  `;

  return {
    ...project,
    projectCode,
  };
};

const getProjectPackageFolderName = (project: any) =>
  sanitizeFileSegment(project.name || 'Proyecto', `proyecto-${project.id}`);

const getProjectPackageBaseDir = () =>
  path.join(process.cwd(), 'uploads', 'project-packages');

const getProjectPackageDir = (project: any) =>
  path.join(getProjectPackageBaseDir(), project.id, getProjectPackageFolderName(project));

const getAssignedProjectIdsForUser = async (userId: string, orgId?: string | null) => {
  const assignedEvents = await prisma.agendaEvent.findMany({
    where: {
      projectId: { not: null },
      ...(orgId ? { organizationId: orgId } : {}),
      OR: [
        { assignees: { some: { userId } } },
        { crew: { members: { some: { userId } } } },
      ],
    },
    select: { projectId: true },
  });

  return Array.from(new Set(
    assignedEvents
      .map((event) => event.projectId)
      .filter((projectId): projectId is string => Boolean(projectId))
  ));
};

const buildProjectExportData = async (project: any, sections?: any) => {
  const plumbingConfig = (project.plumbingConfig as any) || {};
  const selectedPlumbingItems = plumbingConfig.selectedItems || [];
  const electricalConfig = (project.electricalConfig as any) || {};
  const materials = (project.materials as any) || {};
  const tasks = (project.tasks as any) || {};
  const excavationVolume = project.excavationLength * project.excavationWidth * project.excavationDepth;
  const calculationSettings = await prisma.calculationSettings.findUnique({
    where: { userId: project.userId },
  });
  const sidewalkBaseThicknessCm = calculationSettings?.sidewalkBaseThicknessCm || 10;
  const sidewalkConcreteVolume = ((project.sidewalkArea || 0) * sidewalkBaseThicknessCm) / 100;

  const plumbingItems = selectedPlumbingItems.map((item: any) => ({
    name: item.itemName || '',
    diameter: item.diameter || '-',
    quantity: item.quantity || 0,
    type: item.type || 'PVC',
    observations: item.observations || '-',
  }));

  const laborByRoles: any[] = [];
  if (tasks && Object.keys(tasks).length > 0) {
    const rolesSummary: Record<string, any> = {};

    Object.values(tasks).forEach((categoryTasks: any) => {
      if (!Array.isArray(categoryTasks)) return;
      categoryTasks.forEach((task: any) => {
        if (task.assignedRoleId || task.assignedRole) {
          const roleId = task.assignedRoleId || task.assignedRole;
          if (!rolesSummary[roleId]) {
            rolesSummary[roleId] = {
              role: task.assignedRole || 'Sin nombre',
              tasks: 0,
              hours: 0,
              cost: 0,
            };
          }
          rolesSummary[roleId].tasks += 1;
          rolesSummary[roleId].hours += task.estimatedHours || 0;
          rolesSummary[roleId].cost += task.laborCost || 0;
        }
      });
    });

    laborByRoles.push(...Object.values(rolesSummary));
  }

  const totalWatts = electricalConfig.totalWatts ?? electricalConfig.totalPower ?? 0;

  const projectData: any = {
    projectId: (project as any).projectCode || buildProjectCode(project.id),
    projectName: project.name,
    clientName: project.clientName,
    location: project.location || '-',
    address: project.location || '-',
    date: new Date().toLocaleDateString('es-AR'),
    responsible: 'Jesús Olguin',
    pool: {
      name: project.poolPreset?.name || 'Piscina',
      length: project.poolPreset?.length || 0,
      width: project.poolPreset?.width || 0,
      shallowDepth: project.poolPreset?.depth || 0,
      deepDepth: project.poolPreset?.depthEnd || project.poolPreset?.depth || 0,
      volume: project.volume,
      shape: project.poolPreset?.shape || 'RECTANGULAR',
      waterMirrorArea: project.waterMirrorArea,
      hasStairsOnly: project.poolPreset?.hasStairsOnly || false,
      stairsCount: project.poolPreset?.stairsCount || 0,
      canaletasCount: project.poolPreset?.canaletasCount || 0,
      returnsCount: project.poolPreset?.returnsCount || 0,
      skimmersCount: project.poolPreset?.skimmerCount || 0,
      lightingCount: project.poolPreset?.lightingCount || 0,
    },
    tileCalculation: project.tileCalculation || {},
    excavation: {
      length: project.excavationLength,
      width: project.excavationWidth,
      depth: project.excavationDepth,
      volume: excavationVolume,
    },
    supportBed: {
      materials: {
        geomembrane: materials.geomembrane?.quantity || 0,
        geomembraneUnit: materials.geomembrane?.unit || 'm²',
        mesh: materials.electroweldedMesh?.quantity || 0,
        meshUnit: materials.electroweldedMesh?.unit || 'm²',
        sand: materials.sandForBed?.quantity || 0,
        sandUnit: materials.sandForBed?.unit || 'm³',
        cement: materials.cementBags?.quantity || 0,
        cementUnit: materials.cementBags?.unit || 'bolsas',
        mixed: Number(materials.drainStone?.quantity || 0),
        mixedUnit: 'm³',
      }
    },
    sidewalk: {
      materials: {
        area: project.sidewalkArea || 0,
        concreteVolume: Number(sidewalkConcreteVolume.toFixed(2)),
        cement: materials.cement?.quantity || 0,
        cementUnit: materials.cement?.unit || 'bolsas',
        sand: materials.sand?.quantity || 0,
        sandUnit: materials.sand?.unit || 'm³',
        stone: materials.gravel?.quantity || 0,
        stoneUnit: materials.gravel?.unit || 'm³',
        mesh: materials.wireMesh?.quantity || 0,
        meshUnit: materials.wireMesh?.unit || 'm²',
        adhesive: materials.adhesive?.quantity || 0,
        adhesiveUnit: materials.adhesive?.unit || 'kg',
        whiteCement: materials.whiteCement?.quantity || 0,
        whiteCementUnit: materials.whiteCement?.unit || 'bolsas',
        marmolina: materials.marmolina?.quantity || 0,
        marmolinaUnit: materials.marmolina?.unit || 'bolsas',
      }
    },
    plumbing: {
      distanceToEquipment: plumbingConfig.distanceToEquipment || 0,
      returnsCount: project.poolPreset?.returnsCount || 0,
      skimmersCount: project.poolPreset?.skimmerCount || 0,
      hasBottomDrain: project.poolPreset?.hasBottomDrain || false,
      hasVacuumIntake: project.poolPreset?.hasVacuumIntake || false,
      items: plumbingItems,
    },
    electrical: {
      watts: totalWatts,
      amps: totalWatts ? parseFloat((totalWatts / 220).toFixed(1)) : 0,
      recommendedBreaker: electricalConfig.recommendedBreaker || 16,
      recommendedRCD: electricalConfig.recommendedRCD || 16,
      cableSection: electricalConfig.cableSection || '2.5mm²',
      distanceToPanel: electricalConfig.distanceToPanel || plumbingConfig.distanceToEquipment || 15,
      pump: {
        power: electricalConfig.pump?.power || '-',
        observations: electricalConfig.pump?.observations || '-',
        imageUrl: electricalConfig.pump?.imageUrl || null,
      },
      filter: {
        diameter: electricalConfig.filter?.diameter || '-',
        observations: electricalConfig.filter?.observations || '-',
        imageUrl: electricalConfig.filter?.imageUrl || null,
      },
      consumptionBreakdown: electricalConfig.consumptionBreakdown || [],
    },
    labor: {
      roles: laborByRoles,
    },
    sections: sections || {
      excavation: true,
      supportBed: true,
      sidewalk: true,
      plumbing: true,
      electrical: true,
      labor: true,
      sequence: true,
      standards: true,
      hydraulicAnalysis: true,
      electricalAnalysis: true,
    },
    hydraulicAnalysis: null,
    electricalAnalysis: null,
  };

  try {
    const availableEquipment = await prisma.equipmentPreset.findMany({
      where: { type: { in: ['PUMP', 'FILTER'] } }
    });

    const distanceToEquipment = plumbingConfig.distanceToEquipment || 8;
    const staticLift = 1.5;

    projectData.hydraulicAnalysis = calculateHydraulicSystem(
      project as any,
      distanceToEquipment,
      staticLift,
      availableEquipment
    );

    projectData.electricalAnalysis = calculateElectricalSystem(
      project as any,
      {
        voltage: 220,
        distanceToPanel: plumbingConfig.distanceToEquipment || 15,
        installationType: 'CONDUIT',
        ambientTemp: 25,
        maxVoltageDrop: 3,
        electricityCostPerKwh: 0.15,
      }
    );
  } catch (calcError) {
    console.error('[EXPORT] Error al ejecutar cálculos profesionales:', calcError);
  }

  return projectData;
};

const generateExcelExportFileFromProject = async (project: any, sections?: any, outputPath?: string) => {
  const projectData = await buildProjectExportData(project, sections);
  const scriptPath = path.join(__dirname, '../../public/export_to_excel.py');
  const templatePath = path.join(__dirname, '../../public/CALCULADORA MATERIALES AQUAM.xlsx');
  const safeProjectName = sanitizeFileSegment(project.name, 'proyecto');
  const exportFileName = `${safeProjectName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  const exportPath = outputPath || path.join(os.tmpdir(), `${Date.now()}_${exportFileName}`);

  await fs.mkdir(path.dirname(exportPath), { recursive: true });
  await fs.copyFile(templatePath, exportPath);
  await runPythonCommand([scriptPath, JSON.stringify(projectData), exportPath]);

  return { exportPath, exportFileName };
};

const zipDirectory = async (sourceDir: string, zipPath: string) => {
  const zipScript = [
    'import os, sys, zipfile',
    'source_dir = sys.argv[1]',
    'zip_path = sys.argv[2]',
    'with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:',
    '    for root, _, files in os.walk(source_dir):',
    '        for file_name in files:',
    '            full_path = os.path.join(root, file_name)',
    '            arcname = os.path.relpath(full_path, os.path.dirname(source_dir))',
    '            zf.write(full_path, arcname)',
  ].join('\n');

  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await runPythonCommand(['-c', zipScript, sourceDir, zipPath]);
};

const mergeGeneratedTasks = (
  existingTasks: Record<string, any> = {},
  generatedTasks: Record<string, any[]>
) => {
  const mergedTasks: Record<string, any[]> = {};

  AUTO_TASK_CATEGORIES.forEach((category) => {
    const previous = Array.isArray(existingTasks?.[category]) ? existingTasks[category] : [];
    const generated = Array.isArray(generatedTasks?.[category]) ? generatedTasks[category] : [];
    const previousMap = new Map(previous.map((task: any) => [`${category}:${normalizeTaskName(task.name || '')}`, task]));
    const generatedKeys = new Set<string>();

    mergedTasks[category] = generated.map((task: any) => {
      const key = `${category}:${normalizeTaskName(task.name || '')}`;
      generatedKeys.add(key);
      const existing = previousMap.get(key);

      return existing
        ? {
            ...task,
            status: existing.status || task.status,
            assignedRole: existing.assignedRole || task.assignedRole,
            assignedRoleId: existing.assignedRoleId || task.assignedRoleId,
          }
        : task;
    });

    previous.forEach((task: any) => {
      const key = `${category}:${normalizeTaskName(task.name || '')}`;
      if (!generatedKeys.has(key)) {
        mergedTasks[category].push(task);
      }
    });
  });

  Object.entries(existingTasks || {}).forEach(([category, categoryTasks]) => {
    if (AUTO_TASK_CATEGORIES.includes(category)) return;
    mergedTasks[category] = Array.isArray(categoryTasks) ? categoryTasks : [];
  });

  return mergedTasks;
};

/**
 * Elimina tareas auto-generadas (autoGenerated) que ya no existen en la nueva
 * generación, para que al desactivar un factor (ej: izaje con grúa) la tarea
 * asociada desaparezca en lugar de quedar duplicada tras el merge.
 */
const pruneStaleAutoTasks = (
  existingTasks: Record<string, any> = {},
  generatedTasks: Record<string, any[]>
) => {
  const prunedTasks: Record<string, any> = {};

  Object.entries(existingTasks || {}).forEach(([category, categoryTasks]) => {
    if (!AUTO_TASK_CATEGORIES.includes(category) || !Array.isArray(categoryTasks)) {
      prunedTasks[category] = categoryTasks;
      return;
    }

    const generatedNames = new Set(
      (generatedTasks?.[category] || []).map((task: any) => normalizeTaskName(task.name || ''))
    );

    prunedTasks[category] = categoryTasks.filter((task: any) =>
      !task?.autoGenerated || generatedNames.has(normalizeTaskName(task.name || ''))
    );
  });

  return prunedTasks;
};

const withCommercialProfile = <T extends { plumbingConfig?: any; projectAdditionals?: any[] }>(project: T) => ({
  ...project,
  commercialProfile: buildProjectCommercialProfile(project),
});

const withProjectActivity = <T extends { projectUpdates?: Array<{ title?: string | null; createdAt?: Date | string | null }> }>(project: T) => {
  const lastProjectUpdate = project.projectUpdates?.[0] || null;
  return {
    ...project,
    lastProjectUpdateAt: lastProjectUpdate?.createdAt || null,
    lastProjectUpdateTitle: lastProjectUpdate?.title || null,
  };
};

const appendProjectConversations = async (project: any) => {
  if (!project?.id) return project;
  const conversations = await listConversationSummaries({
    organizationId: project.organizationId || null,
    projectId: project.id,
  });
  return {
    ...project,
    conversations,
  };
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { name, clientName, clientEmail, clientPhone, location, poolPresetId, status } = req.body;
    const includeBaseEquipment = req.body.includeBaseEquipment !== 'false' && req.body.includeBaseEquipment !== false;
    const requestedPlumbingConfig = req.body.plumbingConfig && typeof req.body.plumbingConfig === 'object'
      ? req.body.plumbingConfig
      : {};
    const installationFactors = resolveInstallationFactors(requestedPlumbingConfig);

    const poolPreset = await prisma.poolPreset.findUnique({
      where: { id: poolPresetId },
      include: {
        defaultPump: true,
        defaultFilter: true,
      },
    });

    if (!poolPreset) {
      return res.status(404).json({ error: 'Preset de piscina no encontrado' });
    }

    const dimensions = {
      length: poolPreset.length,
      width: poolPreset.width,
      depth: poolPreset.depth,
      depthEnd: poolPreset.depthEnd || undefined,
      shape: poolPreset.shape,
    };

    const perimeter = calculatePerimeter(dimensions);
    const waterMirrorArea = calculateWaterMirrorArea(dimensions);
    const volume = calculateVolume(dimensions);
    const deepestDepth = Math.max(poolPreset.depth, poolPreset.depthEnd || poolPreset.depth);

    const excavationLength = poolPreset.length + (poolPreset.lateralCushionSpace * 2);
    const excavationWidth = poolPreset.width + (poolPreset.lateralCushionSpace * 2);
    const excavationDepth = deepestDepth + poolPreset.floorCushionDepth;

    // Cargar roles para calcular costos de mano de obra
    console.log('[PROJECT] Cargando roles de profesión...');
    const rolesRaw = await ensureReferenceRolesForUser(userId);
    const roles = mapRoleRates(rolesRaw);
    console.log(`[PROJECT] Roles cargados: ${roles.length}`);

    // Generar tareas automáticas basadas en las características de la piscina
    console.log('[PROJECT] Generando tareas automáticas para:', poolPreset.name);
    const defaultTasks = generateCatalogInstallationTasks(
      buildEffectivePoolPreset(poolPreset, []),
      perimeter,
      waterMirrorArea,
      roles,
      installationFactors,
    );
    console.log('[PROJECT] Tareas generadas:', Object.keys(defaultTasks).map(cat => `${cat}: ${defaultTasks[cat].length}`).join(', '));

    // Calcular costo total de mano de obra desde las tareas generadas
    const totalLaborCost = calculateTasksLaborCost(defaultTasks);
    console.log(`[PROJECT] Costo total de mano de obra: $${totalLaborCost.toLocaleString('es-AR')}`);

    const projectId = randomUUID();
    const project = await prisma.project.create({
      data: {
        id: projectId,
        projectCode: buildProjectCode(projectId),
        name,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        location: location || null,
        poolPresetId,
        excavationLength: parseFloat(excavationLength.toFixed(2)),
        excavationWidth: parseFloat(excavationWidth.toFixed(2)),
        excavationDepth: parseFloat(excavationDepth.toFixed(2)),
        perimeter: parseFloat(perimeter.toFixed(2)),
        waterMirrorArea: parseFloat(waterMirrorArea.toFixed(2)),
        volume: parseFloat(volume.toFixed(2)),
        tileCalculation: {},
        totalTileArea: 0,
        sidewalkArea: 0,
        plumbingConfig: requestedPlumbingConfig,
        materials: {},
        tasks: defaultTasks as any,
        exportSettings: {
          taskAutomationLocked: true,
          taskTemplate: 'catalog_installation_base_v1',
        } as any,
        laborCost: totalLaborCost,
        materialCost: 0,
        totalCost: totalLaborCost,
        status: status || 'DRAFT',
        userId,
        organizationId: orgId,
      },
    });

    await syncProjectConversation({
      projectId: project.id,
      organizationId: orgId,
      createdById: userId,
      title: name,
      clientName,
      location: location || null,
    });

    const defaultEquipmentAdditionals = includeBaseEquipment ? [
      poolPreset.defaultPump ? {
        projectId: project.id,
        equipmentId: poolPreset.defaultPump.id,
        baseQuantity: 1,
        newQuantity: 1,
        dependencies: [],
        notes: `Equipamiento base asociado al modelo ${poolPreset.name}`,
      } : null,
      poolPreset.defaultFilter ? {
        projectId: project.id,
        equipmentId: poolPreset.defaultFilter.id,
        baseQuantity: 1,
        newQuantity: 1,
        dependencies: [],
        notes: `Equipamiento base asociado al modelo ${poolPreset.name}`,
      } : null,
    ].filter(Boolean) as Array<{
      projectId: string;
      equipmentId: string;
      baseQuantity: number;
      newQuantity: number;
      dependencies: never[];
      notes: string;
    }> : [];

    if (defaultEquipmentAdditionals.length > 0) {
      await prisma.projectAdditional.createMany({
        data: defaultEquipmentAdditionals,
      });
    }

    const createdProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            accessory: true,
            equipment: true,
            material: true,
          },
        },
      },
    });

    const normalizedCreatedProject = createdProject
      ? await ensureProjectCode(createdProject)
      : await ensureProjectCode(project as any);

    res.status(201).json(withCommercialProfile(await appendProjectConversations(normalizedCreatedProject as any)));
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const accessibleProjectIds = await getAccessibleProjectIdsForUser({ userId, orgId, role });
    const accessContext = await buildProjectAccessContext(userId, orgId);

    const projects = await prisma.project.findMany({
      where: isAdmin
        ? (orgId ? { organizationId: orgId } : {})
        : { id: { in: accessibleProjectIds.length > 0 ? accessibleProjectIds : ['__none__'] } },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            accessory: {
              select: {
                id: true,
                name: true,
                pricePerUnit: true,
              },
            },
            equipment: {
              select: {
                id: true,
                name: true,
                pricePerUnit: true,
              },
            },
            material: {
              select: {
                id: true,
                name: true,
                pricePerUnit: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projectUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const normalizedProjects = await Promise.all(projects.map((project) => ensureProjectCode(project)));
    const serializedProjects = normalizedProjects
      .map((project) => {
        const access = buildProjectAccessProfileFromContext(project, { userId, orgId, role }, accessContext);
        if (!access.canAccess) return null;
        return sanitizeProjectForAccess(withCommercialProfile(withProjectActivity(project)), access);
      })
      .filter(Boolean);

    res.json(serializedProjects);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const baseInclude = {
      poolPreset: true,
      projectAdditionals: {
        include: {
          accessory: true,
          equipment: true,
          material: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      projectUpdates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
    } as const;

    let project = await prisma.project.findFirst({
      where: isAdmin ? { id, ...(orgId ? { organizationId: orgId } : {}) } : { id },
      include: baseInclude,
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    let access = await resolveProjectAccessProfile(project, { userId, orgId, role });
    if (!access.canAccess) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    project = await ensureProjectCode(project);

    // VALIDACIÓN: Verificar que las dimensiones de excavación sean correctas
    const preset = project.poolPreset;
    const expectedExcavLength = preset.length + (preset.lateralCushionSpace * 2);
    const expectedExcavWidth = preset.width + (preset.lateralCushionSpace * 2);
    const expectedExcavDepth = Math.max(preset.depth, preset.depthEnd || preset.depth) + preset.floorCushionDepth;

    const tolerance = 0.01; // Tolerancia de 1cm
    const lengthDiff = Math.abs(project.excavationLength - expectedExcavLength);
    const widthDiff = Math.abs(project.excavationWidth - expectedExcavWidth);
    const depthDiff = Math.abs(project.excavationDepth - expectedExcavDepth);

    if (lengthDiff > tolerance || widthDiff > tolerance || depthDiff > tolerance) {
      console.log(`[VALIDACIÓN] Dimensiones de excavación incorrectas en proyecto ${project.name}`);
      console.log(`  Guardado: ${project.excavationLength}m × ${project.excavationWidth}m × ${project.excavationDepth}m`);
      console.log(`  Esperado: ${expectedExcavLength.toFixed(2)}m × ${expectedExcavWidth.toFixed(2)}m × ${expectedExcavDepth.toFixed(2)}m`);
      console.log(`  Corrigiendo automáticamente...`);

      // Corregir automáticamente
      await prisma.project.update({
        where: { id },
        data: {
          excavationLength: parseFloat(expectedExcavLength.toFixed(2)),
          excavationWidth: parseFloat(expectedExcavWidth.toFixed(2)),
          excavationDepth: parseFloat(expectedExcavDepth.toFixed(2)),
        },
      });

      // Recargar proyecto con valores corregidos
      let correctedProject = await prisma.project.findFirst({
        where: isAdmin ? { id, ...(orgId ? { organizationId: orgId } : {}) } : { id },
        include: baseInclude,
      });

      console.log(`  ✓ Proyecto corregido`);
      if (correctedProject) {
        correctedProject = await ensureProjectCode(correctedProject);
        access = await resolveProjectAccessProfile(correctedProject, { userId, orgId, role });
      }
      res.json(correctedProject ? sanitizeProjectForAccess(withCommercialProfile(withProjectActivity(await appendProjectConversations(correctedProject as any))), access) : correctedProject);
      return;
    }

    const needsMaterialsRefresh =
      project.tileCalculation &&
      Object.keys(project.tileCalculation as any).length > 0;

    if (needsMaterialsRefresh) {
      try {
        let settings = await prisma.calculationSettings.findUnique({
          where: { userId: project.userId },
        });

        if (!settings) {
          settings = await prisma.calculationSettings.create({
            data: { userId: project.userId },
          });
        }

        const tilePresets = await prisma.tilePreset.findMany();
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

        const tileCalculations = calculateTileMaterials(
          project.poolPreset,
          project.tileCalculation as any,
          tilePresets,
          settings,
          materialPrices
        );

        const bedCalculations = calculateBedMaterials(
          project.poolPreset,
          settings,
          materialPrices
        );

        const refreshedMaterials: any = {
          ...tileCalculations.materials,
          ...bedCalculations.bedMaterials,
          tiles: tileCalculations.tiles as any,
          laborBreakdown: tileCalculations.laborBreakdown,
        };

        const refreshedMaterialCost = tileCalculations.totalMaterialCost + bedCalculations.totalBedMaterialCost;
        const refreshedTileLaborCost = tileCalculations.totalLaborCost || 0;

        await prisma.project.update({
          where: { id },
          data: {
            sidewalkArea: tileCalculations.sidewalkArea,
            totalTileArea: tileCalculations.sidewalkArea,
            materials: refreshedMaterials,
            materialCost: refreshedMaterialCost,
            totalCost: refreshedMaterialCost + refreshedTileLaborCost + (project.laborCost || 0),
          },
        });

        let refreshedProject = await prisma.project.findFirst({
          where: isAdmin ? { id, ...(orgId ? { organizationId: orgId } : {}) } : { id },
          include: baseInclude,
        });

        if (refreshedProject) {
          refreshedProject = await ensureProjectCode(refreshedProject);
          access = await resolveProjectAccessProfile(refreshedProject, { userId, orgId, role });
        }
        res.json(refreshedProject ? sanitizeProjectForAccess(withCommercialProfile(withProjectActivity(await appendProjectConversations(refreshedProject as any))), access) : refreshedProject);
        return;
      } catch (refreshError) {
        console.error('Error al refrescar materiales del proyecto:', refreshError);
      }
    }

    res.json(project ? sanitizeProjectForAccess(withCommercialProfile(withProjectActivity(await appendProjectConversations(project as any))), access) : project);
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Actualizando proyecto...', req.params.id);
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));

    const { id } = req.params;
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    const existingProject = await prisma.project.findFirst({
      where: isAdmin ? { id, ...(orgId ? { organizationId: orgId } : {}) } : { id },
      include: { poolPreset: true, projectAdditionals: true },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const access = await resolveProjectAccessProfile(existingProject, { userId, orgId, role });
    if (!access.canEdit) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este proyecto' });
    }

    const requestedExportSettings = req.body.exportSettings !== undefined
      ? {
          ...((existingProject.exportSettings as any) || {}),
          ...(req.body.exportSettings as any),
        }
      : undefined;

    let updateData: any = { ...req.body };
    delete updateData.includeBaseEquipment;
    if (updateData.poolPresetId === '' || updateData.poolPresetId === existingProject.poolPresetId) {
      delete updateData.poolPresetId;
    }
    if (updateData.clientEmail === '') {
      updateData.clientEmail = null;
    }
    if (updateData.clientPhone === '') {
      updateData.clientPhone = null;
    }
    if (updateData.location === '') {
      updateData.location = null;
    }
    if (updateData.status === '' || updateData.status == null) {
      delete updateData.status;
    }
    if (requestedExportSettings !== undefined) {
      updateData.exportSettings = requestedExportSettings;
    }
    let recalculatedTasks: Record<string, any[]> | null = null;
    const poolPresetChanged = Boolean(req.body.poolPresetId && req.body.poolPresetId !== existingProject.poolPresetId);
    let effectivePoolPreset = existingProject.poolPreset;

    if (poolPresetChanged) {
      const nextPoolPreset = await prisma.poolPreset.findUnique({
        where: { id: req.body.poolPresetId },
      });

      if (!nextPoolPreset) {
        return res.status(404).json({ error: 'Preset de piscina no encontrado' });
      }

      effectivePoolPreset = nextPoolPreset;

      const dimensions = {
        length: nextPoolPreset.length,
        width: nextPoolPreset.width,
        depth: nextPoolPreset.depth,
        depthEnd: nextPoolPreset.depthEnd || undefined,
        shape: nextPoolPreset.shape,
      };

      const deepestDepth = Math.max(nextPoolPreset.depth, nextPoolPreset.depthEnd || nextPoolPreset.depth);
      updateData.perimeter = parseFloat(calculatePerimeter(dimensions).toFixed(2));
      updateData.waterMirrorArea = parseFloat(calculateWaterMirrorArea(dimensions).toFixed(2));
      updateData.volume = parseFloat(calculateVolume(dimensions).toFixed(2));
      updateData.excavationLength = parseFloat((nextPoolPreset.length + (nextPoolPreset.lateralCushionSpace * 2)).toFixed(2));
      updateData.excavationWidth = parseFloat((nextPoolPreset.width + (nextPoolPreset.lateralCushionSpace * 2)).toFixed(2));
      updateData.excavationDepth = parseFloat((deepestDepth + nextPoolPreset.floorCushionDepth).toFixed(2));
    }

    const taskAutomationLocked = requestedExportSettings !== undefined
      ? Boolean(requestedExportSettings.taskAutomationLocked)
      : getProjectTaskAutomationLocked(existingProject);

    // Si se está actualizando la configuración de losetas, recalcular materiales
    if (req.body.tileCalculation) {
      console.log('Detectada configuración de losetas, calculando materiales...');

      try {
        let settings = await prisma.calculationSettings.findUnique({
          where: { userId: existingProject.userId },
        });

        console.log('Settings encontrados:', settings ? 'SI' : 'NO');

        if (!settings) {
          console.log('No hay settings, creando defaults...');
          settings = await prisma.calculationSettings.create({
            data: { userId: existingProject.userId },
          });
          console.log('Settings creados');
        }

        const tilePresets = await prisma.tilePreset.findMany();
        console.log(`Losetas encontradas: ${tilePresets.length}`);

        // Cargar precios de materiales de construcción
        console.log('Cargando precios de materiales de construcción...');
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
        console.log(`Precios cargados: ${materialPrices.length} materiales`);

        // Siempre calculamos si hay tileCalculation, independientemente de si los settings son nuevos
        if (settings) {
          console.log('Ejecutando cálculos de losetas...');
          const tileCalculations = calculateTileMaterials(
            existingProject.poolPreset,
            req.body.tileCalculation,
            tilePresets,
            settings,
            materialPrices
          );

          console.log('Cálculos de losetas completados');
          console.log(`Costo materiales losetas/vereda: $${tileCalculations.totalMaterialCost.toLocaleString('es-AR')}`);

          // Calcular materiales de cama interna
          console.log('Ejecutando cálculos de cama interna...');
          const bedCalculations = calculateBedMaterials(
            existingProject.poolPreset,
            settings,
            materialPrices
          );

          console.log('Cálculos de cama completados');
          console.log(`Costo materiales cama: $${bedCalculations.totalBedMaterialCost.toLocaleString('es-AR')}`);

          // Combinar ambos cálculos
          const allMaterials: any = {
            ...tileCalculations.materials,
            ...bedCalculations.bedMaterials,
            tiles: tileCalculations.tiles as any,
            laborBreakdown: tileCalculations.laborBreakdown,
          };

          const totalMaterialCost = tileCalculations.totalMaterialCost + bedCalculations.totalBedMaterialCost;
          const tileLaborCost = tileCalculations.totalLaborCost || 0;
          console.log(`TOTAL materiales base: $${totalMaterialCost.toLocaleString('es-AR')}`);
          console.log(`TOTAL MO losetas/vereda: $${tileLaborCost.toLocaleString('es-AR')}`);

          updateData.sidewalkArea = tileCalculations.sidewalkArea;
          updateData.materials = allMaterials;
          updateData.totalTileArea = tileCalculations.sidewalkArea;
          updateData.materialCost = totalMaterialCost;

          // totalCost = materiales + MO vereda/losetas + MO base (roles/tareas)
          updateData.totalCost = totalMaterialCost + tileLaborCost + (existingProject.laborCost || 0);
        }
      } catch (calcError) {
        console.error('Error en cálculos:', calcError);
      }
    }

    const shouldRegenerateAutomaticTasks = !taskAutomationLocked && !req.body.tasks && (
      req.body.poolPresetId !== undefined ||
      req.body.plumbingConfig !== undefined ||
      req.body.electricalConfig !== undefined
    );

    if (shouldRegenerateAutomaticTasks) {
      const poolPreset = effectivePoolPreset;

      if (poolPreset) {
        const dimensions = {
          length: poolPreset.length,
          width: poolPreset.width,
          depth: poolPreset.depth,
          depthEnd: poolPreset.depthEnd || undefined,
          shape: poolPreset.shape,
        };
        const perimeter = calculatePerimeter(dimensions);
        const volume = calculateVolume(dimensions);

        const rolesRaw = await ensureReferenceRolesForUser(existingProject.userId);
        const roles = mapRoleRates(rolesRaw);
        const generatedTasks = generateDefaultTasks(
          buildEffectivePoolPreset(poolPreset, existingProject.projectAdditionals),
          volume,
          perimeter,
          roles,
          buildTaskGenerationContext({
            plumbingConfig: req.body.plumbingConfig ?? existingProject.plumbingConfig,
            electricalConfig: req.body.electricalConfig ?? existingProject.electricalConfig,
            projectAdditionals: existingProject.projectAdditionals,
          })
        );

        recalculatedTasks = mergeGeneratedTasks((existingProject.tasks as any) || {}, generatedTasks);
        updateData.tasks = recalculatedTasks;
      }
    }

    // Proyectos de catálogo (tarifa base fija): si cambian el sistema de cañería
    // o los factores de obra en plumbingConfig, regenerar las tareas del catálogo
    // aunque la automatización esté bloqueada, manteniendo tareas manuales.
    const effectiveExportSettings = (requestedExportSettings ?? (existingProject.exportSettings as any)) || {};
    const isCatalogTemplate = effectiveExportSettings.taskTemplate === 'catalog_installation_base_v1';
    const nextInstallationFactors = req.body.plumbingConfig !== undefined
      ? resolveInstallationFactors(req.body.plumbingConfig)
      : null;
    const installationFactorsChanged = nextInstallationFactors !== null &&
      !installationFactorsEqual(nextInstallationFactors, resolveInstallationFactors(existingProject.plumbingConfig));

    if (!recalculatedTasks && !req.body.tasks && isCatalogTemplate && installationFactorsChanged && effectivePoolPreset) {
      const dimensions = {
        length: effectivePoolPreset.length,
        width: effectivePoolPreset.width,
        depth: effectivePoolPreset.depth,
        depthEnd: effectivePoolPreset.depthEnd || undefined,
        shape: effectivePoolPreset.shape,
      };
      const perimeter = calculatePerimeter(dimensions);
      const waterMirrorArea = calculateWaterMirrorArea(dimensions);

      const rolesRaw = await ensureReferenceRolesForUser(existingProject.userId);
      const roles = mapRoleRates(rolesRaw);
      const generatedTasks = generateCatalogInstallationTasks(
        buildEffectivePoolPreset(effectivePoolPreset, existingProject.projectAdditionals),
        perimeter,
        waterMirrorArea,
        roles,
        nextInstallationFactors,
      );

      recalculatedTasks = mergeGeneratedTasks(
        pruneStaleAutoTasks((existingProject.tasks as any) || {}, generatedTasks),
        generatedTasks
      );
      updateData.tasks = recalculatedTasks;
      console.log(`[PROJECT] Tareas de catálogo regeneradas por cambio de sistema de cañería/factores (${nextInstallationFactors.pipeSystem})`);
    }

    // Si se están actualizando las tareas, recalcular el costo de mano de obra
    if (req.body.tasks || recalculatedTasks) {
      console.log('Detectada actualización de tareas, recalculando costos de mano de obra...');

      const tasks = (recalculatedTasks || req.body.tasks) as Record<string, any[]>;
      const totalLaborCost = calculateTasksLaborCost(tasks);

      console.log(`Costo total de mano de obra recalculado: $${totalLaborCost.toLocaleString('es-AR')}`);

      // Actualizar laborCost en el proyecto
      updateData.laborCost = totalLaborCost;

      // Recalcular totalCost = materialCost + laborCost
      const finalMaterialCost = updateData.materialCost !== undefined
        ? updateData.materialCost
        : existingProject.materialCost;
      updateData.totalCost = finalMaterialCost + totalLaborCost;

      console.log(`Material Cost: $${finalMaterialCost.toLocaleString('es-AR')}`);
      console.log(`Labor Cost: $${totalLaborCost.toLocaleString('es-AR')}`);
      console.log(`Total Cost: $${updateData.totalCost.toLocaleString('es-AR')}`);
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            accessory: true,
            equipment: true,
            material: true,
          },
        },
      },
    });

    await syncProjectConversation({
      projectId: project.id,
      organizationId: project.organizationId || orgId,
      createdById: project.userId,
      title: project.name,
      clientName: project.clientName,
      location: project.location || null,
    });

    const normalizedProject = await ensureProjectCode(project);

    console.log('Proyecto actualizado exitosamente');
    res.json(sanitizeProjectForAccess(withCommercialProfile(await appendProjectConversations(normalizedProject as any)), access));
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const role = req.user?.role;

    const existingProject = await prisma.project.findFirst({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const access = await resolveProjectAccessProfile(existingProject, { userId, orgId, role });
    if (!access.canDelete) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este proyecto' });
    }

    await prisma.$transaction([
      prisma.projectAdditional.deleteMany({
        where: { projectId: id },
      }),
      prisma.project.delete({
        where: { id },
      }),
    ]);

    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
};

export const exportToExcel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sections } = req.body;
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    // Obtener el proyecto con todos sus datos
    const project = await prisma.project.findFirst({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            accessory: true,
            equipment: true,
            material: true,
          }
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (project.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para exportar este proyecto' });
    }

    const { exportPath, exportFileName } = await generateExcelExportFileFromProject(project, sections);

    // Enviar el archivo Excel como descarga
    res.download(exportPath, exportFileName, (err) => {
      fs.unlink(exportPath).catch((unlinkError) => {
        console.error('Error al limpiar archivo temporal de exportación:', unlinkError);
      });
      if (err) {
        console.error('Error al enviar archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar el archivo' });
        }
      }
    });
  } catch (error: any) {
    console.error('Error al exportar proyecto:', error);
    res.status(500).json({
      error: 'Error al exportar proyecto',
      details: error.message,
    });
  }
};

export const createProjectPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { documents = [], excelSections, metadata = {} } = req.body || {};
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    const project = await prisma.project.findFirst({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            accessory: true,
            equipment: true,
            material: true,
          }
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (project.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para exportar este proyecto' });
    }

    const packageDir = getProjectPackageDir(project);
    await fs.rm(packageDir, { recursive: true, force: true });
    await fs.mkdir(packageDir, { recursive: true });
    await fs.mkdir(path.join(packageDir, '06-imagenes'), { recursive: true });
    await fs.mkdir(path.join(packageDir, '07-notas'), { recursive: true });

    const writtenDocuments: Array<{ fileName: string; path: string }> = [];
    for (const doc of Array.isArray(documents) ? documents : []) {
      const fileName = sanitizeFileSegment(doc?.fileName || 'documento.html', 'documento.html');
      const content = typeof doc?.content === 'string' ? doc.content : '';
      if (!content) continue;
      const targetPath = path.join(packageDir, fileName);
      await fs.writeFile(targetPath, content, 'utf8');
      writtenDocuments.push({ fileName, path: targetPath });
    }

    const excelTargetPath = path.join(packageDir, '05-libro-proyecto.xlsx');
    await generateExcelExportFileFromProject(project, excelSections, excelTargetPath);

    const manifest = {
      generatedAt: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      folderName: path.basename(packageDir),
      documents: writtenDocuments.map((doc) => doc.fileName),
      excelFile: '05-libro-proyecto.xlsx',
      metadata,
    };

    await fs.writeFile(
      path.join(packageDir, '07-notas', 'metadata.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    res.json({
      success: true,
      folderName: path.basename(packageDir),
      relativePath: path.relative(process.cwd(), packageDir),
      documents: manifest.documents,
      excelFile: manifest.excelFile,
    });
  } catch (error) {
    console.error('Error al generar expediente del proyecto:', error);
    res.status(500).json({ error: 'Error al generar expediente del proyecto' });
  }
};

export const downloadProjectPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const orgId = req.user?.orgId || null;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    const project = await prisma.project.findFirst({
      where: { id, ...(orgId ? { organizationId: orgId } : {}) },
      select: {
        id: true,
        name: true,
        clientName: true,
        userId: true,
      },
    });

    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (project.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para descargar este expediente' });
    }

    const packageDir = getProjectPackageDir(project);
    try {
      await fs.access(packageDir);
    } catch {
      return res.status(404).json({ error: 'El expediente todavía no fue generado' });
    }

    const zipName = `${getProjectPackageFolderName(project)}.zip`;
    const zipPath = path.join(getProjectPackageBaseDir(), project.id, zipName);
    await zipDirectory(packageDir, zipPath);

    res.download(zipPath, zipName, async (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Error al descargar el expediente' });
      }
    });
  } catch (error) {
    console.error('Error al descargar expediente del proyecto:', error);
    res.status(500).json({ error: 'Error al descargar expediente del proyecto' });
  }
};
