const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateWaterMirrorArea(dimensions) {
  const { length, width, shape } = dimensions;

  switch (shape) {
    case 'RECTANGULAR':
      return length * width;

    case 'CIRCULAR':
    case 'JACUZZI':
      const radius = length / 2;
      return Math.PI * radius * radius;

    case 'OVAL':
      const a = length / 2;
      const b = width / 2;
      return Math.PI * a * b;

    default:
      return length * width;
  }
}

function calculateVolume(dimensions) {
  const { depth, depthEnd } = dimensions;
  const area = calculateWaterMirrorArea(dimensions);

  if (depthEnd && depthEnd !== depth) {
    const avgDepth = (depth + depthEnd) / 2;
    return area * avgDepth;
  }

  return area * depth;
}

async function fixAllProjects() {
  console.log('🔧 Recalculando todos los proyectos...\n');

  const projects = await prisma.project.findMany({
    include: {
      poolPreset: true
    }
  });

  console.log(`📦 Total proyectos: ${projects.length}\n`);

  let fixed = 0;
  let errors = 0;

  for (const project of projects) {
    try {
      const preset = project.poolPreset;

      const dimensions = {
        length: preset.length,
        width: preset.width,
        depth: preset.depth,
        depthEnd: preset.depthEnd || undefined,
        shape: preset.shape,
      };

      const correctWaterMirrorArea = calculateWaterMirrorArea(dimensions);
      const correctVolume = calculateVolume(dimensions);

      if (Math.abs(project.waterMirrorArea - correctWaterMirrorArea) > 0.01) {
        console.log(`🔄 ${project.name} (${preset.name}):`);
        console.log(`   ❌ Área incorrecta: ${project.waterMirrorArea} m²`);
        console.log(`   ✅ Área correcta: ${correctWaterMirrorArea.toFixed(2)} m²`);

        await prisma.project.update({
          where: { id: project.id },
          data: {
            waterMirrorArea: parseFloat(correctWaterMirrorArea.toFixed(2)),
            volume: parseFloat(correctVolume.toFixed(2))
          }
        });

        console.log(`   ✅ Corregido\n`);
        fixed++;
      }

    } catch (error) {
      console.error(`❌ Error procesando ${project.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Corregidos: ${fixed}`);
  console.log(`   ⏭️  Ya correctos: ${projects.length - fixed - errors}`);
  console.log(`   ❌ Errores: ${errors}`);
}

async function main() {
  try {
    await fixAllProjects();
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Recálculo completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falló:', error);
    process.exit(1);
  });
