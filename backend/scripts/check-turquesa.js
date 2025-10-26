const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTurquesa() {
  const turquesa = await prisma.poolPreset.findFirst({
    where: { name: 'Turquesa' }
  });

  console.log('📊 Datos del modelo Turquesa:');
  console.log(JSON.stringify(turquesa, null, 2));

  if (turquesa) {
    console.log('\n🧮 Cálculo esperado:');
    console.log(`Área = ${turquesa.length} x ${turquesa.width} = ${turquesa.length * turquesa.width} m²`);
  }
}

async function main() {
  try {
    await checkTurquesa();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
