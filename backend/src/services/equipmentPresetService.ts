import prisma from '../config/database';

export const equipmentPresetService = {
  async getAll() {
    return await prisma.equipmentPreset.findMany({
      orderBy: { type: 'asc' },
    });
  },

  async getById(id: string) {
    return await prisma.equipmentPreset.findUnique({
      where: { id },
    });
  },

  async create(data: any) {
    return await prisma.equipmentPreset.create({ data });
  },

  async update(id: string, data: any) {
    return await prisma.equipmentPreset.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return await prisma.equipmentPreset.delete({
      where: { id },
    });
  },
};
