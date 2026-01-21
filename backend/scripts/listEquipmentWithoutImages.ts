import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showAllEquipment() {
  const equipment = await prisma.equipmentPreset.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      brand: true,
      model: true,
      imageUrl: true
    },
    orderBy: [
      { type: 'asc' },
      { brand: 'asc' }
    ]
  });

  console.log('=== EQUIPOS SIN IMAGEN ===\n');
  const noImages = equipment.filter(e => e.imageUrl === null || e.imageUrl === undefined);

  const byType: Record<string, typeof noImages> = {};
  noImages.forEach(e => {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  });

  Object.entries(byType).forEach(([type, items]) => {
    console.log(`\n${type} (${items.length}):`);
    items.forEach(e => {
      console.log(`  - ${e.brand || 'Sin marca'} ${e.model || ''}: ${e.name}`);
    });
  });

  await prisma.$disconnect();
}

showAllEquipment().catch(console.error);
