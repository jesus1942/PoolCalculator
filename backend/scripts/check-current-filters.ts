import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFilters() {
  console.log('\n🔍 Revisando filtros actuales en la base de datos...\n');

  const filters = await prisma.equipmentPreset.findMany({
    where: { type: 'FILTER' },
    orderBy: [
      { brand: 'asc' },
      { model: 'asc' }
    ]
  });

  console.log(`Total de filtros: ${filters.length}\n`);

  filters.forEach(filter => {
    console.log(`📌 ${filter.brand} ${filter.model}`);
    console.log(`   Nombre: ${filter.name}`);
    console.log(`   Volumen: ${filter.minPoolVolume || 'N/A'} - ${filter.maxPoolVolume || 'N/A'} m³`);
    console.log(`   Diámetro: ${filter.filterDiameter || 'N/A'} mm`);
    console.log(`   Caudal: ${filter.flowRate || 'N/A'} m³/h`);
    console.log(`   Activo: ${filter.isActive ? '✅' : '❌'}`);
    console.log(`   Precio: $${filter.pricePerUnit}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkFilters();
