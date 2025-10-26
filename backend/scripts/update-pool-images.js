const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo de modelos con sus páginas del catálogo
const modelImageMapping = {
  'Jacuzzi': 'acquam-page-03.png',
  'Topacio': 'acquam-page-04.png',
  'Cuarzo': 'acquam-page-05.png',
  'Tanzanita': 'acquam-page-06.png',
  'Jaspe': 'acquam-page-07.png',
  'Circón': 'acquam-page-08.png',
  'Ambar': 'acquam-page-09.png',
  'Amatista': 'acquam-page-10.png',
  'Turquesa': 'acquam-page-11.png',
  'Turmalina': 'acquam-page-12.png',
  'Gema Azul': 'acquam-page-13.png',
  'Ópalo': 'acquam-page-14.png',
  'Agua Marina': 'acquam-page-15.png',
  'Ágata': 'acquam-page-16.png',
  'Zafiro Azul': 'acquam-page-17.png',
  'Onix': 'acquam-page-18.png',
  'Zafiro': 'acquam-page-19.png',
  'Espinela': 'acquam-page-20.png',
  'Aventurina': 'acquam-page-21.png',
  'Alejandrita': 'acquam-page-22.png',
  'Diamante Rojo': 'acquam-page-23.png',
  'Kriptonita': 'acquam-page-25.png',
  'Coral': 'acquam-page-26.png',
  'Jade': 'acquam-page-27.png',
  // Catálogos adicionales
  'Cuarzo Rosa': 'Cuarzo Rosa.png'
};

async function updatePoolImages() {
  console.log('🖼️  Actualizando imágenes de piscinas...\n');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const [modelName, imageFile] of Object.entries(modelImageMapping)) {
    try {
      // Buscar el modelo por nombre
      const pool = await prisma.poolPreset.findFirst({
        where: {
          name: modelName
        }
      });

      if (!pool) {
        console.log(`⏭️  No encontrado: ${modelName}`);
        notFound++;
        continue;
      }

      // Actualizar con la URL de la imagen
      const imageUrl = `/pool-images/${imageFile}`;

      await prisma.poolPreset.update({
        where: {
          id: pool.id
        },
        data: {
          imageUrl: imageUrl
        }
      });

      console.log(`✅ ${modelName} -> ${imageUrl}`);
      updated++;

    } catch (error) {
      console.error(`❌ Error actualizando ${modelName}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ⏭️  No encontrados: ${notFound}`);
  console.log(`   ❌ Errores: ${errors}`);
}

async function main() {
  try {
    await updatePoolImages();
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Actualización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Actualización falló:', error);
      process.exit(1);
    });
}

module.exports = { updatePoolImages };
