import prisma from '../src/config/database';

async function fullDiagnostic() {
  console.log('🔍 DIAGNÓSTICO COMPLETO\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar datos en BD
    console.log('\n1️⃣  VERIFICANDO BASE DE DATOS\n');

    const allPools = await prisma.poolPreset.findMany({
      select: {
        id: true,
        name: true,
        vendor: true,
        imageUrl: true
      }
    });

    console.log(`   Total de presets: ${allPools.length}`);

    const withVendor = allPools.filter(p => p.vendor);
    console.log(`   Con vendor: ${withVendor.length}`);

    const akessePools = allPools.filter(p => p.vendor === 'Akesse');
    console.log(`   Akesse: ${akessePools.length}`);

    const withImage = akessePools.filter(p => p.imageUrl);
    console.log(`   Akesse con imagen: ${withImage.length}`);

    if (akessePools.length > 0) {
      console.log('\n   📋 Primeros 3 modelos de Akesse:');
      akessePools.slice(0, 3).forEach((pool, i) => {
        console.log(`   ${i + 1}. ${pool.name.substring(0, 50)}...`);
        console.log(`      imageUrl: ${pool.imageUrl ? '✅ PRESENTE' : '❌ NULL'}`);
        if (pool.imageUrl) {
          console.log(`      URL: ${pool.imageUrl.substring(0, 70)}...`);
        }
      });
    }

    // 2. Verificar estructura del schema
    console.log('\n2️⃣  VERIFICANDO ESTRUCTURA DEL MODELO\n');

    const samplePool = await prisma.poolPreset.findFirst({
      where: { vendor: 'Akesse' }
    });

    if (samplePool) {
      console.log('   ✅ Modelo de prueba encontrado');
      console.log(`   Campos presentes:`);
      console.log(`      - id: ${samplePool.id ? '✅' : '❌'}`);
      console.log(`      - name: ${samplePool.name ? '✅' : '❌'}`);
      console.log(`      - vendor: ${samplePool.vendor ? '✅' : '❌'}`);
      console.log(`      - imageUrl: ${samplePool.imageUrl ? '✅' : '❌'}`);
      console.log(`      - length: ${samplePool.length ? '✅' : '❌'}`);
      console.log(`      - width: ${samplePool.width ? '✅' : '❌'}`);
      console.log(`      - depth: ${samplePool.depth ? '✅' : '❌'}`);
    }

    // 3. Verificar que las URLs sean válidas
    console.log('\n3️⃣  VERIFICANDO FORMATO DE URLs\n');

    const poolsWithImages = await prisma.poolPreset.findMany({
      where: {
        vendor: 'Akesse',
        imageUrl: { not: null }
      },
      select: { imageUrl: true },
      take: 3
    });

    poolsWithImages.forEach((pool, i) => {
      if (pool.imageUrl) {
        const isValid = pool.imageUrl.startsWith('http://') || pool.imageUrl.startsWith('https://');
        console.log(`   ${i + 1}. ${isValid ? '✅' : '❌'} ${pool.imageUrl.substring(0, 70)}...`);
      }
    });

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN:\n');
    console.log(`   ✅ Presets en BD: ${allPools.length}`);
    console.log(`   ${akessePools.length > 0 ? '✅' : '❌'} Modelos Akesse: ${akessePools.length}`);
    console.log(`   ${withImage.length > 0 ? '✅' : '❌'} Con imágenes: ${withImage.length}`);

    if (withImage.length === 0) {
      console.log('\n   ⚠️  PROBLEMA: No hay imágenes guardadas');
      console.log('   Solución: Ejecutar scraping nuevamente y guardar');
    } else if (withImage.length < akessePools.length) {
      console.log('\n   ⚠️  PROBLEMA: Algunas imágenes faltan');
      console.log(`   ${akessePools.length - withImage.length} modelos sin imagen`);
    } else {
      console.log('\n   ✅ BACKEND OK: Todas las imágenes presentes');
      console.log('   El problema debe estar en el FRONTEND');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fullDiagnostic();
