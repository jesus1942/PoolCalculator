import { Project, PoolPreset } from '@/types';

/**
 * Servicio para calcular automáticamente los caños necesarios en instalaciones hidráulicas
 *
 * Criterio de cálculo:
 * - Se toma la distancia desde el extremo más alejado de la piscina hasta el equipo
 * - Se calcula por tipo de línea: succión (skimmers, drains), retorno, hidrojets
 * - Se consideran tanto los accesorios del preset como los adicionales
 */

export interface PlumbingCalculationConfig {
  poolLength: number; // Largo de la piscina en metros
  poolWidth: number; // Ancho de la piscina en metros
  distanceToEquipment: number; // Distancia desde borde hasta equipo en metros
  skimmerCount: number;
  returnCount: number;
  hotWaterReturnCount?: number;
  hydrojetCount: number;
  hasBottomDrain: boolean;
  hasVacuumIntake: boolean;
  vacuumIntakeCount: number;
  additionalSkimmers?: number;
  additionalReturns?: number;
  additionalHotWaterReturns?: number;
  additionalHydrojets?: number;
  additionalDrains?: number;
  hydrojetPumpCount?: number;
  hydrojetSuctionCount?: number;
  hydrojetAirIntakeCount?: number;
}

export interface PipeRequirement {
  lineType: 'SUCCION' | 'RETORNO' | 'HIDROJET' | 'ASPIRACION' | 'AIRE';
  description: string;
  diameter: string;
  totalMeters: number;
  accessoryCount: number;
  metersPerAccessory: number;
  recommendations: string[];
}

export interface PlumbingCalculationResult {
  pipeRequirements: PipeRequirement[];
  fittings: {
    elbows90: { diameter: string; quantity: number }[];
    elbows45: { diameter: string; quantity: number }[];
    tees: { diameter: string; quantity: number }[];
    reducers: { fromDiameter: string; toDiameter: string; quantity: number }[];
    adapters: { diameter: string; threadSize: string; quantity: number }[];
    valves: { diameter: string; type: string; quantity: number }[];
    couplings: { diameter: string; quantity: number }[];
    adhesive: { quantity: number; unit: string };
  };
  summary: {
    totalMeters: number;
    maxDistance: number;
    totalAccessories: number;
  };
}

const includes50mm = (diameter: string) => diameter.includes('50mm');
const reducerDiameterForLine = (req: PipeRequirement) =>
  req.lineType === 'HIDROJET'
    ? '25mm (3/4")'
    : req.lineType === 'RETORNO'
      ? '40mm (1.5")'
      : '50mm (2")';

const calculateTreeLineMeters = (
  distanceToEquipment: number,
  headerSpan: number,
  outletCount: number,
  branchStubMeters: number,
) => {
  if (outletCount <= 0) return 0;
  const collectorMeters = distanceToEquipment + headerSpan;
  const branchMeters = outletCount * branchStubMeters;
  const teeTransitions = Math.max(0, outletCount - 1) * 0.25;
  return (collectorMeters + branchMeters + teeTransitions) * 1.1;
};

const estimate90Elbows = (req: PipeRequirement) => {
  const avgRun = req.accessoryCount > 0 ? req.totalMeters / req.accessoryCount : req.totalMeters;
  const distanceTurns = Math.max(0, Math.ceil(avgRun / 8) - 1);

  switch (req.lineType) {
    case 'SUCCION':
      return 2 + (req.accessoryCount * 2) + distanceTurns;
    case 'RETORNO':
      return 2 + (req.accessoryCount * 2) + distanceTurns;
    case 'HIDROJET':
      return 2 + (req.accessoryCount * 2) + distanceTurns;
    case 'ASPIRACION':
      return 2 + (req.accessoryCount * 2) + distanceTurns;
    case 'AIRE':
      return 1 + (req.accessoryCount * 2) + Math.max(0, Math.ceil(avgRun / 10) - 1);
    default:
      return req.accessoryCount * 2;
  }
};

