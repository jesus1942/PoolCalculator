import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const parseFormData = (body: any) => {
  const parsed: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    if (['pricePerUnit'].includes(key)) {
      parsed[key] = value ? parseFloat(value) : 0;
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
};

export const createConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const material = await prisma.constructionMaterialPreset.create({ data });
    res.status(201).json(material);
  } catch (error) {
    console.error('Error al crear material de construcción:', error);
    res.status(500).json({ error: 'Error al crear material de construcción' });
  }
};

export const getConstructionMaterials = async (req: Request, res: Response) => {
  try {
    const materials = await prisma.constructionMaterialPreset.findMany({
      orderBy: {
        type: 'asc',
      },
    });
    res.json(materials);
  } catch (error) {
    console.error('Error al obtener materiales de construcción:', error);
    res.status(500).json({ error: 'Error al obtener materiales de construcción' });
  }
};

export const updateConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = parseFormData(req.body);
    const material = await prisma.constructionMaterialPreset.update({
      where: { id },
      data,
    });
    res.json(material);
  } catch (error) {
    console.error('Error al actualizar material de construcción:', error);
    res.status(500).json({ error: 'Error al actualizar material de construcción' });
  }
};

export const deleteConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.constructionMaterialPreset.delete({
      where: { id },
    });
    res.json({ message: 'Material de construcción eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar material de construcción:', error);
    res.status(500).json({ error: 'Error al eliminar material de construcción' });
  }
};
