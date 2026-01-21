import { catalogScraperService } from '../src/services/catalogScraperService';
import prisma from '../src/config/database';

async function testCompleteFlow() {
  console.log('🧪 Probando flujo completo de scraping y guardado...\n');

  try {
    // Paso 1: Scraping
    console.log('📡 Paso 1: Haciendo scraping de Akesse...');
    const jobId = `test-complete-${Date.now()}`;
    const result = await catalogScraperService.scrapeFromUrl(
      'https://akesse.com.uy/piscinas',
      'Akesse',
      'pools',
      jobId
    );
    console.log(`✅ Scraping completado: ${result.poolsFound} modelos encontrados\n`);

    // Paso 2: Obtener job status
    console.log('📊 Paso 2: Obteniendo status del job...');
    const job = await catalogScraperService.getJobStatus(jobId);
    if (!job) {
      throw new Error('No se encontró el job');
    }
    console.log(`✅ Job encontrado con ${job.pools?.length || 0} modelos\n`);

    // Paso 3: Obtener usuario de prueba (el primero que encontremos)
    console.log('👤 Paso 3: Buscando usuario para prueba...');
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No hay usuarios en la base de datos');
    }
    console.log(`✅ Usuario encontrado: ${user.email}\n`);

    // Paso 4: Guardar modelos
    console.log('💾 Paso 4: Guardando modelos en la base de datos...');
    const saveResult = await catalogScraperService.savePools(
      result.pools,
      'Akesse',
      user.id,
      true // Replace existing
    );
    console.log(`✅ Guardado completado:`);
    console.log(`   - ✨ Creados: ${saveResult.created}`);
    console.log(`   - 🔄 Actualizados: ${saveResult.updated}`);
    console.log(`   - ⏭️  Omitidos: ${saveResult.skipped}\n`);

    // Paso 5: Verificar que se guardaron con vendor
    console.log('🔍 Paso 5: Verificando modelos guardados...');
    const savedModels = await prisma.poolPreset.findMany({
      where: { vendor: 'Akesse' },
      select: {
        id: true,
        name: true,
        vendor: true,
        length: true,
        width: true,
        depth: true
      },
      take: 3
    });

    if (savedModels.length === 0) {
      throw new Error('❌ No se encontraron modelos con vendor "Akesse"');
    }

    console.log(`✅ Encontrados ${savedModels.length} modelos con vendor "Akesse":`);
    savedModels.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name}`);
      console.log(`      Vendor: ${model.vendor}`);
      console.log(`      Dimensiones: ${model.length}m × ${model.width}m × ${model.depth}m`);
    });

    console.log('\n🎉 ¡Flujo completo exitoso!');
    console.log('\n📋 Resumen:');
    console.log(`   1. ✅ Scraping: ${result.poolsFound} modelos`);
    console.log(`   2. ✅ Job guardado con pools`);
    console.log(`   3. ✅ Modelos guardados en BD con vendor`);
    console.log(`   4. ✅ Modelos recuperables por vendor`);

  } catch (error: any) {
    console.error('\n❌ Error en el flujo:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();
