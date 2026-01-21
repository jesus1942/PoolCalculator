import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const project = await prisma.project.findUnique({
      where: { id: '83fec826-4269-4f72-b4c1-2ceb6d2f8b33' },
      select: {
        name: true,
        materials: true,
      },
    });

    if (!project) {
      console.log('❌ Proyecto no encontrado');
      return;
    }

    console.log('📊 PROYECTO:', project.name);
    console.log('\n🔍 MATERIALS GUARDADOS EN LA BD:');
    console.log(JSON.stringify(project.materials, null, 2));

    // Intentar acceder a tiles
    const materials = project.materials as any;
    if (materials && materials.tiles) {
      console.log('\n✅ TILES ENCONTRADOS:');
      console.log(JSON.stringify(materials.tiles, null, 2));
    } else {
      console.log('\n❌ NO HAY TILES EN MATERIALS');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
