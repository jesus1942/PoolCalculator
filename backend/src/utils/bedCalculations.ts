import { PoolPreset } from '@prisma/client';

interface BedCalculationSettings {
  bedThicknessCm: number;
  bedCementKgPerM3?: number;
  bedCementBagsPerM3: number;
  bedCementBagWeight: number;
  bedSandM3PerCementBag: number;
  drainTrenchWidthCm: number;
  drainTrenchDepthCm: number;
  geomembraneM2PerM2: number;
  electroweldedMeshM2PerM2: number;
}

interface MaterialPricing {
  name: string;
  type: string;
  pricePerUnit: number;
  unit: string;
  bagWeight: number | null;
}

export function calculateBedMaterials(
  poolPreset: PoolPreset,
  settings: BedCalculationSettings,
  materialPrices: MaterialPricing[] = []
) {
  const poolArea = poolPreset.length * poolPreset.width;
  const poolPerimeter = 2 * (poolPreset.length + poolPreset.width);
  const deepestDepth = Math.max(poolPreset.depth, poolPreset.depthEnd || 0);
  const fillThicknessM = (settings.bedThicknessCm || 20) / 100;

  // 1. Geomembrana - área del piso de la piscina
  const geomembrane = poolArea * settings.geomembraneM2PerM2;

  // 2. Malla electrosoldada - área del piso + 15% solapamiento
  const electroweldedMesh = poolArea * settings.electroweldedMeshM2PerM2;

  // 3. Relleno con arena terciada:
  //    separación uniforme lateral y de fondo, usando la profundidad más profunda como referencia.
  const excavationLength = poolPreset.length + (fillThicknessM * 2);
  const excavationWidth = poolPreset.width + (fillThicknessM * 2);
  const excavationDepth = deepestDepth + fillThicknessM;
  const sandForBed = (excavationLength * excavationWidth * excavationDepth) - (poolPreset.length * poolPreset.width * deepestDepth);
  const roundedSandForBed = parseFloat(sandForBed.toFixed(2));

  const sandBolsOnes = Math.ceil(roundedSandForBed);

  // 4. Cemento seco para la cama/relleno: el modelo vigente es kg de cemento por m³.
  //    Los campos viejos quedan solo como compatibilidad para migrar settings existentes.
  const cementMaterial = materialPrices.find(m => m.type === 'CEMENT');
  const bagWeight = settings.bedCementBagWeight || cementMaterial?.bagWeight || 25;
  const fallbackKgPerM3 =
    settings.bedSandM3PerCementBag && settings.bedSandM3PerCementBag > 0
      ? bagWeight / settings.bedSandM3PerCementBag
      : (settings.bedCementBagsPerM3 || 0) > 0
        ? bagWeight * settings.bedCementBagsPerM3
        : 12.5;
  const cementKgPerM3 = settings.bedCementKgPerM3 || fallbackKgPerM3;
  const cementKg = roundedSandForBed * cementKgPerM3;
  const cementBags = Math.ceil(cementKg / bagWeight);

  // 6. Cuneta perimetral (15x15cm alrededor del perímetro)
  const trenchVolume = (poolPerimeter * settings.drainTrenchWidthCm * settings.drainTrenchDepthCm) / 1000000; // convertir cm³ a m³
  const drainStone = trenchVolume; // m³ de piedra para drenaje

  // Helper function to find material price
  const findPrice = (materialType: string, unit: string): number => {
    const material = materialPrices.find(
      m => m.type === materialType || m.name.toLowerCase().includes(materialType.toLowerCase())
    );
    return material?.pricePerUnit || 0;
  };

  // Geomembrana y malla: no existen como MaterialType propio, así que se buscan
  // por el tipo más cercano del enum y por nombre en castellano (el catálogo
  // carga "Geomembrana 200 micrones", "Malla electrosoldada 15x15", etc.).
  const findPriceBy = (predicate: (m: MaterialPricing) => boolean): number =>
    materialPrices.find(predicate)?.pricePerUnit || 0;

  const geomembranePrice = findPriceBy(m => {
    const name = m.name.toLowerCase();
    return m.type === 'GEOTEXTILE' || name.includes('geomembran') || name.includes('geotextil');
  });
  const electroweldedMeshPrice = findPriceBy(m => {
    const name = m.name.toLowerCase();
    return m.type === 'WIRE_MESH' || name.includes('electrosoldada') || name.includes('malla');
  });

  // Calcular costos
  const geomembraneCost = Math.ceil(geomembrane) * geomembranePrice;
  const electroweldedMeshCost = Math.ceil(electroweldedMesh) * electroweldedMeshPrice;
  const sandForBedCost = roundedSandForBed * findPrice('SAND', 'm³');
  const cementCost = Math.ceil(cementBags) * findPrice('CEMENT', 'bolsa');
  const drainStoneCost = parseFloat(drainStone.toFixed(2)) * findPrice('STONE', 'm³');

  const totalBedMaterialCost = geomembraneCost + electroweldedMeshCost + sandForBedCost +
                                cementCost + drainStoneCost;

  return {
    poolArea,
    deepestDepth,
    bedMaterials: {
      geomembrane: { quantity: Math.ceil(geomembrane), unit: 'm²', cost: geomembraneCost },
      electroweldedMesh: { quantity: Math.ceil(electroweldedMesh), unit: 'm²', cost: electroweldedMeshCost },
      sandForBed: { quantity: roundedSandForBed.toFixed(2), unit: 'm³', cost: sandForBedCost },
      sandForBedBulkBags: { quantity: sandBolsOnes, unit: 'bolsones de 1m³', cost: sandForBedCost },
      cementBags: { quantity: Math.ceil(cementBags), unit: `bolsas de ${bagWeight}kg`, cost: cementCost },
      cementKg: { quantity: Math.ceil(cementKg), unit: 'kg', cost: cementCost }, // mismo costo, solo para referencia en kg
      drainStone: { quantity: drainStone.toFixed(2), unit: 'm³', cost: drainStoneCost },
      fillReference: { quantity: deepestDepth.toFixed(2), unit: 'm', cost: 0 },
      fillThickness: { quantity: settings.bedThicknessCm || 20, unit: 'cm', cost: 0 },
    },
    totalBedMaterialCost,
  };
}
