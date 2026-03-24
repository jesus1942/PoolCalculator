import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateDefaultTasks, generateTaskFromAdditional } from '../utils/taskGenerator';
import { AuthRequest } from '../middleware/auth';
import {
  calculatePerimeter,
  calculateVolume,
} from '../utils/calculations';

const prisma = new PrismaClient();
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

const recalculateProjectDerivedData = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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

  if (!project || !project.poolPreset) return;
  if (getProjectTaskAutomationLocked(project)) return;

  const dimensions = {
    length: project.poolPreset.length,
    width: project.poolPreset.width,
    depth: project.poolPreset.depth,
    depthEnd: project.poolPreset.depthEnd || undefined,
    shape: project.poolPreset.shape,
  };

  const perimeter = calculatePerimeter(dimensions);
  const volume = calculateVolume(dimensions);
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
  const generatedTasks = generateDefaultTasks(
    buildEffectivePoolPreset(project.poolPreset, project.projectAdditionals),
    volume,
    perimeter,
    roles,
    buildTaskGenerationContext(project)
  );

  const mergedTasks = mergeGeneratedTasks((project.tasks as any) || {}, generatedTasks);
  const laborCost = calculateTasksLaborCost(mergedTasks);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      tasks: mergedTasks,
      laborCost,
      totalCost: (project.materialCost || 0) + laborCost,
    },
  });
};

// Obtener adicionales del proyecto
export const getProjectAdditionals = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const additionals = await prisma.projectAdditional.findMany({
      where: { projectId },
      include: {
        accessory: true,
        material: true,
        equipment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(additionals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching additionals' });
  }
};

// Procesar adicionales (aplicar reglas de negocio)
export const processAdditionals = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { modifications } = req.body; // Array de modificaciones al preset base
    const userId = req.user?.userId ?? req.user?.id;

    // Obtener reglas activas del usuario
    const rules = await prisma.businessRule.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    const processedAdditionals = [];
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    const taskAutomationLocked = getProjectTaskAutomationLocked(project);

    const currentTasks = (project.tasks as any) || {};
    const nextAdditionalsTasks = Array.isArray(currentTasks.additionals) ? [...currentTasks.additionals] : [];

    for (const mod of modifications) {
      const dependencies = [];

      // Buscar reglas aplicables
      for (const rule of rules) {
        if (shouldApplyRule(rule, mod)) {
          const actions = rule.actions as any[];
          
          for (const action of actions) {
            if (action.type === 'ADD_MATERIAL') {
              dependencies.push({
                type: 'material',
                name: action.name,
                quantity: action.quantity * (mod.newQuantity - mod.baseQuantity),
                unit: action.unit,
                reason: rule.name
              });
            } else if (action.type === 'ADD_ACCESSORY') {
              dependencies.push({
                type: 'accessory',
                name: action.name,
                quantity: action.quantity,
                reason: rule.name
              });
            } else if (action.type === 'CHECK_PUMP_CAPACITY') {
              const additionalFlow = action.additionalGPM * (mod.newQuantity - mod.baseQuantity);
              dependencies.push({
                type: 'pump_check',
                additionalGPM: additionalFlow,
                reason: rule.name
              });
            }
          }
        }
      }

      // Generar nombre y tipo del adicional para la tarea
      let additionalName = mod.customName || 'Adicional';
      let additionalType = mod.customCategory || 'other';

      if (mod.accessoryId) {
        const accessory = await prisma.accessoryPreset.findUnique({ where: { id: mod.accessoryId } });
        if (accessory) {
          additionalName = accessory.name;
          additionalType = accessory.type;
        }
      } else if (mod.equipmentId) {
        const equipment = await prisma.equipmentPreset.findUnique({ where: { id: mod.equipmentId } });
        if (equipment) {
          additionalName = equipment.name;
          additionalType = equipment.type;
        }
      } else if (mod.materialId) {
        const material = await prisma.constructionMaterialPreset.findUnique({ where: { id: mod.materialId } });
        if (material) {
          additionalName = material.name;
          additionalType = material.type;
        }
      }

      // Generar tarea automática para este adicional
      const generatedTask = generateTaskFromAdditional(
        additionalName,
        additionalType,
        mod.newQuantity,
        'additionals', // Categoría por defecto para adicionales
        [],
        mod.customLaborCost
      );

      if (!taskAutomationLocked) {
        nextAdditionalsTasks.push(generatedTask);
      }

      // Crear el adicional con sus dependencias y enlace a la tarea generada
      const additional = await prisma.projectAdditional.create({
        data: {
          projectId,
          accessoryId: mod.accessoryId,
          materialId: mod.materialId,
          equipmentId: mod.equipmentId,
          customName: mod.customName,
          customCategory: mod.customCategory,
          customUnit: mod.customUnit,
          customPricePerUnit: mod.customPricePerUnit,
          customLaborCost: mod.customLaborCost,
          baseQuantity: mod.baseQuantity,
          newQuantity: mod.newQuantity,
          dependencies,
          notes: mod.notes,
          generatedTaskId: generatedTask.id,
          relatedTaskCategory: 'additionals',
        }
      });

      console.log(`✅ [ADDITIONAL] Tarea generada: "${generatedTask.name}" para ${additionalName}`);
      console.log(`📋 [ADDITIONAL] Categoría: ${generatedTask.category} | Horas: ${generatedTask.estimatedHours}`);
      processedAdditionals.push(additional);
    }

    if (!taskAutomationLocked) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          tasks: {
            ...(project.tasks as any || {}),
            additionals: nextAdditionalsTasks,
          } as any,
        }
      });

      await recalculateProjectDerivedData(projectId);
    }

    res.json({
      additionals: processedAdditionals,
      summary: generateSummary(processedAdditionals)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing additionals' });
  }
};

