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
  hydrojetCount: number;
  hasBottomDrain: boolean;
  hasVacuumIntake: boolean;
  vacuumIntakeCount: number;
  // Adicionales
  additionalSkimmers?: number;
  additionalReturns?: number;
  additionalHydrojets?: number;
  additionalDrains?: number;
}

export interface PipeRequirement {
  lineType: 'SUCCION' | 'RETORNO' | 'HIDROJET' | 'ASPIRACION';
  description: string;
  diameter: string;
  totalMeters: number;
  accessoryCount: number;
  metersPerAccessory: number;
  recommendations: string[];
}

export interface PlumbingCalculationResult {
  pipeRequirements: PipeRequirement[];
  summary: {
    totalMeters: number;
    maxDistance: number;
    totalAccessories: number;
  };
}

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

    // 1. LÍNEA DE SUCCIÓN (Skimmers + Bottom Drain)
    const totalSkimmers = config.skimmerCount + (config.additionalSkimmers || 0);
    if (totalSkimmers > 0 || config.hasBottomDrain) {
      const accessoryCount = totalSkimmers + (config.hasBottomDrain ? 1 : 0);
      const totalMeters = maxDistance * accessoryCount;

      // Diámetro según cantidad de accesorios
      let diameter = '50mm (2")';
      if (accessoryCount >= 3) diameter = '63mm (2.5")';
      if (accessoryCount >= 5) diameter = '75mm (3")';

      const recommendations: string[] = [];
      if (totalSkimmers > 2) {
        recommendations.push('Considerar línea colectora de 63mm o mayor');
      }
      if (config.hasBottomDrain) {
        recommendations.push('El drenaje de fondo requiere línea independiente de 50mm mínimo');
      }

      pipeRequirements.push({
        lineType: 'SUCCION',
        description: `Línea de succión (${totalSkimmers} skimmers${config.hasBottomDrain ? ' + 1 drenaje de fondo' : ''})`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount,
        metersPerAccessory: maxDistance,
        recommendations,
      });
    }

    // 2. LÍNEA DE RETORNO
    const totalReturns = config.returnCount + (config.additionalReturns || 0);
    if (totalReturns > 0) {
      const totalMeters = maxDistance * totalReturns;

      // Diámetro según cantidad
      let diameter = '40mm (1.5")';
      if (totalReturns >= 4) diameter = '50mm (2")';

      const recommendations: string[] = [];
      if (totalReturns > 4) {
        recommendations.push('Considerar línea colectora de 50mm con derivaciones de 40mm');
      }

      pipeRequirements.push({
        lineType: 'RETORNO',
        description: `Línea de retorno (${totalReturns} retornos)`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalReturns,
        metersPerAccessory: maxDistance,
        recommendations,
      });
    }

    // 3. LÍNEA DE HIDROJETS (si tiene)
    const totalHydrojets = config.hydrojetCount + (config.additionalHydrojets || 0);
    if (totalHydrojets > 0) {
      const totalMeters = maxDistance * totalHydrojets;

      // Hidrojets generalmente requieren mayor presión
      let diameter = '40mm (1.5")';
      if (totalHydrojets >= 6) diameter = '50mm (2")';

      const recommendations: string[] = [
        'Los hidrojets requieren una bomba con mayor GPM',
        'Verificar presión mínima requerida por el fabricante',
      ];

      pipeRequirements.push({
        lineType: 'HIDROJET',
        description: `Línea de hidrojets (${totalHydrojets} hidrojets)`,
        diameter,
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalHydrojets,
        metersPerAccessory: maxDistance,
        recommendations,
      });
    }

    // 4. LÍNEA DE ASPIRACIÓN/VACUUM (si tiene)
    const totalVacuum = config.hasVacuumIntake ? (config.vacuumIntakeCount || 1) : 0;
    if (totalVacuum > 0) {
      const totalMeters = maxDistance * totalVacuum;

      pipeRequirements.push({
        lineType: 'ASPIRACION',
        description: `Línea de aspiración/vacuum (${totalVacuum} tomas)`,
        diameter: '40mm (1.5")',
        totalMeters: Math.ceil(totalMeters),
        accessoryCount: totalVacuum,
        metersPerAccessory: maxDistance,
        recommendations: ['La toma de aspiración puede compartir línea con retornos si se usa válvula selectora'],
      });
    }

    // Calcular totales
    const totalMeters = pipeRequirements.reduce((sum, req) => sum + req.totalMeters, 0);
    const totalAccessories = pipeRequirements.reduce((sum, req) => sum + req.accessoryCount, 0);

    return {
      pipeRequirements,
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
    let additionalHydrojets = 0;
    let additionalDrains = 0;

    // Analizar adicionales para contar accesorios hidráulicos
    additionals.forEach((additional: any) => {
      const name = (additional.customName || additional.accessory?.name || '').toLowerCase();
      const category = (additional.customCategory || additional.accessory?.type || '').toLowerCase();
      const quantity = additional.newQuantity || 0;

      if (name.includes('skimmer') || category.includes('skimmer')) {
        additionalSkimmers += quantity;
      } else if (name.includes('retorno') || name.includes('return') || category.includes('return')) {
        additionalReturns += quantity;
      } else if (name.includes('hidrojet') || name.includes('hydro') || category.includes('hydrojet')) {
        additionalHydrojets += quantity;
      } else if (name.includes('drenaje') || name.includes('drain') || category.includes('drain')) {
        additionalDrains += quantity;
      }
    });

    const config: PlumbingCalculationConfig = {
      poolLength: preset.length,
      poolWidth: preset.width,
      distanceToEquipment,
      skimmerCount: preset.skimmerCount || 0,
      returnCount: preset.returnsCount || 0,
      hydrojetCount: preset.hydroJetsCount || 0,
      hasBottomDrain: preset.hasBottomDrain || false,
      hasVacuumIntake: preset.hasVacuumIntake || false,
      vacuumIntakeCount: preset.vacuumIntakeCount || 1,
      additionalSkimmers,
      additionalReturns,
      additionalHydrojets,
      additionalDrains: additionalDrains > 0 ? additionalDrains : undefined,
    };

    return this.calculatePipeRequirements(config);
  },

  /**
   * Genera recomendaciones de accesorios (codos, tees, válvulas) basado en los caños
   */
  generateFittingsRecommendations(pipeRequirements: PipeRequirement[]): {
    elbows: { diameter: string; quantity: number }[];
    tees: { diameter: string; quantity: number }[];
    valves: { diameter: string; type: string; quantity: number }[];
  } {
    const elbows: { diameter: string; quantity: number }[] = [];
    const tees: { diameter: string; quantity: number }[] = [];
    const valves: { diameter: string; type: string; quantity: number }[] = [];

    pipeRequirements.forEach(req => {
      // Por cada accesorio, necesitamos aproximadamente:
      // - 4 codos (subida, bajada, conexiones)
      // - 1 tee si hay más de un accesorio en la línea
      // - 1 válvula por línea

      const elbowCount = req.accessoryCount * 4;
      elbows.push({
        diameter: req.diameter,
        quantity: elbowCount,
      });

      if (req.accessoryCount > 1) {
        tees.push({
          diameter: req.diameter,
          quantity: req.accessoryCount - 1, // Un tee menos que accesorios
        });
      }

      // Una válvula por tipo de línea
      valves.push({
        diameter: req.diameter,
        type: req.lineType === 'SUCCION' ? 'Válvula check' : 'Válvula de bola',
        quantity: 1,
      });
    });

    return { elbows, tees, valves };
  },
};
