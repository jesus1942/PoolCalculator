/**
 * Controlador para cálculos profesionales de sistemas hidráulicos y eléctricos
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateProfessionalRecommendation } from '../utils/equipmentSelection';
import {
  calculateHydraulicSystem,
  HydraulicCalculationResult
} from '../utils/hydraulicCalculations';
import {
  calculateElectricalSystem,
  ElectricalConfig,
  generateElectricalReport
} from '../utils/electricalCalculations';

const prisma = new PrismaClient();

/**
 * GET /api/projects/:projectId/professional-calculations
 * Obtiene cálculos profesionales completos para un proyecto
 */
export const getProfessionalCalculations = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      distanceToEquipment = 5,
      staticLift = 1.5,
      voltage = 220,
      installationType = 'CONDUIT',
      ambientTemp = 25
    } = req.query;

    // Obtener proyecto completo
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true,
            accessory: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // Obtener todos los equipos disponibles
    const allEquipment = await prisma.equipmentPreset.findMany({
      where: { isActive: true }
    });

    // Configuración eléctrica
    const electricalConfig: Partial<ElectricalConfig> = {
      voltage: Number(voltage),
      installationType: installationType as 'AERIAL' | 'BURIED' | 'CONDUIT',
      ambientTemp: Number(ambientTemp),
      maxVoltageDrop: 3,
      electricityCostPerKwh: 50
    };

    // Generar recomendación profesional
    const recommendation = generateProfessionalRecommendation(
      project as any,
      Number(distanceToEquipment),
      Number(staticLift),
      allEquipment,
      electricalConfig
    );

    if (!recommendation) {
      return res.status(400).json({
        error: 'No se pudo generar recomendación. Verifique los datos del proyecto.'
      });
    }

    // Formatear respuesta
    const response = {
      project: {
        id: project.id,
        name: project.name,
        volume: project.volume,
        poolPreset: {
          name: project.poolPreset.name,
          shape: project.poolPreset.shape,
          length: project.poolPreset.length,
          width: project.poolPreset.width,
          depth: project.poolPreset.depth
        }
      },
      equipment: {
        pump: {
          name: recommendation.pump.name,
          power: recommendation.pump.power,
          flowRate: recommendation.pump.flowRate,
          maxHead: recommendation.pump.maxHead,
          connectionSize: recommendation.pump.connectionSize,
          price: recommendation.pump.pricePerUnit
        },
        filter: {
          name: recommendation.filter.name,
          diameter: recommendation.filter.filterDiameter,
          area: recommendation.filter.filterArea,
          sandRequired: recommendation.filter.sandRequired,
          price: recommendation.filter.pricePerUnit
        },
        accessories: recommendation.requiredAccessories.map(acc => ({
          name: acc.name,
          type: acc.type,
          quantity: acc.capacity || 1,
          price: acc.pricePerUnit
        }))
      },
      hydraulicAnalysis: recommendation.hydraulicAnalysis,
      electricalAnalysis: recommendation.electricalAnalysis,
      summary: {
        hydraulic: {
          isValid: recommendation.hydraulicAnalysis?.isValid,
          totalDynamicHead: recommendation.hydraulicAnalysis?.totalDynamicHead,
          recommendedPump: recommendation.hydraulicAnalysis?.recommendedPump?.name,
          warningsCount: recommendation.hydraulicAnalysis?.warnings.length || 0,
          errorsCount: recommendation.hydraulicAnalysis?.errors.length || 0
        },
        electrical: {
          isValid: recommendation.electricalAnalysis?.isValid,
          totalPower: recommendation.electricalAnalysis?.totalPowerDemand,
          cableSection: recommendation.electricalAnalysis?.cable.sectionLabel,
          breaker: recommendation.electricalAnalysis?.protection.breaker,
          monthlyCost: recommendation.electricalAnalysis?.operatingCost.monthlyCost,
          warningsCount: recommendation.electricalAnalysis?.warnings.length || 0,
          errorsCount: recommendation.electricalAnalysis?.errors.length || 0
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error en getProfessionalCalculations:', error);
    res.status(500).json({
      error: 'Error al calcular sistemas profesionales',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * GET /api/projects/:projectId/hydraulic-analysis
 * Obtiene solo el análisis hidráulico
 */
export const getHydraulicAnalysis = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      distanceToEquipment = 5,
      staticLift = 1.5
    } = req.query;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const allEquipment = await prisma.equipmentPreset.findMany({
      where: { isActive: true, type: 'PUMP' }
    });

    const hydraulicAnalysis = calculateHydraulicSystem(
      project as any,
      Number(distanceToEquipment),
      Number(staticLift),
      allEquipment
    );

    res.json({
      projectId: project.id,
      projectName: project.name,
      volume: project.volume,
      parameters: {
        distanceToEquipment: Number(distanceToEquipment),
        staticLift: Number(staticLift)
      },
      analysis: hydraulicAnalysis
    });
  } catch (error) {
    console.error('Error en getHydraulicAnalysis:', error);
    res.status(500).json({
      error: 'Error al calcular análisis hidráulico',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * GET /api/projects/:projectId/electrical-analysis
 * Obtiene solo el análisis eléctrico
 */
export const getElectricalAnalysis = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      distanceToPanel = 10,
      voltage = 220,
      installationType = 'CONDUIT',
      ambientTemp = 25
    } = req.query;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const electricalConfig: ElectricalConfig = {
      distanceToPanel: Number(distanceToPanel),
      voltage: Number(voltage),
      installationType: installationType as 'AERIAL' | 'BURIED' | 'CONDUIT',
      ambientTemp: Number(ambientTemp),
      maxVoltageDrop: 3,
      electricityCostPerKwh: 50
    };

    const electricalAnalysis = calculateElectricalSystem(
      project as any,
      electricalConfig
    );

    res.json({
      projectId: project.id,
      projectName: project.name,
      parameters: electricalConfig,
      analysis: electricalAnalysis
    });
  } catch (error) {
    console.error('Error en getElectricalAnalysis:', error);
    res.status(500).json({
      error: 'Error al calcular análisis eléctrico',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * GET /api/projects/:projectId/electrical-report
 * Genera un reporte en texto del análisis eléctrico
 */
export const getElectricalReport = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      distanceToPanel = 10,
      voltage = 220,
      installationType = 'CONDUIT',
      ambientTemp = 25
    } = req.query;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const electricalConfig: ElectricalConfig = {
      distanceToPanel: Number(distanceToPanel),
      voltage: Number(voltage),
      installationType: installationType as 'AERIAL' | 'BURIED' | 'CONDUIT',
      ambientTemp: Number(ambientTemp),
      maxVoltageDrop: 3,
      electricityCostPerKwh: 50
    };

    const electricalAnalysis = calculateElectricalSystem(
      project as any,
      electricalConfig
    );

    const report = generateElectricalReport(electricalAnalysis);

    res.type('text/plain').send(report);
  } catch (error) {
    console.error('Error en getElectricalReport:', error);
    res.status(500).json({
      error: 'Error al generar reporte eléctrico',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * POST /api/projects/:projectId/validate-system
 * Valida la compatibilidad de componentes seleccionados
 */
export const validateSystemCompatibility = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      pumpId,
      filterId,
      distanceToEquipment = 5,
      staticLift = 1.5
    } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // Obtener equipos específicos
    const pump = await prisma.equipmentPreset.findUnique({
      where: { id: pumpId }
    });

    const filter = await prisma.equipmentPreset.findUnique({
      where: { id: filterId }
    });

    if (!pump || !filter) {
      return res.status(400).json({ error: 'Bomba o filtro no encontrado' });
    }

    // Calcular sistema hidráulico
    const hydraulicAnalysis = calculateHydraulicSystem(
      project as any,
      distanceToEquipment,
      staticLift,
      [pump] // Solo con la bomba seleccionada
    );

    // Validaciones
    const issues: string[] = [];
    const warnings: string[] = [];

    // Validar caudal de bomba vs filtro
    if (pump.flowRate && filter.flowRate) {
      if (pump.flowRate > filter.flowRate * 1.1) {
        issues.push(
          `La bomba tiene mayor caudal (${pump.flowRate} m³/h) que el filtro (${filter.flowRate} m³/h). El filtro será sobrecargado.`
        );
      }
    }

    // Validar TDH
    if (hydraulicAnalysis.totalDynamicHead && pump.maxHead) {
      if (hydraulicAnalysis.totalDynamicHead > pump.maxHead) {
        issues.push(
          `La bomba no tiene suficiente altura (${pump.maxHead}m) para el TDH requerido (${hydraulicAnalysis.totalDynamicHead.toFixed(1)}m)`
        );
      } else if (hydraulicAnalysis.totalDynamicHead > pump.maxHead * 0.9) {
        warnings.push(
          'La bomba está cerca de su límite. Considerar una bomba de mayor capacidad.'
        );
      }
    }

    // Incluir warnings del análisis hidráulico
    warnings.push(...hydraulicAnalysis.warnings);
    issues.push(...hydraulicAnalysis.errors);

    const isCompatible = issues.length === 0;

    res.json({
      compatible: isCompatible,
      pump: {
        name: pump.name,
        flowRate: pump.flowRate,
        maxHead: pump.maxHead
      },
      filter: {
        name: filter.name,
        flowRate: filter.flowRate
      },
      hydraulicAnalysis: {
        totalDynamicHead: hydraulicAnalysis.totalDynamicHead,
        velocityChecks: hydraulicAnalysis.velocityChecks
      },
      issues,
      warnings,
      recommendation: isCompatible
        ? 'Los componentes son compatibles y adecuados para el proyecto.'
        : 'Los componentes presentan incompatibilidades. Revisar los problemas identificados.'
    });
  } catch (error) {
    console.error('Error en validateSystemCompatibility:', error);
    res.status(500).json({
      error: 'Error al validar compatibilidad',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
