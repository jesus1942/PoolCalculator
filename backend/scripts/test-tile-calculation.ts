import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCalculation() {
  try {
    // Obtener el proyecto Familia Figueroa
    const project = await prisma.project.findFirst({
      where: { name: { contains: 'Figueroa' } },
      include: {
        poolPreset: true,
      },
    });

    if (!project) {
      console.log('❌ Proyecto no encontrado');
      return;
    }

    console.log('📊 PROYECTO:', project.name);
    console.log('📐 PISCINA:', `${project.poolPreset?.length}m x ${project.poolPreset?.width}m`);
    console.log('⚙️  CONFIGURACIÓN:', JSON.stringify(project.tileCalculation, null, 2));

    // Obtener los materiales calculados
    const materials = await prisma.tileMaterial.findMany({
      where: { projectId: project.id },
    });

    console.log('\n🔢 RESULTADOS ACTUALES EN LA BD:');
    materials.forEach((mat) => {
      console.log(`  - ${mat.tileName}: ${mat.quantity} unidades`);
    });

    console.log('\n✅ RESULTADOS ESPERADOS:');
    console.log('  - Loseta Lomo Ballena (50x50cm): 30 unidades');
    console.log('  - Esquinero Lomo Ballena (50x50cm): 4 unidades');
    console.log('  - Mosaico Común 50x50cm: 35 unidades');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalculation();
