const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTurquesaProject() {
  const turquesaPreset = await prisma.poolPreset.findFirst({
    where: { name: 'Turquesa' }
  });

  if (!turquesaPreset) {
    console.log('❌ No se encontró el preset Turquesa');
    return;
  }

  console.log('📊 Preset Turquesa:');
  console.log(`   ID: ${turquesaPreset.id}`);
  console.log(`   Dimensiones: ${turquesaPreset.length} x ${turquesaPreset.width}`);
  console.log(`   Área calculada: ${turquesaPreset.length * turquesaPreset.width} m²`);

  const projects = await prisma.project.findMany({
    where: { poolPresetId: turquesaPreset.id }
  });

  console.log(`\n📁 Proyectos con Turquesa: ${projects.length}\n`);

  projects.forEach((project, i) => {
    console.log(`Proyecto ${i+1}: ${project.name}`);
    console.log(`   waterMirrorArea guardado: ${project.waterMirrorArea} m²`);
    console.log(`   excavationLength: ${project.excavationLength}`);
    console.log(`   excavationWidth: ${project.excavationWidth}`);
    console.log(`   Área excavación: ${project.excavationLength * project.excavationWidth} m²`);
    console.log('');
  });
}

async function main() {
  try {
    await checkTurquesaProject();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
