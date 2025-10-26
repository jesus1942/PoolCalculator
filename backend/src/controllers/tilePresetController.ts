import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const parseFormData = (body: any) => {
  const parsed: any = {};

  // Campos que NO deben actualizarse (readonly)
  const excludeFields = ['id', 'createdAt', 'updatedAt'];

  for (const key in body) {
    // Skip readonly fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const value = body[key];

    // Números decimales
    if (['width', 'length', 'pricePerUnit', 'cornerPricePerUnit'].includes(key)) {
      // Permitir 0 como valor válido (no convertir a null)
      if (value === null || value === undefined || value === '') {
        parsed[key] = key === 'pricePerUnit' ? 0 : null; // pricePerUnit no puede ser null
      } else {
        parsed[key] = parseFloat(value);
      }
    }
    // Números enteros
    else if (['cornersPerTile'].includes(key)) {
      if (value === null || value === undefined || value === '') {
        parsed[key] = null;
      } else {
        parsed[key] = parseInt(value);
      }
    }
    // Booleanos
    else if (['hasCorner', 'isForFirstRing'].includes(key)) {
      parsed[key] = value === 'true' || value === true;
    }
    // Strings normales
    else {
      parsed[key] = value;
    }
  }

  return parsed;
};

export const createTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const tilePreset = await prisma.tilePreset.create({ data });
    res.status(201).json(tilePreset);
  } catch (error) {
    console.error('Error al crear preset de loseta:', error);
    res.status(500).json({ error: 'Error al crear preset de loseta' });
  }
};

export const getTilePresets = async (req: Request, res: Response) => {
  try {
    const tilePresets = await prisma.tilePreset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(tilePresets);
  } catch (error) {
    console.error('Error al obtener presets de losetas:', error);
    res.status(500).json({ error: 'Error al obtener presets de losetas' });
  }
};

export const updateTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[TILE UPDATE] ID:', id);
    console.log('[TILE UPDATE] Body original:', req.body);

    const data = parseFormData(req.body);
    console.log('[TILE UPDATE] Data parseada:', data);

    const tilePreset = await prisma.tilePreset.update({
      where: { id },
      data,
    });
    res.json(tilePreset);
  } catch (error: any) {
    console.error('Error al actualizar preset de loseta:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    res.status(500).json({
      error: 'Error al actualizar preset de loseta',
      details: error?.message
    });
  }
};

export const deleteTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tilePreset.delete({
      where: { id },
    });
    res.json({ message: 'Preset de loseta eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de loseta:', error);
    res.status(500).json({ error: 'Error al eliminar preset de loseta' });
  }
};
