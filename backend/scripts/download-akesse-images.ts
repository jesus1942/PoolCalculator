import prisma from '../src/config/database';
import { catalogScraperService } from '../src/services/catalogScraperService';

async function downloadAkesseImages() {
  console.log('🖼️  Descargando imágenes de Akesse...\n');

  try {
    // Obtener todos los pools de Akesse con imageUrl externa
    const akessePools = await prisma.poolPreset.findMany({
      where: {
        vendor: 'Akesse',
        imageUrl: {
          startsWith: 'https://'
        }
      }
    });

    console.log(`📊 Encontrados ${akessePools.length} pools de Akesse con imágenes externas\n`);

    let updated = 0;
    let failed = 0;

    for (const pool of akessePools) {
      try {
        console.log(`Procesando: ${pool.name}`);

        if (pool.imageUrl) {
          // Descargar la imagen
          const localImageUrl = await catalogScraperService.downloadImage(pool.imageUrl, 'Akesse');

          if (localImageUrl) {
            // Actualizar en la base de datos
            await prisma.poolPreset.update({
              where: { id: pool.id },
              data: { imageUrl: localImageUrl }
            });

            console.log(`✅ Actualizado: ${pool.name} -> ${localImageUrl}\n`);
            updated++;
          } else {
            console.log(`❌ No se pudo descargar: ${pool.name}\n`);
            failed++;
          }
        }
      } catch (error: any) {
        console.error(`❌ Error procesando ${pool.name}:`, error.message);
        failed++;
      }
    }

    console.log('\n📋 Resumen:');
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ❌ Fallidos: ${failed}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

downloadAkesseImages();