const estimate45Elbows = (req: PipeRequirement) => {
  const avgRun = req.accessoryCount > 0 ? req.totalMeters / req.accessoryCount : req.totalMeters;
  const distanceSweeps = avgRun > 10 ? 1 : 0;

  switch (req.lineType) {
    case 'SUCCION':
      return Math.max(0, Math.floor(req.accessoryCount / 2)) + distanceSweeps;
    case 'RETORNO':
      return Math.max(0, Math.ceil(req.accessoryCount / 2) - 1) + distanceSweeps;
    case 'HIDROJET':
      return Math.max(0, Math.ceil(req.accessoryCount / 3)) + distanceSweeps;
    case 'ASPIRACION':
      return distanceSweeps;
    case 'AIRE':
      return Math.max(0, Math.ceil(req.accessoryCount / 3));
    default:
      return 0;
  }
};

const estimateReducers = (req: PipeRequirement) => {
  if (!includes50mm(req.diameter)) return 0;
  if (req.lineType === 'RETORNO' || req.lineType === 'HIDROJET') {
    return req.accessoryCount;
  }
  return 0;
};

const estimateAdapters = (req: PipeRequirement) => {
  switch (req.lineType) {
    case 'RETORNO':
    case 'HIDROJET':
      return { quantity: req.accessoryCount, threadSize: '1"' };
    case 'SUCCION':
    case 'ASPIRACION':
      return { quantity: req.accessoryCount, threadSize: '1 1/4"' };
    default:
      return { quantity: 0, threadSize: '1"' };
  }
};

