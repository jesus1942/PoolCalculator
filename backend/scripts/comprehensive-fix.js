const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== FUNCIONES DE CÁLCULO ====================

function calculatePerimeter(dimensions) {
  const { length, width, shape } = dimensions;

  switch (shape) {
    case 'RECTANGULAR':
      return 2 * (length + width);

    case 'CIRCULAR':
    case 'JACUZZI':
      return Math.PI * length; // length es el diámetro

    case 'OVAL':
      // Aproximación de perímetro de elipse usando Ramanujan
      const a = length / 2;
      const b = width / 2;
      const h = Math.pow((a - b), 2) / Math.pow((a + b), 2);
      return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));

    default:
      return 2 * (length + width);
  }
}

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
    // Profundidad variable - promedio
    const avgDepth = (depth + depthEnd) / 2;
    return area * avgDepth;
  }

  return area * depth;
}

function calculateExcavationDimensions(preset) {
  return {
    length: preset.length + (preset.lateralCushionSpace * 2),
    width: preset.width + (preset.lateralCushionSpace * 2),
    depth: (preset.depthEnd || preset.depth) + preset.floorCushionDepth
  };
}

// ==================== ANÁLISIS Y CORRECCIÓN ====================

async function comprehensiveFix() {
  console.log('🔍 ANÁLISIS EXHAUSTIVO Y CORRECCIÓN DE TODOS LOS CÁLCULOS\n');
  console.log('='.repeat(100));

  const projects = await prisma.project.findMany({
    include: { poolPreset: true }
  });

  console.log(`\n📦 Total de proyectos a analizar: ${projects.length}\n`);

  let totalFixed = 0;
  const fixes = {
    perimeter: 0,
    waterMirrorArea: 0,
    volume: 0,
    excavationLength: 0,
    excavationWidth: 0,
    excavationDepth: 0
  };

  for (const project of projects) {
    const preset = project.poolPreset;

    console.log(`\n${'='.repeat(100)}`);
    console.log(`📁 PROYECTO: ${project.name}`);
    console.log(`   Cliente: ${project.clientName}`);
    console.log(`   Modelo: ${preset.name} (${preset.shape})`);
    console.log(`${'='.repeat(100)}\n`);

    // Preparar dimensiones
    const dimensions = {
      length: preset.length,
      width: preset.width,
      depth: preset.depth,
      depthEnd: preset.depthEnd || undefined,
      shape: preset.shape,
    };

    // Calcular valores correctos
    const correctPerimeter = calculatePerimeter(dimensions);
    const correctWaterMirrorArea = calculateWaterMirrorArea(dimensions);
    const correctWaterVolume = calculateWaterVolume(dimensions);
    const correctExcavation = calculateExcavationDimensions(preset);

    // Mostrar comparación
    console.log('📊 DIMENSIONES DE LA PISCINA:');
    console.log(`   Largo: ${preset.length} m`);
    console.log(`   Ancho: ${preset.width} m`);
    console.log(`   Profundidad: ${preset.depth} m${preset.depthEnd ? ` a ${preset.depthEnd} m` : ' (uniforme)'}`);
    console.log(`   Forma: ${preset.shape}`);

    console.log('\n🔧 COLCHONES:');
    console.log(`   Lateral: ${preset.lateralCushionSpace} m por lado`);
    console.log(`   Piso: ${preset.floorCushionDepth} m`);

    console.log('\n📏 PERÍMETRO:');
    console.log(`   ❌ Guardado: ${project.perimeter.toFixed(2)} m`);
    console.log(`   ✅ Correcto: ${correctPerimeter.toFixed(2)} m`);
    if (Math.abs(project.perimeter - correctPerimeter) > 0.01) {
      console.log(`   🔴 DIFERENCIA: ${Math.abs(project.perimeter - correctPerimeter).toFixed(2)} m`);
      fixes.perimeter++;
    } else {
      console.log(`   ✅ OK`);
    }

    console.log('\n🌊 ÁREA ESPEJO DE AGUA:');
    console.log(`   ❌ Guardado: ${project.waterMirrorArea.toFixed(2)} m²`);
    console.log(`   ✅ Correcto: ${correctWaterMirrorArea.toFixed(2)} m²`);
    if (Math.abs(project.waterMirrorArea - correctWaterMirrorArea) > 0.01) {
      console.log(`   🔴 DIFERENCIA: ${Math.abs(project.waterMirrorArea - correctWaterMirrorArea).toFixed(2)} m²`);
      fixes.waterMirrorArea++;
    } else {
      console.log(`   ✅ OK`);
    }

    console.log('\n💧 VOLUMEN DE AGUA:');
    console.log(`   ❌ Guardado: ${project.volume.toFixed(2)} m³ (${(project.volume * 1000).toFixed(0)} litros)`);
    console.log(`   ✅ Correcto: ${correctWaterVolume.toFixed(2)} m³ (${(correctWaterVolume * 1000).toFixed(0)} litros)`);
    if (Math.abs(project.volume - correctWaterVolume) > 0.01) {
      console.log(`   🔴 DIFERENCIA: ${Math.abs(project.volume - correctWaterVolume).toFixed(2)} m³`);
      fixes.volume++;
    } else {
      console.log(`   ✅ OK`);
    }

    console.log('\n⛏️  DIMENSIONES DE EXCAVACIÓN:');
    console.log(`   Largo:`);
    console.log(`      ❌ Guardado: ${project.excavationLength.toFixed(2)} m`);
    console.log(`      ✅ Correcto: ${correctExcavation.length.toFixed(2)} m`);
    if (Math.abs(project.excavationLength - correctExcavation.length) > 0.01) {
      console.log(`      🔴 DIFERENCIA: ${Math.abs(project.excavationLength - correctExcavation.length).toFixed(2)} m`);
      fixes.excavationLength++;
    } else {
      console.log(`      ✅ OK`);
    }

    console.log(`   Ancho:`);
    console.log(`      ❌ Guardado: ${project.excavationWidth.toFixed(2)} m`);
    console.log(`      ✅ Correcto: ${correctExcavation.width.toFixed(2)} m`);
    if (Math.abs(project.excavationWidth - correctExcavation.width) > 0.01) {
      console.log(`      🔴 DIFERENCIA: ${Math.abs(project.excavationWidth - correctExcavation.width).toFixed(2)} m`);
      fixes.excavationWidth++;
    } else {
      console.log(`      ✅ OK`);
    }

    console.log(`   Profundidad:`);
    console.log(`      ❌ Guardado: ${project.excavationDepth.toFixed(2)} m`);
    console.log(`      ✅ Correcto: ${correctExcavation.depth.toFixed(2)} m`);
    if (Math.abs(project.excavationDepth - correctExcavation.depth) > 0.01) {
      console.log(`      🔴 DIFERENCIA: ${Math.abs(project.excavationDepth - correctExcavation.depth).toFixed(2)} m`);
      fixes.excavationDepth++;
    } else {
      console.log(`      ✅ OK`);
    }

    // Volumen de excavación (informativo)
    const currentExcavationVolume = project.excavationLength * project.excavationWidth * project.excavationDepth;
    const correctExcavationVolume = correctExcavation.length * correctExcavation.width * correctExcavation.depth;
    console.log(`\n📦 VOLUMEN DE EXCAVACIÓN (TIERRA A REMOVER):`);
    console.log(`   ❌ Con datos guardados: ${currentExcavationVolume.toFixed(2)} m³`);
    console.log(`   ✅ Con datos correctos: ${correctExcavationVolume.toFixed(2)} m³`);
    if (Math.abs(currentExcavationVolume - correctExcavationVolume) > 0.01) {
      console.log(`   🔴 DIFERENCIA: ${Math.abs(currentExcavationVolume - correctExcavationVolume).toFixed(2)} m³`);
    }

    // Determinar si necesita corrección
    const needsFix =
      Math.abs(project.perimeter - correctPerimeter) > 0.01 ||
      Math.abs(project.waterMirrorArea - correctWaterMirrorArea) > 0.01 ||
      Math.abs(project.volume - correctWaterVolume) > 0.01 ||
      Math.abs(project.excavationLength - correctExcavation.length) > 0.01 ||
      Math.abs(project.excavationWidth - correctExcavation.width) > 0.01 ||
      Math.abs(project.excavationDepth - correctExcavation.depth) > 0.01;

    if (needsFix) {
      console.log(`\n🔧 APLICANDO CORRECCIONES...`);

      await prisma.project.update({
        where: { id: project.id },
        data: {
          perimeter: parseFloat(correctPerimeter.toFixed(2)),
          waterMirrorArea: parseFloat(correctWaterMirrorArea.toFixed(2)),
          volume: parseFloat(correctWaterVolume.toFixed(2)),
          excavationLength: parseFloat(correctExcavation.length.toFixed(2)),
          excavationWidth: parseFloat(correctExcavation.width.toFixed(2)),
          excavationDepth: parseFloat(correctExcavation.depth.toFixed(2)),
        }
      });

      console.log(`✅ PROYECTO CORREGIDO`);
      totalFixed++;
    } else {
      console.log(`\n✅ PROYECTO YA ESTABA CORRECTO`);
    }
  }

  console.log(`\n\n${'='.repeat(100)}`);
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(100));
  console.log(`\nTotal de proyectos analizados: ${projects.length}`);
  console.log(`Total de proyectos corregidos: ${totalFixed}`);
  console.log(`Total de proyectos ya correctos: ${projects.length - totalFixed}`);

  console.log(`\n🔧 Correcciones por campo:`);
  console.log(`   Perímetro: ${fixes.perimeter}`);
  console.log(`   Área espejo de agua: ${fixes.waterMirrorArea}`);
  console.log(`   Volumen de agua: ${fixes.volume}`);
  console.log(`   Largo de excavación: ${fixes.excavationLength}`);
  console.log(`   Ancho de excavación: ${fixes.excavationWidth}`);
  console.log(`   Profundidad de excavación: ${fixes.excavationDepth}`);

  console.log(`\n✅ TODOS LOS CÁLCULOS HAN SIDO VERIFICADOS Y CORREGIDOS`);
}

async function main() {
  try {
    await comprehensiveFix();
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Proceso falló:', error);
    process.exit(1);
  });
