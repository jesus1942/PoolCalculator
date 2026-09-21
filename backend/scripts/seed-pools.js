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
    console.log('⚠️  No se encontró ningún usuario. Creando usuario temporal para los presets...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    user = await prisma.user.create({
      data: {
        email: 'admin@poolcalculator.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN'
      }
    });
    console.log('✅ Usuario admin creado');
  }

  return user;
}

function determinePoolShape(name, length, width) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('circular') || nameLower.includes('redond')) {
    return 'CIRCULAR';
  }

  if (nameLower.includes('oval') || nameLower.includes('ovalad')) {
    return 'OVAL';
  }

  if (nameLower.includes('jacuzzi') || nameLower.includes('spa')) {
    return 'JACUZZI';
  }

  // Por defecto rectangular
  return 'RECTANGULAR';
}

async function seedPools() {
  console.log('🌱 Iniciando seed de piscinas...');

  // Obtener usuario por defecto
  const user = await getOrCreateDefaultUser();

  // Leer los modelos extraídos
  const modelsPath = path.join(__dirname, 'extracted-pools.json');

  if (!fs.existsSync(modelsPath)) {
    console.error('❌ No se encontró el archivo extracted-pools.json');
    console.log('   Ejecuta primero: node scripts/extract-catalog.js');
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
          name: model.name,
          length: model.length,
          width: model.width,
          depth: model.depth
        }
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${model.name}`);
        skipped++;
        continue;
      }

      // Determinar la forma de la piscina
      const shape = determinePoolShape(model.name, model.length, model.width);

      // Crear el preset
      const preset = await prisma.poolPreset.create({
        data: {
          name: model.name,
          description: model.description || `Piscina ${model.vendor} de ${model.length}x${model.width}x${model.depth}m`,
          imageUrl: null, // Por ahora null, luego se pueden agregar imágenes
          length: model.length,
          width: model.width,
          depth: model.depth,
          depthEnd: null, // Profundidad uniforme por defecto
          shape: shape,
          constructionType: 'FIBERGLASS', // Acquam es principalmente fibra de vidrio
          lateralCushionSpace: 0.15,
          floorCushionDepth: 0.10,
          hasWetDeck: false,
          hasStairsOnly: false,
          returnsCount: 2,
          hasHotWaterReturn: false,
          hasHydroJets: false,
          hydroJetsCount: 0,
          hasBottomDrain: true,
          hasVacuumIntake: true,
          vacuumIntakeCount: 1,
          hasSkimmer: true,
          skimmerCount: 1,
          hasLighting: true,
          lightingCount: 2,
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
