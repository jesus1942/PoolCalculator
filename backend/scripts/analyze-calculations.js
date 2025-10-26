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

function calculateWaterVolume(dimensions) {
  const { depth, depthEnd } = dimensions;
  const area = calculateWaterMirrorArea(dimensions);

  if (depthEnd && depthEnd !== depth) {
    const avgDepth = (depth + depthEnd) / 2;
    return area * avgDepth;
  }

  return area * depth;
}

function calculateExcavationVolume(preset) {
  const excavationLength = preset.length + (preset.lateralCushionSpace * 2);
  const excavationWidth = preset.width + (preset.lateralCushionSpace * 2);
  const excavationDepth = preset.depth + preset.floorCushionDepth;

  // Si tiene profundidad variable
  if (preset.depthEnd && preset.depthEnd !== preset.depth) {
    const avgExcavationDepth = ((preset.depth + preset.depthEnd) / 2) + preset.floorCushionDepth;
    return excavationLength * excavationWidth * avgExcavationDepth;
  }

  return excavationLength * excavationWidth * excavationDepth;
}

async function analyzeCalculations() {
  const projects = await prisma.project.findMany({
    include: { poolPreset: true }
  });

  console.log('📊 ANÁLISIS DE CÁLCULOS DE VOLUMEN\n');
  console.log('='.repeat(80));

  for (const project of projects) {
    const preset = project.poolPreset;

    const dimensions = {
      length: preset.length,
      width: preset.width,
      depth: preset.depth,
      depthEnd: preset.depthEnd || undefined,
      shape: preset.shape,
    };

    const waterArea = calculateWaterMirrorArea(dimensions);
    const waterVolume = calculateWaterVolume(dimensions);
    const excavationVolume = calculateExcavationVolume(preset);

    console.log(`\n📁 ${project.name}`);
    console.log(`   Modelo: ${preset.name} (${preset.shape})`);
    console.log(`   Dimensiones piscina: ${preset.length}m x ${preset.width}m x ${preset.depth}m${preset.depthEnd ? ` a ${preset.depthEnd}m` : ''}`);
    console.log(`   Colchón lateral: ${preset.lateralCushionSpace}m | Colchón piso: ${preset.floorCushionDepth}m`);

    console.log('\n   PISCINA (espejo de agua):');
    console.log(`      Área: ${waterArea.toFixed(2)} m²`);
    console.log(`      Volumen de AGUA: ${waterVolume.toFixed(2)} m³`);
    console.log(`      Litros: ${(waterVolume * 1000).toFixed(0)} L`);

    console.log('\n   EXCAVACIÓN (pozo):');
    console.log(`      Dimensiones: ${project.excavationLength}m x ${project.excavationWidth}m x ${project.excavationDepth}m`);
    console.log(`      Volumen de TIERRA a excavar: ${excavationVolume.toFixed(2)} m³`);

    console.log('\n   GUARDADO EN BD:');
    console.log(`      waterMirrorArea: ${project.waterMirrorArea} m²`);
    console.log(`      volume: ${project.volume} m³`);

    console.log('\n   ⚠️  VERIFICACIÓN:');
    if (Math.abs(project.waterMirrorArea - waterArea) > 0.1) {
      console.log(`      ❌ waterMirrorArea INCORRECTO`);
    } else {
      console.log(`      ✅ waterMirrorArea correcto`);
    }

    if (Math.abs(project.volume - waterVolume) > 0.1) {
      console.log(`      ❌ volume parece ser de excavación, debería ser ${waterVolume.toFixed(2)} m³`);
    } else {
      console.log(`      ✅ volume correcto (volumen de agua)`);
    }

    console.log('\n' + '-'.repeat(80));
  }

  console.log('\n\n📝 CONCLUSIÓN:');
  console.log('   El campo "volume" debería almacenar el VOLUMEN DE AGUA');
  console.log('   Actualmente NO hay campo para el volumen de excavación');
  console.log('   Se debería agregar un campo "excavationVolume" si se necesita');
}

async function main() {
  try {
    await analyzeCalculations();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
