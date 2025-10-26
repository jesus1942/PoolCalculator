import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const createAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const accessoryPreset = await prisma.accessoryPreset.create({
      data: req.body,
    });

    res.status(201).json(accessoryPreset);
  } catch (error) {
    console.error('Error al crear preset de accesorio:', error);
    res.status(500).json({ error: 'Error al crear preset de accesorio' });
  }
};

export const getAccessoryPresets = async (req: Request, res: Response) => {
  try {
    const accessoryPresets = await prisma.accessoryPreset.findMany({
      orderBy: {
        type: 'asc',
      },
    });

    res.json(accessoryPresets);
  } catch (error) {
    console.error('Error al obtener presets de accesorios:', error);
    res.status(500).json({ error: 'Error al obtener presets de accesorios' });
  }
};

export const updateAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const accessoryPreset = await prisma.accessoryPreset.update({
      where: { id },
      data: req.body,
    });

    res.json(accessoryPreset);
  } catch (error) {
    console.error('Error al actualizar preset de accesorio:', error);
    res.status(500).json({ error: 'Error al actualizar preset de accesorio' });
  }
};

export const deleteAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.accessoryPreset.delete({
      where: { id },
    });

    res.json({ message: 'Preset de accesorio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de accesorio:', error);
    res.status(500).json({ error: 'Error al eliminar preset de accesorio' });
  }
};
