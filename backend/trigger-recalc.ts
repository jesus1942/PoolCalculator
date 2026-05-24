import prisma from './src/config/database';
import { calculateTileMaterials } from './src/utils/tileCalculations';
import { calculateBedMaterials } from './src/utils/bedCalculations';

// Uso: npx ts-node trigger-recalc.ts [projectId o nombre]
const arg = process.argv[2];

async function recalculate() {
  let project;

  if (arg && arg.includes('-')) {
    // Es un UUID
    project = await prisma.project.findUnique({
      where: { id: arg },
      include: { poolPreset: true }
    });
  } else {
    // Es un nombre
    project = await prisma.project.findFirst({
      where: { name: arg || 'Familia Cayo' },
      include: { poolPreset: true }
    });
  }

  if (!project || !project.poolPreset) {
    console.log('Proyecto no encontrado:', arg);
    await prisma.$disconnect();
    return;
  }

  console.log(`Proyecto: ${project.name} (${project.id})`);
  console.log(`Pileta: ${project.poolPreset.length}m × ${project.poolPreset.width}m`);
  console.log(`sidewalkArea actual (BD): ${project.sidewalkArea} m²`);
  console.log(`tileCalculation:`, JSON.stringify(project.tileCalculation, null, 2));

  if (!project.tileCalculation || Object.keys(project.tileCalculation as any).length === 0) {
    console.log('\nNo hay tileCalculation configurado.');
    await prisma.$disconnect();
    return;
  }

  const settings = await prisma.calculationSettings.findUnique({
    where: { userId: project.userId }
  });

  if (!settings) {
    console.log('Settings no encontrados');
    await prisma.$disconnect();
    return;
  }

  const tilePresets = await prisma.tilePreset.findMany();
  const materialPrices = await prisma.constructionMaterialPreset.findMany({
    select: { id: true, name: true, type: true, pricePerUnit: true, unit: true, bagWeight: true }
  });

  console.log('\n🧮 Recalculando materiales...\n');

  const tileCalculations = calculateTileMaterials(
    project.poolPreset,
    project.tileCalculation as any,
    tilePresets,
    settings as any,
    materialPrices
  );

  console.log(`✅ Área de vereda: ${tileCalculations.sidewalkArea.toFixed(2)} m²`);
  console.log('Losetas:');
  tileCalculations.tiles.forEach((tile: any) => {
    console.log(`  - ${tile.tileName}: ${tile.quantity} ${tile.unit} (${tile.type})`);
  });

  const bedCalculations = calculateBedMaterials(
    project.poolPreset,
    settings as any
  );

  const allMaterials = {
    ...tileCalculations.materials,
    ...bedCalculations.bedMaterials,
    tiles: tileCalculations.tiles,
  };

  const totalMaterialCost = tileCalculations.totalMaterialCost + bedCalculations.totalBedMaterialCost;

  await prisma.project.update({
    where: { id: project.id },
    data: {
      sidewalkArea: tileCalculations.sidewalkArea,
      totalTileArea: tileCalculations.sidewalkArea,
      materials: allMaterials as any,
      materialCost: totalMaterialCost,
      totalCost: totalMaterialCost + (project.laborCost || 0),
    }
  });

  console.log('\n✅ Proyecto actualizado con nuevos cálculos');

  await prisma.$disconnect();
}

recalculate();
