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
import { generateDefaultTasks } from '../utils/taskGenerator';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { name, clientName, clientEmail, clientPhone, location, poolPresetId, status } = req.body;

    const poolPreset = await prisma.poolPreset.findUnique({
      where: { id: poolPresetId },
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

    const excavationLength = poolPreset.length + (poolPreset.lateralCushionSpace * 2);
    const excavationWidth = poolPreset.width + (poolPreset.lateralCushionSpace * 2);
    const excavationDepth = poolPreset.depth + poolPreset.floorCushionDepth;

    // Cargar roles para calcular costos de mano de obra
    console.log('[PROJECT] Cargando roles de profesión...');
    const rolesRaw = await prisma.professionRole.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        hourlyRate: true,
        dailyRate: true,
      },
    });
    // Convertir null a undefined para compatibilidad con RoleRate
    const roles = rolesRaw.map(r => ({
      id: r.id,
      name: r.name,
      hourlyRate: r.hourlyRate ?? undefined,
      dailyRate: r.dailyRate ?? undefined,
    }));
    console.log(`[PROJECT] Roles cargados: ${roles.length}`);

    // Generar tareas automáticas basadas en las características de la piscina
    console.log('[PROJECT] Generando tareas automáticas para:', poolPreset.name);
    const defaultTasks = generateDefaultTasks(poolPreset, volume, perimeter, roles);
    console.log('[PROJECT] Tareas generadas:', Object.keys(defaultTasks).map(cat => `${cat}: ${defaultTasks[cat].length}`).join(', '));

    // Calcular costo total de mano de obra desde las tareas generadas
    let totalLaborCost = 0;
    Object.values(defaultTasks).forEach((categoryTasks: any[]) => {
      categoryTasks.forEach(task => {
        totalLaborCost += task.laborCost || 0;
      });
    });
    console.log(`[PROJECT] Costo total de mano de obra: $${totalLaborCost.toLocaleString('es-AR')}`);

    const project = await prisma.project.create({
      data: {
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
        materials: {},
        tasks: defaultTasks as any,
        laborCost: totalLaborCost,
        materialCost: 0,
        totalCost: totalLaborCost,
        status: status || 'DRAFT',
        userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const projects = await prisma.project.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        poolPreset: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(projects);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        poolPreset: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (project.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para ver este proyecto' });
    }

    // VALIDACIÓN: Verificar que las dimensiones de excavación sean correctas
    const preset = project.poolPreset;
    const expectedExcavLength = preset.length + (preset.lateralCushionSpace * 2);
    const expectedExcavWidth = preset.width + (preset.lateralCushionSpace * 2);
    const expectedExcavDepth = preset.depth + preset.floorCushionDepth;

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
      const correctedProject = await prisma.project.findUnique({
        where: { id },
        include: {
          poolPreset: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      console.log(`  ✓ Proyecto corregido`);
      res.json(correctedProject);
      return;
    }

    res.json(project);
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
    const isAdmin = req.user?.role === 'ADMIN';

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { poolPreset: true },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (existingProject.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este proyecto' });
    }

    let updateData: any = { ...req.body };

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
          const allMaterials = {
            ...tileCalculations.materials,
            ...bedCalculations.bedMaterials,
            tiles: tileCalculations.tiles, // Agregar las losetas calculadas
          };

          // Calcular costo total de materiales
          const totalMaterialCost = tileCalculations.totalMaterialCost + bedCalculations.totalBedMaterialCost;
          console.log(`TOTAL materiales base: $${totalMaterialCost.toLocaleString('es-AR')}`);

          updateData.sidewalkArea = tileCalculations.sidewalkArea;
          updateData.materials = allMaterials;
          updateData.totalTileArea = tileCalculations.sidewalkArea;
          updateData.materialCost = totalMaterialCost;

          // Recalcular totalCost = materialCost + laborCost
          updateData.totalCost = totalMaterialCost + (existingProject.laborCost || 0);
        }
      } catch (calcError) {
        console.error('Error en cálculos:', calcError);
      }
    }

    // Si se están actualizando las tareas, recalcular el costo de mano de obra
    if (req.body.tasks) {
      console.log('Detectada actualización de tareas, recalculando costos de mano de obra...');

      let totalLaborCost = 0;
      const tasks = req.body.tasks;

      // Iterar sobre todas las categorías de tareas
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            totalLaborCost += task.laborCost || 0;
          });
        }
      });

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
      },
    });

    console.log('Proyecto actualizado exitosamente');
    res.json(project);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (existingProject.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este proyecto' });
    }

    await prisma.project.delete({
      where: { id },
    });

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
    const isAdmin = req.user?.role === 'ADMIN';

    // Obtener el proyecto con todos sus datos
    const project = await prisma.project.findUnique({
      where: { id },
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

    // Extraer configuraciones del JSON
    const plumbingConfig = (project.plumbingConfig as any) || {};
    const selectedPlumbingItems = plumbingConfig.selectedItems || [];
    const electricalConfig = (project.electricalConfig as any) || {};
    const materials = (project.materials as any) || {};
    const tasks = (project.tasks as any) || {};

    // Calcular datos de excavación
    const excavationVolume = project.excavationLength * project.excavationWidth * project.excavationDepth;

    // Procesar items de plomería con detalles
    const plumbingItems = selectedPlumbingItems.map((item: any) => ({
      name: item.itemName || '',
      diameter: item.diameter || '-',
      quantity: item.quantity || 0,
      type: item.type || 'PVC',
      observations: item.observations || '-',
    }));

    // Calcular mano de obra por roles
    const laborByRoles: any[] = [];
    if (tasks && Object.keys(tasks).length > 0) {
      const rolesSummary: Record<string, any> = {};

      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
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
        }
      });

      laborByRoles.push(...Object.values(rolesSummary));
    }

    // Preparar datos completos para el Excel
    const projectData = {
      // Información básica
      projectId: project.id.substring(0, 8).toUpperCase(),
      projectName: project.name,
      clientName: project.clientName,
      location: project.location || '-',
      date: new Date().toLocaleDateString('es-AR'),
      responsible: 'Jesús Olguin',

      // Características de la piscina
      pool: {
        name: project.poolPreset?.name || 'Piscina',
        length: project.poolPreset?.length || 0,
        width: project.poolPreset?.width || 0,
        shallowDepth: project.poolPreset?.depth || 0,
        deepDepth: project.poolPreset?.depthEnd || project.poolPreset?.depth || 0,
        volume: project.volume,
        shape: project.poolPreset?.shape || 'RECTANGULAR',
        waterMirrorArea: project.waterMirrorArea,
      },

      // Excavación
      excavation: {
        length: project.excavationLength,
        width: project.excavationWidth,
        depth: project.excavationDepth,
        volume: excavationVolume,
      },

      // Materiales de cama de apoyo
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
          mixed: 0,
          mixedUnit: 'm³',
        }
      },

      // Materiales de vereda
      sidewalk: {
        materials: {
          area: project.sidewalkArea || 0,
          cement: materials.cement?.quantity || 0,
          cementUnit: materials.cement?.unit || 'kg',
          sand: materials.sand?.quantity || 0,
          sandUnit: materials.sand?.unit || 'm³',
          stone: materials.gravel?.quantity || 0,
          stoneUnit: materials.gravel?.unit || 'm³',
          mesh: materials.wireMesh?.quantity || 0,
          meshUnit: materials.wireMesh?.unit || 'm²',
          adhesive: materials.adhesive?.quantity || 0,
          adhesiveUnit: materials.adhesive?.unit || 'kg',
          whiteCement: materials.whiteCement?.quantity || 0,
          whiteCementUnit: materials.whiteCement?.unit || 'kg',
          marmolina: materials.marmolina?.quantity || 0,
          marmolinaUnit: materials.marmolina?.unit || 'kg',
        }
      },

      // Plomería detallada
      plumbing: {
        distanceToEquipment: plumbingConfig.distanceToEquipment || 0,
        returnsCount: project.poolPreset?.returnsCount || 0,
        skimmersCount: project.poolPreset?.skimmerCount || 0,
        hasBottomDrain: project.poolPreset?.hasBottomDrain || false,
        hasVacuumIntake: project.poolPreset?.hasVacuumIntake || false,
        items: plumbingItems,
      },

      // Instalación eléctrica
      electrical: {
        watts: electricalConfig.totalWatts || 0,
        amps: electricalConfig.totalWatts ? parseFloat((electricalConfig.totalWatts / 220).toFixed(1)) : 0,
        recommendedBreaker: electricalConfig.recommendedBreaker || 16,
        recommendedRCD: electricalConfig.recommendedRCD || 16,
        cableSection: electricalConfig.cableSection || '2.5mm²',
        distanceToPanel: 15,
        // Equipos
        pump: {
          power: electricalConfig.pump?.power || '-',
          observations: electricalConfig.pump?.observations || '-',
        },
        filter: {
          diameter: electricalConfig.filter?.diameter || '-',
          observations: electricalConfig.filter?.observations || '-',
        },
        // Desglose de consumo
        consumptionBreakdown: electricalConfig.consumptionBreakdown || [],
      },

      // Mano de obra
      labor: {
        roles: laborByRoles,
      },

      // Secciones a incluir
      sections: sections || {
        excavation: true,
        supportBed: true,
        sidewalk: true,
        plumbing: true,
        electrical: true,
        labor: true,
        sequence: true,
        standards: true,
      },
    };

    // Escapar JSON para pasarlo como argumento
    const jsonData = JSON.stringify(projectData).replace(/"/g, '\\"');

    // Ejecutar el script Python
    const scriptPath = path.join(__dirname, '../../public/export_to_excel.py');
    const excelPath = path.join(__dirname, '../../public/CALCULADORA MATERIALES AQUAM.xlsx');
    const command = `python3 "${scriptPath}" "${jsonData}"`;

    console.log('Ejecutando script Python para exportar proyecto...');
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Advertencias del script:', stderr);
    }

    console.log('Salida del script:', stdout);

    // Enviar el archivo Excel como descarga
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.download(excelPath, fileName, (err) => {
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
