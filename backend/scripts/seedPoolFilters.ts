/**
 * Script para agregar filtros de piscina de múltiples marcas
 * Incluye: Vulcano, Fluvial, Espa, AstralPool, marcas brasileras
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FilterData {
  brand: string;
  model: string;
  name: string;
  filterDiameter: number;  // mm
  filterArea: number;      // m²
  flowRate: number;        // m³/h
  sandRequired: number;    // kg
  minPoolVolume: number;   // m³
  maxPoolVolume: number;   // m³
  pricePerUnit: number;    // ARS
  connectionSize: string;  // pulgadas
  description?: string;
  imageUrl?: string;
}

const filtersToAdd: FilterData[] = [
  // ========== VULCANO (Argentina) ==========
  {
    brand: 'Vulcano',
    model: 'FV-450',
    name: 'Filtro Vulcano Ø450 6m³/h',
    filterDiameter: 450,
    filterArea: 0.159,
    flowRate: 6,
    sandRequired: 50,
    minPoolVolume: 10,
    maxPoolVolume: 25,
    pricePerUnit: 145000,
    connectionSize: '1.5"',
    description: 'Filtro de arena para piscinas pequeñas, construcción en fibra de vidrio'
  },
  {
    brand: 'Vulcano',
    model: 'FV-500',
    name: 'Filtro Vulcano Ø500 8m³/h',
    filterDiameter: 500,
    filterArea: 0.196,
    flowRate: 8,
    sandRequired: 75,
    minPoolVolume: 20,
    maxPoolVolume: 35,
    pricePerUnit: 175000,
    connectionSize: '1.5"',
    description: 'Filtro de arena para piscinas medianas'
  },
  {
    brand: 'Vulcano',
    model: 'FV-600',
    name: 'Filtro Vulcano Ø600 12m³/h',
    filterDiameter: 600,
    filterArea: 0.283,
    flowRate: 12,
    sandRequired: 100,
    minPoolVolume: 30,
    maxPoolVolume: 55,
    pricePerUnit: 245000,
    connectionSize: '2"',
    description: 'Filtro de arena para piscinas grandes'
  },
  {
    brand: 'Vulcano',
    model: 'FV-750',
    name: 'Filtro Vulcano Ø750 18m³/h',
    filterDiameter: 750,
    filterArea: 0.442,
    flowRate: 18,
    sandRequired: 150,
    minPoolVolume: 50,
    maxPoolVolume: 85,
    pricePerUnit: 325000,
    connectionSize: '2"',
    description: 'Filtro de arena para piscinas muy grandes'
  },

  // ========== FLUVIAL (Argentina) ==========
  {
    brand: 'Fluvial',
    model: 'TOP 400',
    name: 'Filtro Fluvial TOP 400 6m³/h',
    filterDiameter: 400,
    filterArea: 0.126,
    flowRate: 6,
    sandRequired: 40,
    minPoolVolume: 10,
    maxPoolVolume: 25,
    pricePerUnit: 135000,
    connectionSize: '1.5"',
    description: 'Filtro de arena con válvula selectora de 6 vías'
  },
  {
    brand: 'Fluvial',
    model: 'TOP 500',
    name: 'Filtro Fluvial TOP 500 10m³/h',
    filterDiameter: 500,
    filterArea: 0.196,
    flowRate: 10,
    sandRequired: 70,
    minPoolVolume: 20,
    maxPoolVolume: 40,
    pricePerUnit: 165000,
    connectionSize: '1.5"',
    description: 'Filtro de arena con válvula selectora de 6 vías'
  },
  {
    brand: 'Fluvial',
    model: 'TOP 600',
    name: 'Filtro Fluvial TOP 600 14m³/h',
    filterDiameter: 600,
    filterArea: 0.283,
    flowRate: 14,
    sandRequired: 100,
    minPoolVolume: 35,
    maxPoolVolume: 65,
    pricePerUnit: 235000,
    connectionSize: '2"',
    description: 'Filtro de arena con válvula selectora de 6 vías'
  },
  {
    brand: 'Fluvial',
    model: 'TOP 750',
    name: 'Filtro Fluvial TOP 750 20m³/h',
    filterDiameter: 750,
    filterArea: 0.442,
    flowRate: 20,
    sandRequired: 150,
    minPoolVolume: 60,
    maxPoolVolume: 95,
    pricePerUnit: 315000,
    connectionSize: '2"',
    description: 'Filtro de arena con válvula selectora de 6 vías'
  },

  // ========== ESPA (España) ==========
  {
    brand: 'Espa',
    model: 'Filter GFK 400',
    name: 'Filtro Espa GFK Ø400 5m³/h',
    filterDiameter: 400,
    filterArea: 0.126,
    flowRate: 5,
    sandRequired: 50,
    minPoolVolume: 8,
    maxPoolVolume: 22,
    pricePerUnit: 185000,
    connectionSize: '1.5"',
    description: 'Filtro de arena en fibra de vidrio con válvula top'
  },
  {
    brand: 'Espa',
    model: 'Filter GFK 500',
    name: 'Filtro Espa GFK Ø500 9m³/h',
    filterDiameter: 500,
    filterArea: 0.196,
    flowRate: 9,
    sandRequired: 75,
    minPoolVolume: 18,
    maxPoolVolume: 38,
    pricePerUnit: 225000,
    connectionSize: '1.5"',
    description: 'Filtro de arena en fibra de vidrio con válvula top'
  },
  {
    brand: 'Espa',
    model: 'Filter GFK 600',
    name: 'Filtro Espa GFK Ø600 13m³/h',
    filterDiameter: 600,
    filterArea: 0.283,
    flowRate: 13,
    sandRequired: 100,
    minPoolVolume: 32,
    maxPoolVolume: 60,
    pricePerUnit: 295000,
    connectionSize: '2"',
    description: 'Filtro de arena en fibra de vidrio con válvula top'
  },
  {
    brand: 'Espa',
    model: 'Filter GFK 750',
    name: 'Filtro Espa GFK Ø750 19m³/h',
    filterDiameter: 750,
    filterArea: 0.442,
    flowRate: 19,
    sandRequired: 150,
    minPoolVolume: 55,
    maxPoolVolume: 90,
    pricePerUnit: 385000,
    connectionSize: '2"',
    description: 'Filtro de arena en fibra de vidrio con válvula top'
  },

  // ========== SODRAMAR (Brasil) ==========
  {
    brand: 'Sodramar',
    model: 'FBP-36',
    name: 'Filtro Sodramar FBP-36 9m³/h',
    filterDiameter: 500,
    filterArea: 0.196,
    flowRate: 9,
    sandRequired: 70,
    minPoolVolume: 18,
    maxPoolVolume: 38,
    pricePerUnit: 155000,
    connectionSize: '1.5"',
    description: 'Filtro brasilero con válvula lateral de 6 posiciones'
  },
  {
    brand: 'Sodramar',
    model: 'FBP-48',
    name: 'Filtro Sodramar FBP-48 13m³/h',
    filterDiameter: 600,
    filterArea: 0.283,
    flowRate: 13,
    sandRequired: 100,
    minPoolVolume: 32,
    maxPoolVolume: 60,
    pricePerUnit: 215000,
    connectionSize: '2"',
    description: 'Filtro brasilero con válvula lateral de 6 posiciones'
  },

  // ========== JACUZZI (Brasil/Internacional) ==========
  {
    brand: 'Jacuzzi',
    model: '15TP',
    name: 'Filtro Jacuzzi 15TP 6m³/h',
    filterDiameter: 400,
    filterArea: 0.126,
    flowRate: 6,
    sandRequired: 50,
    minPoolVolume: 10,
    maxPoolVolume: 25,
    pricePerUnit: 195000,
    connectionSize: '1.5"',
    description: 'Filtro de alta calidad con válvula top mount'
  },
  {
    brand: 'Jacuzzi',
    model: '22TP',
    name: 'Filtro Jacuzzi 22TP 10m³/h',
    filterDiameter: 550,
    filterArea: 0.237,
    flowRate: 10,
    sandRequired: 85,
    minPoolVolume: 20,
    maxPoolVolume: 42,
    pricePerUnit: 265000,
    connectionSize: '1.5"',
    description: 'Filtro de alta calidad con válvula top mount'
  }
];

// TAMBIÉN ACTUALIZAR LOS FILTROS ASTRALPOOL EXISTENTES
const astralPoolUpdates = [
  {
    model: 'Aster 400',
    filterDiameter: 400,
    filterArea: 0.126,
    flowRate: 7,
    sandRequired: 50,
    minPoolVolume: 12,
    maxPoolVolume: 28,
    connectionSize: '1.5"'
  },
  {
    model: 'Aster 500',
    filterDiameter: 500,
    filterArea: 0.196,
    flowRate: 10,
    sandRequired: 75,
    minPoolVolume: 22,
    maxPoolVolume: 42,
    connectionSize: '1.5"'
  },
  {
    model: 'Aster 600',
    filterDiameter: 600,
    filterArea: 0.283,
    flowRate: 14,
    sandRequired: 100,
    minPoolVolume: 35,
    maxPoolVolume: 65,
    connectionSize: '2"'
  }
];

async function seedFilters() {
  console.log('\n🌊 Agregando filtros de piscina de múltiples marcas...\n');

  let created = 0;
  let updated = 0;
  let errors = 0;

  // 1. ACTUALIZAR FILTROS ASTRALPOOL EXISTENTES
  console.log('📝 Actualizando filtros AstralPool existentes...\n');
  for (const update of astralPoolUpdates) {
    try {
      const result = await prisma.equipmentPreset.updateMany({
        where: {
          brand: 'AstralPool',
          model: update.model,
          type: 'FILTER'
        },
        data: {
          filterDiameter: update.filterDiameter,
          filterArea: update.filterArea,
          flowRate: update.flowRate,
          sandRequired: update.sandRequired,
          minPoolVolume: update.minPoolVolume,
          maxPoolVolume: update.maxPoolVolume,
          connectionSize: update.connectionSize
        }
      });

      if (result.count > 0) {
        console.log(`✅ Actualizado: AstralPool ${update.model}`);
        updated += result.count;
      }
    } catch (error) {
      console.error(`❌ Error actualizando AstralPool ${update.model}:`, error);
      errors++;
    }
  }

  console.log('\n📦 Agregando nuevos filtros...\n');

  // 2. AGREGAR NUEVOS FILTROS
  for (const filter of filtersToAdd) {
    try {
      // Verificar si ya existe
      const existing = await prisma.equipmentPreset.findFirst({
        where: {
          brand: filter.brand,
          model: filter.model,
          type: 'FILTER'
        }
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${filter.brand} ${filter.model}`);
        continue;
      }

      // Crear nuevo filtro
      await prisma.equipmentPreset.create({
        data: {
          type: 'FILTER',
          category: 'REQUIRED',
          brand: filter.brand,
          model: filter.model,
          name: filter.name,
          filterDiameter: filter.filterDiameter,
          filterArea: filter.filterArea,
          flowRate: filter.flowRate,
          sandRequired: filter.sandRequired,
          minPoolVolume: filter.minPoolVolume,
          maxPoolVolume: filter.maxPoolVolume,
          pricePerUnit: filter.pricePerUnit,
          connectionSize: filter.connectionSize,
          description: filter.description || '',
          imageUrl: filter.imageUrl || null,
          isActive: true
        }
      });

      console.log(`✅ Creado: ${filter.brand} ${filter.model} (${filter.minPoolVolume}-${filter.maxPoolVolume} m³)`);
      created++;

    } catch (error) {
      console.error(`❌ Error con ${filter.brand} ${filter.model}:`, error);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN:');
  console.log(`   Creados: ${created}`);
  console.log(`   Actualizados: ${updated}`);
  console.log(`   Errores: ${errors}`);
  console.log('═══════════════════════════════════════\n');

  // Mostrar resumen final
  const totalFilters = await prisma.equipmentPreset.count({
    where: { type: 'FILTER', isActive: true }
  });

  console.log(`🎯 Total de filtros activos en la base de datos: ${totalFilters}`);

  // Agrupar por marca
  const brands = ['Vulcano', 'Fluvial', 'Espa', 'AstralPool', 'Sodramar', 'Jacuzzi'];
  console.log('\n📦 Por marca:');
  for (const brand of brands) {
    const count = await prisma.equipmentPreset.count({
      where: { type: 'FILTER', brand, isActive: true }
    });
    if (count > 0) {
      console.log(`   ${brand}: ${count} filtros`);
    }
  }

  // Mostrar rangos de volumen cubiertos
  console.log('\n📏 Rangos de volumen cubiertos:');
  const filters = await prisma.equipmentPreset.findMany({
    where: { type: 'FILTER', isActive: true },
    orderBy: { minPoolVolume: 'asc' }
  });

  const minVol = Math.min(...filters.map(f => f.minPoolVolume || 0).filter(v => v > 0));
  const maxVol = Math.max(...filters.map(f => f.maxPoolVolume || 0).filter(v => v > 0));
  console.log(`   Desde ${minVol} m³ hasta ${maxVol} m³`);

  await prisma.$disconnect();
  console.log('\n✅ Proceso completado!\n');
}

seedFilters().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
