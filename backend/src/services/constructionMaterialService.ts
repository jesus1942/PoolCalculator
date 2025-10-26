import prisma from '../config/database';

export const constructionMaterialService = {
  async getAll() {
    return await prisma.constructionMaterialPreset.findMany({
      orderBy: { type: 'asc' },
    });
  },

  async getById(id: string) {
    return await prisma.constructionMaterialPreset.findUnique({
      where: { id },
    });
  },

  async create(data: any) {
    return await prisma.constructionMaterialPreset.create({ data });
  },

  async update(id: string, data: any) {
    return await prisma.constructionMaterialPreset.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return await prisma.constructionMaterialPreset.delete({
      where: { id },
    });
  },
};
