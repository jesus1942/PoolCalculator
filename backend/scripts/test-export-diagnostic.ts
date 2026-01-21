/**
 * Script de diagnóstico para la exportación
 * Verifica qué datos se están generando y si los cálculos son correctos
 */

import { PrismaClient } from '@prisma/client';
import { calculateHydraulicSystem } from '../src/utils/hydraulicCalculations';
import { calculateElectricalSystem } from '../src/utils/electricalCalculations';

const prisma = new PrismaClient();

async function diagnosticExport() {
  try {
    console.log('='.repeat(60));
    console.log('DIAGNÓSTICO DE EXPORTACIÓN');
    console.log('='.repeat(60));
    console.log('');

    // Obtener el proyecto más reciente
    const projects = await prisma.project.findMany({
      take: 1,
      orderBy: { createdAt: 'desc' },
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

    if (projects.length === 0) {
      console.log('❌ No hay proyectos en la base de datos');
      return;
    }

    const project = projects[0];
    console.log(`📋 Proyecto: ${project.name}`);
    console.log(`👤 Cliente: ${project.clientName}`);
    console.log(`🏊 Volumen: ${project.volume} m³`);
    console.log('');

    // Extraer configuraciones
    const plumbingConfig = (project.plumbingConfig as any) || {};
    const electricalConfig = (project.electricalConfig as any) || {};
    const materials = (project.materials as any) || {};

    console.log('📊 DATOS ACTUALES DEL PROYECTO:');
    console.log('-'.repeat(60));

    console.log('Excavación:');
    console.log(`  - Largo: ${project.excavationLength} m`);
    console.log(`  - Ancho: ${project.excavationWidth} m`);
    console.log(`  - Profundidad: ${project.excavationDepth} m`);
    console.log(`  - Volumen: ${(project.excavationLength * project.excavationWidth * project.excavationDepth).toFixed(2)} m³`);
    console.log('');

    console.log('Materiales guardados:');
    console.log(JSON.stringify(materials, null, 2));
    console.log('');

    console.log('Configuración de plomería:');
    console.log(`  - Distancia a equipo: ${plumbingConfig.distanceToEquipment || 'No definida'} m`);
    console.log(`  - Items seleccionados: ${(plumbingConfig.selectedItems || []).length}`);
    console.log('');

    console.log('Configuración eléctrica:');
    console.log(`  - Total Watts: ${electricalConfig.totalWatts || 0} W`);
    console.log(`  - Amperaje: ${electricalConfig.totalWatts ? (electricalConfig.totalWatts / 220).toFixed(1) : 0} A`);
    console.log('');

    // Ejecutar cálculos hidráulicos
    console.log('🔧 EJECUTANDO CÁLCULOS HIDRÁULICOS:');
    console.log('-'.repeat(60));

    try {
      const availableEquipment = await prisma.equipmentPreset.findMany({
        where: { type: { in: ['PUMP', 'FILTER'] } }
      });

      const distanceToEquipment = plumbingConfig.distanceToEquipment || 8;
      const staticLift = 1.5;

      console.log(`Parámetros:`);
      console.log(`  - Distancia a equipo: ${distanceToEquipment} m`);
      console.log(`  - Altura estática: ${staticLift} m`);
      console.log(`  - Equipos disponibles: ${availableEquipment.length}`);
      console.log('');

      const hydraulicAnalysis = calculateHydraulicSystem(
        project as any,
        distanceToEquipment,
        staticLift,
        availableEquipment
      );

      console.log('Resultados:');
      console.log(`  ✓ TDH Total: ${hydraulicAnalysis.totalDynamicHead?.toFixed(2) || 'N/A'} m`);
      console.log(`  ✓ Pérdida por fricción: ${hydraulicAnalysis.frictionLoss?.total?.toFixed(2) || 'N/A'} m`);
      console.log(`  ✓ Pérdida singular: ${hydraulicAnalysis.singularLoss?.total?.toFixed(2) || 'N/A'} m`);
      console.log(`  ✓ Bomba recomendada: ${hydraulicAnalysis.recommendedPump?.name || 'No encontrada'}`);

      if (hydraulicAnalysis.warnings.length > 0) {
        console.log('\n  ⚠ Advertencias:');
        hydraulicAnalysis.warnings.forEach(w => console.log(`    - ${w}`));
      }

      if (hydraulicAnalysis.errors.length > 0) {
        console.log('\n  ❌ Errores:');
        hydraulicAnalysis.errors.forEach(e => console.log(`    - ${e}`));
      }
    } catch (error: any) {
      console.log(`  ❌ Error en cálculos hidráulicos: ${error.message}`);
      console.error(error);
    }
    console.log('');

    // Ejecutar cálculos eléctricos
    console.log('⚡ EJECUTANDO CÁLCULOS ELÉCTRICOS:');
    console.log('-'.repeat(60));

    try {
      const electricalAnalysis = calculateElectricalSystem(
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

      console.log('Resultados:');
      console.log(`  ✓ Potencia instalada: ${electricalAnalysis.totalPowerInstalled || 0} W`);
      console.log(`  ✓ Potencia demanda: ${electricalAnalysis.totalPowerDemand || 0} W`);
      console.log(`  ✓ Corriente total: ${electricalAnalysis.totalCurrent?.toFixed(2) || 0} A`);
      console.log(`  ✓ Sección de cable: ${electricalAnalysis.cable?.sectionLabel || 'N/A'}`);
      console.log(`  ✓ Térmica: ${electricalAnalysis.protection?.breaker || 'N/A'} A`);
      console.log(`  ✓ Diferencial: ${electricalAnalysis.protection?.rcd || 'N/A'} A`);

      if (electricalAnalysis.warnings.length > 0) {
        console.log('\n  ⚠ Advertencias:');
        electricalAnalysis.warnings.forEach(w => console.log(`    - ${w}`));
      }

      if (electricalAnalysis.errors.length > 0) {
        console.log('\n  ❌ Errores:');
        electricalAnalysis.errors.forEach(e => console.log(`    - ${e}`));
      }
    } catch (error: any) {
      console.log(`  ❌ Error en cálculos eléctricos: ${error.message}`);
      console.error(error);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('DIAGNÓSTICO COMPLETO');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error en diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticExport();
