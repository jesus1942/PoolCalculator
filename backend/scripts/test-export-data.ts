import prisma from '../src/config/database';

async function testExportData() {
  console.log('📄 VERIFICANDO DATOS PARA EXPORTACIÓN\n');
  console.log('='.repeat(70));

  try {
    // Obtener el proyecto "Familia Lopez" que ya recalculamos
    const project = await prisma.project.findFirst({
      where: {
        clientName: { contains: 'Lopez' }
      },
      include: {
        poolPreset: true
      }
    });

    if (!project) {
      console.log('❌ No se encontró el proyecto de prueba');
      return;
    }

    console.log(`\n🏊 PROYECTO: ${project.name}`);
    console.log(`   Cliente: ${project.clientName}`);
    console.log(`   Piscina: ${project.poolPreset?.name} (${project.poolPreset?.length}m × ${project.poolPreset?.width}m)`);

    // Extraer materiales del JSON
    const materials = (project.materials as any) || {};

    console.log(`\n🛏️  MATERIALES DE CAMA:`);
    console.log('   ───────────────────────────────────────────────');

    if (materials.geomembrane) {
      console.log(`   Geomembrana: ${materials.geomembrane.quantity} ${materials.geomembrane.unit}`);
      console.log(`   Costo: $${materials.geomembrane.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.electroweldedMesh) {
      console.log(`   Malla Electrosoldada: ${materials.electroweldedMesh.quantity} ${materials.electroweldedMesh.unit}`);
      console.log(`   Costo: $${materials.electroweldedMesh.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.sandForBed) {
      console.log(`   Arena para Cama: ${materials.sandForBed.quantity} ${materials.sandForBed.unit}`);
      console.log(`   Costo: $${materials.sandForBed.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.cementBags) {
      console.log(`   Cemento: ${materials.cementBags.quantity} ${materials.cementBags.unit}`);
      console.log(`   Costo: $${materials.cementBags.cost?.toLocaleString('es-AR') || 0}`);

      // Verificar que esté en bolsas
      if (materials.cementBags.unit.includes('bolsas')) {
        console.log(`   ✅ Cemento en BOLSAS (correcto)`);
      } else {
        console.log(`   ❌ ERROR: Cemento NO está en bolsas`);
      }
    }

    if (materials.cementKg) {
      console.log(`   Cemento (referencia kg): ${materials.cementKg.quantity} ${materials.cementKg.unit}`);
    }

    console.log(`\n🧱 MATERIALES DE VEREDA/LOSETAS:`);
    console.log('   ───────────────────────────────────────────────');

    if (materials.adhesive) {
      console.log(`   Adhesivo: ${materials.adhesive.quantity} ${materials.adhesive.unit}`);
      console.log(`   Costo: $${materials.adhesive.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.cement) {
      console.log(`   Cemento: ${materials.cement.quantity} ${materials.cement.unit}`);
      console.log(`   Costo: $${materials.cement.cost?.toLocaleString('es-AR') || 0}`);

      // Verificar que esté en bolsas
      if (materials.cement.unit.includes('bolsas')) {
        console.log(`   ✅ Cemento de vereda en BOLSAS (correcto)`);
      } else {
        console.log(`   ❌ ERROR: Cemento de vereda NO está en bolsas`);
      }
    }

    if (materials.sand) {
      console.log(`   Arena: ${materials.sand.quantity} ${materials.sand.unit}`);
      console.log(`   Costo: $${materials.sand.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.gravel) {
      console.log(`   Piedra/Grava: ${materials.gravel.quantity} ${materials.gravel.unit}`);
      console.log(`   Costo: $${materials.gravel.cost?.toLocaleString('es-AR') || 0}`);
    }

    if (materials.whiteCement) {
      console.log(`   Cemento Blanco: ${materials.whiteCement.quantity} ${materials.whiteCement.unit}`);
      console.log(`   Costo: $${materials.whiteCement.cost?.toLocaleString('es-AR') || 0}`);

      // Verificar que esté en bolsas
      if (materials.whiteCement.unit.includes('bolsas')) {
        console.log(`   ✅ Cemento blanco en BOLSAS (correcto)`);
      } else {
        console.log(`   ❌ ERROR: Cemento blanco NO está en bolsas`);
      }
    }

    if (materials.marmolina) {
      console.log(`   Marmolina: ${materials.marmolina.quantity} ${materials.marmolina.unit}`);
      console.log(`   Costo: $${materials.marmolina.cost?.toLocaleString('es-AR') || 0}`);

      // Verificar que esté en bolsas
      if (materials.marmolina.unit.includes('bolsas')) {
        console.log(`   ✅ Marmolina en BOLSAS (correcto)`);
      } else {
        console.log(`   ❌ ERROR: Marmolina NO está en bolsas`);
      }
    }

    if (materials.wireMesh) {
      console.log(`   Malla de Acero: ${materials.wireMesh.quantity} ${materials.wireMesh.unit}`);
      console.log(`   Costo: $${materials.wireMesh.cost?.toLocaleString('es-AR') || 0}`);
    }

    console.log(`\n💰 COSTOS TOTALES:`);
    console.log('   ───────────────────────────────────────────────');
    console.log(`   Costo Materiales: $${project.materialCost?.toLocaleString('es-AR') || 0}`);
    console.log(`   Costo Mano de Obra: $${project.laborCost?.toLocaleString('es-AR') || 0}`);
    console.log(`   COSTO TOTAL: $${project.totalCost?.toLocaleString('es-AR') || 0}`);

    console.log(`\n📐 ÁREAS Y VOLÚMENES:`);
    console.log('   ───────────────────────────────────────────────');
    console.log(`   Área Vereda: ${project.sidewalkArea?.toFixed(2) || 0} m²`);
    console.log(`   Espejo de Agua: ${project.waterMirrorArea?.toFixed(2) || 0} m²`);
    console.log(`   Volumen: ${project.volume?.toFixed(2) || 0} m³`);
    console.log(`   Perímetro: ${project.perimeter?.toFixed(2) || 0} m`);

    // Verificar datos del tileCalculation
    const tileCalc = project.tileCalculation as any;
    if (tileCalc && Object.keys(tileCalc).length > 0) {
      console.log(`\n🔲 CONFIGURACIÓN DE LOSETAS:`);
      console.log('   ───────────────────────────────────────────────');

      ['north', 'south', 'east', 'west'].forEach(side => {
        const sideConfig = tileCalc[side];
        if (sideConfig) {
          console.log(`   ${side.toUpperCase()}:`);
          console.log(`      Primer anillo: ${sideConfig.firstRingType || 'ninguno'}`);
          console.log(`      Filas adicionales: ${sideConfig.rows || 0}`);
        }
      });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ DATOS VERIFICADOS - Listos para exportación a PDF/Excel');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
testExportData();
