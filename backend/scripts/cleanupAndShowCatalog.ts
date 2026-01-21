import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  // Eliminar bombas con modelos antiguos incorrectos
  const deleted = await prisma.equipmentPreset.deleteMany({
    where: {
      OR: [
        { model: { in: ['FLU-050', 'FLU-075', 'FLU-100', 'FLU-150', 'FLU-200T', 'FLU-300T'] } },
        { model: { in: ['Modelo 33', 'Modelo 44', 'Modelo 55', 'Modelo 66'] } },
        { model: { in: ['Nox 25 4M', 'Nox 40 5M', 'Silen S 75 15M', 'Silen S 150 26M'] } }
      ]
    }
  });

  console.log(`Bombas con nombres incorrectos eliminadas: ${deleted.count}`);

  // Mostrar resumen actualizado
  console.log('\n=== CATÁLOGO ACTUALIZADO CON DATOS REALES ===\n');

  const brands = ['Fluvial', 'Vulcano', 'Espa'];
  for (const brand of brands) {
    console.log(`\n${brand.toUpperCase()}:`);
    const pumps = await prisma.equipmentPreset.findMany({
      where: { brand, type: 'PUMP', isActive: true },
      select: {
        name: true,
        model: true,
        power: true,
        flowRate: true,
        maxHead: true,
        pricePerUnit: true,
        imageUrl: true,
        catalogPage: true
      },
      orderBy: { power: 'asc' }
    });

    pumps.forEach(p => {
      const hasImage = p.imageUrl ? '📷' : '⬜';
      const hasCatalog = p.catalogPage ? '🔗' : '';
      console.log(`  ${hasImage}${hasCatalog} ${p.name}`);
      console.log(`     Caudal: ${p.flowRate} m³/h | Altura: ${p.maxHead}m | Precio: $${p.pricePerUnit?.toLocaleString() || 'N/A'}`);
    });

    console.log(`  Total: ${pumps.length} modelos`);
  }

  await prisma.$disconnect();
}

cleanup().catch(console.error);
