import { PoolPreset } from '@prisma/client';

interface TileConfig {
  north: SideConfig;
  south: SideConfig;
  east: SideConfig;
  west: SideConfig;
}

interface SideConfig {
  firstRingType: string;
  rows: number;
  selectedTileId: string;
}

interface CalculationSettings {
  adhesiveKgPerM2: number;
  sidewalkBaseThicknessCm: number;
  cementKgPerM3: number;
  sandM3PerM3: number;
  gravelM3PerM3: number;
  groutJointWidthMm: number;
  whiteCementKgPerLinealM: number;
  marmolinaKgPerLinealM: number;
  wireMeshM2PerM2: number;
  waterproofingKgPerM2: number;
  waterproofingCoats: number;
}

interface MaterialPricing {
  name: string;
  type: string;
  pricePerUnit: number;
  unit: string;
  bagWeight: number | null;
}

export function calculateTileMaterials(
  poolPreset: PoolPreset,
  tileConfig: TileConfig,
  tilePresets: any[],
  settings: CalculationSettings,
  materialPrices: MaterialPricing[] = []
) {
  const poolLength = poolPreset.length;
  const poolWidth = poolPreset.width;
  const perimeter = 2 * (poolLength + poolWidth);

  // Calcular área de cada lado de la vereda
  const northSidewalkArea = calculateSidewalkArea(poolLength, tileConfig.north, tilePresets);
  const southSidewalkArea = calculateSidewalkArea(poolLength, tileConfig.south, tilePresets);
  const eastSidewalkArea = calculateSidewalkArea(poolWidth, tileConfig.east, tilePresets);
  const westSidewalkArea = calculateSidewalkArea(poolWidth, tileConfig.west, tilePresets);

  const totalSidewalkArea = northSidewalkArea + southSidewalkArea + eastSidewalkArea + westSidewalkArea;

  // Calcular cantidad de losetas
  const tiles = calculateTileQuantities(poolLength, poolWidth, tileConfig, tilePresets);

  // Calcular materiales
  const adhesive = totalSidewalkArea * settings.adhesiveKgPerM2;

  const concreteVolume = (totalSidewalkArea * settings.sidewalkBaseThicknessCm) / 100; // m³
  const cement = concreteVolume * settings.cementKgPerM3;
  const sand = concreteVolume * settings.sandM3PerM3;
  const gravel = concreteVolume * settings.gravelM3PerM3;

  const totalPerimeterWithRows = perimeter + (
    (tileConfig.north.rows + tileConfig.south.rows) * poolLength * 2 +
    (tileConfig.east.rows + tileConfig.west.rows) * poolWidth * 2
  );
  const whiteCement = totalPerimeterWithRows * settings.whiteCementKgPerLinealM;
  const marmolina = totalPerimeterWithRows * settings.marmolinaKgPerLinealM;

  const wireMesh = totalSidewalkArea * settings.wireMeshM2PerM2;
  const waterproofing = totalSidewalkArea * settings.waterproofingKgPerM2 * settings.waterproofingCoats;

  // Helper function to find material price
  const findPrice = (materialType: string, unit: string): number => {
    const material = materialPrices.find(
      m => m.type === materialType || m.name.toLowerCase().includes(materialType.toLowerCase())
    );
    return material?.pricePerUnit || 0;
  };

  // Obtener pesos de bolsas desde la BD
  const cementMaterial = materialPrices.find(m => m.type === 'CEMENT');
  const whiteCementMaterial = materialPrices.find(m => m.type === 'WHITE_CEMENT');
  const marmolinaMaterial = materialPrices.find(m => m.type === 'MARMOLINA');

  const cementBagWeight = cementMaterial?.bagWeight || 50; // Fallback a 50kg
  const whiteCementBagWeight = whiteCementMaterial?.bagWeight || 25; // Fallback a 25kg
  const marmolinaBagWeight = marmolinaMaterial?.bagWeight || 30; // Fallback a 30kg

  // Calcular costos
  const adhesiveCost = Math.ceil(adhesive) * findPrice('ADHESIVE', 'kg');
  // Calcular cemento por BOLSAS usando bagWeight de BD
  const cementBags = Math.ceil(cement / cementBagWeight);
  const cementCost = cementBags * findPrice('CEMENT', 'bolsa');
  const sandCost = parseFloat(sand.toFixed(2)) * findPrice('SAND', 'm³');
  const gravelCost = parseFloat(gravel.toFixed(2)) * findPrice('STONE', 'm³');
  // Calcular cemento blanco por BOLSAS usando bagWeight de BD
  const whiteCementBags = Math.ceil(whiteCement / whiteCementBagWeight);
  const whiteCementCost = whiteCementBags * findPrice('WHITE_CEMENT', 'bolsa');
  // Calcular marmolina por BOLSAS usando bagWeight de BD
  const marmolinaBags = Math.ceil(marmolina / marmolinaBagWeight);
  const marmolinaCost = marmolinaBags * findPrice('MARMOLINA', 'bolsa');
  const wireMeshCost = Math.ceil(wireMesh) * findPrice('WIRE_MESH', 'm²');
  const waterproofingCost = Math.ceil(waterproofing) * findPrice('WATERPROOFING', 'kg');

  const totalMaterialCost = adhesiveCost + cementCost + sandCost + gravelCost +
                            whiteCementCost + marmolinaCost + wireMeshCost + waterproofingCost;

  return {
    sidewalkArea: totalSidewalkArea,
    tiles,
    materials: {
      adhesive: { quantity: Math.ceil(adhesive), unit: 'kg', cost: adhesiveCost },
      cement: { quantity: Math.ceil(cement), unit: 'kg', cost: cementCost },
      sand: { quantity: sand.toFixed(2), unit: 'm³', cost: sandCost },
      gravel: { quantity: gravel.toFixed(2), unit: 'm³', cost: gravelCost },
      whiteCement: { quantity: Math.ceil(whiteCement), unit: 'kg', cost: whiteCementCost },
      marmolina: { quantity: Math.ceil(marmolina), unit: 'kg', cost: marmolinaCost },
      wireMesh: { quantity: Math.ceil(wireMesh), unit: 'm²', cost: wireMeshCost },
      waterproofing: { quantity: Math.ceil(waterproofing), unit: 'kg', cost: waterproofingCost },
    },
    totalMaterialCost,
  };
}

