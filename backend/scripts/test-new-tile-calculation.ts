/**
 * Script para probar el nuevo algoritmo de cálculo de losetas
 * Verifica que las reglas profesionales se apliquen correctamente
 */

const TILE_SIZE = 0.5; // 50cm
const JOINT_SIZE = 0.003; // 3mm
const EFFECTIVE_TILE_SIZE = TILE_SIZE + JOINT_SIZE; // 0.503m

function calculateTilesForDimension(dimensionLength: number): number {
  // Calcular cuántas losetas completas caben
  const fullTilesCount = Math.floor(dimensionLength / EFFECTIVE_TILE_SIZE);

  // Calcular espacio restante después de colocar losetas completas
  const remainingSpace = dimensionLength - (fullTilesCount * EFFECTIVE_TILE_SIZE);

  // REGLA 1: Si no hay espacio restante o solo es la junta
  if (remainingSpace <= JOINT_SIZE) {
    return fullTilesCount;
  }

  // REGLA 2: Si el espacio restante es >= 50% del tamaño de una loseta
  // Agregar una loseta más (será la loseta central, puede estar ligeramente cortada)
  if (remainingSpace >= (TILE_SIZE / 2)) {
    return fullTilesCount + 1;
  }

  // REGLA 3: Si el espacio restante es < 50% del tamaño de una loseta
  // Significa que la loseta central quedaría muy pequeña
  // En este caso, redistribuimos el espacio entre las últimas 2-3 losetas
  // Para efectos de conteo, agregamos 1 loseta más para compensar los cortes
  return fullTilesCount + 1;
}

// Casos de prueba
console.log('='.repeat(80));
console.log('PRUEBAS DEL NUEVO ALGORITMO DE CÁLCULO DE LOSETAS');
console.log('='.repeat(80));
console.log('');

const testCases = [
  // Caso 1: Dimensión exacta (8m = 15.9 losetas ~ 16 exactas)
  { dimension: 8.048, description: 'Piscina 8m largo (exacto con juntas)' },

  // Caso 2: Dimensión común 8m (no exacta)
  { dimension: 8.0, description: 'Piscina 8m largo (común)' },

  // Caso 3: Dimensión común 4m (ancho)
  { dimension: 4.0, description: 'Piscina 4m ancho' },

  // Caso 4: Dimensión con espacio grande sobrante
  { dimension: 8.5, description: 'Dimensión 8.5m (sobra ~0.5m)' },

  // Caso 5: Dimensión con espacio pequeño sobrante
  { dimension: 8.1, description: 'Dimensión 8.1m (sobra ~0.1m)' },

  // Caso 6: Dimensión con espacio mediano sobrante
  { dimension: 8.3, description: 'Dimensión 8.3m (sobra ~0.3m)' },

  // Caso 7: 10 metros
  { dimension: 10.0, description: 'Piscina 10m largo' },

  // Caso 8: 6 metros
  { dimension: 6.0, description: 'Piscina 6m' },
];

testCases.forEach((testCase, index) => {
  console.log(`\nCASO ${index + 1}: ${testCase.description}`);
  console.log('-'.repeat(80));

  const dimension = testCase.dimension;
  const fullTilesCount = Math.floor(dimension / EFFECTIVE_TILE_SIZE);
  const remainingSpace = dimension - (fullTilesCount * EFFECTIVE_TILE_SIZE);
  const totalTiles = calculateTilesForDimension(dimension);

  console.log(`Dimensión: ${dimension.toFixed(3)}m`);
  console.log(`Losetas completas que caben: ${fullTilesCount}`);
  console.log(`Espacio restante: ${(remainingSpace * 100).toFixed(2)}cm`);
  console.log(`Porcentaje del tamaño de loseta: ${((remainingSpace / TILE_SIZE) * 100).toFixed(1)}%`);

  // Determinar qué regla se aplicó
  let rule = '';
  if (remainingSpace <= JOINT_SIZE) {
    rule = 'REGLA 1: Sin espacio restante (solo junta) - No agregar loseta';
  } else if (remainingSpace >= (TILE_SIZE / 2)) {
    rule = 'REGLA 2: Espacio >= 50% - Agregar loseta completa en centro';
  } else {
    rule = 'REGLA 3: Espacio < 50% - Redistribuir desde 2-3 losetas antes';
  }

  console.log(`Regla aplicada: ${rule}`);
  console.log(`Total de losetas necesarias: ${totalTiles}`);
  console.log('');

  // Mostrar distribución
  if (totalTiles > fullTilesCount) {
    const totalSpaceUsed = fullTilesCount * EFFECTIVE_TILE_SIZE;
    const centerTileSpace = dimension - totalSpaceUsed;
    console.log(`Distribución:`);
    console.log(`  - ${Math.floor(fullTilesCount / 2)} losetas completas desde extremo izquierdo`);
    console.log(`  - 1 loseta central (${(centerTileSpace * 100).toFixed(2)}cm disponibles)`);
    console.log(`  - ${Math.floor(fullTilesCount / 2)} losetas completas desde extremo derecho`);

    if (remainingSpace < (TILE_SIZE / 2)) {
      console.log(`  ⚠️  NOTA: Como la loseta central quedaría muy pequeña (<50%),`);
      console.log(`     se deben redistribuir los últimos cm entre 2-3 losetas para`);
      console.log(`     que todas queden más proporcionadas.`);
    }
  } else {
    console.log(`Distribución:`);
    console.log(`  - ${Math.floor(fullTilesCount / 2)} losetas completas desde extremo izquierdo`);
    console.log(`  - ${Math.floor(fullTilesCount / 2)} losetas completas desde extremo derecho`);
    console.log(`  - Sin loseta central (espacio mínimo)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('EJEMPLO PRÁCTICO: Piscina 8m x 4m');
console.log('='.repeat(80));

const poolLength = 8.0;
const poolWidth = 4.0;

console.log(`\nPiscina de ${poolLength}m x ${poolWidth}m`);
console.log(`\nLado LARGO (${poolLength}m):`);
const longSideTiles = calculateTilesForDimension(poolLength);
console.log(`  Total de losetas por fila: ${longSideTiles}`);

console.log(`\nLado CORTO (${poolWidth}m):`);
const shortSideTiles = calculateTilesForDimension(poolWidth);
console.log(`  Total de losetas por fila: ${shortSideTiles}`);

console.log(`\nPRIMER ANILLO (anillo perimetral - SIEMPRE EXISTE):`);
console.log(`  - Norte: ${longSideTiles} losetas`);
console.log(`  - Sur: ${longSideTiles} losetas`);
console.log(`  - Este: ${shortSideTiles} losetas`);
console.log(`  - Oeste: ${shortSideTiles} losetas`);
console.log(`  - Esquineros: 4 unidades`);
const firstRingTotal = (longSideTiles * 2) + (shortSideTiles * 2);
console.log(`  Total primer anillo: ${firstRingTotal} losetas + 4 esquineros`);

console.log('\n' + '='.repeat(80));
