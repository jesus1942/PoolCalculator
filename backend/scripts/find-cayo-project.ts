import prisma from '../src/config/database';

async function findCayoProject() {
  try {
    const projects = await prisma.project.findMany({
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

    console.log('📊 Proyectos encontrados:', projects.length);

    projects.forEach((project, idx) => {
      console.log(`\n${idx + 1}. ${project.name}`);
      console.log(`   Cliente: ${project.clientName}`);
      console.log(`   Preset: ${project.poolPreset?.name}`);
      console.log(`   Adicionales: ${project.projectAdditionals.length}`);

      if (project.poolPreset) {
        console.log(`\n   📋 Info del Preset:`);
        console.log(`      - Retornos: ${project.poolPreset.returnsCount}`);
        console.log(`      - Retorno agua caliente: ${project.poolPreset.hasHotWaterReturn ? 'SÍ' : 'NO'}`);
        console.log(`      - Skimmers: ${project.poolPreset.skimmerCount}`);
        console.log(`      - Hidrojets: ${project.poolPreset.hydroJetsCount}`);
      }

      if (project.projectAdditionals.length > 0) {
        console.log(`\n   🔧 Adicionales:`);
        project.projectAdditionals.forEach((add, addIdx) => {
          const name = add.customName || add.equipment?.name || add.accessory?.name || add.material?.name || 'Sin nombre';
          console.log(`      ${addIdx + 1}. ${name}`);
          console.log(`         Base: ${add.baseQuantity}, Nueva: ${add.newQuantity}`);
          if (add.equipment) {
            console.log(`         Tipo: ${add.equipment.type}`);
          }
        });
      }

      // Mostrar configuraciones hidráulicas y eléctricas si existen
      if (project.plumbingConfig && typeof project.plumbingConfig === 'object') {
        console.log(`\n   🔧 Config Hidráulica:`, JSON.stringify(project.plumbingConfig, null, 2));
      }
      if (project.electricalConfig && typeof project.electricalConfig === 'object') {
        console.log(`\n   ⚡ Config Eléctrica:`, JSON.stringify(project.electricalConfig, null, 2));
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCayoProject();
