import prisma from '../src/config/database';

async function checkAkesseImages() {
  console.log('🔍 Verificando pools de Akesse en la base de datos...\n');

  try {
    // Contar todos los presets
    const totalPresets = await prisma.poolPreset.count();
    console.log(`📊 Total de presets en BD: ${totalPresets}`);

    // Contar presets de Akesse
    const akesseCount = await prisma.poolPreset.count({
      where: { vendor: 'Akesse' }
    });
    console.log(`🏷️  Presets de Akesse: ${akesseCount}`);

    // Obtener primeros 5 de Akesse
    const akessePools = await prisma.poolPreset.findMany({
      where: { vendor: 'Akesse' },
      take: 5,
      select: {
        id: true,
        name: true,
        vendor: true,
        imageUrl: true,
        length: true,
        width: true,
        depth: true
      }
    });

    console.log('\n🏊 Primeros 5 pools de Akesse:\n');
    akessePools.forEach((pool, idx) => {
      console.log(`${idx + 1}. ${pool.name}`);
      console.log(`   Dimensiones: ${pool.length} x ${pool.width} x ${pool.depth}`);
      console.log(`   ImageUrl: ${pool.imageUrl || 'NO TIENE'}`);
      console.log('');
    });

    // Contar cuántos tienen imageUrl
    const akesseWithImages = await prisma.poolPreset.count({
      where: {
        vendor: 'Akesse',
        imageUrl: { not: null }
      }
    });
    console.log(`✅ Presets de Akesse con imageUrl: ${akesseWithImages} / ${akesseCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAkesseImages();
