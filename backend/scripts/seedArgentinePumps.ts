/**
 * Script para agregar bombas comunes de Argentina al catálogo
 * Marcas: Fluvial, Vulcano, Espa
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const argentinePumps = [
  // FLUVIAL
  {
    name: 'Bomba Fluvial FLU-050 0.5 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-050',
    power: 0.5,
    capacity: 8,
    voltage: 220,
    flowRate: 8,
    maxHead: 8,
    pricePerUnit: 85000,
    description: 'Bomba autocebante ideal para piscinas de hasta 30m³',
    isActive: true
  },
  {
    name: 'Bomba Fluvial FLU-075 0.75 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-075',
    power: 0.75,
    capacity: 12,
    voltage: 220,
    flowRate: 12,
    maxHead: 10,
    pricePerUnit: 95000,
    description: 'Bomba autocebante ideal para piscinas de hasta 45m³',
    isActive: true
  },
  {
    name: 'Bomba Fluvial FLU-100 1 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-100',
    power: 1.0,
    capacity: 14,
    voltage: 220,
    flowRate: 14,
    maxHead: 12,
    pricePerUnit: 110000,
    description: 'Bomba autocebante ideal para piscinas de hasta 60m³',
    isActive: true
  },
  {
    name: 'Bomba Fluvial FLU-150 1.5 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-150',
    power: 1.5,
    capacity: 18,
    voltage: 220,
    flowRate: 18,
    maxHead: 14,
    pricePerUnit: 135000,
    description: 'Bomba autocebante ideal para piscinas de hasta 80m³',
    isActive: true
  },

  // VULCANO
  {
    name: 'Bomba Vulcano Modelo 33 0.5 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'Modelo 33',
    power: 0.5,
    capacity: 7,
    voltage: 220,
    flowRate: 7,
    maxHead: 7,
    pricePerUnit: 78000,
    description: 'Bomba periférica compacta para piscinas pequeñas',
    isActive: true
  },
  {
    name: 'Bomba Vulcano Modelo 44 0.75 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'Modelo 44',
    power: 0.75,
    capacity: 10,
    voltage: 220,
    flowRate: 10,
    maxHead: 9,
    pricePerUnit: 88000,
    description: 'Bomba periférica para piscinas medianas',
    isActive: true
  },
  {
    name: 'Bomba Vulcano Modelo 55 1 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'Modelo 55',
    power: 1.0,
    capacity: 13,
    voltage: 220,
    flowRate: 13,
    maxHead: 11,
    pricePerUnit: 105000,
    description: 'Bomba periférica para piscinas grandes',
    isActive: true
  },
  {
    name: 'Bomba Vulcano Modelo 66 1.5 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'Modelo 66',
    power: 1.5,
    capacity: 16,
    voltage: 220,
    flowRate: 16,
    maxHead: 13,
    pricePerUnit: 125000,
    description: 'Bomba periférica de alta potencia',
    isActive: true
  },

  // ESPA (marca española muy común en Argentina)
  {
    name: 'Bomba Espa Nox 25 4M 0.5 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Nox 25 4M',
    power: 0.5,
    capacity: 9,
    voltage: 220,
    flowRate: 9,
    maxHead: 9,
    pricePerUnit: 145000,
    description: 'Bomba centrífuga monobloc, construcción en tecnopolímero',
    isActive: true
  },
  {
    name: 'Bomba Espa Nox 40 5M 0.75 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Nox 40 5M',
    power: 0.75,
    capacity: 12,
    voltage: 220,
    flowRate: 12,
    maxHead: 11,
    pricePerUnit: 165000,
    description: 'Bomba centrífuga monobloc de alto rendimiento',
    isActive: true
  },
  {
    name: 'Bomba Espa Silen S 75 15M 1 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Silen S 75 15M',
    power: 1.0,
    capacity: 15,
    voltage: 220,
    flowRate: 15,
    maxHead: 12,
    pricePerUnit: 185000,
    description: 'Bomba silenciosa de alto rendimiento para piscinas residenciales',
    isActive: true
  },
  {
    name: 'Bomba Espa Silen S 100 18M 1.5 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Silen S 100 18M',
    power: 1.5,
    capacity: 18,
    voltage: 220,
    flowRate: 18,
    maxHead: 15,
    pricePerUnit: 215000,
    description: 'Bomba silenciosa de alta capacidad',
    isActive: true
  },
  {
    name: 'Bomba Espa Silen S 150 26M 2 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Silen S 150 26M',
    power: 2.0,
    capacity: 22,
    voltage: 220,
    flowRate: 22,
    maxHead: 18,
    pricePerUnit: 265000,
    description: 'Bomba de alta potencia para piscinas grandes o comerciales',
    isActive: true
  },

  // FLUVIAL trifásicas (380V) para instalaciones grandes
  {
    name: 'Bomba Fluvial Trifásica 2 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-200T',
    power: 2.0,
    capacity: 24,
    voltage: 380,
    flowRate: 24,
    maxHead: 16,
    pricePerUnit: 185000,
    description: 'Bomba trifásica para instalaciones comerciales',
    isActive: true
  },
  {
    name: 'Bomba Fluvial Trifásica 3 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'FLU-300T',
    power: 3.0,
    capacity: 30,
    voltage: 380,
    flowRate: 30,
    maxHead: 20,
    pricePerUnit: 235000,
    description: 'Bomba trifásica de alta capacidad',
    isActive: true
  }
];

async function seedArgentinePumps() {
  console.log('Agregando bombas argentinas al catálogo...\n');

  let added = 0;
  let skipped = 0;

  for (const pumpData of argentinePumps) {
    try {
      // Verificar si ya existe
      const existing = await prisma.equipmentPreset.findFirst({
        where: {
          name: pumpData.name
        }
      });

      if (existing) {
        console.log(`⏭️  Ya existe: ${pumpData.name}`);
        skipped++;
        continue;
      }

      // Crear la bomba
      await prisma.equipmentPreset.create({
        data: pumpData as any
      });

      console.log(`✅ Agregada: ${pumpData.name} - ${pumpData.flowRate} m³/h - $${pumpData.pricePerUnit.toLocaleString()}`);
      added++;
    } catch (error) {
      console.error(`❌ Error con ${pumpData.name}:`, error);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Agregadas: ${added}`);
  console.log(`   Omitidas: ${skipped}`);
  console.log(`   Total: ${argentinePumps.length}`);

  await prisma.$disconnect();
}

seedArgentinePumps().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
