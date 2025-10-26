import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateTaskFromAdditional } from '../utils/taskGenerator';

const prisma = new PrismaClient();

// Obtener adicionales del proyecto
export const getProjectAdditionals = async (req: Request, res: Response) => {
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
export const processAdditionals = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { modifications } = req.body; // Array de modificaciones al preset base
    const userId = req.user?.id;

    // Obtener reglas activas del usuario
    const rules = await prisma.businessRule.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    const processedAdditionals = [];

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
        'additionals' // Categoría por defecto para adicionales
      );

      // Obtener el proyecto para actualizar sus tareas
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Actualizar las tareas del proyecto agregando la nueva tarea
      const currentTasks = project.tasks as any || {};
      if (!currentTasks.additionals) {
        currentTasks.additionals = [];
      }

      // Agregar la nueva tarea a la categoría de adicionales
      if (Array.isArray(currentTasks.additionals)) {
        currentTasks.additionals.push(generatedTask);
      } else {
        currentTasks.additionals = [generatedTask];
      }

      // Actualizar el proyecto con las nuevas tareas
      await prisma.project.update({
        where: { id: projectId },
        data: { tasks: currentTasks }
      });

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
export const updateAdditional = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newQuantity, notes } = req.body;

    const updated = await prisma.projectAdditional.update({
      where: { id },
      data: { newQuantity, notes }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating additional' });
  }
};

// Eliminar adicional
export const deleteAdditional = async (req: Request, res: Response) => {
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
    if (additional.generatedTaskId) {
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

    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar adicional:', error);
    res.status(500).json({ error: 'Error deleting additional' });
  }
};

// CRUD para reglas de negocio
export const getBusinessRules = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const rules = await prisma.businessRule.findMany({
      where: { userId },
      orderBy: { category: 'asc' }
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rules' });
  }
};

export const updateBusinessRule = async (req: Request, res: Response) => {
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