function calculateSidewalkArea(sideLength: number, sideConfig: SideConfig, tilePresets: any[]): number {
  // Junta entre losetas: 8mm = 0.008m
  const jointSize = 0.008;
  let totalArea = 0;

  // PRIMER ANILLO - siempre debe contarse si está configurado
  if (sideConfig.firstRingType) {
    // Dimensiones reales de losetas de primer anillo según tipo (en metros)
    let firstRingTileWidth = 0.40; // metros por defecto (40cm de ancho hacia afuera)

    if (sideConfig.firstRingType === 'LOMO_BALLENA') {
      firstRingTileWidth = 0.50; // 50cm de ancho
    } else if (sideConfig.firstRingType === 'L_FINISH') {
      firstRingTileWidth = 0.40; // 40cm
    } else if (sideConfig.firstRingType === 'PERIMETER') {
      firstRingTileWidth = 0.40; // 40cm
    }

    // Ancho efectivo = ancho de loseta + junta
    const effectiveFirstRingWidth = firstRingTileWidth + jointSize;

    // Área del primer anillo = largo del lado × ancho efectivo
    totalArea += sideLength * effectiveFirstRingWidth;
  }

  // FILAS ADICIONALES - solo si están configuradas
  if (sideConfig.rows > 0 && sideConfig.selectedTileId) {
    const tile = tilePresets.find(t => t.id === sideConfig.selectedTileId);
    if (tile) {
      // Ancho de una loseta en metros (tile.width está en centímetros)
      const tileWidthMeters = tile.width / 100;

      // Ancho efectivo = ancho de loseta + junta
      const effectiveTileWidth = tileWidthMeters + jointSize;

      // Área = largo del lado × (ancho efectivo × cantidad de filas)
      totalArea += sideLength * (effectiveTileWidth * sideConfig.rows);
    }
  }

  return totalArea;
}

