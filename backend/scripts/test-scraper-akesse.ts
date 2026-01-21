import { catalogScraperService } from '../src/services/catalogScraperService';

async function testAkesseScraper() {
  console.log('🧪 Testing Akesse Scraper...\n');

  try {
    const jobId = `test-${Date.now()}`;
    const result = await catalogScraperService.scrapeFromUrl(
      'https://akesse.com.uy/piscinas',
      'Akesse',
      'pools',
      jobId
    );

    console.log(`✅ Scraping completado!`);
    console.log(`📊 Modelos encontrados: ${result.poolsFound}`);
    console.log('\n🏊 Primeros 5 modelos:\n');

    result.pools.slice(0, 5).forEach((pool, index) => {
      console.log(`${index + 1}. ${pool.name}`);
      console.log(`   Dimensiones: ${pool.length}m × ${pool.width}m × ${pool.depth}m`);
      console.log(`   Forma: ${pool.shape}`);
      if (pool.imageUrl) {
        console.log(`   Imagen: ${pool.imageUrl}`);
      }
      console.log('');
    });

    if (result.poolsFound === 0) {
      console.log('❌ No se encontraron modelos. Posible causa:');
      console.log('   - La página usa JavaScript para renderizar el contenido');
      console.log('   - Los selectores HTML no coinciden con la estructura');
      console.log('   - El formato de dimensiones es diferente al esperado');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testAkesseScraper();
