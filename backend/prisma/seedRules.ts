import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBusinessRules() {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.log('No admin user found');
    return;
  }

  const rules = [
    // REGLAS ELÉCTRICAS
    {
      name: 'Luz adicional 100W',
      category: 'ELECTRICAL',
      trigger: 'ADD_LIGHT_100W',
      conditions: {
        accessoryType: 'light',
        wattage: 100
      },
      actions: [
        { type: 'ADD_MATERIAL', name: 'Cable 6mm²', quantity: 10, unit: 'm' },
        { type: 'CHECK_JUNCTION_BOX', maxLights: 3 },
      ]
    },
    {
      name: 'Luz adicional 300W',
      category: 'ELECTRICAL',
      trigger: 'ADD_LIGHT_300W',
      conditions: {
        accessoryType: 'light',
        wattage: 300
      },
      actions: [
        { type: 'ADD_MATERIAL', name: 'Cable 10mm²', quantity: 15, unit: 'm' },
        { type: 'CHECK_JUNCTION_BOX', maxLights: 3 },
        { type: 'CHECK_TRANSFORMER', minWatts: 350 }
      ]
    },
    {
      name: 'Caja estanco adicional',
      category: 'ELECTRICAL',
      trigger: 'JUNCTION_BOX_OVERFLOW',
      conditions: {
        totalLights: { gt: 3 }
      },
      actions: [
        { type: 'ADD_ACCESSORY', name: 'Caja estanco IP68', quantity: 1 }
      ]
    },

    // REGLAS HIDRÁULICAS
    {
      name: 'Hidrojet adicional',
      category: 'HYDRAULIC',
      trigger: 'ADD_HYDROJET',
      conditions: {
        accessoryType: 'hydrojet'
      },
      actions: [
        { type: 'ADD_MATERIAL', name: 'Caño PVC 1.5"', quantity: 3, unit: 'm' },
        { type: 'ADD_MATERIAL', name: 'Codo 45° 1.5"', quantity: 2, unit: 'u' },
        { type: 'ADD_MATERIAL', name: 'Válvula esférica 1.5"', quantity: 1, unit: 'u' },
        { type: 'CHECK_PUMP_CAPACITY', additionalGPM: 15 }
      ]
    },
    {
      name: 'Retorno adicional',
      category: 'HYDRAULIC', 
      trigger: 'ADD_RETURN',
      conditions: {
        accessoryType: 'return'
      },
      actions: [
        { type: 'ADD_MATERIAL', name: 'Caño PVC 1.5"', quantity: 2, unit: 'm' },
        { type: 'ADD_MATERIAL', name: 'Codo barrido 1.5"', quantity: 1, unit: 'u' },
        { type: 'ADD_MATERIAL', name: 'Fitting retorno', quantity: 1, unit: 'u' },
        { type: 'CHECK_PUMP_CAPACITY', additionalGPM: 10 }
      ]
    },
    {
      name: 'Skimmer adicional',
      category: 'HYDRAULIC',
      trigger: 'ADD_SKIMMER',
      conditions: {
        accessoryType: 'skimmer'
      },
      actions: [
        { type: 'ADD_MATERIAL', name: 'Caño PVC 2"', quantity: 4, unit: 'm' },
        { type: 'ADD_MATERIAL', name: 'Codo barrido 2"', quantity: 2, unit: 'u' },
        { type: 'ADD_MATERIAL', name: 'Canasta skimmer', quantity: 1, unit: 'u' },
        { type: 'ADD_MATERIAL', name: 'Tapa skimmer', quantity: 1, unit: 'u' },
        { type: 'CHECK_PUMP_CAPACITY', additionalGPM: 35 }
      ]
    },

    // REGLAS DE BOMBA
    {
      name: 'Upgrade bomba por hidrojets',
      category: 'PUMP',
      trigger: 'PUMP_UPGRADE_HYDROJETS',
      conditions: {
        totalHydrojets: { gte: 2 }
      },
      actions: [
        { type: 'SUGGEST_PUMP_UPGRADE', percentIncrease: 25 }
      ]
    }
  ];

  for (const rule of rules) {
    await prisma.businessRule.create({
      data: {
        ...rule,
        userId: adminUser.id,
        isActive: true
      }
    });
  }

  console.log('Business rules seeded successfully');
}

seedBusinessRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
