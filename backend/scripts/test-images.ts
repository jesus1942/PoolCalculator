import { catalogScraperService } from '../src/services/catalogScraperService';

async function testImageScraping() {
  console.log('🖼️  Probando scraping de imágenes de Akesse...\n');

  try {
    const jobId = `test-images-${Date.now()}`;
    const result = await catalogScraperService.scrapeFromUrl(
      'https://akesse.com.uy/piscinas',
      'Akesse',
      'pools',
      jobId
    );

    console.log(`✅ Scraping completado: ${result.poolsFound} modelos\n`);

    // Mostrar las primeras 5 piscinas con sus imágenes
    console.log('🏊 Modelos con imágenes:\n');
    result.pools.slice(0, 5).forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.name}`);
      console.log(`   Image URL: ${pool.imageUrl || '❌ SIN IMAGEN'}`);
      console.log('');
    });

    // Contar cuántas tienen imagen
    const withImages = result.pools.filter(p => p.imageUrl).length;
    console.log(`📊 Estadísticas:`);
    console.log(`   Total: ${result.pools.length}`);
    console.log(`   Con imagen: ${withImages}`);
    console.log(`   Sin imagen: ${result.pools.length - withImages}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testImageScraping();
