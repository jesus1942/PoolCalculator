import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProducts() {
  console.log('🌱 Sembrando productos en la base de datos...');

  // Limpiar datos existentes (opcional)
  console.log('🧹 Limpiando productos existentes...');
  await prisma.plumbingItem.deleteMany({});
  await prisma.tilePreset.deleteMany({});
  await prisma.accessoryPreset.deleteMany({});
  await prisma.equipmentPreset.deleteMany({});
  await prisma.constructionMaterialPreset.deleteMany({});

  // === MATERIALES DE CONSTRUCCIÓN ===
  console.log('📦 Creando materiales de construcción...');

  await prisma.constructionMaterialPreset.createMany({
    data: [
      // Cementos
      {
        name: 'Cemento Portland Loma Negra CPC40',
        type: 'CEMENT',
        unit: 'bolsa 50kg',
        bagWeight: 50,
        pricePerUnit: 12500,
        brand: 'Loma Negra',
        description: 'Cemento Portland Compuesto, ideal para hormigones y morteros',
      },
      {
        name: 'Cemento Blanco Minetti x 25kg',
        type: 'WHITE_CEMENT',
        unit: 'bolsa 25kg',
        bagWeight: 25,
        pricePerUnit: 18500,
        brand: 'Minetti',
        description: 'Cemento blanco para pastina y terminaciones',
      },
      // Arena y agregados
      {
        name: 'Arena Gruesa',
        type: 'SAND',
        unit: 'm³',
        pricePerUnit: 45000,
        description: 'Arena cernida gruesa para hormigón y cama de apoyo',
      },
      {
        name: 'Arena Fina Lavada',
        type: 'SAND',
        unit: 'm³',
        pricePerUnit: 52000,
        description: 'Arena fina lavada para mezclas finas y revoque',
      },
      {
        name: 'Canto Rodado 6-20mm',
        type: 'STONE',
        unit: 'm³',
        pricePerUnit: 62000,
        description: 'Piedra canto rodado para hormigón H17-H21',
      },
      {
        name: 'Piedra Partida Granza',
        type: 'GRAVEL',
        unit: 'm³',
        pricePerUnit: 58000,
        description: 'Piedra partida 6-12mm para hormigón',
      },
      {
        name: 'Piedra para Drenaje',
        type: 'GRAVEL',
        unit: 'm³',
        pricePerUnit: 35000,
        description: 'Piedra gruesa para zanjas de drenaje',
      },
      // Marmolina
      {
        name: 'Marmolina Blanca x 30kg',
        type: 'MARMOLINA',
        unit: 'bolsa',
        bagWeight: 30,
        pricePerUnit: 8500,
        description: 'Marmolina blanca para pastina de losetas',
      },
      // Mallas y hierros
      {
        name: 'Malla de Acero Q188 6x2.15m',
        type: 'WIRE_MESH',
        unit: 'm²',
        pricePerUnit: 4200,
        description: 'Malla electrosoldada Q188 para vereda',
      },
      {
        name: 'Malla Electrosoldada Q335',
        type: 'WIRE_MESH',
        unit: 'm²',
        pricePerUnit: 6800,
        description: 'Malla reforzada para cama y estructuras',
      },
      // Impermeabilizantes
      {
        name: 'Impermeabilizante Sika 1 x 20kg',
        type: 'WATERPROOFING',
        unit: 'kg',
        pricePerUnit: 2800,
        brand: 'Sika',
        description: 'Impermeabilizante en polvo para morteros',
      },
      {
        name: 'Membrana Geotextil 200 Micrones',
        type: 'GEOTEXTILE',
        unit: 'm²',
        pricePerUnit: 1200,
        description: 'Geomembrana para base de piscina',
      },
    ],
  });

  // === ITEMS DE PLOMERÍA ===
  console.log('🔧 Creando items de plomería...');

  await prisma.plumbingItem.createMany({
    data: [
      // Caños PVC
      {
        name: 'Caño PVC 63mm x 4m Awaduct',
        category: 'PIPE',
        type: 'PVC',
        diameter: '63mm',
        length: 4,
        unit: 'unidad',
        pricePerUnit: 12500,
        brand: 'Awaduct',
        description: 'Caño PVC presión clase 10 para red principal',
      },
      {
        name: 'Caño PVC 50mm x 4m Awaduct',
        category: 'PIPE',
        type: 'PVC',
        diameter: '50mm',
        length: 4,
        unit: 'unidad',
        pricePerUnit: 9800,
        brand: 'Awaduct',
        description: 'Caño PVC presión clase 10',
      },
      {
        name: 'Caño PVC 40mm x 4m Awaduct',
        category: 'PIPE',
        type: 'PVC',
        diameter: '40mm',
        length: 4,
        unit: 'unidad',
        pricePerUnit: 7200,
        brand: 'Awaduct',
        description: 'Caño PVC presión para retornos y accesorios',
      },
      {
        name: 'Caño PVC 32mm x 4m',
        category: 'PIPE',
        type: 'PVC',
        diameter: '32mm',
        length: 4,
        unit: 'unidad',
        pricePerUnit: 5600,
        description: 'Caño PVC para conexiones secundarias',
      },
      // Caños Fusión
      {
        name: 'Caño Fusión 63mm x 6m Tigre',
        category: 'PIPE',
        type: 'FUSION_FUSION',
        diameter: '63mm',
        length: 6,
        unit: 'unidad',
        pricePerUnit: 18500,
        brand: 'Tigre',
        description: 'Caño termofusión PPR para agua caliente/fría',
      },
      {
        name: 'Caño Fusión 50mm x 6m Tigre',
        category: 'PIPE',
        type: 'FUSION_FUSION',
        diameter: '50mm',
        length: 6,
        unit: 'unidad',
        pricePerUnit: 14200,
        brand: 'Tigre',
        description: 'Caño termofusión PPR',
      },
      // Codos y Accesorios PVC
      {
        name: 'Codo PVC 90° 63mm',
        category: 'FITTING',
        type: 'PVC',
        diameter: '63mm',
        unit: 'unidad',
        pricePerUnit: 3200,
        description: 'Codo 90 grados a presión',
      },
      {
        name: 'Codo PVC 90° 50mm',
        category: 'FITTING',
        type: 'PVC',
        diameter: '50mm',
        unit: 'unidad',
        pricePerUnit: 2100,
        description: 'Codo 90 grados a presión',
      },
      {
        name: 'Codo PVC 90° 40mm',
        category: 'FITTING',
        type: 'PVC',
        diameter: '40mm',
        unit: 'unidad',
        pricePerUnit: 1600,
        description: 'Codo 90 grados a presión',
      },
      {
        name: 'Te PVC 63mm',
        category: 'FITTING',
        type: 'PVC',
        diameter: '63mm',
        unit: 'unidad',
        pricePerUnit: 4200,
        description: 'Te derivación 90 grados',
      },
      {
        name: 'Te PVC 50mm',
        category: 'FITTING',
        type: 'PVC',
        diameter: '50mm',
        unit: 'unidad',
        pricePerUnit: 2800,
        description: 'Te derivación 90 grados',
      },
      // Válvulas
      {
        name: 'Válvula Esférica PVC 63mm',
        category: 'VALVE',
        type: 'PVC',
        diameter: '63mm',
        unit: 'unidad',
        pricePerUnit: 8900,
        description: 'Válvula de corte esférica presión',
      },
      {
        name: 'Válvula Esférica PVC 50mm',
        category: 'VALVE',
        type: 'PVC',
        diameter: '50mm',
        unit: 'unidad',
        pricePerUnit: 6500,
        description: 'Válvula de corte esférica presión',
      },
      {
        name: 'Válvula Check 50mm',
        category: 'VALVE',
        type: 'PVC',
        diameter: '50mm',
        unit: 'unidad',
        pricePerUnit: 7200,
        description: 'Válvula anti-retorno',
      },
      // Pegamentos y adhesivos
      {
        name: 'Pegamento PVC x 250ml Awaduct',
        category: 'ACCESSORY',
        type: 'OTHER',
        unit: 'unidad',
        pricePerUnit: 3500,
        brand: 'Awaduct',
        description: 'Pegamento para PVC presión',
      },
      {
        name: 'Teflón para Roscas x 12mm',
        category: 'ACCESSORY',
        type: 'OTHER',
        unit: 'rollo',
        pricePerUnit: 800,
        description: 'Cinta teflón para sellado de roscas',
      },
    ],
  });

  // === ACCESORIOS PARA PISCINA ===
  console.log('🏊 Creando accesorios para piscina...');

  await prisma.accessoryPreset.createMany({
    data: [
      // Kit Vulcano
      {
        name: 'Kit Vulcano Completo (Skimmer + 3 Retornos + Virola)',
        type: 'SKIMMER_ITEM',
        unit: 'kit',
        pricePerUnit: 96500,
        description: 'Kit completo marca Vulcano para piscina fibra hasta 12x5m',
      },
      {
        name: 'Skimmer Vulcano Boca Ancha 20cm',
        type: 'SKIMMER_ITEM',
        unit: 'unidad',
        pricePerUnit: 42000,
        description: 'Skimmer boca ancha de 20cm marca Vulcano',
      },
      {
        name: 'Retorno Orientable Vulcano',
        type: 'RETURN_ITEM',
        unit: 'unidad',
        pricePerUnit: 8500,
        description: 'Retorno orientable de agua marca Vulcano',
      },
      {
        name: 'Virola para Limpiafondos',
        type: 'DRAIN_ITEM',
        unit: 'unidad',
        pricePerUnit: 12500,
        description: 'Virola de aspiración para limpiafondos',
      },
      {
        name: 'Desagüe de Fondo Ø110mm',
        type: 'DRAIN_ITEM',
        unit: 'unidad',
        pricePerUnit: 18500,
        description: 'Desagüe de fondo con rejilla',
      },
      // Losetas y remates
      {
        name: 'Remate Lomo Ballena 12x25cm',
        type: 'TRIM',
        unit: 'ml',
        pricePerUnit: 3200,
        description: 'Remate tipo lomo ballena para bordes',
      },
      {
        name: 'Esquinero Remate',
        type: 'CORNER',
        unit: 'unidad',
        pricePerUnit: 1800,
        description: 'Esquinero para remate de bordes',
      },
      {
        name: 'Rejilla Rebosadero',
        type: 'GRILL',
        unit: 'ml',
        pricePerUnit: 4500,
        description: 'Rejilla para canal rebosadero',
      },
      {
        name: 'Zócalo Cerámico 30cm',
        type: 'BASEBOARD',
        unit: 'ml',
        pricePerUnit: 2100,
        description: 'Zócalo cerámico para terminación',
      },
    ],
  });

  // === EQUIPAMIENTO ===
  console.log('⚙️ Creando equipamiento...');

  await prisma.equipmentPreset.createMany({
    data: [
      // Bombas AstralPool
      {
        name: 'Bomba Astralpool Sena 0.5 HP',
        type: 'PUMP',
        brand: 'AstralPool',
        model: 'Sena 0.5',
        power: 0.5,
        capacity: 8,
        voltage: 220,
        pricePerUnit: 185000,
        description: 'Bomba autocebante 8 m³/h, monofásica',
      },
      {
        name: 'Bomba Astralpool Sena 0.75 HP',
        type: 'PUMP',
        brand: 'AstralPool',
        model: 'Sena 0.75',
        power: 0.75,
        capacity: 12,
        voltage: 220,
        pricePerUnit: 225000,
        description: 'Bomba autocebante 12 m³/h, monofásica',
      },
      {
        name: 'Bomba Astralpool Sena 1 HP',
        type: 'PUMP',
        brand: 'AstralPool',
        model: 'Sena 1',
        power: 1,
        capacity: 15,
        voltage: 220,
        pricePerUnit: 285000,
        description: 'Bomba autocebante 15 m³/h, monofásica',
      },
      {
        name: 'Bomba Peabody 1 HP Autocebante',
        type: 'PUMP',
        brand: 'Peabody',
        model: 'PB-POOL100',
        power: 1,
        capacity: 14,
        voltage: 220,
        pricePerUnit: 195000,
        description: 'Bomba para piscina autocebante',
      },
      // Filtros
      {
        name: 'Filtro Astralpool Aster Ø400 7m³/h',
        type: 'FILTER',
        brand: 'AstralPool',
        model: 'Aster 400',
        capacity: 7,
        pricePerUnit: 165000,
        description: 'Filtro de arena con válvula multipuerta 6 vías',
      },
      {
        name: 'Filtro Astralpool Aster Ø500 10m³/h',
        type: 'FILTER',
        brand: 'AstralPool',
        model: 'Aster 500',
        capacity: 10,
        pricePerUnit: 225000,
        description: 'Filtro de arena con válvula multipuerta 6 vías',
      },
      {
        name: 'Filtro Astralpool Aster Ø600 14m³/h',
        type: 'FILTER',
        brand: 'AstralPool',
        model: 'Aster 600',
        capacity: 14,
        pricePerUnit: 295000,
        description: 'Filtro de arena con válvula multipuerta 6 vías',
      },
      {
        name: 'Arena Sílice para Filtro x 25kg',
        type: 'FILTER',
        brand: 'Genérica',
        pricePerUnit: 8500,
        description: 'Arena sílice granulometría 0.5-1mm',
      },
      // Calefacción
      {
        name: 'Calefactor Solar 30.000 Kcal',
        type: 'HEATER',
        brand: 'Genérico',
        capacity: 30,
        pricePerUnit: 285000,
        description: 'Colector solar para piscinas hasta 40m³',
      },
      {
        name: 'Intercambiador de Calor 40.000 Kcal',
        type: 'HEATER',
        brand: 'Astralpool',
        capacity: 40,
        pricePerUnit: 425000,
        description: 'Intercambiador de calor de titanio',
      },
      // Cloración
      {
        name: 'Clorador Salino Astralpool 35g/h',
        type: 'CHLORINATOR',
        brand: 'AstralPool',
        model: 'Next Salt',
        capacity: 35,
        pricePerUnit: 485000,
        description: 'Clorador salino para piscinas hasta 60m³',
      },
      {
        name: 'Clorador Salino Astralpool 60g/h',
        type: 'CHLORINATOR',
        brand: 'AstralPool',
        model: 'Next Salt Pro',
        capacity: 60,
        pricePerUnit: 685000,
        description: 'Clorador salino para piscinas hasta 100m³',
      },
      {
        name: 'Dosificador Cloro Flotante',
        type: 'CHLORINATOR',
        brand: 'Genérico',
        pricePerUnit: 8500,
        description: 'Dosificador flotante para pastillas de cloro',
      },
      // Iluminación
      {
        name: 'Luz LED RGB 18W 12V IP68',
        type: 'LIGHTING',
        brand: 'Genérica',
        power: 18,
        voltage: 12,
        pricePerUnit: 32000,
        description: 'Luz LED RGB sumergible con control remoto',
      },
      {
        name: 'Luz LED Blanca 35W 12V',
        type: 'LIGHTING',
        brand: 'Genérica',
        power: 35,
        voltage: 12,
        pricePerUnit: 28000,
        description: 'Luz LED blanca sumergible',
      },
      {
        name: 'Transformador 220V a 12V 300W',
        type: 'LIGHTING',
        brand: 'Genérico',
        power: 300,
        voltage: 220,
        pricePerUnit: 42000,
        description: 'Transformador para luces LED 12V',
      },
      // Automatización
      {
        name: 'Timer Digital Programable',
        type: 'OTHER',
        brand: 'Genérico',
        pricePerUnit: 18500,
        description: 'Timer digital para programación de bomba',
      },
      {
        name: 'Regulador de Nivel Automático',
        type: 'OTHER',
        brand: 'Astralpool',
        pricePerUnit: 52000,
        description: 'Sistema automático de llenado',
      },
    ],
  });

  // === LOSETAS Y CERÁMICOS ===
  console.log('🔲 Creando losetas y cerámicos...');

  await prisma.tilePreset.createMany({
    data: [
      {
        name: 'Loseta Antideslizante 30x30cm Gris',
        type: 'COMMON',
        width: 0.30,
        length: 0.30,
        pricePerUnit: 1850,
        brand: 'Cerro Negro',
        description: 'Loseta antideslizante para vereda exterior',
      },
      {
        name: 'Loseta Antideslizante 40x40cm Gris',
        type: 'COMMON',
        width: 0.40,
        length: 0.40,
        pricePerUnit: 2600,
        brand: 'Cerro Negro',
        description: 'Loseta antideslizante para vereda exterior',
      },
      {
        name: 'Loseta Símil Madera 20x120cm',
        type: 'COMMON',
        width: 0.20,
        length: 1.20,
        pricePerUnit: 4200,
        brand: 'Ilva',
        description: 'Porcelanato símil madera para deck',
      },
      {
        name: 'Loseta Piedra Natural 40x40cm',
        type: 'COMMON',
        width: 0.40,
        length: 0.40,
        pricePerUnit: 3800,
        brand: 'San Lorenzo',
        description: 'Loseta símil piedra natural antideslizante',
      },
      {
        name: 'Remate Lomo Ballena 12x25cm Blanco',
        type: 'LOMO_BALLENA',
        width: 0.12,
        length: 0.25,
        pricePerUnit: 2200,
        brand: 'Genérico',
        description: 'Remate tipo lomo ballena para bordes',
      },
      {
        name: 'Remate Lomo Ballena 12x25cm Azul',
        type: 'LOMO_BALLENA',
        width: 0.12,
        length: 0.25,
        pricePerUnit: 2400,
        brand: 'Genérico',
        description: 'Remate tipo lomo ballena color azul',
      },
      {
        name: 'Terminación L 10x30cm',
        type: 'L_FINISH',
        width: 0.10,
        length: 0.30,
        pricePerUnit: 1600,
        description: 'Terminación en L para bordes',
      },
      {
        name: 'Venecita Azul Piscina 2x2cm',
        type: 'PERIMETER',
        width: 0.02,
        length: 0.02,
        pricePerUnit: 8500,
        brand: 'Venecitas Córdoba',
        description: 'Venecitas azul para revestimiento interior (precio por m²)',
      },
      {
        name: 'Venecita Verde Agua 2x2cm',
        type: 'PERIMETER',
        width: 0.02,
        length: 0.02,
        pricePerUnit: 9200,
        brand: 'Venecitas Córdoba',
        description: 'Venecitas verde agua para revestimiento (precio por m²)',
      },
    ],
  });

  console.log('✅ Base de datos poblada exitosamente!');
  console.log('');
  console.log('📊 Resumen:');
  const materialCount = await prisma.constructionMaterialPreset.count();
  const plumbingCount = await prisma.plumbingItem.count();
  const accessoryCount = await prisma.accessoryPreset.count();
  const equipmentCount = await prisma.equipmentPreset.count();
  const tileCount = await prisma.tilePreset.count();

  console.log(`   - Materiales de construcción: ${materialCount}`);
  console.log(`   - Items de plomería: ${plumbingCount}`);
  console.log(`   - Accesorios: ${accessoryCount}`);
  console.log(`   - Equipamiento: ${equipmentCount}`);
  console.log(`   - Losetas y cerámicos: ${tileCount}`);
  console.log('');
  console.log('💰 Precios actualizados para Argentina 2025');
}

seedProducts()
  .catch((e) => {
    console.error('Error al sembrar productos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
