import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPlaceholders() {
  console.log('Agregando placeholders a equipos sin imagen...\n');

  // Agregar placeholders temporales
  const updated = await prisma.equipmentPreset.updateMany({
    where: {
      type: 'PUMP',
      imageUrl: null
    },
    data: {
      imageUrl: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Bomba+de+Piscina',
      catalogPage: 'https://ejemplo.com/catalogo'
    }
  });

  console.log(`✅ Placeholders agregados a ${updated.count} bombas\n`);

  // Mostrar bombas argentinas
  const pumps = await prisma.equipmentPreset.findMany({
    where: { brand: { in: ['Fluvial', 'Vulcano', 'Espa'] } },
    select: {
      name: true,
      brand: true,
      flowRate: true,
      maxHead: true,
      pricePerUnit: true,
      imageUrl: true
    },
    orderBy: [
      { brand: 'asc' },
      { power: 'asc' }
    ]
  });

  console.log('📋 Bombas argentinas en el catálogo:\n');
  console.table(pumps);

  await prisma.$disconnect();
}

addPlaceholders().catch(console.error);