export const plumbingCalculationService = {
  /**
   * Calcula la distancia máxima desde el extremo más alejado de la piscina hasta el equipo
   */
  calculateMaxDistance(config: PlumbingCalculationConfig): number {
    // La distancia máxima es desde la diagonal más lejana
    // Diagonal de la piscina + distancia al equipo + margen de seguridad
    const poolDiagonal = Math.sqrt(
      Math.pow(config.poolLength, 2) + Math.pow(config.poolWidth, 2)
    );

    // Tomamos la mitad de la diagonal (desde el centro al extremo) + distancia al equipo
    const maxDistance = (poolDiagonal / 2) + config.distanceToEquipment;

    // Agregamos un 15% de margen para codos, subidas, etc.
    return maxDistance * 1.15;
  },

  /**
   * Calcula los caños necesarios para todas las instalaciones
   */
  calculatePipeRequirements(config: PlumbingCalculationConfig): PlumbingCalculationResult {
    const maxDistance = this.calculateMaxDistance(config);
    const pipeRequirements: PipeRequirement[] = [];

    // 1. CIRCUITO DE FILTRADO - SUCCIÓN
    const totalSkimmers = config.skimmerCount + (config.additionalSkimmers || 0);
    const totalFiltrationSuctionAccessories =
      totalSkimmers +
      (config.hasBottomDrain ? 1 : 0) +
      (config.hasVacuumIntake ? (config.vacuumIntakeCount || 1) : 0);

    if (totalFiltrationSuctionAccessories > 0) {
      const accessoryCount = totalFiltrationSuctionAccessories;
      const totalMeters = maxDistance * accessoryCount;

      // En el estándar residencial del proyecto la succión base se mantiene en 50 mm.
      // El cálculo anterior escalaba a 63/75 mm demasiado pronto y sobredimensionaba.
      let diameter = '50mm (2")';

      const recommendations: string[] = [];
      if (config.hasBottomDrain) {
        recommendations.push('El drenaje de fondo requiere línea independiente de 50mm mínimo');
      }
      if (config.hasVacuumIntake) {
        recommendations.push('La toma de aspiración/barrefondo se contempla dentro de la succión de filtrado');
      }

      pipeRequirements.push({
        lineType: 'SUCCION',
        description: `Succión de filtrado (${totalSkimmers} skimmers${config.hasBottomDrain ? ' + 1 drenaje de fondo' : ''}${config.hasVacuumIntake ? ` + ${config.vacuumIntakeCount || 1} toma(s) de aspiración` : ''})`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount,
        metersPerAccessory: maxDistance,
        recommendations,
      });
    }

    // 2. CIRCUITO DE FILTRADO - RETORNO / IMPULSIÓN
    const shortSideSpan = Math.min(config.poolLength, config.poolWidth);
    const totalStandardReturns = config.returnCount + (config.additionalReturns || 0);
    const totalHotWaterReturns = (config.hotWaterReturnCount || 0) + (config.additionalHotWaterReturns || 0);

    if (totalStandardReturns > 0) {
      const totalMeters = calculateTreeLineMeters(
        config.distanceToEquipment,
        shortSideSpan,
        totalStandardReturns,
        0.8,
      );

      let diameter = '40mm (1.5")';
      if (totalStandardReturns >= 4) diameter = '50mm (2")';

      const recommendations: string[] = [
        'Los retornos trabajan sobre un colector principal tipo arbol, no con una línea completa independiente por retorno',
      ];
      if (totalStandardReturns >= 4) {
        recommendations.push('Usar colector principal de 50 mm y derivaciones cortas finales a cada retorno');
      }

      pipeRequirements.push({
        lineType: 'RETORNO',
        description: `Impulsión de filtrado en colector (${totalStandardReturns} retornos)`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalStandardReturns,
        metersPerAccessory: Number((totalMeters / totalStandardReturns).toFixed(1)),
        recommendations,
      });
    }

    if (totalHotWaterReturns > 0) {
      const totalMeters = maxDistance * totalHotWaterReturns;

      pipeRequirements.push({
        lineType: 'RETORNO',
        description: `Retorno independiente de agua caliente (${totalHotWaterReturns} línea(s))`,
        diameter: '40mm (1.5")',
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalHotWaterReturns,
        metersPerAccessory: maxDistance,
        recommendations: ['El retorno de agua caliente se calcula como línea independiente del colector principal'],
      });
    }

    // 3. CIRCUITO DE HIDROJETS - IMPULSIÓN DE AGUA
    const totalHydrojets = config.hydrojetCount + (config.additionalHydrojets || 0);
    if (totalHydrojets > 0) {
      const totalMeters = calculateTreeLineMeters(
        config.distanceToEquipment,
        shortSideSpan,
        totalHydrojets,
        0.7,
      );

      const diameter = totalHydrojets >= 4 ? '50mm (2")' : '40mm (1.5")';

      const recommendations: string[] = [
        'Los hidrojets requieren una bomba con mayor GPM',
        'Verificar presión mínima requerida por el fabricante',
        'La impulsión de agua de hidrojets se resuelve en colector tipo arbol y se unifica en 50/40 mm según cantidad',
        'Los ramales individuales en 25 mm aplican solo en la salida final corta hacia cada hidrojet',
      ];

      pipeRequirements.push({
        lineType: 'HIDROJET',
        description: `Impulsión de hidrojets en colector (${totalHydrojets} hidrojets)`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalHydrojets,
        metersPerAccessory: Number((totalMeters / totalHydrojets).toFixed(1)),
        recommendations,
      });
    }

    // 4. CIRCUITO DE HIDROJETS - SUCCIÓN DEDICADA
    const hydrojetSuctionCount = totalHydrojets > 0
      ? Math.max(1, config.hydrojetSuctionCount || config.hydrojetPumpCount || 1)
      : 0;
    if (hydrojetSuctionCount > 0) {
      const totalMeters = maxDistance * hydrojetSuctionCount;

      pipeRequirements.push({
        lineType: 'ASPIRACION',
        description: `Succión dedicada para bomba de hidrojets (${hydrojetSuctionCount} toma(s))`,
        diameter: '50mm (2")',
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: hydrojetSuctionCount,
        metersPerAccessory: maxDistance,
        recommendations: ['La bomba de hidrojets debe tomar agua por una línea de succión independiente'],
      });
    }

    // 5. CIRCUITO DE HIDROJETS - ASPIRACIÓN DE AIRE
    const totalAirIntakes = totalHydrojets > 0
      ? Math.max(totalHydrojets, config.hydrojetAirIntakeCount || totalHydrojets)
      : 0;
    if (totalAirIntakes > 0) {
      const totalMeters = maxDistance * totalAirIntakes;

      pipeRequirements.push({
        lineType: 'AIRE',
        description: `Aspiración de aire para hidrojets (${totalAirIntakes} línea(s) de aire)`,
        diameter: '25mm (1")',
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalAirIntakes,
        metersPerAccessory: maxDistance,
        recommendations: ['Cada hidrojet contempla línea de aire independiente de 25 mm'],
      });
    }

    // Calcular totales
    const totalMeters = pipeRequirements.reduce((sum, req) => sum + req.totalMeters, 0);
    const totalAccessories = pipeRequirements.reduce((sum, req) => sum + req.accessoryCount, 0);

    const fittings = this.generateFittingsRecommendations(pipeRequirements, {
      pumpCount: 1 + (config.hydrojetPumpCount || 0),
    });

    return {
      pipeRequirements,
      fittings,
      summary: {
        totalMeters: Math.ceil(totalMeters),
        maxDistance: Math.ceil(maxDistance),
        totalAccessories,
      },
    };
  },

  /**
   * Calcula los caños desde un proyecto
   */
  calculateFromProject(project: Project, distanceToEquipment: number): PlumbingCalculationResult {
    const preset = project.poolPreset as PoolPreset;

    // Obtener accesorios adicionales de tipo hidráulico
    const additionals = (project as any).additionals || [];
    let additionalSkimmers = 0;
    let additionalReturns = 0;
    let additionalHotWaterReturns = 0;
    let additionalHydrojets = 0;
    let additionalDrains = 0;
    let hydrojetPumpCount = preset.hasHydroJets && (preset.hydroJetsCount || 0) > 0 ? 1 : 0;

    // Analizar adicionales para contar accesorios hidráulicos
    additionals.forEach((additional: any) => {
      const name = (additional.customName || additional.accessory?.name || '').toLowerCase();
      const category = (additional.customCategory || additional.accessory?.type || '').toLowerCase();
      const quantity = additional.newQuantity || 0;

      if (name.includes('skimmer') || category.includes('skimmer')) {
        additionalSkimmers += quantity;
      } else if (name.includes('retorno') || name.includes('return') || category.includes('return')) {
        if (name.includes('caliente') || name.includes('termic') || name.includes('calef')) {
          additionalHotWaterReturns += quantity;
        } else {
          additionalReturns += quantity;
        }
      } else if (name.includes('hidrojet') || name.includes('hydro') || category.includes('hydrojet')) {
        additionalHydrojets += quantity;
      } else if (name.includes('drenaje') || name.includes('drain') || category.includes('drain')) {
        additionalDrains += quantity;
      } else if ((name.includes('bomba') || category.includes('pump')) && (name.includes('hidro') || name.includes('bac200') || name.includes('jet'))) {
        hydrojetPumpCount += quantity;
      }
    });

    const config: PlumbingCalculationConfig = {
      poolLength: preset.length,
      poolWidth: preset.width,
      distanceToEquipment,
      skimmerCount: preset.skimmerCount || 0,
      returnCount: preset.returnsCount || 0,
      hotWaterReturnCount: preset.hasHotWaterReturn ? 1 : 0,
      hydrojetCount: preset.hydroJetsCount || 0,
      hasBottomDrain: preset.hasBottomDrain || false,
      hasVacuumIntake: preset.hasVacuumIntake || false,
      vacuumIntakeCount: preset.vacuumIntakeCount || 1,
      additionalSkimmers,
      additionalReturns,
      additionalHotWaterReturns,
      additionalHydrojets,
      additionalDrains: additionalDrains > 0 ? additionalDrains : undefined,
      hydrojetPumpCount,
      hydrojetSuctionCount: hydrojetPumpCount > 0 ? hydrojetPumpCount : undefined,
      hydrojetAirIntakeCount: (preset.hydroJetsCount || 0) + additionalHydrojets,
    };

    return this.calculatePipeRequirements(config);
  },

  /**
   * Genera recomendaciones de accesorios (codos, tees, válvulas) basado en los caños
   */
  generateFittingsRecommendations(
    pipeRequirements: PipeRequirement[],
    options?: { pumpCount?: number }
  ): {
    elbows90: { diameter: string; quantity: number }[];
    elbows45: { diameter: string; quantity: number }[];
    tees: { diameter: string; quantity: number }[];
    reducers: { fromDiameter: string; toDiameter: string; quantity: number }[];
    adapters: { diameter: string; threadSize: string; quantity: number }[];
    valves: { diameter: string; type: string; quantity: number }[];
    couplings: { diameter: string; quantity: number }[];
    adhesive: { quantity: number; unit: string };
  } {
    const elbows90: { diameter: string; quantity: number }[] = [];
    const elbows45: { diameter: string; quantity: number }[] = [];
    const tees: { diameter: string; quantity: number }[] = [];
    const reducers: { fromDiameter: string; toDiameter: string; quantity: number }[] = [];
    const adapters: { diameter: string; threadSize: string; quantity: number }[] = [];
    const valves: { diameter: string; type: string; quantity: number }[] = [];
    const couplings: { diameter: string; quantity: number }[] = [];
    let adhesiveLiters = 0;
    const pumpCount = Math.max(1, options?.pumpCount || 1);

    pipeRequirements.forEach(req => {
      elbows90.push({
        diameter: req.diameter,
        quantity: estimate90Elbows(req),
      });

      const elbow45Count = estimate45Elbows(req);
      if (elbow45Count > 0) {
        elbows45.push({
          diameter: req.diameter,
          quantity: elbow45Count,
        });
      }

      const reducerCount = estimateReducers(req);
      if (reducerCount > 0) {
        reducers.push({
          fromDiameter: req.diameter,
          toDiameter: reducerDiameterForLine(req),
          quantity: reducerCount,
        });
      }

      const adapterConfig = estimateAdapters(req);
      if (adapterConfig.quantity > 0) {
        adapters.push({
          diameter: includes50mm(req.diameter) && (req.lineType === 'RETORNO' || req.lineType === 'HIDROJET')
            ? '40mm (1.5")'
            : req.diameter,
          threadSize: adapterConfig.threadSize,
          quantity: adapterConfig.quantity,
        });
      }

      if (req.accessoryCount > 1) {
        tees.push({
          diameter: req.diameter,
          quantity: req.accessoryCount - 1, // Un tee menos que accesorios
        });
      }

      // Una válvula de maniobra mínima por línea
      valves.push({
        diameter: req.diameter,
        type: 'Válvula de bola',
        quantity: 1,
      });

      const estimatedBars = Math.ceil(req.totalMeters / 6);
      couplings.push({
        diameter: req.diameter,
        quantity: Math.max(0, estimatedBars - 1),
      });

      adhesiveLiters += Math.max(0.25, req.totalMeters / 45);
    });

    const suctionLines = pipeRequirements.filter((req) =>
      req.lineType === 'SUCCION' || req.lineType === 'ASPIRACION'
    );
    const pressureLines = pipeRequirements.filter((req) =>
      req.lineType === 'RETORNO' || req.lineType === 'HIDROJET'
    );
    const airLines = pipeRequirements.filter((req) => req.lineType === 'AIRE');

    const getDominantDiameter = (requirements: PipeRequirement[]) =>
      requirements.reduce((selected, current) =>
        current.accessoryCount >= selected.accessoryCount ? current : selected,
      requirements[0]).diameter;

    // Si las tomas están repartidas en más de una línea, agregamos tees de cabecera/colector.
    if (suctionLines.length > 1) {
      tees.push({
        diameter: getDominantDiameter(suctionLines),
        quantity: suctionLines.length - 1,
      });
    }

    if (pressureLines.length > 1) {
      tees.push({
        diameter: getDominantDiameter(pressureLines),
        quantity: pressureLines.length - 1,
      });
    }

    if (airLines.length > 1) {
      tees.push({
        diameter: getDominantDiameter(airLines),
        quantity: airLines.length - 1,
      });
    }

    // Cabecera con varias bombas: más derivaciones y una check por bomba.
    if (pumpCount > 1) {
      const suctionHeaderDiameter = suctionLines.length > 0
        ? getDominantDiameter(suctionLines)
        : '50mm (2")';
      const pressureHeaderDiameter = pressureLines.length > 0
        ? getDominantDiameter(pressureLines)
        : suctionHeaderDiameter;

      tees.push({
        diameter: suctionHeaderDiameter,
        quantity: pumpCount - 1,
      });
      tees.push({
        diameter: pressureHeaderDiameter,
        quantity: pumpCount - 1,
      });
      valves.push({
        diameter: pressureHeaderDiameter,
        type: 'Válvula check',
        quantity: pumpCount,
      });
      valves.push({
        diameter: suctionHeaderDiameter,
        type: 'Válvula de bola',
        quantity: pumpCount - 1,
      });
    } else {
      const checkDiameter = pressureLines.length > 0
        ? getDominantDiameter(pressureLines)
        : suctionLines.length > 0
        ? getDominantDiameter(suctionLines)
        : '50mm (2")';
      valves.push({
        diameter: checkDiameter,
        type: 'Válvula check',
        quantity: 1,
      });
    }

    return {
      elbows90,
      elbows45,
      tees,
      reducers,
      adapters,
      valves,
      couplings,
      adhesive: {
        quantity: Number(adhesiveLiters.toFixed(1)),
        unit: 'lt',
      },
    };
  },
};
