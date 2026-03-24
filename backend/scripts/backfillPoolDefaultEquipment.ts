import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type EquipmentPair = {
  pumpId: string;
  filterId: string;
  pumpModel: string;
  filterModel: string;
};

async function getEquipmentPair(length: number): Promise<EquipmentPair> {
  const pumpModel = length > 8 ? 'BAE 075' : 'BAE 050';
  const filterModel = length > 8 ? 'VC-50' : 'VC-30';

  const [pump, filter] = await Promise.all([
    prisma.equipmentPreset.findFirst({ where: { model: pumpModel } }),
    prisma.equipmentPreset.findFirst({ where: { model: filterModel } }),
  ]);

  if (!pump || !filter) {
    throw new Error(`No se encontró el par de equipos ${pumpModel} / ${filterModel}`);
  }

  return {
    pumpId: pump.id,
    filterId: filter.id,
    pumpModel,
    filterModel,
  };
}

async function main() {
  const presets = await prisma.poolPreset.findMany({
    where: {
      OR: [
        { vendor: { contains: 'acquan', mode: 'insensitive' } },
        { vendor: null },
      ],
    },
    select: {
      id: true,
      name: true,
      vendor: true,
      length: true,
    },
  });

  for (const preset of presets) {
    const pair = await getEquipmentPair(preset.length);

    await prisma.poolPreset.update({
      where: { id: preset.id },
      data: {
        defaultPumpId: pair.pumpId,
        defaultFilterId: pair.filterId,
      },
    });

    console.log(
      `[POOL DEFAULT EQUIPMENT] ${preset.name} (${preset.length}m) -> ${pair.pumpModel} + ${pair.filterModel}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
