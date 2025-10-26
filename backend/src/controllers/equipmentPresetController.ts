import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const parseFormData = (body: any) => {
  const parsed: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    if (['power', 'capacity', 'pricePerUnit'].includes(key)) {
      parsed[key] = value ? parseFloat(value) : null;
    } else if (['voltage'].includes(key)) {
      parsed[key] = value ? parseInt(value) : null;
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
};

export const createEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const equipmentPreset = await prisma.equipmentPreset.create({ data });
    res.status(201).json(equipmentPreset);
  } catch (error) {
    console.error('Error al crear preset de equipo:', error);
    res.status(500).json({ error: 'Error al crear preset de equipo' });
  }
};

export const getEquipmentPresets = async (req: Request, res: Response) => {
  try {
    const equipmentPresets = await prisma.equipmentPreset.findMany({
      orderBy: {
        type: 'asc',
      },
    });
    res.json(equipmentPresets);
  } catch (error) {
    console.error('Error al obtener presets de equipos:', error);
    res.status(500).json({ error: 'Error al obtener presets de equipos' });
  }
};

export const updateEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = parseFormData(req.body);
    const equipmentPreset = await prisma.equipmentPreset.update({
      where: { id },
      data,
    });
    res.json(equipmentPreset);
  } catch (error) {
    console.error('Error al actualizar preset de equipo:', error);
    res.status(500).json({ error: 'Error al actualizar preset de equipo' });
  }
};

export const deleteEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.equipmentPreset.delete({
      where: { id },
    });
    res.json({ message: 'Preset de equipo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de equipo:', error);
    res.status(500).json({ error: 'Error al eliminar preset de equipo' });
  }
};
