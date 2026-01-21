/**
 * Script para recalcular TODOS los proyectos existentes con el nuevo algoritmo de losetas
 * Este script actualiza los cálculos de losetas siguiendo las nuevas reglas profesionales
 */

import prisma from '../src/config/database';
import { calculateTileMaterials } from '../src/utils/tileCalculations';

async function recalculateAllProjects() {
  console.log('='.repeat(80));
  console.log('RECALCULANDO PROYECTOS CON NUEVO ALGORITMO DE LOSETAS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Obtener todos los proyectos que tienen tileCalculation
    const projects = await prisma.project.findMany({
      where: {
        tileCalculation: {
          not: {},
        },
      },
      include: {
        poolPreset: true,
      },
    });

    console.log(`📊 Proyectos encontrados con configuración de losetas: ${projects.length}`);
    console.log('');

    if (projects.length === 0) {
      console.log('⚠️  No hay proyectos para recalcular');
      return;
    }

    // Obtener presets de losetas
    const tilePresets = await prisma.tilePreset.findMany();
    console.log(`📐 Presets de losetas disponibles: ${tilePresets.length}`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      console.log('─'.repeat(80));
      console.log(`\n🔄 Procesando: ${project.name} (ID: ${project.id})`);
      console.log(`   Piscina: ${project.poolPreset.name} (${project.poolPreset.length}m × ${project.poolPreset.width}m)`);

      try {
        // Verificar que tenga tileCalculation configurado
        const tileConfig = project.tileCalculation as any;

        if (!tileConfig || !tileConfig.north) {
          console.log('   ⚠️  Sin configuración de losetas, saltando...');
          continue;
        }

        // Obtener settings del usuario
        const settings = await prisma.calculationSettings.findUnique({
          where: { userId: project.userId },
        });

        if (!settings) {
          console.log('   ⚠️  Usuario sin settings de cálculo, saltando...');
          continue;
        }

        // Obtener precios de materiales (globales)
        const materialPrices = await prisma.constructionMaterialPreset.findMany();

        console.log('   Calculando con nuevo algoritmo...');

        // Recalcular con el nuevo algoritmo
        const newCalculations = calculateTileMaterials(
          project.poolPreset,
          tileConfig,
          tilePresets,
          {
            adhesiveKgPerM2: settings.adhesiveKgPerM2,
            sidewalkBaseThicknessCm: settings.sidewalkBaseThicknessCm,
            cementKgPerM3: settings.cementKgPerM3,
            sandM3PerM3: settings.sandM3PerM3,
            gravelM3PerM3: settings.gravelM3PerM3,
            groutJointWidthMm: settings.groutJointWidthMm,
            whiteCementKgPerLinealM: settings.whiteCementKgPerLinealM,
            marmolinaKgPerLinealM: settings.marmolinaKgPerLinealM,
            wireMeshM2PerM2: settings.wireMeshM2PerM2,
            waterproofingKgPerM2: settings.waterproofingKgPerM2,
            waterproofingCoats: settings.waterproofingCoats,
          },
          materialPrices.map(m => ({
            name: m.name,
            type: m.type,
            pricePerUnit: m.pricePerUnit,
            unit: m.unit,
            bagWeight: m.bagWeight,
          }))
        );

        console.log('   ✓ Cálculo completado');
        console.log(`   📦 Losetas totales: ${JSON.stringify(newCalculations.tiles)}`);
        console.log(`   💰 Costo materiales: $${newCalculations.totalMaterialCost.toFixed(2)}`);

        // Actualizar el proyecto con los nuevos cálculos
        // Calcular nuevo materialCost y totalCost
        const oldMaterialCost = project.materialCost || 0;
        const oldTileCost = (project.materials as any)?.tiles?.totalMaterialCost || 0;
        const newMaterialCost = oldMaterialCost - oldTileCost + newCalculations.totalMaterialCost;
        const newTotalCost = newMaterialCost + (project.laborCost || 0);

        await prisma.project.update({
          where: { id: project.id },
          data: {
            sidewalkArea: newCalculations.sidewalkArea,
            materials: {
              ...(project.materials as any),
              tiles: {
                materials: newCalculations.materials,
                totalMaterialCost: newCalculations.totalMaterialCost,
                tiles: newCalculations.tiles,
              },
            },
            materialCost: newMaterialCost,
            totalCost: newTotalCost,
          },
        });

        console.log('   ✅ Proyecto actualizado exitosamente');
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error procesando proyecto ${project.name}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('RESUMEN DE RECALCULACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Proyectos actualizados: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${successCount + errorCount}`);
    console.log('');
    console.log('🎉 Recalculación completada!');

  } catch (error) {
    console.error('❌ Error fatal en el script de recalculación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
recalculateAllProjects()
  .then(() => {
    console.log('✓ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script finalizado con errores:', error);
    process.exit(1);
  });
