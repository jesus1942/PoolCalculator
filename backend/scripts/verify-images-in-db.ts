import prisma from '../src/config/database';

async function verifyImagesInDb() {
  console.log('🔍 Verificando imágenes en la base de datos...\n');

  try {
    const pools = await prisma.poolPreset.findMany({
      where: { vendor: 'Akesse' },
      select: {
        name: true,
        vendor: true,
        imageUrl: true,
        length: true,
        width: true,
        depth: true
      },
      take: 5
    });

    console.log(`✅ Encontrados ${pools.length} modelos de Akesse:\n`);

    pools.forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.name}`);
      console.log(`   Dimensiones: ${pool.length}m × ${pool.width}m × ${pool.depth}m`);
      console.log(`   Imagen: ${pool.imageUrl ? '✅ SÍ' : '❌ NO'}`);
      if (pool.imageUrl) {
        console.log(`   URL: ${pool.imageUrl.substring(0, 80)}...`);
      }
      console.log('');
    });

    const withImages = pools.filter(p => p.imageUrl).length;
    console.log(`📊 Estadísticas:`);
    console.log(`   Total: ${pools.length}`);
    console.log(`   Con imagen: ${withImages}`);
    console.log(`   Sin imagen: ${pools.length - withImages}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImagesInDb();
