import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const realPumpData = [
  // FLUVIAL PLATA SERIES (datos reales de búsqueda web 2025)
  {
    name: 'Bomba Fluvial Plata 2 - 0.5 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'Plata 2',
    power: 0.5,
    voltage: 220,
    flowRate: 15.6,  // 15,600 l/h = 15.6 m³/h
    maxHead: 16.5,
    capacity: 15.6,
    pricePerUnit: 280579,
    description: 'Bomba autocebante para piscinas de hasta 50,000-60,000 litros. Cuerpo de polipropileno reforzado.',
    catalogPage: 'https://www.fravega.com/p/bomba-autocebante-pileta-piscina-fluvial-1-2-hp-plata-2-990023297/',
    isActive: true
  },
  {
    name: 'Bomba Fluvial Plata 3 - 0.75 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'Plata 3',
    power: 0.75,
    voltage: 220,
    flowRate: 18.5,  // 18,500 l/h
    maxHead: 18,
    capacity: 18.5,
    pricePerUnit: 272663,
    description: 'Bomba autocebante para piscinas de hasta 90,000 litros. Consumo 3.9 amper.',
    catalogPage: 'https://www.fravega.com/p/bomba-autocebante-para-piscina-plata-3-3-4hp-fluvial-20023030/',
    isActive: true
  },
  {
    name: 'Bomba Fluvial Plata 4 - 1 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'Plata 4',
    power: 1.0,
    voltage: 220,
    flowRate: 21.8,  // 21,800 l/h
    maxHead: 18,
    capacity: 21.8,
    pricePerUnit: 297954,
    description: 'Bomba autocebante para piscinas de hasta 110,000 litros. Consumo 4.8 amper.',
    catalogPage: 'https://www.fravega.com/p/bomba-autocebante-para-piscina-plata-4-1hp-fluvial-20023031/',
    isActive: true
  },
  {
    name: 'Bomba Fluvial Plata 5 - 1.5 HP',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'Plata 5',
    power: 1.5,
    voltage: 220,
    flowRate: 24.5,  // 24,500 l/h
    maxHead: 20,
    capacity: 24.5,
    pricePerUnit: 341831,
    description: 'Bomba autocebante alta potencia. Máximo caudal de agua de 24,500 l/h.',
    catalogPage: 'https://www.filhossrl.com/productos/bomba-autocebante-para-pileta-piscina-fluvial-1-5-hp-plata-52/',
    isActive: true
  },

  // VULCANO SERIES (datos reales de búsqueda web 2025)
  {
    name: 'Bomba Vulcano BAS 033 - 0.33 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAS 033',
    power: 0.33,
    voltage: 220,
    flowRate: 7,
    maxHead: 8,
    capacity: 7,
    pricePerUnit: 256031,
    description: 'Bomba autocebante compacta para piscinas pequeñas. Motor con protector térmico y grado de protección IPX4.',
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106101.webp',
    catalogPage: 'https://vulcano-sa.com.ar/producto/bomba-para-piscina-bas-033-0-33hp-220v-monofasica/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAS 050 - 0.5 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAS 050',
    power: 0.5,
    voltage: 220,
    flowRate: 9,
    maxHead: 10,
    capacity: 9,
    pricePerUnit: 258338,
    description: 'Bomba autocebante serie BAS. Mejor relación presión-caudal del mercado con óptima eficiencia energética.',
    catalogPage: 'https://vulcano-sa.com.ar/producto/bomba-para-piscina-bas-050-0-50hp-220v-monofasica/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAE 050 - 0.5 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAE 050',
    power: 0.5,
    voltage: 220,
    flowRate: 10,
    maxHead: 11,
    capacity: 10,
    pricePerUnit: 263663,
    description: 'Bomba autocebante línea BAE. Óptimo rendimiento para uso profesional.',
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106010.webp',
    catalogPage: 'https://vulcano-sa.com.ar/producto/bomba-para-piscina-bae-050-0-50hp-220v-monofasica/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAP 075 - 0.75 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAP 075',
    power: 0.75,
    voltage: 220,
    flowRate: 13,
    maxHead: 13,
    capacity: 13,
    pricePerUnit: 247000,
    description: 'Bomba autocebante línea BAP. Diseñada para responder a las exigencias del uso profesional.',
    imageUrl: 'https://vulcano-sa.com.ar/wp-content/uploads/2024/02/106122.webp',
    catalogPage: 'https://vulcano-sa.com.ar/producto/bomba-para-piscina-bap-075-0-75hp-220v-monofasica/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAE 075 - 0.75 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAE 075',
    power: 0.75,
    voltage: 220,
    flowRate: 14,
    maxHead: 14,
    capacity: 14,
    pricePerUnit: 288499,
    description: 'Bomba autocebante línea BAE de alta eficiencia. Motor Vulcano con certificación S1.',
    catalogPage: 'https://www.hidropilar.com.ar/productos/bomba-autocebante-vulcano-3-4hp-bap-075-monofasica/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAP 100 - 1 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAP 100',
    power: 1.0,
    voltage: 220,
    flowRate: 16,
    maxHead: 15,
    capacity: 16,
    pricePerUnit: 315000,
    description: 'Bomba autocebante línea BAP para piscinas medianas-grandes. Uso profesional.',
    catalogPage: 'https://vulcano-sa.com.ar/categoria-producto/piscinas/bombas-para-piscinas/',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAE 100 - 1 HP',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAE 100',
    power: 1.0,
    voltage: 220,
    flowRate: 17,
    maxHead: 16,
    capacity: 17,
    pricePerUnit: 323941,
    description: 'Bomba autocebante línea BAE. Alto rendimiento para instalaciones profesionales.',
    catalogPage: 'https://vulcano-sa.com.ar/producto/bomba-para-piscina-bae-100-1-00hp-220v-monofasica/',
    isActive: true
  },

  // ESPA SERIES (datos basados en especificaciones de catálogo)
  {
    name: 'Bomba ESPA NOX 75 15M - 0.75 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'NOX 75 15M',
    power: 0.75,
    voltage: 220,
    flowRate: 15,
    maxHead: 15,
    capacity: 15,
    pricePerUnit: 350000,  // Estimado para Argentina
    description: 'Bomba silenciosa, autocebante hasta 4m. Compatible con agua clorada y salada (hasta 7 gr/litro).',
    catalogPage: 'https://www.espa.com/ar/',
    isActive: true
  },
  {
    name: 'Bomba ESPA Silen S 100 18M - 1 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Silen S 100 18M',
    power: 1.0,
    voltage: 220,
    flowRate: 18,
    maxHead: 18,
    capacity: 18,
    pricePerUnit: 420000,  // Estimado para Argentina
    description: 'Bomba centrífuga silenciosa monoetapa para recirculación y filtración. Alta eficiencia.',
    catalogPage: 'https://www.espa.com/ar/',
    isActive: true
  },
  {
    name: 'Bomba ESPA Silen S 150 22M - 1.5 HP',
    type: 'PUMP',
    brand: 'Espa',
    model: 'Silen S 150 22M',
    power: 1.5,
    voltage: 220,
    flowRate: 22,
    maxHead: 22,
    capacity: 22,
    pricePerUnit: 480000,  // Estimado para Argentina
    description: 'Bomba silenciosa de alta capacidad. Reemplazo directo del modelo Silen anterior.',
    catalogPage: 'https://www.espa.com/ar/',
    isActive: true
  },

  // BOMBAS TRIFÁSICAS (para instalaciones comerciales/grandes)
  {
    name: 'Bomba Fluvial Trifásica 2 HP - 380V',
    type: 'PUMP',
    brand: 'Fluvial',
    model: 'Trifásica 2HP',
    power: 2.0,
    voltage: 380,
    flowRate: 28,
    maxHead: 20,
    capacity: 28,
    pricePerUnit: 450000,
    description: 'Bomba trifásica para instalaciones comerciales. Alto caudal y altura.',
    isActive: true
  },
  {
    name: 'Bomba Vulcano BAC 2-3 - 2 HP Trifásica',
    type: 'PUMP',
    brand: 'Vulcano',
    model: 'BAC 2-3',
    power: 2.0,
    voltage: 380,
    flowRate: 26,
    maxHead: 18,
    capacity: 26,
    pricePerUnit: 497407,
    description: 'Bomba autocebante trifásica serie BAC. Para piscinas comerciales o grandes instalaciones.',
    catalogPage: 'https://www.bigger.com.ar/',
    isActive: true
  }
];