// Helper: Verificar si aplicar regla
function shouldApplyRule(rule: any, modification: any): boolean {
  const conditions = rule.conditions as any;
  
  // Verificar tipo de accesorio
  if (conditions.accessoryType && modification.type !== conditions.accessoryType) {
    return false;
  }

  // Verificar wattage para luces
  if (conditions.wattage && modification.wattage !== conditions.wattage) {
    return false;
  }

  // Verificar cantidades
  if (conditions.totalLights?.gt && modification.totalLights <= conditions.totalLights.gt) {
    return false;
  }

  return true;
}

// Helper: Generar resumen de materiales adicionales
function generateSummary(additionals: any[]): any {
  const materials: Record<string, number> = {};
  const accessories: Record<string, number> = {};
  let totalAdditionalGPM = 0;

  for (const add of additionals) {
    const deps = add.dependencies as any[];
    
    for (const dep of deps) {
      if (dep.type === 'material') {
        const key = `${dep.name} (${dep.unit})`;
        materials[key] = (materials[key] || 0) + dep.quantity;
      } else if (dep.type === 'accessory') {
        accessories[dep.name] = (accessories[dep.name] || 0) + dep.quantity;
      } else if (dep.type === 'pump_check') {
        totalAdditionalGPM += dep.additionalGPM;
      }
    }
  }

  return {
    materials,
    accessories,
    pumpRequirement: totalAdditionalGPM > 0 ? {
      additionalGPM: totalAdditionalGPM,
      recommendation: totalAdditionalGPM > 50 ? 'Consider pump upgrade' : 'Current pump should handle'
    } : null
  };
}

// Actualizar adicional
export const updateAdditional = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newQuantity, notes } = req.body;

    const existing = await prisma.projectAdditional.findUnique({
      where: { id },
      include: {
        accessory: true,
        equipment: true,
        material: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Adicional no encontrado' });
    }

    const updated = await prisma.projectAdditional.update({
      where: { id },
      data: { newQuantity, notes }
    });

    const projectForLock = await prisma.project.findUnique({
      where: { id: existing.projectId },
      select: { exportSettings: true },
    });
    const taskAutomationLocked = getProjectTaskAutomationLocked(projectForLock || {});

    if (!taskAutomationLocked && existing.generatedTaskId) {
      const project = await prisma.project.findUnique({
        where: { id: existing.projectId }
      });

      if (project) {
        const currentTasks = (project.tasks as any) || {};
        const category = existing.relatedTaskCategory || 'additionals';
        const categoryTasks = Array.isArray(currentTasks[category]) ? currentTasks[category] : [];
        const generatedTask = generateTaskFromAdditional(
          getAdditionalName(existing),
          existing.customCategory || existing.equipment?.type || existing.accessory?.type || existing.material?.type || 'other',
          Number(newQuantity || 0),
          category,
          [],
          existing.customLaborCost || undefined
        );

        currentTasks[category] = categoryTasks.map((task: any) =>
          task.id === existing.generatedTaskId
            ? {
                ...task,
                name: generatedTask.name,
                description: generatedTask.description,
                estimatedHours: generatedTask.estimatedHours,
                laborCost: generatedTask.laborCost,
              }
            : task
        );

        await prisma.project.update({
          where: { id: existing.projectId },
          data: { tasks: currentTasks }
        });
      }
    }

    if (!taskAutomationLocked) {
      await recalculateProjectDerivedData(existing.projectId);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating additional' });
  }
};

// Eliminar adicional
export const deleteAdditional = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Obtener el adicional para encontrar su tarea relacionada
    const additional = await prisma.projectAdditional.findUnique({
      where: { id }
    });

    if (!additional) {
      return res.status(404).json({ error: 'Adicional no encontrado' });
    }

    // Si tiene una tarea generada, eliminarla del proyecto
    const projectForLock = await prisma.project.findUnique({
      where: { id: additional.projectId },
      select: { exportSettings: true },
    });
    const taskAutomationLocked = getProjectTaskAutomationLocked(projectForLock || {});

    if (!taskAutomationLocked && additional.generatedTaskId) {
      const project = await prisma.project.findUnique({
        where: { id: additional.projectId }
      });

      if (project) {
        const currentTasks = project.tasks as any || {};
        const category = additional.relatedTaskCategory || 'additionals';

        if (currentTasks[category] && Array.isArray(currentTasks[category])) {
          // Filtrar la tarea eliminada
          currentTasks[category] = currentTasks[category].filter(
            (task: any) => task.id !== additional.generatedTaskId
          );

          // Actualizar el proyecto
          await prisma.project.update({
            where: { id: additional.projectId },
            data: { tasks: currentTasks }
          });

          console.log(`✅ Tarea automática eliminada junto con el adicional`);
        }
      }
    }

    // Eliminar el adicional
    await prisma.projectAdditional.delete({
      where: { id }
    });

    if (!taskAutomationLocked) {
      await recalculateProjectDerivedData(additional.projectId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar adicional:', error);
    res.status(500).json({ error: 'Error deleting additional' });
  }
};

// CRUD para reglas de negocio
export const getBusinessRules = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    
    const rules = await prisma.businessRule.findMany({
      where: { userId },
      orderBy: { category: 'asc' }
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rules' });
  }
};

export const updateBusinessRule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const updated = await prisma.businessRule.update({
      where: { id },
      data: req.body
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating rule' });
  }
};
