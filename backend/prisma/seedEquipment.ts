import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedEquipment() {
  console.log('Seeding equipment data...');

  // ========================
  // BOMBAS VULCANO - Serie BAE (Autocebantes)
  // ========================
  const pumps = [
    {
      name: 'Bomba Vulcano BAE 033',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 033',
      power: 0.33,
      voltage: 220,
      pricePerUnit: 220000,
      description: 'Bomba autocebante 0.33HP, motor italiano, prefiltro integrado',
      minPoolVolume: 0,
      maxPoolVolume: 40000,
      flowRate: 12,
      maxHead: 9,
      consumption: 350,
      connectionSize: '1 1/2"',
      recommendedFilterModel: 'VC-10, VC-20',
    },
    {
      name: 'Bomba Vulcano BAE 050',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 050',
      power: 0.50,
      voltage: 220,
      pricePerUnit: 280000,
      description: 'Bomba autocebante 0.50HP, motor italiano, caudal 16.7 m³/h',
      minPoolVolume: 30000,
      maxPoolVolume: 60000,
      flowRate: 16.7,
      maxHead: 11,
      consumption: 500,
      connectionSize: '1 1/2"',
      recommendedFilterModel: 'VC-30',
    },
    {
      name: 'Bomba Vulcano BAE 075',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 075',
      power: 0.75,
      voltage: 220,
      pricePerUnit: 350000,
      description: 'Bomba autocebante 0.75HP, motor italiano, caudal 19.3 m³/h',
      minPoolVolume: 50000,
      maxPoolVolume: 80000,
      flowRate: 19.3,
      maxHead: 13,
      consumption: 750,
      connectionSize: '1 1/2"',
      recommendedFilterModel: 'VC-50',
    },
    {
      name: 'Bomba Vulcano BAE 100',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 100',
      power: 1.00,
      voltage: 220,
      pricePerUnit: 420000,
      description: 'Bomba autocebante 1.00HP, motor italiano, caudal 21.8 m³/h',
      minPoolVolume: 80000,
      maxPoolVolume: 130000,
      flowRate: 21.8,
      maxHead: 14,
      consumption: 1000,
      connectionSize: '1 1/2"',
      recommendedFilterModel: 'VC-100',
    },
    {
      name: 'Bomba Vulcano BAE 150',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 150',
      power: 1.50,
      voltage: 220,
      pricePerUnit: 550000,
      description: 'Bomba autocebante 1.50HP, motor italiano, caudal 28 m³/h',
      minPoolVolume: 130000,
      maxPoolVolume: 200000,
      flowRate: 28,
      maxHead: 16,
      consumption: 1500,
      connectionSize: '2"',
      recommendedFilterModel: 'VC-200',
    },
    {
      name: 'Bomba Vulcano BAE 200',
      type: 'PUMP',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'BAE 200',
      power: 2.00,
      voltage: 220,
      pricePerUnit: 680000,
      description: 'Bomba autocebante 2.00HP, motor italiano, caudal 35 m³/h',
      minPoolVolume: 200000,
      maxPoolVolume: 300000,
      flowRate: 35,
      maxHead: 18,
      consumption: 2000,
      connectionSize: '2"',
      recommendedFilterModel: 'VC-200',
    },
  ];

  // ========================
  // FILTROS VULCANO - Serie VC (Arena)
  // ========================
  const filters = [
    {
      name: 'Filtro Vulcano VC-10',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-10',
      pricePerUnit: 210000,
      description: 'Filtro de arena ø290mm, multiválvula 6 vías, cuerpo polietileno UV',
      minPoolVolume: 0,
      maxPoolVolume: 20000,
      filterArea: 0.066,
      filterDiameter: 290,
      sandRequired: 40,
      recommendedPumpModel: 'BAE 033',
    },
    {
      name: 'Filtro Vulcano VC-20',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-20',
      pricePerUnit: 260000,
      description: 'Filtro de arena ø360mm, multiválvula 6 vías 2", manómetro integrado',
      minPoolVolume: 20000,
      maxPoolVolume: 35000,
      filterArea: 0.102,
      filterDiameter: 360,
      sandRequired: 65,
      recommendedPumpModel: 'BAE 033',
    },
    {
      name: 'Filtro Vulcano VC-30',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-30',
      pricePerUnit: 330000,
      description: 'Filtro de arena ø440mm, multiválvula 6 vías 2", drenaje inferior',
      minPoolVolume: 35000,
      maxPoolVolume: 50000,
      filterArea: 0.152,
      filterDiameter: 440,
      sandRequired: 100,
      recommendedPumpModel: 'BAE 050',
    },
    {
      name: 'Filtro Vulcano VC-50',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-50',
      pricePerUnit: 420000,
      description: 'Filtro de arena ø540mm, multiválvula 6 vías 2", alta capacidad',
      minPoolVolume: 50000,
      maxPoolVolume: 80000,
      filterArea: 0.229,
      filterDiameter: 540,
      sandRequired: 150,
      recommendedPumpModel: 'BAE 075',
    },
    {
      name: 'Filtro Vulcano VC-100',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-100',
      pricePerUnit: 580000,
      description: 'Filtro de arena ø690mm, multiválvula 6 vías 2", piscinas grandes',
      minPoolVolume: 80000,
      maxPoolVolume: 130000,
      filterArea: 0.374,
      filterDiameter: 690,
      sandRequired: 250,
      recommendedPumpModel: 'BAE 100',
    },
    {
      name: 'Filtro Vulcano VC-200',
      type: 'FILTER',
      category: 'REQUIRED',
      brand: 'Vulcano',
      model: 'VC-200',
      pricePerUnit: 950000,
      description: 'Filtro de arena ø900mm, multiválvula 6 vías 2", piscinas comerciales',
      minPoolVolume: 130000,
      maxPoolVolume: 250000,
      filterArea: 0.636,
      filterDiameter: 900,
      sandRequired: 450,
      recommendedPumpModel: 'BAE 150, BAE 200',
    },
  ];

  // ========================
  // CLIMATIZADORES EUTERMA - Serie Aruba (Gas)
  // ========================
  const heatersEuterma = [
    {
      name: 'Climatizador Euterma Aruba 20',
      type: 'HEATER',
      category: 'HEATING',
      brand: 'Euterma',
      model: 'Aruba 20',
      pricePerUnit: 1400000,
      description: 'Climatizador a gas 18.000 Kcal/h, intercambiador cobre, uso exterior',
      minPoolVolume: 0,
      maxPoolVolume: 20000,
      thermalPower: 18000,
      consumption: 50, // Consumo eléctrico mínimo (encendido)
    },
    {
      name: 'Climatizador Euterma Aruba 30',
      type: 'HEATER',
      category: 'HEATING',
      brand: 'Euterma',
      model: 'Aruba 30',
      pricePerUnit: 1750000,
      description: 'Climatizador a gas 27.000 Kcal/h, quemador inox, encendido electrónico',
      minPoolVolume: 20000,
      maxPoolVolume: 30000,
      thermalPower: 27000,
      consumption: 50,
    },
    {
      name: 'Climatizador Euterma Aruba 40',
      type: 'HEATER',
      category: 'HEATING',
      brand: 'Euterma',
      model: 'Aruba 40',
      pricePerUnit: 2100000,
      description: 'Climatizador a gas 36.700 Kcal/h, alto rendimiento, control digital',
      minPoolVolume: 30000,
      maxPoolVolume: 40000,
      thermalPower: 36700,
      consumption: 50,
    },
  ];

  // ========================
  // CLIMATIZADORES CALDAIA (Gas)
  // ========================
  const heatersCaldaia = [
    {
      name: 'Climatizador Caldaia Digital CP-20',
      type: 'HEATER',
      category: 'HEATING',
      brand: 'Caldaia',
      model: 'Digital CP-20',
      pricePerUnit: 1300000,
      description: 'Climatizador a gas 18.000 Kcal/h, control digital, certificado ENARGAS',
      minPoolVolume: 0,
      maxPoolVolume: 20000,
      thermalPower: 18000,
      consumption: 50,
    },
    {
      name: 'Climatizador Caldaia Digital CP-30',
      type: 'HEATER',
      category: 'HEATING',
      brand: 'Caldaia',
      model: 'Digital CP-30',
      pricePerUnit: 1650000,
      description: 'Climatizador a gas 27.000 Kcal/h, temperatura exacta, ahorro de gas',
      minPoolVolume: 20000,
      maxPoolVolume: 30000,
      thermalPower: 27000,
      consumption: 50,
    },
  ];

  // ========================
  // BOMBAS DE CALOR INVERTER (Eléctricas)
  // ========================
  const heatPumps = [
    {
      name: 'Bomba de Calor Inverter 7.2kW',
      type: 'HEAT_PUMP',
      category: 'HEATING',
      brand: 'Genérica',
      model: '7.2kW',
      power: 7.2,
      pricePerUnit: 2800000,
      description: 'Bomba de calor inverter con WiFi, COP 5.5, alta eficiencia energética',
      minPoolVolume: 0,
      maxPoolVolume: 30000,
      thermalPower: 7200,
      consumption: 1300,
      voltage: 220,
    },
    {
      name: 'Bomba de Calor Inverter 9.0kW',
      type: 'HEAT_PUMP',
      category: 'HEATING',
      brand: 'Genérica',
      model: '9.0kW',
      power: 9.0,
      pricePerUnit: 3500000,
      description: 'Bomba de calor inverter con WiFi, COP 5.8, control inteligente',
      minPoolVolume: 30000,
      maxPoolVolume: 45000,
      thermalPower: 9000,
      consumption: 1500,
      voltage: 220,
    },
    {
      name: 'Bomba de Calor Inverter 12.0kW',
      type: 'HEAT_PUMP',
      category: 'HEATING',
      brand: 'Genérica',
      model: '12.0kW',
      power: 12.0,
      pricePerUnit: 4500000,
      description: 'Bomba de calor inverter con WiFi, COP 6.0, piscinas grandes',
      minPoolVolume: 45000,
      maxPoolVolume: 60000,
      thermalPower: 12000,
      consumption: 2000,
      voltage: 220,
    },
  ];

  // ========================
  // ACCESORIOS VULCANO
  // ========================
  const accessories = [
    {
      name: 'Skimmer Vulcano Standard',
      type: 'SKIMMER',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Standard',
      pricePerUnit: 42000,
      description: 'Skimmer boca ancha, ABS resistente UV, tapa regulable',
    },
    {
      name: 'Skimmer Vulcano Premium',
      type: 'SKIMMER',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Premium',
      pricePerUnit: 55000,
      description: 'Skimmer premium con regulación de caudal, ABS reforzado',
    },
    {
      name: 'Retorno Vulcano Standard',
      type: 'RETURN',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Standard',
      pricePerUnit: 10000,
      description: 'Retorno orientable 1 1/2", ABS, conexión universal',
      connectionSize: '1 1/2"',
    },
    {
      name: 'Retorno Vulcano Orientable',
      type: 'RETURN',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Orientable',
      pricePerUnit: 14500,
      description: 'Retorno orientable premium, regulación 360°, ABS reforzado',
      connectionSize: '1 1/2"',
    },
    {
      name: 'Luz LED RGB 12V Vulcano',
      type: 'LIGHTING',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'RGB 18W',
      power: 18,
      voltage: 12,
      pricePerUnit: 52000,
      description: 'Luz LED RGB sumergible, 18W, control remoto, colores variables',
      consumption: 18,
    },
    {
      name: 'Luz LED Blanco 12V Vulcano',
      type: 'LIGHTING',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Blanco 18W',
      power: 18,
      voltage: 12,
      pricePerUnit: 42000,
      description: 'Luz LED blanco sumergible, 18W, alta luminosidad',
      consumption: 18,
    },
    {
      name: 'Transformador 300W 220V/12V',
      type: 'TRANSFORMER',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: '300W',
      power: 300,
      voltage: 220,
      pricePerUnit: 65000,
      description: 'Transformador para luces LED, 220V a 12V, protección IP65',
      consumption: 50, // Pérdida por transformación
    },
    {
      name: 'Toma de Barrefondo Vulcano',
      type: 'VACUUM_INTAKE',
      category: 'ACCESSORIES',
      brand: 'Vulcano',
      model: 'Standard',
      pricePerUnit: 15000,
      description: 'Toma de aspiración para barrefondo, 1 1/2", ABS',
      connectionSize: '1 1/2"',
    },
  ];

  // ========================
  // INSERTAR EN BASE DE DATOS
  // ========================

  console.log('  Creando bombas Vulcano...');
  for (const pump of pumps) {
    await prisma.equipmentPreset.upsert({
      where: { name: pump.name },
      update: pump,
      create: pump,
    });
  }

  console.log('  Creando filtros Vulcano...');
  for (const filter of filters) {
    await prisma.equipmentPreset.upsert({
      where: { name: filter.name },
      update: filter,
      create: filter,
    });
  }

  console.log('  Creando climatizadores Euterma...');
  for (const heater of heatersEuterma) {
    await prisma.equipmentPreset.upsert({
      where: { name: heater.name },
      update: heater,
      create: heater,
    });
  }

  console.log('  Creando climatizadores Caldaia...');
  for (const heater of heatersCaldaia) {
    await prisma.equipmentPreset.upsert({
      where: { name: heater.name },
      update: heater,
      create: heater,
    });
  }

  console.log('  Creando bombas de calor...');
  for (const heatPump of heatPumps) {
    await prisma.equipmentPreset.upsert({
      where: { name: heatPump.name },
      update: heatPump,
      create: heatPump,
    });
  }

  console.log('  Creando accesorios Vulcano...');
  for (const accessory of accessories) {
    await prisma.equipmentPreset.upsert({
      where: { name: accessory.name },
      update: accessory,
      create: accessory,
    });
  }

  const totalEquipment = pumps.length + filters.length + heatersEuterma.length +
                         heatersCaldaia.length + heatPumps.length + accessories.length;

  console.log(`${totalEquipment} equipos creados exitosamente`);
}

// Ejecutar el seed
seedEquipment()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
