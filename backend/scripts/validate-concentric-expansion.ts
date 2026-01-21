import { calculateTileMaterials } from '../src/utils/tileCalculations';

console.log('🧪 VALIDACIÓN DE EXPANSIÓN CONCÉNTRICA\n');
console.log('='.repeat(70));

// Mock de piscina 5m × 2.5m
const mockPoolPreset: any = {
  id: 'test',
  name: 'Test Pool',
  length: 5.0,  // Norte-Sur
  width: 2.5,   // Este-Oeste
  depth: 1.0,
};

// Mock de loseta 50x50cm
const mockTilePresets = [
  {
    id: 'tile-50x50',
    name: 'Loseta 50x50cm',
    type: 'COMMON',
    width: 0.5,
    length: 0.5,
    pricePerUnit: 1000,
  }
];

const mockSettings: any = {
  adhesiveKgPerM2: 5.0,
  sidewalkBaseThicknessCm: 10.0,
  cementKgPerM3: 200.0,
  sandM3PerM3: 0.6,
  gravelM3PerM3: 0.8,
  groutJointWidthMm: 3.0,
  whiteCementKgPerLinealM: 0.15,
  marmolinaKgPerLinealM: 0.10,
};

const mockMaterialPrices: any[] = [];

console.log('\n📐 PISCINA DE PRUEBA:');
console.log(`   Dimensiones: ${mockPoolPreset.length}m (N-S) × ${mockPoolPreset.width}m (E-O)`);
console.log(`   Perímetro: ${2 * (mockPoolPreset.length + mockPoolPreset.width)}m`);
console.log(`   Loseta: 50cm × 50cm`);

// TEST 1: Primer anillo perimetral completo con LOMO_BALLENA
console.log('\n\n' + '='.repeat(70));
console.log('TEST 1: PRIMER ANILLO PERIMETRAL - LOMO BALLENA');
console.log('='.repeat(70));

const config1 = {
  north: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  south: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  east: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  west: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
};

const result1 = calculateTileMaterials(
  mockPoolPreset,
  config1,
  mockTilePresets,
  mockSettings,
  mockMaterialPrices
);

console.log('\n📊 CÁLCULO ESPERADO:');
console.log(`   Perímetro: ${2 * (mockPoolPreset.length + mockPoolPreset.width)}m = 15m`);
console.log(`   15m / 0.5m = 30 losetas`);
console.log(`   30 - 4 (esquinas) = 26 losetas LOMO_BALLENA`);
console.log(`   + 4 esquineros`);

console.log('\n✅ RESULTADO DEL SISTEMA:');
result1.tiles.forEach((tile: any) => {
  console.log(`   ${tile.tileName}: ${tile.quantity} ${tile.unit}`);

  if (tile.type === 'first_ring' && tile.quantity !== 26) {
    console.log(`   ⚠️  ESPERADO: 26, OBTENIDO: ${tile.quantity}`);
  }
  if (tile.type === 'corner' && tile.quantity !== 4) {
    console.log(`   ⚠️  ESPERADO: 4, OBTENIDO: ${tile.quantity}`);
  }
});

// TEST 2: Una fila en el lado del skimmer (norte)
console.log('\n\n' + '='.repeat(70));
console.log('TEST 2: PRIMER ANILLO + 1 FILA EN NORTE (SKIMMER)');
console.log('='.repeat(70));

const config2 = {
  north: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
  south: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  east: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  west: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
};

const result2 = calculateTileMaterials(
  mockPoolPreset,
  config2,
  mockTilePresets,
  mockSettings,
  mockMaterialPrices
);

console.log('\n📊 CÁLCULO ESPERADO:');
console.log(`   Norte (skimmer): 2.5m / 0.5m = 5 losetas`);

console.log('\n✅ RESULTADO DEL SISTEMA:');
result2.tiles.forEach((tile: any) => {
  console.log(`   ${tile.tileName}: ${tile.quantity} ${tile.unit}`);

  if (tile.type === 'additional_rows' && tile.quantity !== 5) {
    console.log(`   ⚠️  ESPERADO: 5, OBTENIDO: ${tile.quantity}`);
  }
});

