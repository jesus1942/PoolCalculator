import prisma from './src/config/database';
import { calculateTileMaterials } from './src/utils/tileCalculations';
import { calculateBedMaterials } from './src/utils/bedCalculations';

async function recalculate() {
  const project = await prisma.project.findFirst({
    where: { name: 'Familia Cayo' },
    include: { poolPreset: true }
  });

  if (!project || !project.poolPreset) {
    console.log('Proyecto no encontrado');
    return;
  }

  const settings = await prisma.calculationSettings.findUnique({
    where: { userId: project.userId }
  });

  if (!settings) {
    console.log('Settings no encontrados');
    return;
  }

  const tilePresets = await prisma.tilePreset.findMany();

  console.log('🧮 Recalculando materiales...\n');

  const tileCalculations = calculateTileMaterials(
    project.poolPreset,
    project.tileCalculation as any,
    tilePresets,
    settings as any
  );

  console.log('✅ Área de vereda:', tileCalculations.sidewalkArea, 'm²');
  console.log('✅ Losetas calculadas:', tileCalculations.tiles.length);
  console.log('\nLosetas:');
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

  console.log('\nMateriales de vereda:');
  Object.entries(tileCalculations.materials).forEach(([key, value]: [string, any]) => {
    console.log(`  - ${key}: ${value.quantity} ${value.unit}`);
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      sidewalkArea: tileCalculations.sidewalkArea,
      totalTileArea: tileCalculations.sidewalkArea,
      materials: allMaterials as any
    }
  });

  console.log('\n✅ Proyecto actualizado con nuevos cálculos');

  await prisma.$disconnect();
}

recalculate();
