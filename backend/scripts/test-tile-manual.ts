// Test manual del cálculo de losetas para Familia Figueroa

const TILE_SIZE = 0.5; // 50cm = 0.5m
const JOINT_SIZE = 0.003; // 3mm = 0.003m
const EFFECTIVE_TILE_SIZE = TILE_SIZE + JOINT_SIZE; // 0.503m

// Configuración Familia Figueroa
const poolLength = 5; // metros
const poolWidth = 2.5; // metros

const tileConfig = {
  north: { rows: 1, firstRingType: 'LOMO_BALLENA' },
  south: { rows: 1, firstRingType: 'LOMO_BALLENA' },
  east: { rows: 5, firstRingType: 'LOMO_BALLENA' },
  west: { rows: 2, firstRingType: 'LOMO_BALLENA' },
};

console.log('📐 PROYECTO: Familia Figueroa');
console.log(`📏 Dimensiones: ${poolLength}m x ${poolWidth}m\n`);

// PASO 1: PRIMER ANILLO
console.log('🔵 PASO 1: PRIMER ANILLO (Lomo Ballena)');
const northTiles = Math.ceil(poolLength / EFFECTIVE_TILE_SIZE);
const southTiles = Math.ceil(poolLength / EFFECTIVE_TILE_SIZE);
const eastTiles = Math.ceil(poolWidth / EFFECTIVE_TILE_SIZE);
const westTiles = Math.ceil(poolWidth / EFFECTIVE_TILE_SIZE);

console.log(`  Norte (${poolLength}m): ${northTiles} losetas`);
console.log(`  Sur (${poolLength}m): ${southTiles} losetas`);
console.log(`  Este (${poolWidth}m): ${eastTiles} losetas`);
console.log(`  Oeste (${poolWidth}m): ${westTiles} losetas`);

const totalFirstRing = northTiles + southTiles + eastTiles + westTiles;
console.log(`  TOTAL Lomo Ballena: ${totalFirstRing} losetas ✅\n`);

// PASO 2: ESQUINEROS
console.log('🟡 PASO 2: ESQUINEROS');
console.log(`  4 Esquineros amarillos ✅\n`);

// PASO 3: FILAS ADICIONALES
console.log('⚪ PASO 3: FILAS ADICIONALES (Mosaicos Comunes)');

const getExtraRows = (side: string, totalRows: number) => {
  return Math.max(0, totalRows - 1); // Restar 1 porque la primera es el primer anillo
};

const northExtraRows = getExtraRows('north', tileConfig.north.rows);
const southExtraRows = getExtraRows('south', tileConfig.south.rows);
const eastExtraRows = getExtraRows('east', tileConfig.east.rows);
const westExtraRows = getExtraRows('west', tileConfig.west.rows);

console.log(`  Norte: ${northExtraRows} filas extra × ${northTiles} = ${northExtraRows * northTiles} losetas`);
console.log(`  Sur: ${southExtraRows} filas extra × ${southTiles} = ${southExtraRows * southTiles} losetas`);
console.log(`  Este: ${eastExtraRows} filas extra × ${eastTiles} = ${eastExtraRows * eastTiles} losetas`);
console.log(`  Oeste: ${westExtraRows} filas extra × ${westTiles} = ${westExtraRows * westTiles} losetas`);

let totalCommon =
  (northExtraRows * northTiles) +
  (southExtraRows * southTiles) +
  (eastExtraRows * eastTiles) +
  (westExtraRows * westTiles);

console.log(`  Subtotal lados: ${totalCommon}`);

// Esquinas de filas adicionales
const cornerNorthWest = tileConfig.north.rows * tileConfig.west.rows;
const cornerNorthEast = tileConfig.north.rows * tileConfig.east.rows;
const cornerSouthWest = tileConfig.south.rows * tileConfig.west.rows;
const cornerSouthEast = tileConfig.south.rows * tileConfig.east.rows;

const totalCorners = cornerNorthWest + cornerNorthEast + cornerSouthWest + cornerSouthEast;
const cornersMinusFirstRing = totalCorners - 4; // Restar las 4 del primer anillo (esquineros)

console.log(`\n  Esquinas totales: ${totalCorners}`);
console.log(`    NorteOeste: ${tileConfig.north.rows} × ${tileConfig.west.rows} = ${cornerNorthWest}`);
console.log(`    NorteEste: ${tileConfig.north.rows} × ${tileConfig.east.rows} = ${cornerNorthEast}`);
console.log(`    SurOeste: ${tileConfig.south.rows} × ${tileConfig.west.rows} = ${cornerSouthWest}`);
console.log(`    SurEste: ${tileConfig.south.rows} × ${tileConfig.east.rows} = ${cornerSouthEast}`);
console.log(`  Menos 4 esquineros amarillos: ${totalCorners} - 4 = ${cornersMinusFirstRing}`);

totalCommon += cornersMinusFirstRing;

console.log(`  TOTAL Mosaicos Comunes: ${totalCommon} losetas ✅\n`);

// RESUMEN
console.log('=' .repeat(50));
console.log('📊 RESUMEN FINAL:');
console.log('=' .repeat(50));
console.log(`✅ Losetas Lomo Ballena (50x50cm): ${totalFirstRing} unidades`);
console.log(`✅ Esquineros Lomo Ballena (50x50cm): 4 unidades`);
console.log(`✅ Mosaicos Comunes (50x50cm): ${totalCommon} unidades`);
console.log('=' .repeat(50));
