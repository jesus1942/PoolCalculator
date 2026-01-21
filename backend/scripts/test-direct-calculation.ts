import { calculateTileMaterials } from '../src/utils/tileCalculations';

// Datos exactos de Familia Figueroa
const poolPreset = {
  id: '60dcc637-bcad-4715-bf1f-7fdaa4a476d3',
  name: 'Piscina 5x2.5m',
  length: 5,
  width: 2.5,
  depth: 1.4,
  volume: 17.5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tileConfig = {
  north: { rows: 1, firstRingType: 'LOMO_BALLENA', selectedTileId: '8e438894-d413-4489-8d8e-c57e9afbcb02' },
  south: { rows: 1, firstRingType: 'LOMO_BALLENA', selectedTileId: '8e438894-d413-4489-8d8e-c57e9afbcb02' },
  east: { rows: 5, firstRingType: 'LOMO_BALLENA', selectedTileId: '8e438894-d413-4489-8d8e-c57e9afbcb02' },
  west: { rows: 2, firstRingType: 'LOMO_BALLENA', selectedTileId: '8e438894-d413-4489-8d8e-c57e9afbcb02' },
};

const tilePresets = [
  {
    id: '8e438894-d413-4489-8d8e-c57e9afbcb02',
    name: 'Mosaico Romana',
    type: 'ROMANA',
    width: 50,
    length: 50,
    pricePerUnit: 1200,
    brand: 'Romana',
    description: 'Mosaico veneciano 50x50cm',
    hasCorner: true,
    cornerPrice: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const settings = {
  adhesiveKgPerM2: 4,
  sidewalkBaseThicknessCm: 10,
  cementKgPerM3: 350,
  sandM3PerM3: 0.5,
  gravelM3PerM3: 0.8,
  groutJointWidthMm: 3,
  whiteCementKgPerLinealM: 0.5,
  marmolinaKgPerLinealM: 0.3,
  wireMeshM2PerM2: 1,
  waterproofingKgPerM2: 0,
  waterproofingCoats: 0,
};

console.log('🧮 CALCULANDO CON LA FUNCIÓN ACTUAL...\n');

const result = calculateTileMaterials(poolPreset, tileConfig, tilePresets, settings, []);

console.log('📊 RESULTADOS:');
console.log(JSON.stringify(result.tiles, null, 2));

console.log('\n✅ ESPERADO:');
console.log('  - 30 Losetas Lomo Ballena');
console.log('  - 4 Esquineros');
console.log('  - 35 Mosaicos Comunes');
