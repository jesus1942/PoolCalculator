import prisma from '../src/config/database';

/**
 * Script para regenerar la configuración hidráulica y eléctrica del proyecto Familia Cayo
 * incluyendo los componentes adicionales
 */

async function regenerateCayoConfig() {
  try {
    // Buscar el proyecto
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: 'Cayo', mode: 'insensitive' } },
          { clientName: { contains: 'Cayo', mode: 'insensitive' } }
        ]
      },
      include: {
        poolPreset: true,
        projectAdditionals: {
          include: {
            equipment: true,
            accessory: true,
            material: true
          }
        }
      }
    });

    if (!project) {
      console.log('❌ No se encontró el proyecto Familia Cayo');
      return;
    }

    console.log('📊 Proyecto encontrado:', project.name);
    console.log('   Cliente:', project.clientName);
    console.log('   Preset:', project.poolPreset?.name);
    console.log('   Adicionales:', project.projectAdditionals.length);

    if (!project.poolPreset) {
      console.log('❌ El proyecto no tiene preset asociado');
      return;
    }

    // Para regenerar, simplemente eliminamos las configuraciones actuales
    // El frontend las regenerará automáticamente con la nueva función
    console.log('\n🔄 Eliminando configuraciones existentes para forzar regeneración...');

    await prisma.project.update({
      where: { id: project.id },
      data: {
        plumbingConfig: {},
        electricalConfig: {}
      }
    });

    console.log('✅ Configuraciones eliminadas. El frontend las regenerará automáticamente');
    console.log('\n📝 Cuando abras el proyecto en el navegador, se regenerarán las configuraciones');
    console.log('   con los siguientes adicionales:');

    project.projectAdditionals.forEach((additional, idx) => {
      const name = additional.customName || additional.equipment?.name || additional.accessory?.name || additional.material?.name || 'Sin nombre';
      const type = additional.equipment?.type || additional.customCategory || 'N/A';
      console.log(`   ${idx + 1}. ${name}`);
      console.log(`      - Tipo: ${type}`);
      console.log(`      - Cantidad base: ${additional.baseQuantity}, Nueva: ${additional.newQuantity}`);
      console.log(`      - Agregados: ${additional.newQuantity - additional.baseQuantity}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateCayoConfig();
