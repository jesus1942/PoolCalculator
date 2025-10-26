const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearPools() {
  console.log('🗑️  Limpiando presets de piscinas incorrectos...');

  const result = await prisma.poolPreset.deleteMany({});

  console.log(`✅ ${result.count} presets eliminados`);
}

async function main() {
  try {
    await clearPools();
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
      console.log('\n✅ Limpieza completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falló:', error);
      process.exit(1);
    });
}

module.exports = { clearPools };
