import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const imageUpdates = [
  // BOMBAS VULCANO (imágenes reales del sitio oficial)
  {
    match: { brand: 'Vulcano', model: 'BAE 075' },
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106011.webp'
  },
  {
    match: { brand: 'Vulcano', model: 'BAE 100' },
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106014.webp'
  },
  {
    match: { brand: 'Vulcano', model: 'BAS 050' },
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106101.webp'
  },

  // FILTROS ASTRALPOOL (imagen real de Poolaria)
  {
    match: { brand: 'AstralPool', model: 'Aster 400' },
    imageUrl: 'https://www.poolaria.com/21718-big_default/filtro-aster-lateral.jpg'
  },
  {
    match: { brand: 'AstralPool', model: 'Aster 500' },
    imageUrl: 'https://www.poolaria.com/21718-big_default/filtro-aster-lateral.jpg'
  },
  {
    match: { brand: 'AstralPool', model: 'Aster 600' },
    imageUrl: 'https://www.poolaria.com/21718-big_default/filtro-aster-lateral.jpg'
  },

  // CLORADORES ASTRALPOOL (imagen real de Poolaria)
  {
    match: { brand: 'AstralPool', model: 'Next Salt' },
    imageUrl: 'https://www.poolaria.com/21287-big_default/e-next-astralpool.jpg'
  },
  {
    match: { brand: 'AstralPool', model: 'Next Salt Pro' },
    imageUrl: 'https://www.poolaria.com/21287-big_default/e-next-astralpool.jpg'
  },

  // BOMBAS FLUVIAL - Placeholder genérico de bomba de piscina
  {
    match: { brand: 'Fluvial', model: 'Plata 2' },
    imageUrl: 'https://via.placeholder.com/400x400/2563eb/ffffff?text=Fluvial+Plata+2'
  },
  {
    match: { brand: 'Fluvial', model: 'Plata 3' },
    imageUrl: 'https://via.placeholder.com/400x400/2563eb/ffffff?text=Fluvial+Plata+3'
  },
  {
    match: { brand: 'Fluvial', model: 'Plata 4' },
    imageUrl: 'https://via.placeholder.com/400x400/2563eb/ffffff?text=Fluvial+Plata+4'
  },
  {
    match: { brand: 'Fluvial', model: 'Plata 5' },
    imageUrl: 'https://via.placeholder.com/400x400/2563eb/ffffff?text=Fluvial+Plata+5'
  },
  {
    match: { brand: 'Fluvial', model: 'Trifásica 2HP' },
    imageUrl: 'https://via.placeholder.com/400x400/2563eb/ffffff?text=Fluvial+Trifásica+2HP'
  },

  // BOMBAS ESPA - Placeholder
  {
    match: { brand: 'Espa', model: 'NOX 75 15M' },
    imageUrl: 'https://via.placeholder.com/400x400/dc2626/ffffff?text=ESPA+NOX+75'
  },
  {
    match: { brand: 'Espa', model: 'Silen S 150 22M' },
    imageUrl: 'https://via.placeholder.com/400x400/dc2626/ffffff?text=ESPA+Silen+S+150'
  },

  // BOMBA VULCANO TRIFÁSICA - Placeholder
  {
    match: { brand: 'Vulcano', model: 'BAC 2-3' },
    imageUrl: 'https://via.placeholder.com/400x400/0891b2/ffffff?text=Vulcano+BAC+2-3'
  },
  {
    match: { brand: 'Vulcano', model: 'BAP 100' },
    imageUrl: 'https://via.placeholder.com/400x400/0891b2/ffffff?text=Vulcano+BAP+100'
  },

  // ARENA SÍLICE - Placeholder
  {
    match: { name: { contains: 'Arena' } },
    imageUrl: 'https://via.placeholder.com/400x400/a3a3a3/ffffff?text=Arena+Sílice'
  },

  // CALEFACTOR / INTERCAMBIADOR - Placeholder
  {
    match: { name: { contains: 'Intercambiador' } },
    imageUrl: 'https://via.placeholder.com/400x400/f97316/ffffff?text=Intercambiador'
  },
  {
    match: { name: { contains: 'Calefactor Solar' } },
    imageUrl: 'https://via.placeholder.com/400x400/f97316/ffffff?text=Calefactor+Solar'
  },

  // DOSIFICADOR CLORO - Placeholder
  {
    match: { name: { contains: 'Dosificador Cloro' } },
    imageUrl: 'https://via.placeholder.com/400x400/22c55e/ffffff?text=Dosificador+Cloro'
  },

  // LUCES LED - Placeholder
  {
    match: { name: { contains: 'Luz LED' } },
    imageUrl: 'https://via.placeholder.com/400x400/eab308/ffffff?text=Luz+LED+Piscina'
  },

  // TRANSFORMADOR - Placeholder
  {
    match: { name: { contains: 'Transformador' } },
    imageUrl: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=Transformador'
  },

  // REGULADOR NIVEL - Placeholder
  {
    match: { name: { contains: 'Regulador' } },
    imageUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Regulador+Nivel'
  },

  // TIMER - Placeholder
  {
    match: { name: { contains: 'Timer' } },
    imageUrl: 'https://via.placeholder.com/400x400/ec4899/ffffff?text=Timer+Digital'
  }
];

async function addAllImages() {
  console.log('Agregando imágenes a todos los equipos...\n');

  let updated = 0;
  let skipped = 0;

  for (const update of imageUpdates) {
    try {
      const result = await prisma.equipmentPreset.updateMany({
        where: update.match as any,
        data: {
          imageUrl: update.imageUrl
        }
      });

      if (result.count > 0) {
        console.log(`✅ Actualizado: ${JSON.stringify(update.match)} (${result.count} equipos)`);
        updated += result.count;
      } else {
        console.log(`⏭️  No encontrado: ${JSON.stringify(update.match)}`);
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error con ${JSON.stringify(update.match)}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Actualizados: ${updated}`);
  console.log(`   Omitidos: ${skipped}`);

  // Mostrar resumen final
  const types = ['PUMP', 'FILTER', 'CHLORINATOR', 'HEATER', 'LIGHTING', 'OTHER'];

  console.log('\n📷 Estado de imágenes por tipo:\n');
  for (const type of types) {
    const total = await prisma.equipmentPreset.count({
      where: { type, isActive: true }
    });

    const withImages = await prisma.equipmentPreset.count({
      where: {
        type,
        isActive: true,
        imageUrl: { not: null }
      }
    });

    const percentage = total > 0 ? Math.round((withImages / total) * 100) : 0;
    console.log(`   ${type}: ${withImages}/${total} (${percentage}%)`);
  }

  await prisma.$disconnect();
}

addAllImages().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