// TEST 3: Una fila en norte + una fila en este (expansión)
console.log('\n\n' + '='.repeat(70));
console.log('TEST 3: PRIMER ANILLO + 1 FILA NORTE + 1 FILA ESTE (CON EXPANSIÓN)');
console.log('='.repeat(70));

const config3 = {
  north: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
  south: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
  east: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
  west: { firstRingType: 'LOMO_BALLENA' as const, rows: 0, selectedTileId: null },
};

const result3 = calculateTileMaterials(
  mockPoolPreset,
  config3,
  mockTilePresets,
  mockSettings,
  mockMaterialPrices
);

console.log('\n📊 CÁLCULO ESPERADO:');
console.log(`   Fila 1 Norte: 2.5m / 0.5m = 5 losetas`);
console.log(`   Fila 1 Este: (5m + 0.5m) / 0.5m = 11 losetas`);
console.log(`   TOTAL ADICIONALES: 5 + 11 = 16 losetas`);

console.log('\n✅ RESULTADO DEL SISTEMA:');
let totalAdditional = 0;
result3.tiles.forEach((tile: any) => {
  console.log(`   ${tile.tileName}: ${tile.quantity} ${tile.unit}`);
  if (tile.type === 'additional_rows') {
    totalAdditional += tile.quantity;
  }
});

if (totalAdditional === 16) {
  console.log(`   ✅ TOTAL ADICIONALES CORRECTO: ${totalAdditional}`);
} else {
  console.log(`   ⚠️  ESPERADO: 16, OBTENIDO: ${totalAdditional}`);
}

// TEST 4: Dos filas en norte, una en los demás (caso complejo)
console.log('\n\n' + '='.repeat(70));
console.log('TEST 4: CASO COMPLEJO - FILAS DIFERENTES POR LADO');
console.log('='.repeat(70));

const config4 = {
  north: { firstRingType: 'LOMO_BALLENA' as const, rows: 2, selectedTileId: 'tile-50x50' },
  south: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
  east: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
  west: { firstRingType: 'LOMO_BALLENA' as const, rows: 1, selectedTileId: 'tile-50x50' },
};

const result4 = calculateTileMaterials(
  mockPoolPreset,
  config4,
  mockTilePresets,
  mockSettings,
  mockMaterialPrices
);

console.log('\n📊 CÁLCULO ESPERADO (MANUAL):');
console.log(`   FILA 1:`);
console.log(`     Norte: 2.5m / 0.5m = 5 losetas`);
console.log(`     Sur: 2.5m / 0.5m = 5 losetas`);
console.log(`     Este: (5m + 0.5m + 0.5m) / 0.5m = 12 losetas (expandido por N+S)`);
console.log(`     Oeste: (5m + 0.5m + 0.5m) / 0.5m = 12 losetas`);
console.log(`   FILA 2:`);
console.log(`     Norte: (2.5m + 0.5m + 0.5m) / 0.5m = 7 losetas (expandido por E+O fila 1)`);
console.log(`     Sur, Este, Oeste: no tienen fila 2`);
console.log(`   TOTAL: 5 + 5 + 12 + 12 + 7 = 41 losetas`);

console.log('\n✅ RESULTADO DEL SISTEMA:');
let totalAdditional4 = 0;
result4.tiles.forEach((tile: any) => {
  console.log(`   ${tile.tileName}: ${tile.quantity} ${tile.unit}`);
  if (tile.type === 'additional_rows') {
    totalAdditional4 += tile.quantity;
  }
});

if (totalAdditional4 === 41) {
  console.log(`   ✅ TOTAL ADICIONALES CORRECTO: ${totalAdditional4}`);
} else {
  console.log(`   ⚠️  ESPERADO: 41, OBTENIDO: ${totalAdditional4}`);
}

console.log('\n' + '='.repeat(70));
console.log('FIN DE TESTS DE VALIDACIÓN');
console.log('='.repeat(70) + '\n');
