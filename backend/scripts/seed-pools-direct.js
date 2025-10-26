const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function getOrCreateDefaultUser() {
  // Buscar un usuario admin o crear uno temporal para los presets
  let user = await prisma.user.findFirst({
    where: {
      role: 'ADMIN'
    }
  });

  if (!user) {
    // Si no hay admin, buscar cualquier usuario
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.log('⚠️  No se encontró ningún usuario. Los presets necesitan un usuario.');
    console.log('   Por favor, crea un usuario primero e intenta de nuevo.');
    return null;
  }

  return user;
}

async function seedPools() {
  console.log('🌱 Iniciando seed de piscinas Acquam...');

  // Obtener usuario por defecto
  const user = await getOrCreateDefaultUser();

  if (!user) {
    return;
  }

  // Leer los modelos reales del catálogo
  const modelsPath = path.join(__dirname, 'acquam-pools-real.json');

  if (!fs.existsSync(modelsPath)) {
    console.error('❌ No se encontró el archivo acquam-pools-real.json');
    return;
  }

  const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

  console.log(`📦 Modelos a insertar: ${models.length}`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const model of models) {
    try {
      // Verificar si ya existe un preset similar
      const existing = await prisma.poolPreset.findFirst({
        where: {
          name: model.name
        }
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${model.name}`);
        skipped++;
        continue;
      }

      // Crear el preset
      const preset = await prisma.poolPreset.create({
        data: {
          name: model.name,
          description: model.description,
          imageUrl: null, // Por ahora null, luego se pueden agregar imágenes
          length: model.length,
          width: model.width,
          depth: model.depth,
          depthEnd: model.depthEnd || null,
          shape: model.shape || 'RECTANGULAR',
          constructionType: 'FIBERGLASS', // Acquam es principalmente fibra de vidrio
          lateralCushionSpace: 0.15,
          floorCushionDepth: 0.10,
          hasWetDeck: false,
          hasStairsOnly: false,
          returnsCount: 2,
          hasHotWaterReturn: false,
          hasHydroJets: model.shape === 'JACUZZI',
          hydroJetsCount: model.shape === 'JACUZZI' ? 6 : 0,
          hasBottomDrain: true,
          hasVacuumIntake: true,
          vacuumIntakeCount: 1,
          hasSkimmer: true,
          skimmerCount: 1,
          hasLighting: false,
          lightingCount: 0,
          userId: user.id
        }
      });

      console.log(`✅ Insertado: ${preset.name}`);
      inserted++;

    } catch (error) {
      console.error(`❌ Error insertando ${model.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen del seed:`);
  console.log(`   ✅ Insertados: ${inserted}`);
  console.log(`   ⏭️  Omitidos: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
}

async function main() {
  try {
    await seedPools();
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
      console.log('\n✅ Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed falló:', error);
      process.exit(1);
    });
}

module.exports = { seedPools };
