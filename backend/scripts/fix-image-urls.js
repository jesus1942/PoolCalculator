const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImageUrls() {
  console.log('🔧 Corrigiendo URLs de imágenes...\n');

  // Obtener todos los presets con imágenes
  const presets = await prisma.poolPreset.findMany({
    where: {
      imageUrl: {
        not: null
      }
    }
  });

  console.log(`📦 Presets encontrados: ${presets.length}\n`);

  let updated = 0;

  for (const preset of presets) {
    if (preset.imageUrl && preset.imageUrl.startsWith('/pool-images/')) {
      // Cambiar de /pool-images/... a URL completa del backend
      const newUrl = `http://localhost:3000${preset.imageUrl}`;

      await prisma.poolPreset.update({
        where: { id: preset.id },
        data: { imageUrl: newUrl }
      });

      console.log(`✅ ${preset.name}: ${preset.imageUrl} -> ${newUrl}`);
      updated++;
    }
  }

  console.log(`\n📊 Total actualizados: ${updated}`);
}

async function main() {
  try {
    await fixImageUrls();
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ URLs corregidas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falló:', error);
      process.exit(1);
    });
}

module.exports = { fixImageUrls };
