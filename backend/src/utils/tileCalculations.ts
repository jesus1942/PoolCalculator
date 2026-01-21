import { PoolPreset } from '@prisma/client';

interface TileConfig {
  north: SideConfig;
  south: SideConfig;
  east: SideConfig;
  west: SideConfig;
}

interface SideConfig {
  firstRingType: string | null;
  rows: number;
  selectedTileId: string | null;
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

  const cementBagWeight = cementMaterial?.bagWeight || 25; // Fallback a 25kg (nuevo estándar)
  const whiteCementBagWeight = whiteCementMaterial?.bagWeight || 25; // Fallback a 25kg
  const marmolinaBagWeight = marmolinaMaterial?.bagWeight || 30; // Fallback a 30kg

  // Redondear materiales en m³ hacia arriba (arena, grava, calcáreo, mixto, terciada)
  const sandRounded = Math.ceil(sand);
  const gravelRounded = Math.ceil(gravel);

  // Calcular costos
  const adhesiveCost = Math.ceil(adhesive) * findPrice('ADHESIVE', 'kg');
  // Calcular cemento por BOLSAS usando bagWeight de BD
  const cementBags = Math.ceil(cement / cementBagWeight);
  const cementCost = cementBags * findPrice('CEMENT', 'bolsa');
  const sandCost = sandRounded * findPrice('SAND', 'm³');
  const gravelCost = gravelRounded * findPrice('STONE', 'm³');
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
      cement: { quantity: cementBags, unit: `bolsas de ${cementBagWeight}kg`, cost: cementCost },
      cementKg: { quantity: Math.ceil(cement), unit: 'kg', cost: cementCost }, // Referencia en kg
      sand: { quantity: sandRounded, unit: 'm³', cost: sandCost },
      gravel: { quantity: gravelRounded, unit: 'm³', cost: gravelCost },
      whiteCement: { quantity: whiteCementBags, unit: `bolsas de ${whiteCementBagWeight}kg`, cost: whiteCementCost },
      whiteCementKg: { quantity: Math.ceil(whiteCement), unit: 'kg', cost: whiteCementCost }, // Referencia en kg
      marmolina: { quantity: marmolinaBags, unit: `bolsas de ${marmolinaBagWeight}kg`, cost: marmolinaCost },
      marmolinaKg: { quantity: Math.ceil(marmolina), unit: 'kg', cost: marmolinaCost }, // Referencia en kg
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

/**
 * Calcula la cantidad de losetas para una dimensión siguiendo las reglas profesionales:
 * 1. Distribución desde extremos hacia el centro
 * 2. Preferencia por loseta completa en el centro
 * 3. Si la loseta central queda <50%, redistribuir desde 2-3 losetas antes
 * 4. El anillo perimetral (primera vuelta) siempre existe
 */
function calculateTilesForDimension(dimensionLength: number): number {
  // Constantes
  const TILE_SIZE = 0.5; // 50cm
  const JOINT_SIZE = 0.003; // 3mm
  const EFFECTIVE_TILE_SIZE = TILE_SIZE + JOINT_SIZE; // 0.503m

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

function calculateTileQuantities(
  poolLength: number,
  poolWidth: number,
  tileConfig: TileConfig,
  tilePresets: any[]
) {
  const quantities: any = {};

  // ========================================
  // PASO 1: PRIMER ANILLO (SIEMPRE EXISTE)
  // ========================================
  let hasLomoBalena = false;

  ['north', 'south', 'east', 'west'].forEach((side) => {
    const sideConfig = tileConfig[side as keyof TileConfig];

    // El primer anillo SIEMPRE debe existir (regla del usuario)
    if (sideConfig.firstRingType) {
      // Mapeo: Norte/Sur = largo de piscina, Este/Oeste = ancho de piscina
      const sideLength = (side === 'north' || side === 'south') ? poolLength : poolWidth;

      const firstRingKey = `firstRing_${sideConfig.firstRingType}`;

      let firstRingTileName = 'Primer Anillo';

      if (sideConfig.firstRingType === 'LOMO_BALLENA') {
        firstRingTileName = 'Loseta Lomo Ballena (50x50cm)';
        hasLomoBalena = true;
      } else if (sideConfig.firstRingType === 'L_FINISH') {
        firstRingTileName = 'Loseta Terminación L (50x50cm)';
      } else if (sideConfig.firstRingType === 'PERIMETER') {
        firstRingTileName = 'Loseta Perímetro (50x50cm)';
      }

      // Calcular cuántas losetas caben en este lado usando el algoritmo profesional
      const tilesInSide = calculateTilesForDimension(sideLength);

      if (!quantities[firstRingKey]) {
        quantities[firstRingKey] = {
          tileId: firstRingKey,
          tileName: firstRingTileName,
          type: 'first_ring',
          quantity: 0,
          unit: 'unidades',
        };
      }
      quantities[firstRingKey].quantity += tilesInSide;
    }
  });

  // Agregar esquineros amarillos si hay Lomo Ballena
  if (hasLomoBalena) {
    const cornerKey = 'corner_LOMO_BALLENA';
    quantities[cornerKey] = {
      tileId: cornerKey,
      tileName: 'Esquinero Lomo Ballena (50x50cm)',
      type: 'corner',
      quantity: 4,
      unit: 'unidades',
    };
  }

  // ========================================
  // PASO 2: FILAS ADICIONALES (mosaicos comunes 50x50cm)
  // Solo contar filas EXTRA más allá del primer anillo
  // ========================================
  let totalCommonTiles = 0;

  // Calcular cuántas filas extras tiene cada lado (si tiene firstRingType, restar 1)
  const getExtraRows = (sideKey: string) => {
    const sideConfig = tileConfig[sideKey as keyof TileConfig];
    const totalRows = sideConfig.rows || 0;
    const hasFirstRing = !!sideConfig.firstRingType;
    return hasFirstRing ? Math.max(0, totalRows - 1) : totalRows;
  };

  const northExtraRows = getExtraRows('north');
  const southExtraRows = getExtraRows('south');
  const eastExtraRows = getExtraRows('east');
  const westExtraRows = getExtraRows('west');

  // 1. NORTE (cabecera superior - lado largo)
  if (northExtraRows > 0) {
    for (let fila = 0; fila < northExtraRows; fila++) {
      const tilesInRow = calculateTilesForDimension(poolLength);
      totalCommonTiles += tilesInRow;
    }
  }

  // 2. SUR (cabecera inferior - lado largo)
  if (southExtraRows > 0) {
    for (let fila = 0; fila < southExtraRows; fila++) {
      const tilesInRow = calculateTilesForDimension(poolLength);
      totalCommonTiles += tilesInRow;
    }
  }

  // 3. ESTE (lateral derecho - lado corto)
  if (eastExtraRows > 0) {
    for (let col = 0; col < eastExtraRows; col++) {
      const tilesInColumn = calculateTilesForDimension(poolWidth);
      totalCommonTiles += tilesInColumn;
    }
  }

  // 4. OESTE (lateral izquierdo/skimmer - lado corto)
  if (westExtraRows > 0) {
    for (let col = 0; col < westExtraRows; col++) {
      const tilesInColumn = calculateTilesForDimension(poolWidth);
      totalCommonTiles += tilesInColumn;
    }
  }

  // 5. ESQUINAS - Solo para las filas TOTALES (incluyendo primer anillo)
  // porque las esquinas se dibujan para TODAS las intersecciones
  let cornerTiles = 0;

  // Esquina SUPERIOR IZQUIERDA (North + West)
  if (tileConfig.north.rows > 0 && tileConfig.west.rows > 0) {
    cornerTiles += tileConfig.north.rows * tileConfig.west.rows;
  }

  // Esquina SUPERIOR DERECHA (North + East)
  if (tileConfig.north.rows > 0 && tileConfig.east.rows > 0) {
    cornerTiles += tileConfig.north.rows * tileConfig.east.rows;
  }

  // Esquina INFERIOR IZQUIERDA (South + West)
  if (tileConfig.south.rows > 0 && tileConfig.west.rows > 0) {
    cornerTiles += tileConfig.south.rows * tileConfig.west.rows;
  }

  // Esquina INFERIOR DERECHA (South + East)
  if (tileConfig.south.rows > 0 && tileConfig.east.rows > 0) {
    cornerTiles += tileConfig.south.rows * tileConfig.east.rows;
  }

  // Restar las 4 esquinas del primer anillo (ya contadas con los esquineros)
  if (hasLomoBalena) {
    cornerTiles -= 4;
  }

  totalCommonTiles += cornerTiles;

  // Agregar losetas comunes al resultado
  if (totalCommonTiles > 0) {
    const commonKey = 'common_tile_50x50';
    quantities[commonKey] = {
      tileId: commonKey,
      tileName: 'Mosaico Común 50x50cm',
      type: 'common_tiles',
      quantity: totalCommonTiles,
      unit: 'unidades',
    };
  }

  return Object.values(quantities);
}
