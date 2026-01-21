/**
 * Script para probar el endpoint de cálculos profesionales
 */
import { PrismaClient } from '@prisma/client';
import { generateProfessionalRecommendation } from '../src/utils/equipmentSelection';

const prisma = new PrismaClient();

async function testProfessionalCalculations() {
  try {
    console.log('\n🧪 Probando cálculos profesionales...\n');

    // Obtener un proyecto de ejemplo
    const projects = await prisma.project.findMany({
      take: 1,
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

    if (projects.length === 0) {
      console.error('❌ No hay proyectos en la base de datos');
      return;
    }

    const project = projects[0];
    console.log(`📋 Proyecto de prueba: ${project.name}`);
    console.log(`   Volumen: ${project.volume} m³`);
    console.log(`   Forma: ${project.poolPreset.shape}`);
    console.log(`   Dimensiones: ${project.poolPreset.length}m x ${project.poolPreset.width}m x ${project.poolPreset.depth}m\n`);

    // Obtener equipos disponibles
    const allEquipment = await prisma.equipmentPreset.findMany({
      where: { isActive: true }
    });

    console.log(`🔧 Equipos disponibles en base de datos:`);
    console.log(`   Bombas: ${allEquipment.filter(e => e.type === 'PUMP').length}`);
    console.log(`   Filtros: ${allEquipment.filter(e => e.type === 'FILTER').length}`);
    console.log(`   Total: ${allEquipment.length}\n`);

    // Mostrar algunas bombas con sus datos técnicos
    const pumps = allEquipment.filter(e => e.type === 'PUMP');
    console.log(`📊 Bombas disponibles con datos técnicos:`);
    pumps.slice(0, 5).forEach(pump => {
      console.log(`   - ${pump.name}`);
      console.log(`     Volumen: ${pump.minPoolVolume || 'N/A'} - ${pump.maxPoolVolume || 'N/A'} m³`);
      console.log(`     Caudal: ${pump.flowRate || 'N/A'} m³/h | Altura: ${pump.maxHead || 'N/A'} m`);
    });
    console.log('');

    // Probar la generación de recomendación profesional
    console.log('🔬 Ejecutando generateProfessionalRecommendation()...\n');

    const recommendation = generateProfessionalRecommendation(
      project as any,
      5,  // distanceToEquipment
      1.5, // staticLift
      allEquipment,
      {
        voltage: 220,
        installationType: 'CONDUIT',
        ambientTemp: 25,
        maxVoltageDrop: 3,
        electricityCostPerKwh: 50
      }
    );

    if (!recommendation) {
      console.error('\n❌ generateProfessionalRecommendation() retornó NULL');
      console.error('   Esto significa que no se pudo seleccionar bomba o filtro adecuado\n');

      // Intentar seleccionar bomba manualmente para ver qué falla
      const { selectPump, selectFilter } = await import('../src/utils/equipmentSelection');

      console.log('🔍 Intentando selección manual de bomba...');
      const pump = selectPump(project.volume, allEquipment);
      if (pump) {
        console.log(`✅ Bomba encontrada: ${pump.name}`);
      } else {
        console.error(`❌ No se encontró bomba para volumen ${project.volume} m³`);
      }

      console.log('\n🔍 Intentando selección manual de filtro...');
      const filter = selectFilter(project.volume, allEquipment);
      if (filter) {
        console.log(`✅ Filtro encontrado: ${filter.name}`);
      } else {
        console.error(`❌ No se encontró filtro para volumen ${project.volume} m³`);
      }

      return;
    }

    console.log('\n✅ Recomendación generada exitosamente!\n');
    console.log(`💧 BOMBA RECOMENDADA: ${recommendation.pump.name}`);
    console.log(`   Caudal: ${recommendation.pump.flowRate} m³/h`);
    console.log(`   Altura: ${recommendation.pump.maxHead} m`);
    console.log(`   Precio: $${recommendation.pump.pricePerUnit}\n`);

    console.log(`🔵 FILTRO RECOMENDADO: ${recommendation.filter.name}`);
    console.log(`   Diámetro: ${recommendation.filter.filterDiameter} mm`);
    console.log(`   Área: ${recommendation.filter.filterArea} m²`);
    console.log(`   Arena: ${recommendation.filter.sandRequired} kg`);
    console.log(`   Precio: $${recommendation.filter.pricePerUnit}\n`);

    if (recommendation.hydraulicAnalysis) {
      console.log(`🌊 ANÁLISIS HIDRÁULICO:`);
      console.log(`   TDH Total: ${recommendation.hydraulicAnalysis.totalDynamicHead.toFixed(2)} m`);
      console.log(`   Caudal requerido: ${recommendation.hydraulicAnalysis.pumpSelectionDetails.requiredFlowRate.toFixed(2)} m³/h`);
      console.log(`   Warnings: ${recommendation.hydraulicAnalysis.warnings.length}`);
      console.log(`   Errors: ${recommendation.hydraulicAnalysis.errors.length}`);
      console.log(`   Válido: ${recommendation.hydraulicAnalysis.isValid ? '✅' : '❌'}\n`);
    }

    if (recommendation.electricalAnalysis) {
      console.log(`⚡ ANÁLISIS ELÉCTRICO:`);
      console.log(`   Potencia total: ${recommendation.electricalAnalysis.totalPowerDemand.toFixed(2)} W`);
      console.log(`   Corriente: ${recommendation.electricalAnalysis.totalCurrent.toFixed(2)} A`);
      console.log(`   Cable: ${recommendation.electricalAnalysis.cable.sectionLabel}`);
      console.log(`   Térmica: ${recommendation.electricalAnalysis.protection.breaker}A`);
      console.log(`   Diferencial: ${recommendation.electricalAnalysis.protection.rcd}A`);
      console.log(`   Costo mensual: $${recommendation.electricalAnalysis.operatingCost.monthlyCost.toFixed(2)}\n`);
    }

    console.log(`🔧 ACCESORIOS REQUERIDOS: ${recommendation.requiredAccessories.length}`);
    recommendation.requiredAccessories.forEach(acc => {
      console.log(`   - ${acc.name} (x${acc.capacity || 1})`);
    });

    console.log(`\n🔥 OPCIONES DE CALEFACCIÓN: ${recommendation.heatingOptions.length}`);
    recommendation.heatingOptions.slice(0, 3).forEach(heater => {
      console.log(`   - ${heater.name}`);
    });

  } catch (error) {
    console.error('\n💥 Error durante la prueba:', error);
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testProfessionalCalculations();
