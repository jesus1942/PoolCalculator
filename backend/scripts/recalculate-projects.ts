import prisma from '../src/config/database';
import { calculateTileMaterials } from '../src/utils/tileCalculations';
import { calculateBedMaterials } from '../src/utils/bedCalculations';

async function recalculateAllProjects() {
  console.log('🔄 Iniciando recálculo de todos los proyectos...\n');

  try {
    // Obtener todos los proyectos con sus relaciones
    const projects = await prisma.project.findMany({
      include: {
        poolPreset: true,
        user: {
          include: {
            calculationSettings: true,
          },
        },
      },
    });

    console.log(`📊 Total de proyectos encontrados: ${projects.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        console.log(`\n⚙️  Procesando proyecto: ${project.name} (ID: ${project.id.substring(0, 8)})`);
        console.log(`   Cliente: ${project.clientName}`);

        // Obtener settings del usuario
        const userSettings = project.user.calculationSettings;
        if (!userSettings) {
          console.log(`   ⏭️  Usuario sin settings, saltando proyecto`);
          continue;
        }

        // Obtener presets de materiales con precios
        const materialPrices = await prisma.constructionMaterialPreset.findMany();

        // Recalcular materiales de cama
        const bedCalc = calculateBedMaterials(
          project.poolPreset,
          userSettings as any,
          materialPrices
        );

        // Recalcular materiales de losetas
        const tileConfig = project.tileCalculation as any;
        let tileCalc;

        if (tileConfig && Object.keys(tileConfig).length > 0) {
          const tilePresets = await prisma.tilePreset.findMany();
          tileCalc = calculateTileMaterials(
            project.poolPreset,
            tileConfig,
            tilePresets,
            userSettings as any,
            materialPrices
          );
        }

        // Combinar materiales
        const updatedMaterials = {
          ...bedCalc.bedMaterials,
          ...(tileCalc?.materials || {}),
        };

        // Calcular costo total de materiales
        const totalMaterialCost = bedCalc.totalBedMaterialCost + (tileCalc?.totalMaterialCost || 0);

        // Actualizar proyecto en base de datos
        await prisma.project.update({
          where: { id: project.id },
          data: {
            materials: updatedMaterials,
            materialCost: totalMaterialCost,
            totalCost: totalMaterialCost + project.laborCost,
            sidewalkArea: tileCalc?.sidewalkArea || project.sidewalkArea,
            totalTileArea: tileCalc?.sidewalkArea || project.totalTileArea,
          },
        });

        console.log(`   ✅ Recalculado exitosamente`);
        console.log(`   💰 Costo materiales: $${totalMaterialCost.toLocaleString('es-AR')}`);
        if (tileCalc) {
          console.log(`   📐 Área vereda: ${tileCalc.sidewalkArea.toFixed(2)} m²`);
          console.log(`   🔢 Tipos de losetas: ${tileCalc.tiles.length}`);
        }

        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Error al procesar proyecto ${project.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ Recálculo completado`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✔️  Proyectos recalculados exitosamente: ${successCount}`);
    console.log(`❌ Proyectos con errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${projects.length}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('\n❌ Error fatal al recalcular proyectos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
recalculateAllProjects();
