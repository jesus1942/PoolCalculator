import { PoolPreset } from '@prisma/client';

interface BedCalculationSettings {
  bedThicknessCm: number;
  bedCementBagsPerM3: number;
  bedCementBagWeight: number;
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

  // 1. Geomembrana - área del piso de la piscina
  const geomembrane = poolArea * settings.geomembraneM2PerM2;

  // 2. Malla electrosoldada - área del piso + 15% solapamiento
  const electroweldedMesh = poolArea * settings.electroweldedMeshM2PerM2;

  // 3. Volumen de cama arena-cemento (10cm de espesor)
  const bedVolume = (poolArea * settings.bedThicknessCm) / 100; // m³

  // 4. Arena para la cama
  const sandForBed = bedVolume; // m³

  // 5. Cemento para la cama (5 bolsas por m³)
  // Obtener el peso de bolsa desde la BD o usar el valor de settings como fallback
  const cementMaterial = materialPrices.find(m => m.type === 'CEMENT');
  const bagWeight = cementMaterial?.bagWeight || settings.bedCementBagWeight;
  const cementBags = bedVolume * settings.bedCementBagsPerM3;
  const cementKg = cementBags * bagWeight;

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

  // Calcular costos
  const geomembraneCost = Math.ceil(geomembrane) * findPrice('GEOMEMBRANE', 'm²');
  const electroweldedMeshCost = Math.ceil(electroweldedMesh) * findPrice('ELECTROWELDED_MESH', 'm²');
  const sandForBedCost = parseFloat(sandForBed.toFixed(2)) * findPrice('SAND', 'm³');
  // CORREGIDO: Calcular costo por BOLSAS, no por kg
  const cementCost = Math.ceil(cementBags) * findPrice('CEMENT', 'bolsa');
  const drainStoneCost = parseFloat(drainStone.toFixed(2)) * findPrice('STONE', 'm³');

  const totalBedMaterialCost = geomembraneCost + electroweldedMeshCost + sandForBedCost +
                                cementCost + drainStoneCost;

  return {
    poolArea,
    bedMaterials: {
      geomembrane: { quantity: Math.ceil(geomembrane), unit: 'm²', cost: geomembraneCost },
      electroweldedMesh: { quantity: Math.ceil(electroweldedMesh), unit: 'm²', cost: electroweldedMeshCost },
      sandForBed: { quantity: sandForBed.toFixed(2), unit: 'm³', cost: sandForBedCost },
      cementBags: { quantity: Math.ceil(cementBags), unit: `bolsas de ${bagWeight}kg`, cost: cementCost },
      cementKg: { quantity: Math.ceil(cementKg), unit: 'kg', cost: cementCost }, // mismo costo, solo para referencia en kg
      drainStone: { quantity: drainStone.toFixed(2), unit: 'm³', cost: drainStoneCost },
    },
    totalBedMaterialCost,
  };
}
