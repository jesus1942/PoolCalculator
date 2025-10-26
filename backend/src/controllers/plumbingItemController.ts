import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const parseFormData = (body: any) => {
  const parsed: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    if (key === 'pricePerUnit') {
      parsed[key] = parseFloat(value) || 0;
    } else if (key === 'length') {
      parsed[key] = value ? parseFloat(value) : null;
    } else {
      parsed[key] = value || null;
    }
  }
  
  return parsed;
};

export const getPlumbingItems = async (req: Request, res: Response) => {
  try {
    const { search, category, type } = req.query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { diameter: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (type) {
      where.type = type;
    }
    
    const items = await prisma.plumbingItem.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error al obtener items de plomería:', error);
    res.status(500).json({ error: 'Error al obtener items' });
  }
};

export const createPlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    
    const item = await prisma.plumbingItem.create({
      data,
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error al crear item:', error);
    res.status(500).json({ error: 'Error al crear item' });
  }
};

export const updatePlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = parseFormData(req.body);
    
    const item = await prisma.plumbingItem.update({
      where: { id },
      data,
    });
    
    res.json(item);
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
};

export const deletePlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.plumbingItem.delete({
      where: { id },
    });
    
    res.json({ message: 'Item eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
};
