import prisma from '../src/config/database';
import { calculateTileMaterials } from '../src/utils/tileCalculations';
import { calculateBedMaterials } from '../src/utils/bedCalculations';

async function validateCalculations() {
  console.log('🧪 VALIDANDO CÁLCULOS DE LOSETAS Y MATERIALES\n');
  console.log('='.repeat(70));

  try {
    // Obtener una piscina de prueba (cualquiera)
    const poolPreset = await prisma.poolPreset.findFirst();

    if (!poolPreset) {
      console.log('❌ No se encontró piscina de prueba');
      return;
    }

    console.log(`\n📐 PISCINA DE PRUEBA: ${poolPreset.name}`);
    console.log(`   Dimensiones: ${poolPreset.length}m × ${poolPreset.width}m × ${poolPreset.depth}m`);
    console.log(`   Perímetro: ${2 * (poolPreset.length + poolPreset.width)}m`);

    // Obtener una loseta común de 50x50cm
    const commonTile = await prisma.tilePreset.findFirst({
      where: {
        type: 'COMMON',
        width: 0.5,
        length: 0.5
      }
    });

    if (!commonTile) {
      console.log('❌ No se encontró loseta de prueba');
      return;
    }

    console.log(`\n🔲 LOSETA DE PRUEBA: ${commonTile.name}`);
    console.log(`   Dimensiones: ${commonTile.width}m × ${commonTile.length}m`);
    console.log(`   Precio: $${commonTile.pricePerUnit}`);

    // Crear configuración de losetas de prueba
    // Caso: 4 filas adicionales en lado norte (largo de la piscina) con losetas de 50x50cm
    const testSideLength = poolPreset.length; // Usar el largo real de la piscina
    const testRows = 4;
    const jointSize = 0.008; // 8mm

    console.log(`\n🧮 CÁLCULO MANUAL DE VALIDACIÓN:`);
    console.log(`   Lado norte (largo piscina): ${testSideLength}m`);
    console.log(`   Filas adicionales: ${testRows}`);
    console.log(`   Loseta: ${commonTile.width}m × ${commonTile.length}m`);
    console.log(`   Junta: ${jointSize}m (8mm)`);

    // Cálculo esperado
    const effectiveTileLength = commonTile.length + jointSize; // 0.5 + 0.008 = 0.508m
    const tilesPerRow = Math.ceil(testSideLength / effectiveTileLength);
    const totalTilesExpected = tilesPerRow * testRows;

    console.log(`\n   ✓ Largo efectivo por loseta: ${effectiveTileLength}m`);
    console.log(`   ✓ Losetas por fila: ${tilesPerRow}`);
    console.log(`   ✓ Total losetas ESPERADO: ${totalTilesExpected}`);

    // Configuración de losetas para prueba
    const tileConfig = {
      north: {
        firstRingType: null,
        rows: testRows,
        selectedTileId: commonTile.id,
      },
      south: {
        firstRingType: null,
        rows: 0,
        selectedTileId: null,
      },
      east: {
        firstRingType: null,
        rows: 0,
        selectedTileId: null,
      },
      west: {
        firstRingType: null,
        rows: 0,
        selectedTileId: null,
      },
    };

    // Obtener todos los presets necesarios
    const tilePresets = await prisma.tilePreset.findMany();
    const userSettings = await prisma.calculationSettings.findFirst();
    const materialPrices = await prisma.constructionMaterialPreset.findMany();

    if (!userSettings) {
      console.log('\n⚠️  No se encontraron settings de usuario, usando defaults');
      return;
    }

    // Ejecutar cálculo real del sistema
    const result = calculateTileMaterials(
      poolPreset,
      tileConfig as any,
      tilePresets,
      userSettings as any,
      materialPrices
    );

    console.log(`\n📊 RESULTADO DEL SISTEMA:`);
    console.log('   Losetas calculadas:');

    let testPassed = true;
    result.tiles.forEach((tile: any) => {
      console.log(`   - ${tile.tileName}: ${tile.quantity} ${tile.unit}`);

      if (tile.type === 'additional_rows' && tile.quantity !== totalTilesExpected) {
        testPassed = false;
        console.log(`   ⚠️  ESPERADO: ${totalTilesExpected}, OBTENIDO: ${tile.quantity}`);
      }
    });

    // Verificar cálculo de materiales de cama
    console.log(`\n🛏️  CÁLCULO DE MATERIALES DE CAMA:`);
    const bedCalc = calculateBedMaterials(
      poolPreset,
      userSettings as any,
      materialPrices
    );

    console.log(`   Geomembrana: ${bedCalc.bedMaterials.geomembrane.quantity} ${bedCalc.bedMaterials.geomembrane.unit}`);
    console.log(`   Malla: ${bedCalc.bedMaterials.electroweldedMesh.quantity} ${bedCalc.bedMaterials.electroweldedMesh.unit}`);
    console.log(`   Arena: ${bedCalc.bedMaterials.sandForBed.quantity} ${bedCalc.bedMaterials.sandForBed.unit}`);
    console.log(`   Cemento: ${bedCalc.bedMaterials.cementBags.quantity} ${bedCalc.bedMaterials.cementBags.unit}`);
    console.log(`   Costo total cama: $${bedCalc.totalBedMaterialCost.toLocaleString('es-AR')}`);

    // Verificar que el cemento esté en bolsas, no en kg
    if (bedCalc.bedMaterials.cementBags.unit.includes('bolsas')) {
      console.log(`   ✅ Cemento correctamente en bolsas`);
    } else {
      console.log(`   ❌ ERROR: Cemento NO está en bolsas`);
      testPassed = false;
    }

    // Verificar materiales de vereda
    if (result.materials) {
      console.log(`\n🧱 MATERIALES DE VEREDA:`);
      console.log(`   Área de vereda: ${result.sidewalkArea.toFixed(2)} m²`);

      if (result.materials.cement) {
        console.log(`   Cemento: ${result.materials.cement.quantity} ${result.materials.cement.unit}`);
        if (result.materials.cement.unit.includes('bolsas')) {
          console.log(`   ✅ Cemento de vereda correctamente en bolsas`);
        } else {
          console.log(`   ❌ ERROR: Cemento de vereda NO está en bolsas`);
          testPassed = false;
        }
      }

      if (result.materials.whiteCement) {
        console.log(`   Cemento Blanco: ${result.materials.whiteCement.quantity} ${result.materials.whiteCement.unit}`);
        if (result.materials.whiteCement.unit.includes('bolsas')) {
          console.log(`   ✅ Cemento blanco correctamente en bolsas`);
        } else {
          console.log(`   ❌ ERROR: Cemento blanco NO está en bolsas`);
          testPassed = false;
        }
      }

      if (result.materials.marmolina) {
        console.log(`   Marmolina: ${result.materials.marmolina.quantity} ${result.materials.marmolina.unit}`);
        if (result.materials.marmolina.unit.includes('bolsas')) {
          console.log(`   ✅ Marmolina correctamente en bolsas`);
        } else {
          console.log(`   ❌ ERROR: Marmolina NO está en bolsas`);
          testPassed = false;
        }
      }

      console.log(`   Costo total vereda: $${result.totalMaterialCost.toLocaleString('es-AR')}`);
    }

    console.log(`\n${'='.repeat(70)}`);
    if (testPassed) {
      console.log('✅ TODOS LOS TESTS PASARON CORRECTAMENTE');
    } else {
      console.log('❌ ALGUNOS TESTS FALLARON - Revisar detalles arriba');
    }
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ ERROR EN VALIDACIÓN:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar validación
validateCalculations();
