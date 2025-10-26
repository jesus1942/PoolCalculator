import prisma from './src/config/database';

async function configureTiles() {
  const project = await prisma.project.findFirst({
    where: { name: 'Familia Cayo' }
  });

  if (!project) {
    console.log('Proyecto no encontrado');
    return;
  }

  const commonTile = await prisma.tilePreset.findFirst({
    where: { name: { contains: 'Antideslizante 30x30' } }
  });

  if (!commonTile) {
    console.log('Loseta no encontrada');
    return;
  }

  const tileConfig = {
    north: {
      firstRingType: 'LOMO_BALLENA',
      rows: 3,
      selectedTileId: commonTile.id
    },
    south: {
      firstRingType: 'LOMO_BALLENA',
      rows: 3,
      selectedTileId: commonTile.id
    },
    east: {
      firstRingType: 'LOMO_BALLENA',
      rows: 2,
      selectedTileId: commonTile.id
    },
    west: {
      firstRingType: 'LOMO_BALLENA',
      rows: 2,
      selectedTileId: commonTile.id
    }
  };

  await prisma.project.update({
    where: { id: project.id },
    data: { tileCalculation: tileConfig }
  });

  console.log('Configuracion guardada:');
  console.log(JSON.stringify(tileConfig, null, 2));

  await prisma.$disconnect();
}

configureTiles();