async function updateRealPumpData() {
  console.log('Actualizando base de datos con información real de bombas...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const pumpData of realPumpData) {
    try {
      // Buscar si existe una bomba con el mismo nombre o modelo
      const existing = await prisma.equipmentPreset.findFirst({
        where: {
          OR: [
            { name: pumpData.name },
            {
              AND: [
                { brand: pumpData.brand },
                { model: pumpData.model }
              ]
            }
          ]
        }
      });

      if (existing) {
        // Actualizar bomba existente
        await prisma.equipmentPreset.update({
          where: { id: existing.id },
          data: pumpData as any
        });
        console.log(`✏️  Actualizada: ${pumpData.name} - $${pumpData.pricePerUnit.toLocaleString()}`);
        updated++;
      } else {
        // Crear nueva bomba
        await prisma.equipmentPreset.create({
          data: pumpData as any
        });
        console.log(`✅ Creada: ${pumpData.name} - $${pumpData.pricePerUnit.toLocaleString()}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error con ${pumpData.name}:`, error);
      skipped++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Creadas: ${created}`);
  console.log(`   Actualizadas: ${updated}`);
  console.log(`   Errores: ${skipped}`);
  console.log(`   Total procesado: ${realPumpData.length}`);

  // Mostrar bombas por marca
  console.log('\n📋 Bombas en el catálogo por marca:\n');

  const brands = ['Fluvial', 'Vulcano', 'Espa'];
  for (const brand of brands) {
    const count = await prisma.equipmentPreset.count({
      where: { brand, type: 'PUMP', isActive: true }
    });
    console.log(`   ${brand}: ${count} modelos`);
  }

  await prisma.$disconnect();
}

updateRealPumpData().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
