const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos del catálogo ACQUAM con todas las piscinas y sus dimensiones
// Estos datos deben coincidir con lo que aparece en el catálogo PDF
const catalogData = {
  'Jacuzzi': { length: 2.8, width: 2.8, depth: 1.0, depthEnd: 1.0, shape: 'RECTANGULAR' },
  'Topacio': { length: 3.5, width: 2.5, depth: 1.2, depthEnd: 1.2, shape: 'RECTANGULAR' },
  'Cuarzo': { length: 4.0, width: 2.5, depth: 1.2, depthEnd: 1.2, shape: 'RECTANGULAR' },
  'Tanzanita': { length: 4.5, width: 2.5, depth: 1.3, depthEnd: 1.3, shape: 'RECTANGULAR' },
  'Jaspe': { length: 5.0, width: 2.5, depth: 1.3, depthEnd: 1.3, shape: 'RECTANGULAR' },
  'Circón': { length: 5.5, width: 3.0, depth: 1.3, depthEnd: 1.3, shape: 'RECTANGULAR' },
  'Ambar': { length: 6.0, width: 3.0, depth: 1.3, depthEnd: 1.5, shape: 'RECTANGULAR' },
  'Amatista': { length: 6.5, width: 3.1, depth: 1.3, depthEnd: 1.6, shape: 'RECTANGULAR' },
  'Turquesa': { length: 6.5, width: 3.1, depth: 1.3, depthEnd: 1.6, shape: 'RECTANGULAR' },
  'Turmalina': { length: 7.0, width: 3.2, depth: 1.3, depthEnd: 1.6, shape: 'RECTANGULAR' },
  'Gema Azul': { length: 7.3, width: 3.5, depth: 1.4, depthEnd: 1.6, shape: 'RECTANGULAR' },
  'Ópalo': { length: 8.0, width: 3.6, depth: 1.4, depthEnd: 1.7, shape: 'RECTANGULAR' },
  'Agua Marina': { length: 8.5, width: 3.7, depth: 1.4, depthEnd: 1.8, shape: 'RECTANGULAR' },
  'Ágata': { length: 9.0, width: 3.8, depth: 1.4, depthEnd: 1.8, shape: 'RECTANGULAR' },
  'Zafiro Azul': { length: 9.5, width: 4.0, depth: 1.5, depthEnd: 1.9, shape: 'RECTANGULAR' },
  'Onix': { length: 10.0, width: 4.0, depth: 1.5, depthEnd: 2.0, shape: 'RECTANGULAR' },
  'Zafiro': { length: 11.0, width: 4.2, depth: 1.5, depthEnd: 2.0, shape: 'RECTANGULAR' },
  'Espinela': { length: 12.0, width: 4.5, depth: 1.5, depthEnd: 2.1, shape: 'RECTANGULAR' },
  'Aventurina': { length: 6.0, width: 4.0, depth: 1.3, depthEnd: 1.3, shape: 'KIDNEY' },
  'Alejandrita': { length: 7.0, width: 4.0, depth: 1.3, depthEnd: 1.5, shape: 'KIDNEY' },
  'Diamante Rojo': { length: 8.0, width: 4.5, depth: 1.4, depthEnd: 1.6, shape: 'KIDNEY' },
  'Kriptonita': { length: 8.0, width: 4.0, depth: 1.3, depthEnd: 1.6, shape: 'L_SHAPED' },
  'Coral': { length: 9.0, width: 4.5, depth: 1.4, depthEnd: 1.7, shape: 'L_SHAPED' },
  'Jade': { length: 10.0, width: 4.5, depth: 1.5, depthEnd: 1.8, shape: 'L_SHAPED' },

  // Nuevas piscinas de catálogos adicionales
  'Cuarzo Rosa': { length: 4.0, width: 2.5, depth: 1.2, depthEnd: 1.2, shape: 'RECTANGULAR' }
};

// Valores por defecto para todas las piscinas
const defaultValues = {
  lateralCushionSpace: 0.5,
  floorCushionDepth: 0.3
};

async function bulkImportCatalog() {
  console.log('📚 Importación masiva de catálogo ACQUAM\n');
  console.log('=' .repeat(60));

  // Obtener un usuario admin o el primer usuario disponible
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  // Si no hay admin, usar el primer usuario disponible
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }

  if (!adminUser) {
    console.error('❌ No se encontró ningún usuario en la base de datos.');
    console.error('   Crea un usuario primero desde la aplicación web.');
    return;
  }

  console.log(`👤 Usando usuario: ${adminUser.name} (${adminUser.email}) - Rol: ${adminUser.role}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [poolName, dimensions] of Object.entries(catalogData)) {
    try {
      // Verificar si ya existe
      const existing = await prisma.poolPreset.findFirst({
        where: { name: poolName }
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${poolName} (ID: ${existing.id})`);
        skipped++;
        continue;
      }

      // Crear la piscina
      const pool = await prisma.poolPreset.create({
        data: {
          name: poolName,
          length: dimensions.length,
          width: dimensions.width,
          depth: dimensions.depth,
          depthEnd: dimensions.depthEnd || dimensions.depth,
          shape: dimensions.shape || 'RECTANGULAR',
          lateralCushionSpace: defaultValues.lateralCushionSpace,
          floorCushionDepth: defaultValues.floorCushionDepth,
          imageUrl: null, // Se actualizará después
          userId: adminUser.id
        }
      });

      console.log(`✅ Creada: ${poolName} (${dimensions.length}x${dimensions.width}m) - ID: ${pool.id}`);
      created++;

    } catch (error) {
      console.error(`❌ Error creando ${poolName}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE IMPORTACIÓN:');
  console.log(`   ✅ Creadas: ${created}`);
  console.log(`   ⏭️  Ya existían: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log('='.repeat(60));

  if (created > 0) {
    console.log('\n🖼️  Actualizando imágenes de piscinas nuevas...\n');
    const { updatePoolImages } = require('./update-pool-images.js');
    await updatePoolImages();
  } else {
    console.log('\nℹ️  No se crearon piscinas nuevas, no es necesario actualizar imágenes.');
  }
}

async function main() {
  try {
    await bulkImportCatalog();
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
      console.log('\n✅ Importación completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Importación falló:', error);
      process.exit(1);
    });
}

module.exports = { bulkImportCatalog, catalogData };