function calculateTileQuantities(
  poolLength: number,
  poolWidth: number,
  tileConfig: TileConfig,
  tilePresets: any[]
) {
  const quantities: any = {};

  // Calcular para cada lado
  ['north', 'south', 'east', 'west'].forEach((side) => {
    const sideConfig = tileConfig[side as keyof TileConfig];
    const sideLength = (side === 'north' || side === 'south') ? poolLength : poolWidth;

    // PRIMER ANILLO (obligatorio si está configurado)
    if (sideConfig.firstRingType) {
      const firstRingKey = `firstRing_${sideConfig.firstRingType}`;

      // Junta entre losetas: 8mm = 0.008m
      const jointSize = 0.008;

      // Dimensiones reales de losetas de primer anillo según tipo (en metros)
      let firstRingTileLength = 0.40; // metros por defecto (40cm)
      let firstRingTileName = 'Primer Anillo';

      if (sideConfig.firstRingType === 'LOMO_BALLENA') {
        firstRingTileLength = 0.50; // 50cm (Lomo Ballena real)
        firstRingTileName = 'Primer Anillo LOMO BALLENA (40x50cm)';
      } else if (sideConfig.firstRingType === 'L_FINISH') {
        firstRingTileLength = 0.40; // 40cm (Terminación L)
        firstRingTileName = 'Primer Anillo TERMINACIÓN L (40x40cm)';
      } else if (sideConfig.firstRingType === 'PERIMETER') {
        firstRingTileLength = 0.40; // 40cm (Perimetral)
        firstRingTileName = 'Primer Anillo PERIMETRAL (40x40cm)';
      }

      // Largo efectivo considerando junta
      const effectiveTileLength = firstRingTileLength + jointSize;

      // Calcular cantidad de losetas necesarias para el lado
      const tilesInFirstRing = Math.ceil(sideLength / effectiveTileLength);

      if (!quantities[firstRingKey]) {
        quantities[firstRingKey] = {
          tileId: firstRingKey,
          tileName: firstRingTileName,
          type: 'first_ring',
          quantity: 0,
          unit: 'unidades',
        };
      }
      quantities[firstRingKey].quantity += tilesInFirstRing;
    }

    // FILAS ADICIONALES (opcionales, después del primer anillo)
    if (sideConfig.selectedTileId && sideConfig.rows > 0) {
      const tile = tilePresets.find(t => t.id === sideConfig.selectedTileId);
      if (tile) {
        // Junta entre losetas: 8mm = 0.008m
        const jointSize = 0.008;

        // tile.length y tile.width están en centímetros, convertir a metros
        const tileLengthMeters = tile.length / 100;
        const tileWidthMeters = tile.width / 100;

        // Largo efectivo considerando junta
        const effectiveTileLength = tileLengthMeters + jointSize;

        // Calcular cantidad de losetas por fila
        const tilesPerRow = Math.ceil(sideLength / effectiveTileLength);

        // Total de losetas = losetas por fila × número de filas
        const totalTiles = tilesPerRow * sideConfig.rows;

        if (!quantities[sideConfig.selectedTileId]) {
          quantities[sideConfig.selectedTileId] = {
            tileId: tile.id,
            tileName: `${tile.name} (${tileWidthMeters * 100}x${tileLengthMeters * 100}cm)`,
            type: 'additional_rows',
            quantity: 0,
            unit: 'unidades',
          };
        }
        quantities[sideConfig.selectedTileId].quantity += totalTiles;
      }
    }
  });

  // LOSETAS ESQUINERAS (solo para Lomo Ballena)
  // Contar cuántos lados tienen Lomo Ballena
  const sidesWithLomoBalena = ['north', 'south', 'east', 'west'].filter(
    side => tileConfig[side as keyof TileConfig].firstRingType === 'LOMO_BALLENA'
  );

  // Si hay Lomo Ballena, necesitamos 4 losetas esquineras (una por esquina)
  if (sidesWithLomoBalena.length > 0) {
    const cornerKey = 'corner_LOMO_BALLENA';
    quantities[cornerKey] = {
      tileId: cornerKey,
      tileName: 'Loseta Esquinera LOMO BALLENA (40x40cm)',
      type: 'corner',
      quantity: 4, // Siempre 4 esquinas en una piscina rectangular
      unit: 'unidades',
    };
  }

  return Object.values(quantities);
}
