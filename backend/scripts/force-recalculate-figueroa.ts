import { PrismaClient } from '@prisma/client';
import { calculateTileMaterials } from '../src/utils/tileCalculations';
import { calculateBedMaterials } from '../src/utils/bedCalculations';

const prisma = new PrismaClient();

async function forceRecalculate() {
  try {
    // Obtener proyecto
    const project = await prisma.project.findUnique({
      where: { id: '83fec826-4269-4f72-b4c1-2ceb6d2f8b33' },
      include: { poolPreset: true },
    });

    if (!project) {
      console.log('❌ Proyecto no encontrado');
      return;
    }

    console.log('📊 Recalculando proyecto:', project.name);

    // Obtener settings
    const settings = await prisma.calculationSettings.findFirst({
      where: { userId: project.userId },
    });

    if (!settings) {
      console.log('❌ Settings no encontrados');
      return;
    }

    // Obtener losetas
    const tilePresets = await prisma.tilePreset.findMany();

    // Obtener precios de materiales
    const materialPrices = await prisma.constructionMaterialPreset.findMany({
      select: {
        name: true,
        type: true,
        pricePerUnit: true,
        unit: true,
        bagWeight: true,
      },
    });

    console.log('🧮 Ejecutando cálculos...');

    // Calcular losetas
    const tileCalculations = calculateTileMaterials(
      project.poolPreset!,
      project.tileCalculation as any,
      tilePresets,
      settings,
      materialPrices as any
    );

    // Calcular cama
    const bedCalculations = calculateBedMaterials(
      project.poolPreset!,
      settings,
      materialPrices as any
    );

    // Combinar materiales
    const allMaterials = {
      ...tileCalculations.materials,
      ...bedCalculations.bedMaterials,
      tiles: tileCalculations.tiles,
    };

    const totalMaterialCost = tileCalculations.totalMaterialCost + bedCalculations.totalBedMaterialCost;

    console.log('\n✅ NUEVOS VALORES CALCULADOS:');
    console.log(JSON.stringify(tileCalculations.tiles, null, 2));

    // Actualizar proyecto
    await prisma.project.update({
      where: { id: project.id },
      data: {
        materials: allMaterials as any,
        sidewalkArea: tileCalculations.sidewalkArea,
        totalTileArea: tileCalculations.sidewalkArea,
        materialCost: totalMaterialCost,
        totalCost: totalMaterialCost + (project.laborCost || 0),
      },
    });

    console.log('\n✅ Proyecto actualizado correctamente en la BD');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceRecalculate();
